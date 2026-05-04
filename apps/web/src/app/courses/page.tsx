"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { GrammarCourseLesson, GrammarTask } from "@/types/grammar";
import { grammarCourseById, grammarCourseByLevel } from "@/data/grammar-course";
import { levelLabels, levelOptions } from "@/lib/grammar/constants";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const panel = "rounded-xl border border-rule bg-surface shadow-sm";

function isPracticeLevel(value: string): value is GrammarTask["difficulty"] {
  return levelOptions.includes(value as GrammarTask["difficulty"]);
}

export default function CoursesPage() {
  return (
    <Suspense fallback={<CoursesFallback />}>
      <CoursesContent />
    </Suspense>
  );
}

function CoursesContent() {
  const searchParams = useSearchParams();
  const queryLessonId = searchParams.get("lesson");
  const queryLesson = queryLessonId ? grammarCourseById[queryLessonId] : undefined;
  const initialLevel =
    queryLesson && isPracticeLevel(queryLesson.level) ? queryLesson.level : "B1";

  const [selectedLevel, setSelectedLevel] =
    useState<GrammarTask["difficulty"]>(initialLevel);
  const lessons = useMemo(
    () => grammarCourseByLevel[selectedLevel],
    [selectedLevel],
  );
  const [selectedLesson, setSelectedLesson] = useState<GrammarCourseLesson>(
    queryLesson && isPracticeLevel(queryLesson.level) ? queryLesson : lessons[0],
  );

  useEffect(() => {
    if (queryLesson && isPracticeLevel(queryLesson.level)) {
      setSelectedLevel(queryLesson.level);
      setSelectedLesson(queryLesson);
    }
  }, [queryLesson]);

  useEffect(() => {
    if (selectedLesson.level !== selectedLevel) {
      setSelectedLesson(grammarCourseByLevel[selectedLevel][0]);
    }
  }, [selectedLesson.level, selectedLevel]);

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-rule-soft bg-surface-2/85 backdrop-blur">
        <Container className="flex h-(--header-h) items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-ink text-white">
              <BookOpen size={18} />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-ink">
                Grammar Courses
              </h1>
              <p className="hidden text-xs font-medium text-muted md:block">
                IELTS band lessons and mistake review
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/">
                <ArrowLeft size={14} />
                Practice
              </Link>
            </Button>
          </div>
        </Container>
      </header>

      <Container className="py-8">
        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className={`${panel} p-7`}>
            <Badge variant="accent">IELTS course path</Badge>
            <h2 className="mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-ink md:text-4xl">
              Study the grammar behind each band before you practise.
            </h2>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-muted">
              Pick a band, read the lesson, check examples, then use mini practice
              to make the rule feel obvious before returning to live questions.
            </p>
          </div>
          <div className={`${panel} grid grid-cols-2 gap-3 p-5`}>
            <CourseStat label="Bands" value="4" />
            <CourseStat label="Lessons" value="32" />
            <CourseStat label="Current" value={`IELTS ${levelLabels[selectedLevel]}`} />
            <CourseStat label="Mode" value="Short answers" />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <div className={`${panel} p-5`}>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-2">
                IELTS band
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {levelOptions.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedLevel(level)}
                    className={`rounded-lg border px-4 py-3 text-left transition ${
                      level === selectedLevel
                        ? "border-accent bg-accent-50 text-accent-press shadow-sm"
                        : "border-rule bg-surface-2 text-ink hover:bg-surface-mute"
                    }`}
                  >
                    <span className="block text-xs font-bold text-muted">
                      Band
                    </span>
                    <span className="mt-1 block text-lg font-extrabold">
                      {levelLabels[level]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className={`${panel} overflow-hidden`}>
              <div className="border-b border-rule-soft p-5">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-2">
                  Lessons
                </p>
                <h3 className="mt-1 text-base font-extrabold text-ink">
                  IELTS {levelLabels[selectedLevel]}
                </h3>
              </div>
              <div className="max-h-[560px] overflow-auto p-2">
                {lessons.map((lesson, index) => (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => setSelectedLesson(lesson)}
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition ${
                      lesson.id === selectedLesson.id
                        ? "bg-accent-50 text-accent-press"
                        : "text-ink hover:bg-surface-mute"
                    }`}
                  >
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-rule bg-surface text-xs font-extrabold">
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-extrabold leading-5">
                        {lesson.title}
                      </span>
                      <span className="mt-1 line-clamp-2 block text-xs font-medium leading-5 text-muted">
                        {lesson.summary}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <LessonArticle lesson={selectedLesson} />
        </section>
      </Container>
    </main>
  );
}

function CoursesFallback() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <Container className="py-8">
        <div className={`${panel} h-[520px] animate-pulse bg-surface`} />
      </Container>
    </main>
  );
}

function CourseStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-mute p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-2">
        {label}
      </p>
      <p className="mt-2 text-xl font-extrabold text-ink">{value}</p>
    </div>
  );
}

function LessonArticle({ lesson }: { lesson: GrammarCourseLesson }) {
  return (
    <article className={`${panel} min-w-0 overflow-hidden`}>
      <div className="border-b border-rule-soft p-7">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">IELTS lesson</Badge>
          {lesson.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="muted">
              {tag}
            </Badge>
          ))}
        </div>
        <h2 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-ink">
          {lesson.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-muted">
          {lesson.summary}
        </p>
      </div>

      <div className="grid gap-6 p-7 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-7">
          <LessonSection icon={<GraduationCap size={17} />} title="Learn">
            <p className="text-base font-medium leading-8 text-ink-3">
              {lesson.explanation}
            </p>
          </LessonSection>

          <LessonSection icon={<Sparkles size={17} />} title="Examples">
            <div className="grid gap-3 md:grid-cols-2">
              {lesson.examples.map((example) => (
                <div
                  key={example.sentence}
                  className="rounded-lg border border-rule bg-surface-2 p-4"
                >
                  <p className="text-base font-extrabold leading-7 text-ink">
                    {example.sentence}
                  </p>
                  <p className="mt-2 text-sm font-medium leading-6 text-muted">
                    {example.note}
                  </p>
                </div>
              ))}
            </div>
          </LessonSection>

          <LessonSection icon={<CheckCircle2 size={17} />} title="Mini practice">
            <div className="space-y-3">
              {lesson.practicePrompts.map((practice) => (
                <div
                  key={practice.prompt}
                  className="rounded-lg border border-rule bg-surface p-4"
                >
                  <p className="text-sm font-semibold leading-6 text-ink-3">
                    {practice.prompt}
                  </p>
                  <p className="mt-2 text-sm font-extrabold text-accent-press">
                    Answer: {practice.answer}
                  </p>
                </div>
              ))}
            </div>
          </LessonSection>
        </div>

        <aside className="rounded-xl bg-surface-mute p-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted-2">
            Common mistakes
          </p>
          <ul className="mt-4 space-y-3">
            {lesson.commonMistakes.map((mistake) => (
              <li
                key={mistake}
                className="flex gap-3 text-sm font-medium leading-6 text-ink-3"
              >
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                <span>{mistake}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="accent" className="mt-6 w-full">
            <Link href="/">Practise this band</Link>
          </Button>
        </aside>
      </div>
    </article>
  );
}

function LessonSection({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-accent-50 text-accent-press">
          {icon}
        </span>
        <h3 className="text-base font-extrabold text-ink">{title}</h3>
      </div>
      {children}
    </section>
  );
}
