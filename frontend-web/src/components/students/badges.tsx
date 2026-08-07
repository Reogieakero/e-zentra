import { Badge } from "@/components/ui/badge";
import styles from "./badges.module.css";

export function RiskBadge({ tone }: { tone: string | null }) {
  if (!tone || tone === "neutral") return <span className={styles.muted}>No data</span>;
  const badgeTone = tone === "high" ? "danger" : tone === "moderate" ? "warning" : "brand";
  const label = tone.charAt(0).toUpperCase() + tone.slice(1);
  return <Badge tone={badgeTone}>{label} Risk</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  if (status === "active") return <Badge tone="brand">Active</Badge>;
  if (status === "pending") return <Badge tone="warning">Pending</Badge>;
  return <Badge tone="neutral">No Account</Badge>;
}

export function Sf10Badge({ status }: { status: string }) {
  return <Badge tone="neutral">{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
}