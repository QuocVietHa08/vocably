import * as React from "react";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  tone = "flat",
  className,
}: {
  children: React.ReactNode;
  tone?: "flat" | "card";
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-rule-soft bg-surface p-4",
        tone === "card" && "shadow-xs",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p
        className="font-bold uppercase text-muted-2"
        style={{
          fontSize: "var(--eyebrow-size)",
          letterSpacing: "var(--eyebrow-track)",
        }}
      >
        {eyebrow}
      </p>
      <h2 className="mt-1 text-sm font-semibold tracking-normal text-ink">
        {title}
      </h2>
    </div>
  );
}

export function PanelSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mt-4", className)}>{children}</div>;
}
