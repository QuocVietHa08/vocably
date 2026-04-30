import type { Feedback } from "@/types/grammar";
import { callOpenAI } from "./openai-client";
import { fallbackCheck } from "./fallback";
import { CheckRequest, FeedbackSchema, feedbackJsonSchema } from "./schemas";
import { log } from "./errors";
import {
  CHECK_GRADING_RULES,
  CHECK_SYSTEM_PROMPT,
  ERROR_MESSAGES,
  LOG_EVENTS,
  OPENAI,
  SCHEMA_NAMES,
  TEMPERATURE,
} from "./constants";

type CheckResult = {
  feedback: Feedback;
  source: "openai" | "fallback";
  error?: string;
};

export async function checkAnswer(req: CheckRequest): Promise<CheckResult> {
  const apiKey = process.env[OPENAI.apiKeyEnvVar];

  if (!apiKey) {
    return { feedback: fallbackCheck(req.task, req.answer), source: "fallback" };
  }

  try {
    const feedback = await callOpenAI({
      apiKey,
      model: resolveModel(process.env[OPENAI.modelEnvVars.check], OPENAI.models.check),
      schemaName: SCHEMA_NAMES.grammarFeedback,
      jsonSchema: feedbackJsonSchema,
      parser: FeedbackSchema,
      temperature: TEMPERATURE.check,
      input: [
        { role: "system", content: CHECK_SYSTEM_PROMPT },
        { role: "user", content: buildCheckUserPayload(req) },
      ],
    });

    return {
      feedback: { ...feedback, score: clampScore(feedback.score) },
      source: "openai",
    };
  } catch (err) {
    log("warn", LOG_EVENTS.checkFallback, {
      reason: err instanceof Error ? err.message : String(err),
    });
    return {
      feedback: fallbackCheck(req.task, req.answer),
      source: "fallback",
      error: err instanceof Error ? err.message : ERROR_MESSAGES.checkFailed,
    };
  }
}

function resolveModel(envValue: string | undefined, fallback: string): string {
  const trimmed = envValue?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function buildCheckUserPayload(req: CheckRequest): string {
  return JSON.stringify({
    task: req.task,
    learnerAnswer: req.answer,
    gradingRules: CHECK_GRADING_RULES,
  });
}

function clampScore(raw: number): number {
  if (Number.isNaN(raw)) return 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}
