"use client";

import type { GrammarCourseLesson, GrammarTask } from "@/types/grammar";
import { grammarCourseByLevel } from "@/data/grammar-course";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { levelLabels } from "@/lib/grammar/constants";

export function CourseBrowser({
  selectedLevel,
  onSelectLesson,
}: {
  selectedLevel: GrammarTask["difficulty"];
  onSelectLesson: (lesson: GrammarCourseLesson) => void;
}) {
  const lessons = grammarCourseByLevel[selectedLevel];

  return (
    <div className="rounded-xl border border-[#deded7] bg-white shadow-[0_1px_2px_rgba(20,20,18,.04),0_2px_8px_rgba(20,20,18,.04)]">
      <div className="flex flex-col gap-1 p-5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-extrabold">Band lessons</h3>
          <Badge variant="accent">IELTS {levelLabels[selectedLevel]}</Badge>
        </div>
        <p className="text-xs leading-5 text-[#77776f]">
          Showing lessons for the selected IELTS band.
        </p>
      </div>
      <div className="max-h-[360px] space-y-1.5 overflow-auto p-5 pt-0">
        {lessons.map((lesson) => (
          <Button
            key={lesson.id}
            type="button"
            variant="ghost"
            className="h-auto w-full justify-start whitespace-normal rounded-lg px-2 py-2 text-left text-xs font-bold leading-5 text-[#30302c] hover:bg-[#f7f7f2]"
            onClick={() => onSelectLesson(lesson)}
          >
            {lesson.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
