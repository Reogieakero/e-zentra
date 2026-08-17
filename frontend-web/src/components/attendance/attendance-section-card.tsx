import styles from "./attendance-top-sections.module.css";

export function SectionSummaryCard({
  rank,
  top,
  sectionName,
  gradeLabel,
  adviserName,
  studentCount,
  avgPresent,
  interactive = true,
}: {
  rank: number;
  top: boolean;
  sectionName: string;
  gradeLabel: string;
  adviserName: string | null;
  studentCount: number;
  avgPresent: number;
  interactive?: boolean;
}) {
  return (
    <div className={`${styles.topCard} ${top ? styles.topCardHighlight : ""} ${interactive ? styles.topCardClickable : ""}`}>
      <span className={`${styles.topRank} ${top ? styles.topRankHighlight : ""}`}>{rank}</span>
      <div className={styles.topRow}>
        <div className={styles.topLeft}>
          <p className={styles.topName}>{sectionName}</p>
          <p className={styles.topGrade}>{gradeLabel}</p>
          <p className={styles.topAdviser}>Adviser: {adviserName ?? "—"}</p>
        </div>
        <div className={styles.topRight}>
          <div className={styles.popRow}>
            <span className={styles.legendDot} />
            <p className={styles.topCount}>{studentCount}</p>
          </div>
        </div>
      </div>
      <div className={styles.topAvgWrap}>
        <p className={styles.topAvg}>{avgPresent.toFixed(1)}</p>
        <p className={styles.topAvgLabel}>Avg. Present / Day</p>
      </div>
    </div>
  );
}