import { Target, TrendingUp } from "lucide-react";
import { Panel, PanelTitle } from "@/components/grammar/Panel";
import { Metric } from "@/components/grammar/Metric";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { SESSION_GOAL } from "@/lib/grammar/constants";

export function SessionGoal({
  answered,
  streak,
  averageScore,
}: {
  answered: number;
  streak: number;
  averageScore: number;
}) {
  const progress = Math.min(100, Math.round((answered / SESSION_GOAL) * 100));

  return (
    <Panel>
      <PanelTitle eyebrow="Goal" title={`${SESSION_GOAL}-question session`} />
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-base font-semibold tabular-nums text-ink">
            {answered}
            <span className="ml-0.5 text-xs font-medium text-muted-2">
              /{SESSION_GOAL}
            </span>
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-2">
            answered
          </span>
        </div>
        <Progress
          value={progress}
          className="mt-2 h-1.5 bg-rule-soft transition-all duration-500"
          indicatorClassName="bg-accent transition-all duration-500"
        />
      </div>
      <Separator className="mt-4 bg-rule-soft" />
      <div className="mt-1.5 space-y-0.5">
        <Metric icon={<Target size={13} />} label="Streak" value={streak} />
        <Metric
          icon={<TrendingUp size={13} />}
          label="Average"
          value={`${averageScore}%`}
        />
      </div>
    </Panel>
  );
}
