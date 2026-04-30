"use client";

import { AnimatePresence, motion } from "framer-motion";

export function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="flex items-center gap-2 text-[11px] font-medium text-muted">
        <span className="text-accent">{icon}</span>
        {label}
      </span>
      <AnimatePresence mode="wait">
        <motion.span
          key={String(value)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          className="text-sm font-semibold tabular-nums text-ink"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
