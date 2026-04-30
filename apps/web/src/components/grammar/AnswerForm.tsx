"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Keyboard, Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MotionButton } from "@/components/ui/motion-button";

const schema = z.object({
  answer: z.string().trim().min(1, "Type the missing or corrected part."),
});
export type AnswerFormValues = z.infer<typeof schema>;

export interface AnswerFormHandle {
  focus: () => void;
  reset: () => void;
}

export const AnswerForm = forwardRef<
  AnswerFormHandle,
  {
    hasFeedback: boolean;
    isChecking: boolean;
    isGenerating: boolean;
    onCheck: (answer: string) => Promise<void> | void;
    onNext: () => void;
  }
>(function AnswerForm(
  { hasFeedback, isChecking, isGenerating, onCheck, onNext },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const form = useForm<AnswerFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { answer: "" },
    mode: "onSubmit",
  });

  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputRef.current?.focus(),
      reset: () => form.reset({ answer: "" }),
    }),
    [form],
  );

  useEffect(() => {
    if (!hasFeedback) form.reset({ answer: "" });
  }, [hasFeedback, form]);

  const onSubmit = form.handleSubmit(async ({ answer }) => {
    if (hasFeedback) return onNext();
    await onCheck(answer);
  });

  const buttonState = hasFeedback
    ? "next"
    : isChecking || isGenerating
      ? "loading"
      : "check";

  const { ref: register, ...rest } = form.register("answer");
  const answer = useWatch({ control: form.control, name: "answer" });

  return (
    <form
      onSubmit={onSubmit}
      className="bg-surface px-6 py-4 lg:px-8"
    >
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <Input
          {...rest}
          ref={(node) => {
            register(node);
            inputRef.current = node;
          }}
          disabled={isChecking || isGenerating}
          placeholder="Type only the missing or corrected part..."
          className="h-13 text-base font-bold transition-all duration-200 focus-visible:border-accent focus-visible:ring-accent/40"
        />
        <MotionButton
          type="submit"
          variant="ink"
          size="tall"
          disabled={
            isChecking ||
            isGenerating ||
            (!hasFeedback && !answer?.trim())
          }
          className="min-w-30 overflow-hidden"
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={buttonState}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14 }}
              className="flex items-center gap-2"
            >
              {buttonState === "loading" ? (
                <Loader2 className="animate-spin" size={18} />
              ) : buttonState === "next" ? (
                <>
                  Next <ArrowRight size={17} />
                </>
              ) : (
                <>
                  Check <Send size={17} />
                </>
              )}
            </motion.span>
          </AnimatePresence>
        </MotionButton>
      </div>
      {form.formState.errors.answer ? (
        <p className="mt-2 text-xs font-bold text-accent-press">
          {form.formState.errors.answer.message}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-muted-2">
        <Keyboard size={12} />
        <span>Type only the word or phrase that changes.</span>
      </div>
    </form>
  );
});
