"use client";

import { AlertTriangle, Crown, Percent, Target, Users, type LucideIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import type { ReportStatBlocks } from "@/lib/dashboard";
import { fmt } from "./report-config";
import styles from "./report-stat-cards.module.css";

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
  subTone?: "neutral" | "good" | "warn" | "danger";
  hint?: string;
}) {
  const body = (
    <div className={styles.statCard}>
      <div className={styles.statHead}>
        <span className={styles.statLabel}>{label}</span>
        <Icon className={styles.statIcon} />
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={`${styles.statSub} ${styles[`statSub${subTone === "good" ? "Good" : subTone === "warn" ? "Warn" : subTone === "danger" ? "Danger" : ""}`]}`}>
        {sub}
      </div>
    </div>
  );
  return hint ? <Tooltip label={hint}>{body}</Tooltip> : body;
}

interface ReportStatCardsProps {
  statBlocks: ReportStatBlocks;
  targetRate: number;
  isDaily: boolean;
  enrollmentTotal: number;
  hasSection: boolean;
}

export default function ReportStatCards({ statBlocks: sb, targetRate, isDaily, enrollmentTotal, hasSection }: ReportStatCardsProps) {
  const periodName = isDaily ? "Day" : "Month";
  const periodsName = isDaily ? "Days" : "Months";
  const above = sb.periodsAboveTarget;
  const below = sb.periodsTracked - above;
  const avgAbove = sb.averageRate >= targetRate;
  const bestLabel = sb.bestPeriod ? sb.bestPeriod.label.split(",")[0] : null;
  const lowestLabel = sb.lowestPeriod ? sb.lowestPeriod.label.split(",")[0] : null;
  const bestValue = bestLabel ? `${bestLabel} · ${fmt(sb.bestPeriod!.rate)}` : "—";

  return (
    <div className={`${styles.statGrid} ${hasSection ? styles.statGridWide : ""}`}>
      <StatCard
        icon={Percent}
        label="Average Rate"
        value={fmt(sb.averageRate)}
        sub={`${sb.periodsTracked} tracked ${periodName.toLowerCase()}${sb.periodsTracked === 1 ? "" : "s"}`}
        subTone="good"
        hint="The mean attendance rate across the current filter (grade/section) over the tracked periods. Computed as present ÷ (attended + late + excused)."
      />
      <StatCard
        icon={Crown}
        label={`Best ${periodName}`}
        value={bestValue}
        sub="Highest rate"
        hint={`Highest ${periodName.toLowerCase()} attendance rate in the filtered range.`}
      />
      <StatCard
        icon={AlertTriangle}
        label={`Lowest ${periodName}`}
        value={lowestLabel ? `${lowestLabel} · ${fmt(sb.lowestPeriod!.rate)}` : "—"}
        sub={sb.lowestPeriod ? `${(targetRate - sb.lowestPeriod.rate).toFixed(1)} pts below target` : "No data yet"}
        subTone={sb.lowestPeriod && sb.lowestPeriod.rate < targetRate ? "danger" : "neutral"}
        hint={`Lowest ${periodName} attendance rate in the filtered range; compared against the ${targetRate}% target.`}
      />
      <StatCard
        icon={Target}
        label={`${periodsName} Above Target`}
        value={`${above} / ${sb.periodsTracked}`}
        sub={`${below} below ${targetRate}%`}
        subTone={avgAbove ? "good" : "warn"}
        hint={`How many of the tracked ${periodName.toLowerCase()}s met or exceeded the ${targetRate}% attendance target.`}
      />
      {hasSection ? (
        <StatCard
          icon={Users}
          label="Students"
          value={enrollmentTotal.toLocaleString()}
          sub="enrolled in section"
          hint="Number of actively enrolled students in the currently selected section."
        />
      ) : null}
    </div>
  );
}