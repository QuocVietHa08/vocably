import { Kbd } from "@/components/ui/kbd";

export function Shortcut({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
      <span className="flex items-center gap-1">
        {keys.map((key) => (
          <Kbd
            key={key}
            className="border-0 bg-surface-mute px-1.5 py-0.5 text-[10px] text-ink-4"
          >
            {key}
          </Kbd>
        ))}
      </span>
      <span>{label}</span>
    </span>
  );
}
