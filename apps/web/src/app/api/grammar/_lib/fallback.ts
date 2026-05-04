import type { Feedback, GrammarTask } from "@/types/grammar";
import { normalizePrompt } from "@/lib/grammar-utils";
import { grammarCourseById } from "@/data/grammar-course";
import { sampleTasks } from "./sample-tasks";
import { FALLBACK_FEEDBACK } from "./constants";

export function pickFallbackTask(args: {
  level?: string;
  taskType?: string;
  usedPromptKeys: Set<string>;
}): GrammarTask {
  const { level, taskType, usedPromptKeys } = args;
  const matchingType = sampleTasks.filter((task) => !taskType || task.type === taskType);
  const matchingTypeAndLevel = matchingType.filter((task) => !level || task.difficulty === level);
  const preferredPool = matchingTypeAndLevel.length > 0 ? matchingTypeAndLevel : matchingType;
  const pool = preferredPool.length > 0 ? preferredPool : sampleTasks;
  const unused = pool.filter((task) => !usedPromptKeys.has(normalizePrompt(task.prompt)));
  const candidates =
    unused.length > 0
      ? unused
      : sampleTasks.filter((task) => !usedPromptKeys.has(normalizePrompt(task.prompt)));
  const finalPool = candidates.length > 0 ? candidates : pool;

  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

export function fallbackCheck(task: GrammarTask, answer: string): Feedback {
  const expected = normalizePrompt(task.targetAnswer ?? "");
  const actual = normalizePrompt(answer);
  const isCorrect = expected.length > 0 && isCloseEnough(expected, actual);

  return {
    isCorrect,
    score: isCorrect ? FALLBACK_FEEDBACK.scoreCorrect : FALLBACK_FEEDBACK.scoreIncorrect,
    summary: isCorrect ? FALLBACK_FEEDBACK.summaryCorrect : FALLBACK_FEEDBACK.summaryIncorrect,
    corrections: isCorrect
      ? [FALLBACK_FEEDBACK.correctionCorrect]
      : [
          `${FALLBACK_FEEDBACK.correctionIncorrectPrefix}${
            task.targetAnswer ?? FALLBACK_FEEDBACK.correctionMissingTarget
          }`,
        ],
    rewrite: task.targetAnswer ?? answer,
    nextTip: task.hint,
    relatedLessonId: isCorrect ? undefined : task.lessonId,
    relatedLessonTitle: !isCorrect && task.lessonId ? grammarCourseById[task.lessonId]?.title : undefined,
  };
}

function isCloseEnough(expected: string, actual: string): boolean {
  if (actual === expected) return true;
  const lenDiff = Math.abs(actual.length - expected.length);
  if (lenDiff > FALLBACK_FEEDBACK.maxLengthDiff) return false;
  return levenshtein(actual, expected) <= FALLBACK_FEEDBACK.maxEditDistance;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}
