import { BookOpen, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

export function InfoBox({
  label,
  text,
  tone = "default",
}: {
  label: string;
  text: string;
  tone?: "default" | "accent";
}) {
  const Icon = tone === "accent" ? BookOpen : Lightbulb;
  const accent = tone === "accent";

  return (
    <div
      className={cn(
        "rounded-lg p-4",
        accent ? "bg-accent-tint" : "bg-surface-2",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon
          size={12}
          className={accent ? "text-accent-press" : "text-muted-2"}
        />
        <p
          className={cn(
            "font-bold uppercase",
            accent ? "text-accent-press" : "text-muted-2",
          )}
          style={{
            fontSize: "var(--eyebrow-size)",
            letterSpacing: "var(--eyebrow-track)",
          }}
        >
          {label}
        </p>
      </div>
      <p className="mt-2 text-sm font-medium leading-6 text-ink-3">{text}</p>
    </div>
  );
}
