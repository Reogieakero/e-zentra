"use client";

import { useAllSectionsAttendance } from "@/lib/dashboard";
import { SectionSummaryCard } from "./attendance-section-card";
import styles from "./attendance-all-sections.module.css";

export function AttendanceAllSections() {
  const { data: rows, isLoading } = useAllSectionsAttendance();

  if (isLoading && rows.length === 0) {
    return (
      <div className={styles.skArea}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`${styles.skeleton} ${styles.skCard}`} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return <p className={styles.empty}>No section attendance data recorded yet.</p>;
  }

  return (
    <div className={styles.grid}>
      {rows.map((s, i) => (
        <SectionSummaryCard
          key={s.sectionId}
          rank={i + 1}
          top={i < 3}
          sectionName={s.sectionName}
          gradeLabel={s.gradeLabel}
          adviserName={s.adviserName}
          studentCount={s.studentCount}
          avgPresent={s.avgPresent}
          interactive={false}
        />
      ))}
    </div>
  );
}