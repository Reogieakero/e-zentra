"use client";

import { Trophy, Flower2 } from "lucide-react";
import type { TopSection } from "@/lib/dashboard";
import styles from "./attendance.module.css";

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
          <p className={styles.cardSubtitle}>Highest average attendance rate by section this school year</p>
        </div>
      </div>

      {ranked.length === 0 ? (
        <p className={styles.emptyText}>No section attendance data recorded yet.</p>
      ) : (
        <div className={styles.topGrid}>
          {ranked.map((s) => {
            const top = s.rank <= 3;
            return (
              <div key={s.sectionId} className={`${styles.topCard} ${top ? styles.topCardHighlight : ""}`}>
                <span className={`${styles.topRank} ${top ? styles.topRankHighlight : ""}`}>{s.rank}</span>
                <div className={`${styles.topAvatar} ${top ? styles.topAvatarHighlight : ""}`}>
                  <Flower2 className={styles.topAvatarIcon} />
                </div>
                <p className={styles.topName}>{s.sectionName}</p>
                <p className={styles.topGrade}>{s.gradeLabel}</p>
                <p className={`${styles.topRate} ${top ? styles.topRateHighlight : ""}`}>{s.rate.toFixed(1)}%</p>
                <p className={styles.topCount}>{s.studentCount} students</p>
              </div>
            );
          })}
        </div>
      )}
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