import * as React from "react";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type KbdGroupItem = {
  keys: string[];
  label: string;
};

export function KbdGroup({
  items,
  className,
}: {
  items: KbdGroupItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-full border border-rule-soft bg-surface px-3 py-1.5 shadow-xs",
        className,
      )}
    >
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 ? (
            <Separator orientation="vertical" className="h-4 bg-rule-soft" />
          ) : null}
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
            <span className="flex items-center gap-1">
              {item.keys.map((k) => (
                <Kbd
                  key={k}
                  className="border-0 bg-surface-mute px-1.5 py-0.5 text-[10px] text-ink-4"
                >
                  {k}
                </Kbd>
              ))}
            </span>
            <span>{item.label}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}
