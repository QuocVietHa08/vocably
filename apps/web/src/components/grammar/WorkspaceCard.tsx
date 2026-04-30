import * as React from "react";
import type { GrammarTask } from "@/types/grammar";
import { Tag } from "@/components/grammar/Tag";
import { levelLabels, typeLabels } from "@/lib/grammar/constants";

export function WorkspaceCard({
  task,
  apiNote,
  body,
  footer,
}: {
  task: GrammarTask;
  apiNote: string | null;
  body: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule-soft px-6 py-3 lg:px-8">
        <div className="min-w-0">
          <p
            className="font-bold uppercase text-muted-2"
            style={{
              fontSize: "var(--eyebrow-size)",
              letterSpacing: "var(--eyebrow-track)",
            }}
          >
            Exercise
          </p>
          <h2 className="mt-0.5 truncate text-sm font-semibold tracking-tight text-ink">
            {task.title}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tag>{typeLabels[task.type]}</Tag>
          <Tag>IELTS {levelLabels[task.difficulty]}</Tag>
          {apiNote ? <Tag tone="warning">{apiNote}</Tag> : null}
        </div>
      </div>
      <div>{body}</div>
      <div className="border-t border-rule-soft">{footer}</div>
    </div>
  );
}
