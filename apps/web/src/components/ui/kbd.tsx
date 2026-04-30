import * as React from "react";
import { cn } from "@/lib/utils";

export function Kbd({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "rounded border border-rule bg-surface-3 px-1.5 py-0.5 text-[11px] font-extrabold text-ink-4",
        className
      )}
      {...props}
    />
  );
}
