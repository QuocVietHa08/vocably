# Grammar API

Endpoint: `POST /api/grammar`

Two actions, dispatched via `body.action`:

| Action | Purpose |
|--------|---------|
| `generate` | Produce a fresh grammar practice task |
| `check` | Grade a learner's short answer |

OpenAI-backed when `AI_API_KEY` is present. Static fallback bank serves both paths when the key is missing or the upstream call fails.

---

## Architecture

```
POST /api/grammar
        │
        ▼
┌───────────────────────────────┐
│  route.ts                     │  parse → validate (zod) → dispatch
└───────────────┬───────────────┘
                │
       ┌────────┴─────────┐
       ▼                  ▼
generate-task.ts     check-answer.ts
       │                  │
       ▼                  ▼
   openai-client.ts (timeout, retry, structured-output validation)
       │
       └─► fallback.ts (sample bank + Levenshtein grader)  ◄─ used on miss / error
```

### Files

| File | Responsibility |
|------|---------------|
| [route.ts](../src/app/api/grammar/route.ts) | Edge-thin handler: JSON parse, zod validation, action dispatch, error mapping |
| [_lib/constants.ts](../src/app/api/grammar/_lib/constants.ts) | Single source of truth for prompts, enum values, schema names, OpenAI tuning, error messages, log event taxonomy, and fallback grader copy. Anything reused in two or more files lives here. |
| [_lib/schemas.ts](../src/app/api/grammar/_lib/schemas.ts) | Zod schemas for request, task, feedback. Derives JSON Schema for OpenAI structured output. |
| [_lib/sample-tasks.ts](../src/app/api/grammar/_lib/sample-tasks.ts) | Static bank of 14 fallback tasks across difficulty levels |
| [_lib/openai-client.ts](../src/app/api/grammar/_lib/openai-client.ts) | Hardened OpenAI fetch wrapper: timeout, retry, structured-output parsing, schema validation, structured logging |
| [_lib/generate-task.ts](../src/app/api/grammar/_lib/generate-task.ts) | Generate handler: builds prompt, calls OpenAI, falls back on failure |
| [_lib/check-answer.ts](../src/app/api/grammar/_lib/check-answer.ts) | Check handler: deterministic grading, score clamp, fallback on failure |
| [_lib/fallback.ts](../src/app/api/grammar/_lib/fallback.ts) | Pick task from sample bank + Levenshtein-based grader |
| [_lib/errors.ts](../src/app/api/grammar/_lib/errors.ts) | Typed error classes + central HTTP mapping + structured logger |

---

## Request / Response Contract

### `generate`

**Request**
```ts
{
  action: "generate",
  level?:    "A2" | "B1" | "B2" | "C1",
  taskType?: "random" | "tense" | "paraphrase" | "word_choice" | "vocabulary" | "sentence_fix",
  history?:    Array<{ prompt: string; answer: string; score: number; isCorrect: boolean }>,
  seenPrompts?: string[],
}
```

`taskType` semantics:
- `"random"` — server picks one of the five concrete types uniformly per request and passes that single type to the AI (and to the fallback picker). Picking server-side gives the AI a tighter prompt than telling it "pick anything".
- A concrete value — pinned to that type for both AI and fallback paths.
- Omitted — server passes the full set to the AI (legacy / older-client tolerant).

`history` and `seenPrompts` are deduplication signals — both feed into the disallowed-prompts list passed to OpenAI and to the fallback picker.

**Response**
```ts
{
  task: GrammarTask,             // see schemas.ts
  source: "openai" | "fallback",
  error?: string,                // present when fallback was used after a failed OpenAI call
}
```

### `check`

**Request**
```ts
{
  action: "check",
  task: GrammarTask,
  answer: string,
}
```

**Response**
```ts
{
  feedback: {
    isCorrect: boolean,
    score: number,                 // clamped 0–100, integer
    summary: string,
    corrections: string[],         // 1–4 items
    rewrite: string,               // expected short word/phrase only
    nextTip: string,
  },
  source: "openai" | "fallback",
  error?: string,
}
```

### Error responses

