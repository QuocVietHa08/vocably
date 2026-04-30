export function StatusPill({ label }: { label: string }) {
  const isActive = label === "Generating" || label === "Checking";

  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full bg-surface-mute px-3 text-xs font-semibold text-ink-4">
      <span
        className={`h-1.5 w-1.5 rounded-full bg-accent ${isActive ? "animate-pulse" : ""}`}
      />
      {label}
    </span>
  );
}
