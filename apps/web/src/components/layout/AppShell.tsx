import * as React from "react";
import { cn } from "@/lib/utils";
import { Container } from "./Container";

export function AppShell({
  header,
  left,
  center,
  right,
  className,
}: {
  header: React.ReactNode;
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "min-h-dvh overflow-x-hidden bg-background text-foreground",
        className,
      )}
    >
      {header}
      <Container className="grid items-start gap-(--gutter) pb-16 pt-8 xl:grid-cols-[var(--aside-left-w)_minmax(0,1fr)_var(--aside-right-w)] 2xl:grid-cols-[320px_minmax(0,1fr)_400px]">
        {left}
        {center}
        {right}
      </Container>
    </main>
  );
}
