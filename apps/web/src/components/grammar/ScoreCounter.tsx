"use client";

import { useEffect } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

export function ScoreCounter({ score }: { score: number }) {
  const count = useMotionValue(0);
  const display = useTransform(count, (v) => `${Math.round(v)}%`);

  useEffect(() => {
    const ctrl = animate(count, score, { duration: 0.5, ease: "easeOut" });
    return ctrl.stop;
  }, [score, count]);

  return (
    <motion.p className="text-4xl font-semibold tabular-nums leading-none tracking-tight text-ink">
      {display}
    </motion.p>
  );
}
