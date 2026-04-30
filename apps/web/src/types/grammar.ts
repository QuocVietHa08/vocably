export type GrammarTask = {
  id: string;
  type: "tense" | "paraphrase" | "word_choice" | "vocabulary" | "sentence_fix";
  title: string;
  instruction: string;
  prompt: string;
  context?: string;
  targetAnswer?: string;
  hint: string;
  difficulty: "A2" | "B1" | "B2" | "C1";
};

export type Feedback = {
  isCorrect: boolean;
  score: number;
  summary: string;
  corrections: string[];
  rewrite: string;
  nextTip: string;
};

export type HistoryItem = {
  id: string;
  prompt: string;
  answer: string;
  score: number;
  isCorrect: boolean;
};

export type TaskTypeSelection = GrammarTask["type"] | "random";

export type GenerateGrammarRequest = {
  action: "generate";
  level?: GrammarTask["difficulty"];
  taskType?: TaskTypeSelection;
  history?: Pick<HistoryItem, "prompt" | "answer" | "score" | "isCorrect">[];
  seenPrompts?: string[];
};

export type GenerateGrammarResponse = {
  task: GrammarTask;
  source: "openai" | "fallback";
  error?: string;
};

export type CheckGrammarRequest = {
  action: "check";
  task: GrammarTask;
  answer: string;
};

export type CheckGrammarResponse = {
  feedback: Feedback;
  source: "openai" | "fallback";
  error?: string;
};
