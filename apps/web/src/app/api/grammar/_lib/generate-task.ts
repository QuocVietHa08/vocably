import type { GrammarTask } from "@/types/grammar";
import { normalizePrompt } from "@/lib/grammar-utils";
import { getLessonMetadataForPrompt } from "@/data/grammar-course";
import { callOpenAI } from "./openai-client";
import { pickFallbackTask } from "./fallback";
import { GenerateRequest, GrammarTaskSchema, grammarTaskJsonSchema } from "./schemas";
import { log } from "./errors";
import {
  DEFAULT_LEVEL,
  ERROR_MESSAGES,
  GENERATE_REQUIREMENTS,
  GENERATE_SYSTEM_PROMPT,
  LOG_EVENTS,
  OPENAI,
  RANDOM_TASK_TYPE,
  SCHEMA_NAMES,
  TASK_TYPES,
  TEMPERATURE,
} from "./constants";

type ConcreteTaskType = (typeof TASK_TYPES)[number];

type GenerateResult = {
  task: GrammarTask;
  source: "openai" | "fallback";
  error?: string;
};

export async function generateTask(req: GenerateRequest): Promise<GenerateResult> {
  const apiKey = process.env[OPENAI.apiKeyEnvVar];
  const usedPromptKeys = collectUsedPromptKeys(req);
  const resolvedTaskType = resolveTaskType(req.taskType);
  const fallback = pickFallbackTask({
    level: req.level,
    taskType: resolvedTaskType,
    usedPromptKeys,
  });

  if (!apiKey) {
    return { task: withUniqueId(fallback), source: "fallback" };
  }

  try {
    const task = await callOpenAI({
      apiKey,
      model: resolveModel(process.env[OPENAI.modelEnvVars.generate], OPENAI.models.generate),
      schemaName: SCHEMA_NAMES.grammarTask,
      jsonSchema: grammarTaskJsonSchema,
      parser: GrammarTaskSchema,
      temperature: TEMPERATURE.generate,
      input: [
        { role: "system", content: GENERATE_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildGenerateUserPayload(req, usedPromptKeys, resolvedTaskType),
        },
      ],
    });

    return { task: withUniqueId(task), source: "openai" };
  } catch (err) {
    log("warn", LOG_EVENTS.generateFallback, {
      reason: err instanceof Error ? err.message : String(err),
    });
    return {
      task: withUniqueId(fallback),
      source: "fallback",
      error: err instanceof Error ? err.message : ERROR_MESSAGES.generateFailed,
    };
  }
}

function resolveModel(envValue: string | undefined, fallback: string): string {
  const trimmed = envValue?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function buildGenerateUserPayload(
  req: GenerateRequest,
  usedPromptKeys: Set<string>,
  resolvedTaskType: ConcreteTaskType | undefined,
): string {
  return JSON.stringify({
    level: req.level ?? DEFAULT_LEVEL,
    // Either a single concrete type (user-picked or random-resolved) or the full set
    // (when client omits taskType entirely — keeps server tolerant of older clients).
    taskTypes: resolvedTaskType ? [resolvedTaskType] : TASK_TYPES,
    recentHistory: req.history ?? [],
    disallowedPrompts: Array.from(usedPromptKeys),
    availableLessons: getLessonMetadataForPrompt(req.level),
    requirements: GENERATE_REQUIREMENTS,
  });
}

// Resolves the client's task-type selection to a concrete type:
//   - undefined          → undefined (server lets AI roam across all 5)
//   - "random"           → one of TASK_TYPES picked uniformly at random
//   - any concrete value → returned as-is
// Picking server-side instead of telling the AI "be random" gives the AI a
// tighter prompt (single task type) and lets the fallback picker filter cleanly.
function resolveTaskType(
  selection: GenerateRequest["taskType"],
): ConcreteTaskType | undefined {
  if (!selection) return undefined;
  if (selection === RANDOM_TASK_TYPE) {
    return TASK_TYPES[Math.floor(Math.random() * TASK_TYPES.length)];
  }
  return selection;
}

function collectUsedPromptKeys(req: GenerateRequest): Set<string> {
  const keys = new Set<string>();
  for (const prompt of req.seenPrompts ?? []) keys.add(normalizePrompt(prompt));
  for (const item of req.history ?? []) keys.add(normalizePrompt(item.prompt));
  return keys;
}

function withUniqueId(task: GrammarTask): GrammarTask {
  return { ...task, id: `${task.id}-${randomId()}` };
}

function randomId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
