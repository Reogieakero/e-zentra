import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import styles from "./badges.module.css";

export interface RiskBadgeData {
  tone: string | null;
  academicAvg: number | null;
  attendance: number | null;
  anecdotalCount: number;
}

export function RiskBadge({ tone, academicAvg, attendance, anecdotalCount }: RiskBadgeData) {
  if (!tone || tone === "neutral") return <span className={styles.muted}>No data</span>;
  const badgeTone = tone === "high" ? "danger" : tone === "moderate" ? "warning" : "brand";
  const label = tone.charAt(0).toUpperCase() + tone.slice(1);
  const signals: string[] = [];
  if (academicAvg != null && academicAvg < 75) signals.push(`Academic average ${academicAvg} (below 75)`);
  if (attendance != null && attendance < 80) signals.push(`Attendance ${attendance}% (below 80%)`);
  if (anecdotalCount >= 1) signals.push(`Behavioral concern${anecdotalCount > 1 ? "s" : ""} (${anecdotalCount})`);
  const tooltip = signals.length > 0 ? signals.join(" · ") : "No threshold crossed";
  return (
    <Tooltip label={tooltip}>
      <Badge tone={badgeTone}>{label} Risk</Badge>
    </Tooltip>
  );
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge tone="brand">Active</Badge>;
  if (status === "pending") return <Badge tone="warning">Pending</Badge>;
  return <Badge tone="neutral">No Account</Badge>;
}

export function Sf10Badge({ status }: { status: string }) {
  return <Badge tone="neutral">{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}