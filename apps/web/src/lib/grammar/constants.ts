import type { GrammarTask, TaskTypeSelection } from "@/types/grammar";

export const RANDOM_TASK_TYPE = "random" as const;

export const fallbackTask: GrammarTask = {
  id: "starter-tense",
  type: "tense",
  title: "Past Perfect",
  instruction: "Type only the missing verb phrase.",
  prompt: "By the time the meeting started, I ____ the report.",
  context: "Use the verb: finish",
  targetAnswer: "had finished",
  hint: "One action happened before another past action.",
  difficulty: "B1",
};

export const typeLabels: Record<TaskTypeSelection, string> = {
  random: "Random mix",
  tense: "Tense",
  paraphrase: "Paraphrase",
  word_choice: "Word choice",
  vocabulary: "Vocabulary",
  sentence_fix: "Sentence fix",
};

export const typeOptions: TaskTypeSelection[] = [
  "random",
  "tense",
  "paraphrase",
  "word_choice",
  "vocabulary",
  "sentence_fix",
];

export const levelOptions: GrammarTask["difficulty"][] = ["A2", "B1", "B2", "C1"];

export const levelLabels: Record<GrammarTask["difficulty"], string> = {
  A2: "6.0",
  B1: "7.0",
  B2: "8.0",
  C1: "9.0",
};

export const SESSION_GOAL = 10;
