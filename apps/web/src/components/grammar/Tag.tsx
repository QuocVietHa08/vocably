import * as React from "react";
import { Badge } from "@/components/ui/badge";

export function Tag({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <Badge
      variant={tone === "warning" ? "warning" : "muted"}
      className="h-7 rounded-full px-2.5 text-[11px] font-semibold transition-colors duration-150"
    >
      {children}
    </Badge>
  );
}
