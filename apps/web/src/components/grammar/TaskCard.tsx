"use client";

import { AnimatePresence, motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import type { GrammarTask } from "@/types/grammar";
import { InfoBox } from "@/components/grammar/InfoBox";

export function TaskCard({
  task,
  round,
}: {
  task: GrammarTask;
  round: number;
}) {
  return (
    <div className="px-6 py-6 lg:px-8 lg:py-8">
      <AnimatePresence mode="wait">
        <motion.article
          key={task.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="mx-auto w-full max-w-3xl"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-2.5 py-1 text-xs font-bold text-accent-press">
              <RefreshCw size={12} />
              Round {round}
            </span>
            <p className="text-xs font-medium text-muted-2">
              Answer only the changed part
            </p>
          </div>

          <h3 className="mt-5 text-balance text-xl font-semibold leading-snug tracking-tight text-ink lg:text-2xl">
            {task.instruction}
          </h3>

          <motion.div
            key={`prompt-${task.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16, delay: 0.04 }}
            className="mt-5 rounded-xl bg-surface-2 p-4"
          >
            <p className="text-base font-medium leading-7 text-ink-2">
              {task.prompt}
            </p>
          </motion.div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {task.context ? (
              <InfoBox label="Context" text={task.context} tone="accent" />
            ) : null}
            <InfoBox label="Hint" text={task.hint} />
          </div>
        </motion.article>
      </AnimatePresence>
    </div>
  );
}
