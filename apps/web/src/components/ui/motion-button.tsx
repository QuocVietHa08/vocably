"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type ButtonVariantProps = VariantProps<typeof buttonVariants>;

export interface MotionButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref">,
    ButtonVariantProps {
  className?: string;
}

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ className, variant, size, whileTap = { scale: 0.97 }, whileHover, ...props }, ref) => (
    <motion.button
      ref={ref}
      whileTap={whileTap}
      whileHover={whileHover}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
);
MotionButton.displayName = "MotionButton";
