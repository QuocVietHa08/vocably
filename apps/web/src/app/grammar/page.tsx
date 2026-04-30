"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Lightbulb,
  Loader2,
  RotateCcw,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import type { Feedback, GrammarTask, HistoryItem } from "@/types/grammar";
import { useGrammarPracticeMutations } from "@/hooks/useGrammarPracticeMutations";
import { useShortcut } from "@/hooks/useShortcut";
import { useStatus } from "@/hooks/useStatus";
import {
  fallbackTask,
  levelOptions,
  typeLabels,
  typeOptions,
  SESSION_GOAL,
} from "@/lib/grammar/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const card =
  "rounded-xl border border-[#deded7] bg-white shadow-[0_1px_2px_rgba(20,20,18,.04),0_2px_8px_rgba(20,20,18,.04)]";

export default function GrammarPage() {
  const [task, setTask] = useState<GrammarTask>(fallbackTask);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [round, setRound] = useState(1);
  const [level, setLevel] = useState<GrammarTask["difficulty"]>("B1");
  const [taskType, setTaskType] = useState<GrammarTask["type"]>("tense");
  const [answer, setAnswer] = useState("");
  const [apiNote, setApiNote] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const seenPromptKeysRef = useRef<Set<string>>(new Set());

  const { generateMutation, checkMutation, isGenerating, isChecking } =
    useGrammarPracticeMutations({
      level,
      taskType,
      history,
      seenPromptKeys: seenPromptKeysRef,
    });

  const status = useStatus({
    isGenerating,
    isChecking,
    hasFeedback: !!feedback,
  });

  const stats = useMemo(() => {
    if (history.length === 0) return { avg: 0, streak: 0, correct: 0 };
    const correct = history.filter((h) => h.isCorrect).length;
    const avg = Math.round(
      history.reduce((s, h) => s + h.score, 0) / history.length,
    );
    let streak = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (!history[i].isCorrect) break;
      streak += 1;
    }
    return { avg, streak, correct };
  }, [history]);

  const generateTask = useCallback(async () => {
    setApiNote(null);
    try {
      const data = await generateMutation.mutateAsync();
      setTask(data.task);
      setApiNote(data.source === "fallback" ? "Local sample mode" : null);
    } catch (error) {
      setTask(fallbackTask);
      setApiNote(
        error instanceof Error ? error.message : "Using local sample mode",
      );
    } finally {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [generateMutation]);

  useEffect(() => {
    generateTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAnswer = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setApiNote(null);
      try {
        const data = await checkMutation.mutateAsync({ task, answer: trimmed });
        const fb = data.feedback as Feedback;
        setFeedback(fb);
        setHistory((items) => [
          ...items,
          {
            id: `${task.id}-${Date.now()}`,
            prompt: task.prompt,
            answer: trimmed,
            score: fb.score,
            isCorrect: fb.isCorrect,
          },
        ]);
        setApiNote(data.source === "fallback" ? "Local checking mode" : null);
      } catch (error) {
        setFeedback({
          isCorrect: false,
          score: 0,
          summary: "Could not check this answer right now.",
          corrections: [
            error instanceof Error ? error.message : "Checker unavailable.",
          ],
          rewrite: task.targetAnswer ?? trimmed,
          nextTip: task.hint,
        });
      }
    },
    [checkMutation, task],
  );

  const nextQuestion = useCallback(async () => {
    if (isGenerating || isChecking) return;
    setRound((r) => r + 1);
    setFeedback(null);
    setAnswer("");
    await generateTask();
  }, [generateTask, isChecking, isGenerating]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (feedback) {
      void nextQuestion();
      return;
    }
    void submitAnswer(answer);
  };

  useShortcut(
    {
      "mod+Enter": () => void nextQuestion(),
      n: () => void nextQuestion(),
    },
    { allowInInput: ["mod+Enter"] },
  );

  const goalProgress = Math.min(100, (history.length / SESSION_GOAL) * 100);

  return (
    <div className="min-h-screen bg-[#f5f5f1] text-[#161616]">
      <header className="border-b border-[#deded7] bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-[#f4511e] text-white">
              <Sparkles className="size-4" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-bold leading-none">Vocally Grammar</p>
              <p className="text-xs text-[#77776f] leading-none">
                Round {round} · {status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="muted" className="hidden sm:inline-flex">
              {stats.streak} streak
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void nextQuestion()}
              disabled={isGenerating || isChecking}
            >
              {isGenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RotateCcw className="size-4" />
              )}
              New
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 py-8 lg:grid-cols-[260px_1fr_300px]">
        <aside className="flex flex-col gap-4">
          <div className={card}>
            <div className="flex flex-col gap-1 p-5 pb-3">
              <h3 className="text-sm font-extrabold">Settings</h3>
              <p className="text-xs text-[#77776f]">Pick level and task type.</p>
            </div>
            <div className="flex flex-col gap-4 p-5 pt-0">
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-[#77776f]">
                  Level
                </Label>
                <Select
                  value={level}
                  onValueChange={(v) => setLevel(v as GrammarTask["difficulty"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {levelOptions.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-[#77776f]">
                  Task type
                </Label>
                <Select
                  value={taskType}
                  onValueChange={(v) => setTaskType(v as GrammarTask["type"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {typeLabels[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className={card}>
            <div className="flex flex-col gap-1 p-5 pb-3">
              <h3 className="text-sm font-extrabold">Session goal</h3>
              <p className="text-xs text-[#77776f]">
                {history.length} / {SESSION_GOAL} answered
              </p>
            </div>
            <div className="flex flex-col gap-4 p-5 pt-0">
              <Progress
                value={goalProgress}
                className="bg-[#f2f2ed]"
                indicatorClassName="bg-[#f4511e]"
              />
              <div className="grid grid-cols-2 gap-3">
                <Stat
                  icon={<Target className="size-3.5" />}
                  label="Correct"
                  value={`${stats.correct}/${history.length || 0}`}
                />
                <Stat
                  icon={<TrendingUp className="size-3.5" />}
                  label="Avg"
                  value={`${stats.avg}%`}
                />
              </div>
            </div>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col gap-6">
          <div className={`${card} overflow-hidden`}>
            <div className="flex flex-col gap-3 p-6 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">{task.difficulty}</Badge>
                <Badge variant="muted">{typeLabels[task.type]}</Badge>
                {apiNote && (
                  <Badge variant="warning" className="ml-auto">
                    {apiNote}
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl font-extrabold leading-tight">
                {task.title}
              </h2>
              <p className="text-sm text-[#77776f]">{task.instruction}</p>
            </div>
            <div className="h-px w-full bg-[#deded7]" />
            <div className="flex flex-col gap-5 p-6">
              <p className="text-lg font-semibold leading-relaxed text-[#171714]">
                {task.prompt}
              </p>
              {task.context && (
                <div className="rounded-lg border border-[#deded7] bg-[#fbfbf8] px-4 py-3 text-sm text-[#30302c]">
                  {task.context}
                </div>
              )}

              <form onSubmit={onSubmit} className="flex flex-col gap-3">
                <Input
                  ref={inputRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer…"
                  disabled={isChecking || isGenerating || !!feedback}
                  autoFocus
                />
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-[#77776f]">
                    {feedback
                      ? "Press Enter or N for next."
                      : "Press Enter to check."}
                  </p>
                  <Button
                    type="submit"
                    variant="accent"
                    disabled={
                      isChecking ||
                      isGenerating ||
                      (!feedback && !answer.trim())
                    }
                  >
                    {isChecking ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : feedback ? (
                      <ArrowRight className="size-4" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    {feedback ? "Next" : "Check"}
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {feedback && <FeedbackBlock feedback={feedback} />}
        </section>

        <aside className="flex flex-col gap-4">
          <div className={card}>
            <div className="flex flex-col gap-1 p-5 pb-3">
              <h3 className="text-sm font-extrabold">Coach tip</h3>
            </div>
            <div className="p-5 pt-0">
              <div className="flex gap-3">
                <Lightbulb className="size-4 shrink-0 text-[#f4511e]" />
                <p className="text-sm leading-6 text-[#30302c]">
                  {feedback?.nextTip ?? task.hint}
                </p>
              </div>
            </div>
          </div>

          <div className={card}>
            <div className="flex flex-col gap-1 p-5 pb-3">
              <h3 className="text-sm font-extrabold">Recent</h3>
              <p className="text-xs text-[#77776f]">Last 5 answers</p>
            </div>
            <div className="flex flex-col gap-2 p-5 pt-0">
              {history.length === 0 ? (
                <p className="text-xs text-[#77776f]">No history yet.</p>
              ) : (
                history
                  .slice(-5)
                  .reverse()
                  .map((h) => (
                    <div
                      key={h.id}
                      className="flex items-start gap-2 rounded-md border border-[#deded7] bg-[#fbfbf8] p-2.5"
                    >
                      <span
                        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                          h.isCorrect
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {h.isCorrect ? (
                          <Check className="size-3" />
                        ) : (
                          <X className="size-3" />
                        )}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <p className="truncate text-xs text-[#77776f]">
                          {h.prompt}
                        </p>
                        <p className="truncate text-sm font-semibold">
                          {h.answer}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#30302c]">
                        {h.score}
                      </span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-[#deded7] bg-[#fbfbf8] p-3">
      <div className="flex items-center gap-1.5 text-[#77776f]">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-lg font-extrabold text-[#171714] leading-none">
        {value}
      </p>
    </div>
  );
}

function FeedbackBlock({ feedback }: { feedback: Feedback }) {
  const positive = feedback.isCorrect;
  return (
    <div
      className={`rounded-xl border shadow-[0_1px_2px_rgba(20,20,18,.04),0_2px_8px_rgba(20,20,18,.04)] ${
        positive
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-rose-200 bg-rose-50/60"
      }`}
    >
      <div className="flex flex-col gap-2 p-5 pb-3">
        <div className="flex items-center gap-2">
          <span
            className={`flex size-7 items-center justify-center rounded-full ${
              positive ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
            }`}
          >
            {positive ? (
              <Check className="size-4" />
            ) : (
              <X className="size-4" />
            )}
          </span>
          <h3 className="text-base font-extrabold">
            {positive ? "Nice work" : "Needs a tweak"}
          </h3>
          <Badge
            variant={positive ? "success" : "warning"}
            className="ml-auto"
          >
            {feedback.score}%
          </Badge>
        </div>
        <p className="text-sm text-[#30302c]">{feedback.summary}</p>
      </div>
      <div className="flex flex-col gap-3 p-5 pt-0">
        {feedback.corrections.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {feedback.corrections.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm text-[#30302c]">
                <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-[#77776f]" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        )}
        {feedback.rewrite && (
          <div className="flex flex-col gap-1 rounded-lg border border-[#deded7] bg-white px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#77776f]">
              Rewrite
            </p>
            <p className="text-sm font-semibold text-[#171714]">
              {feedback.rewrite}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
