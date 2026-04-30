"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Feedback,
  GrammarTask,
  HistoryItem,
  TaskTypeSelection,
} from "@/types/grammar";
import { useGrammarPracticeMutations } from "@/hooks/useGrammarPracticeMutations";
import { useShortcut } from "@/hooks/useShortcut";
import { useStatus } from "@/hooks/useStatus";
import { fallbackTask } from "@/lib/grammar/constants";
import { AppShell } from "@/components/layout/AppShell";
import { StickyAside } from "@/components/layout/StickyAside";
import { Show } from "@/components/layout/Show";
import { ActivityList } from "@/components/grammar/ActivityList";
import {
  AnswerForm,
  type AnswerFormHandle,
} from "@/components/grammar/AnswerForm";
import { AppHeader } from "@/components/grammar/AppHeader";
import { FeedbackPanel } from "@/components/grammar/FeedbackPanel";
import { Panel, PanelTitle } from "@/components/grammar/Panel";
import { PracticeControls } from "@/components/grammar/PracticeControls";
import { SessionGoal } from "@/components/grammar/SessionGoal";
import { TaskCard } from "@/components/grammar/TaskCard";
import { WorkspaceCard } from "@/components/grammar/WorkspaceCard";

export default function Home() {
  const [task, setTask] = useState<GrammarTask>(fallbackTask);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [round, setRound] = useState(1);
  const [selectedLevel, setSelectedLevel] =
    useState<GrammarTask["difficulty"]>("B1");
  const [selectedType, setSelectedType] =
    useState<TaskTypeSelection>("random");
  const [apiNote, setApiNote] = useState<string | null>(null);

  const formRef = useRef<AnswerFormHandle>(null);
  const seenPromptKeysRef = useRef<Set<string>>(new Set());

  const { generateMutation, checkMutation, isGenerating, isChecking } =
    useGrammarPracticeMutations({
      level: selectedLevel,
      taskType: selectedType,
      history,
      seenPromptKeys: seenPromptKeysRef,
    });

  const averageScore = useMemo(() => {
    if (history.length === 0) return 0;
    return Math.round(
      history.reduce((sum, item) => sum + item.score, 0) / history.length,
    );
  }, [history]);

  const streak = useMemo(() => {
    let count = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (!history[i].isCorrect) break;
      count += 1;
    }
    return count;
  }, [history]);

  const status = useStatus({
    isGenerating,
    isChecking,
    hasFeedback: !!feedback,
  });

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
      requestAnimationFrame(() => formRef.current?.focus());
    }
  }, [generateMutation]);

  useEffect(() => {
    generateTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAnswer = useCallback(
    async (answer: string) => {
      setApiNote(null);
      try {
        const data = await checkMutation.mutateAsync({ task, answer });
        const checkedFeedback = data.feedback as Feedback;
        setFeedback(checkedFeedback);
        setHistory((items) => [
          ...items,
          {
            id: `${task.id}-${Date.now()}`,
            prompt: task.prompt,
            answer,
            score: checkedFeedback.score,
            isCorrect: checkedFeedback.isCorrect,
          },
        ]);
        setApiNote(data.source === "fallback" ? "Local checking mode" : null);
      } catch (error) {
        setFeedback({
          isCorrect: false,
          score: 0,
          summary: "I could not check this answer right now.",
          corrections: [
            error instanceof Error
              ? error.message
              : "The checker is unavailable.",
          ],
          rewrite: task.targetAnswer ?? answer,
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
    formRef.current?.reset();
    await generateTask();
  }, [generateTask, isChecking, isGenerating]);

  useShortcut(
    {
      "mod+Enter": () => void nextQuestion(),
      n: () => void nextQuestion(),
    },
    { allowInInput: ["mod+Enter"] },
  );

  return (
    <AppShell
      header={
        <AppHeader
          status={status}
          streak={streak}
          isGenerating={isGenerating}
          isChecking={isChecking}
          onNewQuestion={() => void nextQuestion()}
        />
      }
      left={
        <StickyAside>
          <PracticeControls
            level={selectedLevel}
            type={selectedType}
            onLevelChange={setSelectedLevel}
            onTypeChange={setSelectedType}
          />
          <SessionGoal
            answered={history.length}
            streak={streak}
            averageScore={averageScore}
          />
          <Show above="xl">
            <Panel>
              <PanelTitle eyebrow="History" title="Recent answers" />
              <ActivityList history={history} />
            </Panel>
          </Show>
        </StickyAside>
      }
      center={
        <section className="min-w-0">
          <WorkspaceCard
            task={task}
            apiNote={apiNote}
            body={<TaskCard task={task} round={round} />}
            footer={
              <AnswerForm
                ref={formRef}
                hasFeedback={!!feedback}
                isChecking={isChecking}
                isGenerating={isGenerating}
                onCheck={checkAnswer}
                onNext={() => void nextQuestion()}
              />
            }
          />
        </section>
      }
      right={
        <StickyAside>
          <FeedbackPanel feedback={feedback} />
          <Panel>
            <PanelTitle eyebrow="Coach note" title="Next tip" />
            <p className="mt-3 text-sm font-medium leading-6 text-ink-3">
              {feedback?.nextTip ?? task.hint}
            </p>
          </Panel>
          <Show below="xl">
            <Panel>
              <PanelTitle eyebrow="History" title="Recent answers" />
              <ActivityList history={history} />
            </Panel>
          </Show>
        </StickyAside>
      }
    />
  );
}
