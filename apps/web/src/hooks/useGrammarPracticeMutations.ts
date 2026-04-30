import { useMutation } from "@tanstack/react-query";
import { checkGrammarAnswer, generateGrammarTask } from "@/lib/grammar-api";
import { normalizePrompt } from "@/lib/grammar-utils";
import type { GrammarTask, HistoryItem, TaskTypeSelection } from "@/types/grammar";

type UseGrammarPracticeMutationsParams = {
  level: GrammarTask["difficulty"];
  taskType: TaskTypeSelection;
  history: HistoryItem[];
  seenPromptKeys: React.MutableRefObject<Set<string>>;
};

type GenerateUniqueTaskResult = {
  task: GrammarTask;
  source: "openai" | "fallback";
};

export function useGrammarPracticeMutations({
  level,
  taskType,
  history,
  seenPromptKeys,
}: UseGrammarPracticeMutationsParams) {
  const generateMutation = useMutation({
    mutationFn: async (): Promise<GenerateUniqueTaskResult> => {
      let generatedTask: GrammarTask | null = null;
      let generatedSource: "openai" | "fallback" | null = null;

      for (let attempt = 0; attempt < 6; attempt++) {
        const data = await generateGrammarTask({
          level,
          taskType,
          history: history.slice(-10),
          seenPrompts: Array.from(seenPromptKeys.current),
        });

        const promptKey = normalizePrompt(data.task.prompt);
        generatedTask = data.task;
        generatedSource = data.source;

        if (!seenPromptKeys.current.has(promptKey)) {
          seenPromptKeys.current.add(promptKey);
          break;
        }

        generatedTask = null;
      }

      if (!generatedTask || !generatedSource) {
        throw new Error("Could not generate a new non-duplicate question.");
      }

      return { task: generatedTask, source: generatedSource };
    },
  });

  const checkMutation = useMutation({
    mutationFn: checkGrammarAnswer,
  });

  return {
    generateMutation,
    checkMutation,
    isGenerating: generateMutation.isPending,
    isChecking: checkMutation.isPending,
  };
}
