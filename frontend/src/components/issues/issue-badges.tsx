import { Circle, CircleCheck, CircleDot, OctagonAlert, SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { priorityLabel, statusLabel, type IssuePriority, type IssueStatus } from "@/lib/issues-api";

/** Status chip: colour and icon reinforce the text, which is always present so meaning never depends on colour alone. */
export function StatusBadge({ status }: { status: IssueStatus }) {
  const icon = {
    TODO: <Circle aria-hidden="true" />,
    IN_PROGRESS: <CircleDot aria-hidden="true" className="text-warning-icon" />,
    DONE: <CircleCheck aria-hidden="true" className="text-success-icon" />,
  }[status];
  const tone = { TODO: "neutral", IN_PROGRESS: "warning", DONE: "success" } as const;
  return <Badge tone={tone[status]}>{icon}{statusLabel[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  const icon = {
    LOW: <SignalLow aria-hidden="true" />,
    MEDIUM: <SignalMedium aria-hidden="true" />,
    HIGH: <SignalHigh aria-hidden="true" />,
    URGENT: <OctagonAlert aria-hidden="true" />,
  }[priority];
  const tone = { LOW: "neutral", MEDIUM: "info", HIGH: "warning", URGENT: "danger" } as const;
  return <Badge tone={tone[priority]}>{icon}{priorityLabel[priority]}</Badge>;
}
