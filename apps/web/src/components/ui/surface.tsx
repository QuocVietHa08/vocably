import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const surfaceVariants = cva("", {
  variants: {
    tone: {
      page: "bg-surface",
      raised: "bg-surface shadow-sm",
      mute: "bg-surface-mute",
      hero: "bg-surface shadow-md",
    },
    pad: {
      none: "",
      sm: "p-4",
      md: "p-5",
      lg: "p-6",
    },
    radius: {
      sm: "rounded-md",
      md: "rounded-lg",
      lg: "rounded-xl",
      xl: "rounded-2xl",
    },
    border: {
      none: "",
      hairline: "border border-rule-soft",
      strong: "border border-rule",
    },
  },
  defaultVariants: {
    tone: "page",
    pad: "md",
    radius: "lg",
    border: "none",
  },
});

type SurfaceProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof surfaceVariants> & {
    as?: "div" | "section" | "article" | "aside";
  };

export function Surface({
  as = "div",
  tone,
  pad,
  radius,
  border,
  className,
  ...props
}: SurfaceProps) {
  const Comp = as as React.ElementType;
  return (
    <Comp
      className={cn(surfaceVariants({ tone, pad, radius, border }), className)}
      {...props}
    />
  );
}
