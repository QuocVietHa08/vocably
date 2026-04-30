import * as React from "react";
import { cn } from "@/lib/utils";

type Breakpoint = "sm" | "md" | "lg" | "xl" | "2xl";

const aboveMap: Record<Breakpoint, string> = {
  sm: "hidden sm:block",
  md: "hidden md:block",
  lg: "hidden lg:block",
  xl: "hidden xl:block",
  "2xl": "hidden 2xl:block",
};

const belowMap: Record<Breakpoint, string> = {
  sm: "block sm:hidden",
  md: "block md:hidden",
  lg: "block lg:hidden",
  xl: "block xl:hidden",
  "2xl": "block 2xl:hidden",
};

export function Show({
  above,
  below,
  className,
  children,
}: {
  above?: Breakpoint;
  below?: Breakpoint;
  className?: string;
  children: React.ReactNode;
}) {
  const cls = above ? aboveMap[above] : below ? belowMap[below] : "";
  return <div className={cn(cls, className)}>{children}</div>;
}
