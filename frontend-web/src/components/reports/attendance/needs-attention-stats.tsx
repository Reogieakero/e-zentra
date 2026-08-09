"use client";

import { AlertTriangle, Flag, type LucideIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import styles from "./needs-attention-stats.module.css";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  subTone = "neutral",
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  subTone?: "neutral" | "danger" | "warn";
  hint?: string;
}) {
  const body = (
    <div className={`${styles.statCard} ${subTone !== "neutral" ? styles[`statCard${subTone === "danger" ? "Danger" : "Warn"}`] : ""}`}>
      <div className={styles.statHead}>
        <span className={styles.statLabel}>{label}</span>
        <Icon className={styles.statIcon} />
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={`${styles.statSub} ${subTone !== "neutral" ? styles[`statSub${subTone === "danger" ? "Danger" : "Warn"}`] : ""}`}>
        {sub}
      </div>
    </div>
  );
  return hint ? <Tooltip label={hint}>{body}</Tooltip> : body;
}

interface NeedsAttentionStatsProps {
  totalFlagged: number;
  dangerCount: number;
  warnCount: number;
  hasFilters: boolean;
}

export default function NeedsAttentionStats({ totalFlagged, dangerCount, warnCount, hasFilters }: NeedsAttentionStatsProps) {
  return (
    <div className={styles.statGrid}>
      <StatCard
        icon={Flag}
        label="Flagged Students"
        value={totalFlagged.toLocaleString()}
        sub={hasFilters ? "matching your filters" : "school-wide"}
        hint="Total students whose logged attendance rate is below the 80% target in the active school year."
      />
      <StatCard
        icon={AlertTriangle}
        label="High Risk"
        value={dangerCount.toLocaleString()}
        sub="below 70% attendance"
        subTone="danger"
        hint="Students below 70% attendance — these need immediate attention."
      />
      <StatCard
        icon={Flag}
        label="At Risk"
        value={warnCount.toLocaleString()}
        sub="70% to 79% attendance"
        subTone="warn"
        hint="Students between 70% and 79% attendance — they are trending below the target."
      />
    </div>
  );
}