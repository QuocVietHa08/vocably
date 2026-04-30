import * as React from "react";
import { Label } from "@/components/ui/label";

export function ControlGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label
        className="mb-2 block font-medium uppercase text-muted-2"
        style={{
          fontSize: "var(--eyebrow-size)",
          letterSpacing: "var(--eyebrow-track)",
        }}
      >
        {label}
      </Label>
      {children}
    </div>
  );
}
