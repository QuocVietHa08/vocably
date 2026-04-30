"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MotionButton } from "@/components/ui/motion-button";

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      {options.map((opt) => (
        <MotionButton
          key={opt.value}
          type="button"
          variant={value === opt.value ? "toggleActive" : "toggle"}
          size="pill"
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </MotionButton>
      ))}
    </div>
  );
}
