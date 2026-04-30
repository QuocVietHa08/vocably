import * as React from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  text,
  className,
}: {
  icon?: React.ReactNode;
  text: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-lg bg-surface-mute px-4 py-6 text-center",
        className
      )}
    >
      {icon ? <div className="text-muted-3">{icon}</div> : null}
      <p className="text-sm font-medium leading-6 text-muted">{text}</p>
    </div>
  );
}
