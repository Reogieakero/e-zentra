import { AlertTriangle, FileText, ThumbsUp, Flag, type LucideIcon } from "lucide-react";
import styles from "./anecdotal-stats.module.css";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number;
  note: string;
  accent: string;
  danger?: boolean;
}

function StatCard({ icon: Icon, label, value, note, accent, danger }: StatCardProps) {
  return (
    <div className={`${styles.card} ${danger ? styles.cardDanger : ""}`}>
      <div className={styles.cardHead}>
        <span className={styles.label}>{label}</span>
        <span className={styles.iconWrap} style={{ color: accent, background: `${accent}1a` }}>
          <Icon size={14} />
        </span>
      </div>
      <div className={styles.value}>{value.toLocaleString()}</div>
      <div className={`${styles.note} ${danger ? styles.noteDanger : ""}`}>{note}</div>
    </div>
  );
}

export function AnecdotalStatsLoading({ cards = 4 }: { cards?: number }) {
  return (
    <div className={styles.grid}>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className={`${styles.card} ${styles.skeletonCard}`}>
          <div className={`${styles.skeleton} ${styles.skHead}`} />
          <div className={`${styles.skeleton} ${styles.skValue}`} />
          <div className={`${styles.skeleton} ${styles.skNote}`} />
        </div>
      ))}
    </div>
  );
}

interface AnecdotalStatsProps {
  stats: {
    total: number;
    positive: number;
    behavioral: number;
    followup: number;
  };
}

export default function AnecdotalStats({ stats }: AnecdotalStatsProps) {
  return (
    <div className={styles.grid}>
      <StatCard
        icon={FileText}
        label="Total Records"
        value={stats.total}
        note="All logged entries"
        accent="#16a34a"
      />
      <StatCard
        icon={ThumbsUp}
        label="Positive Behavior"
        value={stats.positive}
        note="Positive observations"
        accent="#16a34a"
      />
      <StatCard
        icon={AlertTriangle}
        label="Behavioral Concerns"
        value={stats.behavioral}
        note="Flagged for behavior"
        accent="#d97706"
        danger
      />
      <StatCard
        icon={Flag}
        label="Needs Follow-up"
        value={stats.followup}
        note="Follow-up recorded"
        accent="#dc2626"
        danger
      />
    </div>
  );
}
