import * as React from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p
            className="font-bold uppercase text-muted-2"
            style={{
              fontSize: "var(--eyebrow-size)",
              letterSpacing: "var(--eyebrow-track)",
            }}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2 className="mt-1 truncate text-base font-bold tracking-normal text-ink">
          {title}
        </h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
