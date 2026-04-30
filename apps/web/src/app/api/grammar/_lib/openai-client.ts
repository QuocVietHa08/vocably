import { z, ZodType } from "zod/v3";
import { OpenAIError, OpenAITimeoutError, log } from "./errors";
import { ERROR_MESSAGES, LOG_EVENTS, OPENAI } from "./constants";

type ChatMessage = { role: "system" | "user"; content: string };

type CallOpts<T> = {
  apiKey: string;
  model: string;
  schemaName: string;
  jsonSchema: object;
  parser: ZodType<T>;
  input: ChatMessage[];
  temperature: number;
  timeoutMs?: number;
};

export async function callOpenAI<T>(opts: CallOpts<T>): Promise<T> {
  const {
    apiKey,
    model,
    schemaName,
    jsonSchema,
    parser,
    input,
    temperature,
    timeoutMs = OPENAI.timeoutMs,
  } = opts;
  const startedAt = Date.now();

  console.log("[openai-client] callOpenAI", { schemaName, model, modelType: typeof model });

  const body = JSON.stringify({
    model,
    input,
    temperature,
    text: {
      format: {
        type: "json_schema",
        name: schemaName,
        strict: true,
        schema: jsonSchema,
      },
    },
  });

  const res = await fetchWithRetry({ apiKey, body, timeoutMs, schemaName });
  const data = await res.json();
  const outputText = extractOutputText(data);

  if (!outputText) {
    throw new OpenAIError(ERROR_MESSAGES.emptyOpenAIResponse);
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(outputText);
  } catch {
    throw new OpenAIError(ERROR_MESSAGES.nonJsonOpenAIResponse);
  }

  const validated = parser.safeParse(parsedJson);
  if (!validated.success) {
    log("error", LOG_EVENTS.openAISchemaMismatch, { schemaName, issues: validated.error.issues });
    throw new OpenAIError(ERROR_MESSAGES.openAISchemaMismatch);
  }

  log("info", LOG_EVENTS.openAICall, {
    schemaName,
    model,
    latencyMs: Date.now() - startedAt,
  });

  return validated.data;
}

async function fetchWithRetry(args: {
  apiKey: string;
  body: string;
  timeoutMs: number;
  schemaName: string;
}): Promise<Response> {
  const { apiKey, body, timeoutMs, schemaName } = args;
  const maxAttempts = OPENAI.maxAttempts;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(OPENAI.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.ok) return res;

      const text = await res.text();

      if (OPENAI.retryStatuses.has(res.status) && attempt < maxAttempts) {
        log("warn", LOG_EVENTS.openAIRetry, { schemaName, attempt, status: res.status });
        await sleep(backoffMs(attempt));
        continue;
      }

      throw new OpenAIError(
        `${ERROR_MESSAGES.openAIRequestFailed}: ${truncate(text, OPENAI.errorBodyPreviewLength)}`,
        res.status,
      );
    } catch (err) {
      lastErr = err;
      if (err instanceof OpenAIError) throw err;
      if (isTimeoutError(err)) throw new OpenAITimeoutError();
      if (attempt < maxAttempts) {
        log("warn", LOG_EVENTS.openAINetworkRetry, { schemaName, attempt });
        await sleep(backoffMs(attempt));
        continue;
      }
    }
  }

  throw new OpenAIError(`${ERROR_MESSAGES.openAIRetryExhausted}: ${String(lastErr)}`);
}

function isTimeoutError(err: unknown): boolean {
  return err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
}

function backoffMs(attempt: number) {
  return Math.min(1000 * attempt, 2000);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function extractOutputText(data: unknown): string {
  const Shape = z
    .object({
      output_text: z.string().optional(),
      output: z
        .array(
          z.object({
            content: z
              .array(z.object({ text: z.string().optional() }).passthrough())
              .optional(),
          }).passthrough(),
        )
        .optional(),
    })
    .passthrough();

  const parsed = Shape.safeParse(data);
  if (!parsed.success) return "";
  const d = parsed.data;
  if (typeof d.output_text === "string" && d.output_text.length > 0) return d.output_text;
  for (const item of d.output ?? []) {
    for (const content of item.content ?? []) {
      if (typeof content.text === "string" && content.text.length > 0) return content.text;
    }
  }
  return "";
}
