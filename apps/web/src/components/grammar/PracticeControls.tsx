"use client";

import type { GrammarTask, TaskTypeSelection } from "@/types/grammar";
import { Panel, PanelTitle } from "@/components/grammar/Panel";
import { ControlGroup } from "@/components/grammar/ControlGroup";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  levelLabels,
  levelOptions,
  typeLabels,
  typeOptions,
} from "@/lib/grammar/constants";

const levelSegmentOptions = levelOptions.map((opt) => ({
  value: opt,
  label: levelLabels[opt],
}));

export function PracticeControls({
  level,
  type,
  onLevelChange,
  onTypeChange,
}: {
  level: GrammarTask["difficulty"];
  type: TaskTypeSelection;
  onLevelChange: (level: GrammarTask["difficulty"]) => void;
  onTypeChange: (type: TaskTypeSelection) => void;
}) {
  return (
    <Panel>
      <PanelTitle eyebrow="Setup" title="Practice" />
      <div className="mt-5 space-y-5">
        <ControlGroup label="IELTS band">
          <SegmentedControl
            value={level}
            options={levelSegmentOptions}
            onChange={onLevelChange}
            className="grid grid-cols-4 gap-1.5"
          />
        </ControlGroup>

        <ControlGroup label="Drill type">
          <Select
            value={type}
            onValueChange={(value) => onTypeChange(value as TaskTypeSelection)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Choose a drill type" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {typeLabels[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ControlGroup>
      </div>
    </Panel>
  );
}
