import * as React from "react";
import { cn } from "@/lib/utils";

const gapMap = {
  0: "gap-0",
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  5: "gap-5",
  6: "gap-6",
  8: "gap-8",
} as const;

type Gap = keyof typeof gapMap;

export function Stack({
  as = "div",
  gap = 4,
  align,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  as?: "div" | "section" | "ul" | "ol" | "nav";
  gap?: Gap;
  align?: "start" | "center" | "end" | "stretch";
}) {
  const Comp = as as React.ElementType;
  return (
    <Comp
      className={cn(
        "flex flex-col",
        gapMap[gap],
        align === "start" && "items-start",
        align === "center" && "items-center",
        align === "end" && "items-end",
        align === "stretch" && "items-stretch",
        className,
      )}
      {...props}
    />
  );
}
