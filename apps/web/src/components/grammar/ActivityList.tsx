"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { HistoryItem } from "@/types/grammar";
import { EmptyState } from "@/components/ui/empty-state";

export function ActivityList({ history }: { history: HistoryItem[] }) {
  if (history.length === 0) {
    return (
      <EmptyState
        className="mt-4"
        icon={<Sparkles size={14} />}
        text="Completed questions will appear here."
      />
    );
  }

  return (
    <ul className="mt-4 space-y-1.5">
      {history
        .slice(-4)
        .reverse()
        .map((item) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.16 }}
            className="rounded-lg bg-surface-2 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-ink-3">
                {item.answer}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  item.isCorrect
                    ? "bg-success-100 text-success"
                    : "bg-accent-150 text-accent"
                }`}
              >
                {item.score}%
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
              {item.prompt}
            </p>
          </motion.li>
        ))}
    </ul>
  );
}
