"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Lightbulb, MessageSquare } from "lucide-react";
import Link from "next/link";
import type { Feedback } from "@/types/grammar";
import { Panel, PanelTitle } from "@/components/grammar/Panel";
import { ScoreCounter } from "@/components/grammar/ScoreCounter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { IconBox } from "@/components/ui/icon-box";
import { Kbd } from "@/components/ui/kbd";
import { staggerItemVariants, staggerListVariants } from "@/lib/motion";

export function FeedbackPanel({
  feedback,
  lessonHref,
}: {
  feedback: Feedback | null;
  lessonHref?: string;
}) {
  return (
    <Panel>
      <PanelTitle eyebrow="Review" title="Feedback" />
      <AnimatePresence mode="wait">
        {feedback ? (
          <motion.div
            key="feedback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="mt-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <ScoreCounter score={feedback.score} />
                <p className="mt-1 text-xs font-semibold text-muted">
                  {feedback.isCorrect ? "Correct answer" : "Needs revision"}
                </p>
              </div>
              <IconBox
                tone={feedback.isCorrect ? "success" : "accent"}
                size="lg"
              >
                {feedback.isCorrect ? (
                  <CheckCircle2 size={22} />
                ) : (
                  <AlertCircle size={22} />
                )}
              </IconBox>
            </div>

            <Progress
              value={feedback.score}
              className="mt-5 bg-rule-soft"
              indicatorClassName={`transition-all duration-500 ${feedback.isCorrect ? "bg-success" : "bg-accent"}`}
            />

            <p className="mt-5 text-sm font-medium leading-6 text-ink-3">
              {feedback.summary}
            </p>

            {feedback.corrections.length > 0 ? (
              <motion.ul
                variants={staggerListVariants}
                initial="hidden"
                animate="show"
                className="mt-4 space-y-2"
              >
                {feedback.corrections.map((correction) => (
                  <motion.li
                    key={correction}
                    variants={staggerItemVariants}
                    className="rounded-lg bg-surface-mute p-3 text-sm font-medium leading-6 text-ink-4"
                  >
                    {correction}
                  </motion.li>
                ))}
              </motion.ul>
            ) : null}

            <div className="mt-4 rounded-lg bg-success-50 p-4">
              <p
                className="font-bold uppercase text-success"
                style={{
                  fontSize: "var(--eyebrow-size)",
                  letterSpacing: "var(--eyebrow-track)",
                }}
              >
                Correct part
              </p>
              <p className="mt-1.5 text-base font-bold leading-6 text-success-ink">
                {feedback.rewrite}
              </p>
            </div>

            {lessonHref ? (
              <Button
                asChild
                variant="outline"
                className="mt-4 w-full justify-center"
              >
                <Link href={lessonHref}>
                  <Lightbulb size={16} />
                  Review lesson
                </Link>
              </Button>
            ) : null}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="mt-5 flex items-start gap-3 border-t border-rule-soft pt-4"
          >
            <IconBox tone="muted" size="sm">
              <MessageSquare size={14} />
            </IconBox>
            <p className="text-sm leading-6 text-muted">
              Type your answer to see feedback. Press{" "}
              <Kbd className="border-0 bg-surface-mute px-1.5 py-0.5 text-[10px] text-ink-4">
                Enter
              </Kbd>{" "}
              to check.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}
