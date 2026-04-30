// Single source of truth for prompts, enum values, error messages, and fallback copy
// used across the grammar API. Anything reused in two or more files belongs here.

export const TASK_TYPES = [
  "tense",
  "paraphrase",
  "word_choice",
  "vocabulary",
  "sentence_fix",
] as const;

export const RANDOM_TASK_TYPE = "random" as const;

export const TASK_TYPE_SELECTIONS = [RANDOM_TASK_TYPE, ...TASK_TYPES] as const;

export const DIFFICULTIES = ["A2", "B1", "B2", "C1"] as const;

export const DEFAULT_LEVEL: (typeof DIFFICULTIES)[number] = "B1";

// ── OpenAI structured-output schema names ──
export const SCHEMA_NAMES = {
  grammarTask: "grammar_task",
  grammarFeedback: "grammar_feedback",
} as const;

// ── Sampling temperatures (variety vs determinism) ──
export const TEMPERATURE = {
  generate: 0.7,
  check: 0,
} as const;

// ── OpenAI client tuning ──
// Per-action model: generate needs stronger reasoning + idiom coverage,
// check runs at temperature 0 so a smaller model is enough.
export const OPENAI = {
  url: "https://api.openai.com/v1/responses",
  models: {
    generate: "gpt-4.1",
    check: "gpt-4.1-mini",
  },
  modelEnvVars: {
    generate: "AI_GRAMMAR_GENERATE_MODEL",
    check: "AI_GRAMMAR_CHECK_MODEL",
  },
  apiKeyEnvVar: "AI_API_KEY",
  timeoutMs: 15_000,
  maxAttempts: 2,
  retryStatuses: new Set<number>([408, 429, 500, 502, 503, 504]),
  errorBodyPreviewLength: 300,
} as const;

// ── Generate-task prompt parts ──
export const GENERATE_SYSTEM_PROMPT =
  "You create concise English grammar practice prompts. Return only valid JSON matching the schema. Avoid repeated topics from the provided history.";

export const GENERATE_REQUIREMENTS = [
  "Make one short, clear question.",
  "The learner should answer by typing only the missing or corrected word/phrase.",
  "Do not require the learner to rewrite the full sentence.",
  "If the prompt is a sentence correction, identify the exact word or phrase to replace.",
  "Include a targetAnswer that contains only the expected word or phrase, not a full sentence.",
  "Use practical everyday or IELTS-style English.",
  "Do not repeat any prompt from disallowedPrompts.",
] as const;

// ── Check-answer prompt parts ──
export const CHECK_SYSTEM_PROMPT =
  "You are a precise but friendly English grammar tutor. The learner only submits the missing or corrected word/phrase, not the full sentence. Grade that short answer, explain specific errors, and provide the correct word/phrase only. Return only valid JSON matching the schema.";

export const CHECK_GRADING_RULES = [
  "Score from 0 to 100.",
  "Mark correct when the submitted word/phrase is grammatically correct and satisfies the prompt.",
  "Do not require a full sentence.",
  "Accept equivalent short phrases when the meaning is unchanged.",
  "Corrections should be concrete and short.",
  "rewrite must be only the correct word/phrase, not the full sentence.",
] as const;

// ── HTTP / API error messages (surfaced to clients) ──
export const ERROR_MESSAGES = {
  invalidJson: "Request body must be valid JSON",
  invalidPayload: "Invalid request payload",
  invalidRequestBody: "Invalid request body",
  internal: "Internal server error",
  emptyOpenAIResponse: "OpenAI returned an empty response",
  nonJsonOpenAIResponse: "OpenAI returned non-JSON output",
  openAISchemaMismatch: "OpenAI output failed schema validation",
  openAITimeout: "OpenAI request timed out",
  openAIRequestFailed: "OpenAI request failed",
  openAIRetryExhausted: "OpenAI request failed after retry",
  generateFailed: "AI generation failed",
  checkFailed: "AI checking failed",
} as const;

// ── Log event names (one taxonomy across modules) ──
export const LOG_EVENTS = {
  openAICall: "openai_call",
  openAIRetry: "openai_retry",
  openAINetworkRetry: "openai_network_retry",
  openAISchemaMismatch: "openai_schema_mismatch",
  openAIError: "openai_error",
  generateFallback: "generate_fallback",
  checkFallback: "check_fallback",
  validationError: "validation_error",
  zodError: "zod_error",
  unknownError: "unknown_error",
} as const;

// ── Fallback grader copy ──
export const FALLBACK_FEEDBACK = {
  scoreCorrect: 100,
  scoreIncorrect: 45,
  summaryCorrect: "Your changed word or phrase matches the expected grammar.",
  summaryIncorrect:
    "This word or phrase may not fully match the expected grammar or meaning.",
  correctionCorrect: "The structure is correct for this prompt.",
  correctionIncorrectPrefix: "Expected part: ",
  correctionMissingTarget: "Check the grammar and meaning again.",
  // Levenshtein matcher tuning — accepts identical answers + single-char typos
  maxLengthDiff: 2,
  maxEditDistance: 1,
} as const;
