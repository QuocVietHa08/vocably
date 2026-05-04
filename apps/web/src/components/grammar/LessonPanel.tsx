"use client";

import { X } from "lucide-react";
import type { GrammarCourseLesson } from "@/types/grammar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function LessonPanel({
  lesson,
  onClose,
}: {
  lesson: GrammarCourseLesson | null;
  onClose: () => void;
}) {
  if (!lesson) return null;

  return (
    <div className="rounded-xl border border-[#deded7] bg-white shadow-[0_1px_2px_rgba(20,20,18,.04),0_2px_8px_rgba(20,20,18,.04)]">
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="accent">{lesson.level}</Badge>
            {lesson.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="muted">
                {tag}
              </Badge>
            ))}
          </div>
          <h3 className="text-base font-extrabold leading-tight">{lesson.title}</h3>
          <p className="mt-1 text-xs leading-5 text-[#77776f]">{lesson.summary}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close lesson">
          <X className="size-4" />
        </Button>
      </div>
      <Separator />
      <div className="space-y-5 p-5">
        <section>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#77776f]">Learn</h4>
          <p className="mt-2 text-sm leading-6 text-[#30302c]">{lesson.explanation}</p>
        </section>

        <section>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#77776f]">Examples</h4>
          <div className="mt-2 space-y-2">
            {lesson.examples.map((example) => (
              <div key={example.sentence} className="rounded-lg bg-[#fbfbf8] p-3">
                <p className="text-sm font-bold text-[#171714]">{example.sentence}</p>
                <p className="mt-1 text-xs leading-5 text-[#77776f]">{example.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#77776f]">Common mistakes</h4>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6 text-[#30302c]">
            {lesson.commonMistakes.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#77776f]">Mini practice</h4>
          <div className="mt-2 space-y-2">
            {lesson.practicePrompts.map((practice) => (
              <div key={practice.prompt} className="rounded-lg border border-[#deded7] p-3">
                <p className="text-sm font-semibold leading-6 text-[#30302c]">{practice.prompt}</p>
                <p className="mt-1 text-xs font-bold text-[#f4511e]">Answer: {practice.answer}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
