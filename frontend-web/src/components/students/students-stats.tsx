import { AlertTriangle, GraduationCap, UserCheck, Users, type LucideIcon } from "lucide-react";
import type { StudentStats } from "@/lib/students";
import styles from "./students-stats.module.css";

function StatCard({
  icon: Icon,
  label,
  value,
  note,
  danger = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  danger?: boolean;
}) {
  return (
    <div className={`${styles.statCard} ${danger ? styles.statCardDanger : ""}`}>
      <div className={styles.statIconWrap}>
        <Icon className={danger ? styles.statIconDanger : styles.statIcon} />
      </div>
      <div className={styles.statBody}>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statValue}>{value}</div>
        <div className={`${styles.statNote} ${danger ? styles.statNoteDanger : ""}`}>{note}</div>
      </div>
    </div>
  );
}

export function StudentsStatsLoading({ cards }: { cards: number }) {
  return (
    <div className={styles.statGrid}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className={`${styles.statCard} ${styles.skeletonCard}`}>
          <div className={`${styles.skeleton} ${styles.skStatIcon}`} />
          <div className={styles.statBody}>
            <div className={`${styles.skeleton} ${styles.skStatLabel}`} />
            <div className={`${styles.skeleton} ${styles.skStatValue}`} />
            <div className={`${styles.skeleton} ${styles.skStatNote}`} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface StudentsStatsProps {
  stats: StudentStats | undefined;
}

export default function StudentsStats({ stats }: StudentsStatsProps) {
  return (
    <div className={styles.statGrid}>
      <StatCard icon={Users} label="Total Students" value={stats?.total.toLocaleString() ?? "0"} note="All enrolled records" />
      <StatCard icon={UserCheck} label="ADM Students" value={stats?.adm.toLocaleString() ?? "0"} note="Approved ADM profiles" />
      <StatCard icon={GraduationCap} label="Graduated Students" value={stats?.graduated.toLocaleString() ?? "0"} note="All-time total" />
      <StatCard
        icon={AlertTriangle}
        label="At-Risk Students"
        value={stats?.atRiskHigh.toLocaleString() ?? "0"}
        note="High risk level"
        danger
      />
    </div>
  );
}