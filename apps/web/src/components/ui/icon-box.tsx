import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const iconBoxVariants = cva(
  "flex items-center justify-center rounded-lg",
  {
    variants: {
      tone: {
        ink: "bg-ink text-white",
        accent: "bg-accent-150 text-accent ring-2 ring-accent/20",
        success: "bg-success-100 text-success ring-2 ring-success/20",
        muted: "bg-surface-mute text-muted",
      },
      size: {
        sm: "h-8 w-8",
        md: "h-9 w-9",
        lg: "h-11 w-11",
      },
    },
    defaultVariants: { tone: "ink", size: "md" },
  }
);

export interface IconBoxProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconBoxVariants> {}

export function IconBox({ className, tone, size, ...props }: IconBoxProps) {
  return <div className={cn(iconBoxVariants({ tone, size }), className)} {...props} />;
}
