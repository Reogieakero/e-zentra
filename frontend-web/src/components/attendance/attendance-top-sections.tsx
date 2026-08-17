"use client";

import { Trophy } from "lucide-react";
import { InfoDialog } from "@/components/ui/info-dialog";
import { HowComputed } from "@/components/ui/how-computed";
import { SectionSummaryCard } from "./attendance-section-card";
import { AttendanceSectionDetail } from "./attendance-section-detail";
import { AttendanceAllSections } from "./attendance-all-sections";
import type { TopSection } from "@/lib/dashboard";
import styles from "./attendance-top-sections.module.css";

const COMPUTATION_TEXT =
  "Average present per school day is computed as the total present attendance records of the section divided by the number of school days with attendance. Sections are ranked by this average, highest first.";

const SAMPLE_LINES: Array<
  { type: "title"; text: string } | { type: "divider" } | { type: "row"; label: string; value: string }
> = [
  { type: "title", text: "Sample solving — Rizal" },
  { type: "row", label: "Total present records", value: "= 240" },
  { type: "row", label: "School days with attendance", value: "= 9" },
  { type: "divider" },
  { type: "row", label: "Average present / day", value: "240 ÷ 9 = 26.7" },
];

export function AttendanceTopSections({ sections }: { sections: TopSection[] }) {
  const ranked = sections.map((s, i) => ({ ...s, rank: i + 1 }));

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h4 className={styles.cardTitle}>
            <Trophy className={styles.cardTitleIcon} />
            Top Sections
          </h4>
          <p className={styles.cardSubtitle}>Highest average student present per school day by section this school year</p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.legend}>
            <span className={styles.legendDot} />
            <span className={styles.legendLabel}>Population</span>
          </div>
          <HowComputed computationText={COMPUTATION_TEXT} lines={SAMPLE_LINES} />
        </div>
      </div>

      {ranked.length === 0 ? (
        <p className={styles.emptyText}>No section attendance data recorded yet.</p>
      ) : (
        <div className={styles.topGrid}>
          {ranked.map((s) => {
            const top = s.rank <= 3;
            return (
              <InfoDialog
                key={s.sectionId}
                title={`${s.sectionName} · ${s.gradeLabel}`}
                label={`View ${s.sectionName} attendance details`}
                trigger={
                  <SectionSummaryCard
                    rank={s.rank}
                    top={top}
                    sectionName={s.sectionName}
                    gradeLabel={s.gradeLabel}
                    adviserName={s.adviserName}
                    studentCount={s.studentCount}
                    avgPresent={s.avgPresent}
                  />
                }
              >
                <AttendanceSectionDetail
                  sectionId={s.sectionId}
                  avgPresent={s.avgPresent}
                  adviserName={s.adviserName}
                  studentCount={s.studentCount}
                />
              </InfoDialog>
            );
          })}
        </div>
      )}

      <div className={styles.cardFooter}>
        <span>Top 10 sections by avg. present / day</span>
        <InfoDialog
          title="All Sections Attendance"
          label="View all sections"
          wide
          trigger={<span className={styles.cardLink}>View all</span>}
        >
          <AttendanceAllSections />
        </InfoDialog>
      </div>
    </section>
  );
}

export function AttendanceTopSectionsLoading() {
  return (
    <div className={`${styles.card} ${styles.skCard}`}>
      <div className={`${styles.skeleton} ${styles.skHeaderLine}`} />
      <div className={styles.topGrid}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`${styles.skeleton} ${styles.skTopCard}`} />
        ))}
      </div>
    </div>
  );
}