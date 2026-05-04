import { z, type ZodTypeAny } from "zod/v3";
import { zodToJsonSchema as zodToJsonSchemaRaw } from "zod-to-json-schema";

// zod-to-json-schema's typings reference an internal ZodSchema shape that drifts
// from the public ZodTypeAny we use here. The runtime contract is fine — narrow
// the function type so our zod/v3 schemas pass without ts errors.
const zodToJsonSchema = zodToJsonSchemaRaw as unknown as (
  schema: ZodTypeAny,
  options?: Parameters<typeof zodToJsonSchemaRaw>[1],
) => object;
import { DIFFICULTIES, TASK_TYPES, TASK_TYPE_SELECTIONS } from "./constants";

export const GrammarTaskSchema = z.object({
  id: z.string(),
  type: z.enum(TASK_TYPES),
  title: z.string(),
  instruction: z.string(),
  prompt: z.string(),
  context: z.string(),
  targetAnswer: z.string(),
  hint: z.string(),
  difficulty: z.enum(DIFFICULTIES),
  lessonId: z.string().optional(),
});

export const FeedbackSchema = z.object({
  isCorrect: z.boolean(),
  score: z.number(),
  summary: z.string(),
  corrections: z.array(z.string()).min(1).max(4),
  rewrite: z.string(),
  nextTip: z.string(),
  relatedLessonId: z.string().optional(),
  relatedLessonTitle: z.string().optional(),
});

const HistoryItemSchema = z.object({
  prompt: z.string(),
  answer: z.string(),
  score: z.number(),
  isCorrect: z.boolean(),
});

export const GenerateRequestSchema = z.object({
  action: z.literal("generate"),
  level: z.enum(DIFFICULTIES).optional(),
  taskType: z.enum(TASK_TYPE_SELECTIONS).optional(),
  history: z.array(HistoryItemSchema).optional(),
  seenPrompts: z.array(z.string()).optional(),
});

export const CheckRequestSchema = z.object({
  action: z.literal("check"),
  task: GrammarTaskSchema.partial({ id: true, context: true, targetAnswer: true }).extend({
    id: z.string(),
    type: z.enum(TASK_TYPES),
    difficulty: z.enum(DIFFICULTIES),
    title: z.string(),
    instruction: z.string(),
    prompt: z.string(),
    hint: z.string(),
    lessonId: z.string().optional(),
  }),
  answer: z.string(),
});

export const RequestSchema = z.discriminatedUnion("action", [
  GenerateRequestSchema,
  CheckRequestSchema,
]);

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type CheckRequest = z.infer<typeof CheckRequestSchema>;
export type ParsedRequest = z.infer<typeof RequestSchema>;

export const grammarTaskJsonSchema = zodToJsonSchema(GrammarTaskSchema, {
  $refStrategy: "none",
  target: "openAi",
});

export const feedbackJsonSchema = zodToJsonSchema(FeedbackSchema, {
  $refStrategy: "none",
  target: "openAi",
});
