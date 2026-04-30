"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Flame } from "lucide-react";

export function StreakBadge({ streak }: { streak: number }) {
  return (
    <AnimatePresence>
      {streak > 0 ? (
        <motion.span
          key={streak}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="hidden items-center gap-1 text-xs font-bold text-accent-press sm:flex"
        >
          <Flame size={13} className="text-accent" />
          {streak} streak
        </motion.span>
      ) : null}
    </AnimatePresence>
  );
}
