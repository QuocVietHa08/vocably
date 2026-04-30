import * as React from "react";
import { cn } from "@/lib/utils";

export function StickyAside({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <aside
      className={cn(
        "flex flex-col gap-4 xl:sticky xl:top-[var(--aside-top)] xl:self-start",
        className
      )}
    >
      {children}
    </aside>
  );
}