| Status | When |
|--------|------|
| `400` | Body is not JSON, fails zod validation, or unknown `action` |
| `502` | OpenAI returned a non-OK response or output failed schema validation |
| `504` | OpenAI request exceeded the 15s timeout |
| `500` | Unhandled error |

All error responses share the shape `{ error: string, details?: unknown }`.

---

## Constants

`_lib/constants.ts` centralizes every string and tuning value the API touches. Adding a new error message, log event, or grading rule means editing one file. Sections:

| Group | Notes |
|-------|-------|
| `TASK_TYPES`, `DIFFICULTIES`, `DEFAULT_LEVEL` | Enum values reused by zod schemas and prompt builders |
| `SCHEMA_NAMES` | OpenAI structured-output schema identifiers |
| `TEMPERATURE` | `generate: 0.7` (variety), `check: 0` (determinism) |
| `OPENAI` | URL, default model, env var names, timeout, max attempts, retryable status codes, error preview length |
| `GENERATE_SYSTEM_PROMPT`, `GENERATE_REQUIREMENTS` | Generate prompt parts |
| `CHECK_SYSTEM_PROMPT`, `CHECK_GRADING_RULES` | Check prompt parts |
| `ERROR_MESSAGES` | Every user-visible error string |
| `LOG_EVENTS` | Stable event taxonomy for log aggregation |
| `FALLBACK_FEEDBACK` | Fallback grader scores, copy, and Levenshtein tuning (`maxLengthDiff`, `maxEditDistance`) |

All entries use `as const` so the values are literal types — autocomplete works at every call site and typos become compile errors.

---

## Validation Strategy

zod is the single source of truth.

- TS types are derived via `z.infer<>` so the runtime validator and the compile-time type cannot drift.
- The OpenAI structured-output JSON Schema is generated from the same zod schema via `zod-to-json-schema` (with `target: "openAi"`), eliminating the previous hand-maintained JSON literal that had to be kept in sync with the TS definitions.
- A discriminated union on `action` lets the route's `switch` exhaustively narrow the request without manual type guards.

Because zod v3 is used (via `zod/v3` re-export — `zod-to-json-schema` is not yet zod-v4-compatible), the upgrade path when the lib lands is a single import swap.

---

## OpenAI Integration

### Structured output

We call the `/v1/responses` endpoint with `text.format = { type: "json_schema", strict: true, schema, name }`. OpenAI then guarantees the model output parses against the supplied JSON Schema. We additionally re-validate with zod at runtime — defense in depth against schema drift between OpenAI's interpretation and ours.

### Models

Per-action models — `generate` runs with stronger reasoning (idiom + grammar coverage matters), `check` runs at temperature 0 so a smaller model is enough:

| Action | Default | Env override |
|--------|---------|--------------|
| `generate` | `gpt-4.1` | `AI_GRAMMAR_GENERATE_MODEL` |
| `check`    | `gpt-4.1-mini` | `AI_GRAMMAR_CHECK_MODEL` |

### Temperature

| Action | Temperature | Reason |
|--------|------------:|--------|
| `generate` | `0.7` | Want variety — same level/type should produce different prompts each call |
| `check`    | `0.0` | Want determinism — same answer must score the same every time |

Previously both paths used `0.7`, which made grading non-reproducible.

### Timeout + retry

`AbortSignal.timeout(15_000)` caps each request. On retryable status (`408`, `429`, `5xx`) or network error, the client retries once with linear backoff. Non-retryable errors (`4xx` other than `408`/`429`) fail fast.

### Output extraction

Some OpenAI responses surface text via `output_text`, others via `output[].content[].text`. The extractor checks both, runtime-shapes the response, and throws a typed `OpenAIError` if neither contains text.

---

## Fallback Strategy

The fallback path runs in three cases:

1. `AI_API_KEY` is absent (local dev without a key)
2. The OpenAI request fails (timeout, schema mismatch, upstream 5xx after retry)
3. The output fails zod validation

### Generate fallback

`pickFallbackTask` filters the sample bank by `taskType`, then by `level`, then by previously-seen prompts (using normalized text). It progressively widens the pool when filters produce zero candidates so the API never returns nothing.

