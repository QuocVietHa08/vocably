"use client";

import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { IconBox } from "@/components/ui/icon-box";
import { MotionButton } from "@/components/ui/motion-button";
import { KbdGroup } from "@/components/ui/kbd-group";
import { Separator } from "@/components/ui/separator";
import { StreakBadge } from "@/components/grammar/StreakBadge";
import { StatusPill } from "@/components/grammar/StatusPill";

export function AppHeader({
  status,
  streak,
  isGenerating,
  isChecking,
  onNewQuestion,
}: {
  status: string;
  streak: number;
  isGenerating: boolean;
  isChecking: boolean;
  onNewQuestion: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-rule-soft bg-surface-2/80 backdrop-blur">
      <Container className="flex h-(--header-h) items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <IconBox tone="ink">
            <BookOpen size={18} />
          </IconBox>
          <div className="leading-tight">
            <h1 className="text-[13px] font-semibold tracking-tight text-ink">
              Vocally Grammar
            </h1>
            <p className="hidden text-[10px] font-medium text-muted md:block">
              AI practice workspace
            </p>
          </div>
        </div>

        <div className="hidden lg:block">
          <KbdGroup
            items={[
              { keys: ["Enter"], label: "Check / Next" },
              { keys: ["⌘", "Enter"], label: "Skip" },
              { keys: ["N"], label: "New question" },
            ]}
          />
        </div>

        <div className="flex items-center gap-2">
          <StatusPill label={status} />
          <StreakBadge streak={streak} />
          <Separator
            orientation="vertical"
            className="hidden h-6 bg-rule-soft xl:block"
          />
          <MotionButton
            type="button"
            variant="accent"
            size="pill"
            className="px-2"
            onClick={onNewQuestion}
            disabled={isGenerating || isChecking}
          >
            {isGenerating ? (
              <Loader2 className="animate-spin" size={15} />
            ) : (
              <Sparkles size={15} />
            )}
            New question
          </MotionButton>
        </div>
      </Container>
    </header>
  );
}