Each returned task gets a fresh suffix on its `id` via `crypto.randomUUID()` to prevent ID collisions when the same sample task is served twice (e.g. across two rapid-fire generate calls). The previous `Date.now()` approach collided when calls landed in the same millisecond.

### Check fallback

`fallbackCheck` compares the normalized learner answer to the normalized `targetAnswer` using a Levenshtein distance ≤ 1 with a length-difference guard ≤ 2 — matches identical answers and single-character typos but rejects the substring match that the previous version allowed (e.g. `"not had finished"` no longer passes for `"had finished"`).

`normalizePrompt` is reused from `lib/grammar-utils.ts` instead of being duplicated locally.

---

## Logging

`log(level, event, data)` emits a single-line JSON object per call. Events emitted by this route:

| Event | When |
|-------|------|
| `openai_call` | Successful OpenAI call (with latency + model + schemaName) |
| `openai_retry` | Retryable upstream status, retrying |
| `openai_network_retry` | Network error during fetch, retrying |
| `openai_schema_mismatch` | OpenAI output failed zod validation |
| `generate_fallback` | Generate path fell back to sample bank |
| `check_fallback` | Check path fell back to local grader |
| `validation_error` / `zod_error` | Bad request body |
| `openai_error` / `unknown_error` | Surfaced through `handleError` |

Prompts and learner answers are intentionally **not** logged — they may carry user content.

---

## Why Each Change Matters

| Before | After | Reason |
|--------|-------|--------|
| 456-line monolithic route | Route file is 28 lines; logic split into single-responsibility modules | Reviewability, testability |
| `if (body.action === ...)` chains | Discriminated union + exhaustive `switch` | Type safety; adding a new action becomes a compile error if unhandled |
| Hand-rolled JSON Schema literals + parallel TS types | One zod schema → both | Eliminates drift class of bugs |
| No fetch timeout | 15s `AbortSignal.timeout` | Hung connections used to block the route forever |
| No retry on transient upstream | Single retry on `408/429/5xx` + network errors | Fewer false fallbacks under transient cloud blips |
| `temperature: 0.7` for grading | `0.0` for check | Same answer → same score |
| `Date.now()` task IDs | `crypto.randomUUID()` | Collision-safe under rapid calls |
| `actual.includes(expected)` fallback grader | Levenshtein ≤ 1 with length guard | Drops false positives like `"not had finished"` |
| Duplicate `normalize` function | Reuses `lib/grammar-utils.ts#normalizePrompt` | Single source of truth |
| Score clamp only on OpenAI branch | Single `clampScore` in check handler | Consistent invariant across paths |
| Errors leaked as raw 400/500 | Typed error classes mapped centrally | Consistent response shape, easier client handling |
| No structured logs | JSON-line logs with event taxonomy | Searchable in production log aggregators |

---

## Local Development

Without `AI_API_KEY`, both actions return responses with `source: "fallback"`. The sample bank is large enough (14 tasks across A2–C1 and all five task types) to test both UI paths.

Set `AI_API_KEY` in `.env.local` to exercise the live path. Override models with `AI_GRAMMAR_GENERATE_MODEL` / `AI_GRAMMAR_CHECK_MODEL` if needed.

---

## Future Work (Phase 4)

Not landed in this refactor — listed for follow-up:

- **Personalization**: extract weak task types from `history` (filter `isCorrect: false`) and pass as `focusOn` hint to the generate prompt. Requires adding `taskType` to `HistoryItem` on the client side, so coordinate with mobile + web simultaneously.
- **Rate limiting**: 30 req/min/IP via Upstash Redis or in-memory LRU.
- **Caching for `check`**: hash `(taskId, normalizedAnswer)` → cached `Feedback` for 5 minutes. Cuts cost when the UI re-submits the same answer.
- **Tests**: Vitest + `msw` mock for OpenAI. Cover bad body, missing key, OpenAI timeout, OpenAI 5xx, fallback grader correctness.
- **Telemetry**: emit `grammar.generate.latency_ms`, `grammar.check.fallback_rate` metrics.
