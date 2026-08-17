"use client";

import Link from "next/link";
import { AlertTriangle, BadgeCheck } from "lucide-react";
import type { LowAttendanceRow, PerfectAttendanceRow, TopSection } from "@/lib/dashboard";
import { AttendanceTopSections } from "./attendance-top-sections";
import { PipBoyAttentionCard } from "./pipboy-attention-card";
import styles from "./attendance-lists-row.module.css";

export function AttendanceNeedsAttention({ low }: { low: LowAttendanceRow[] }) {
  return (
    <section className={`${styles.card} ${styles.fillCard}`}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>
            <AlertTriangle className={styles.cardTitleIcon} />
            Needs Attention
          </h3>
          <p className={styles.cardSubtitle}>Students with attendance below 80%</p>
        </div>
        <span className={styles.flagBadge}>{low.length} flagged</span>
      </div>

      {low.length === 0 ? (
        <p className={styles.emptyText}>No students below the attendance threshold.</p>
      ) : (
        <PipBoyAttentionCard students={low} />
      )}

      <div className={styles.cardFooter}>
        <span>Threshold: &lt;80% attendance</span>
        <Link href="/principal/reports/attendance/needs-attention" className={styles.cardLink}>
          View all
        </Link>
      </div>
    </section>
  );
}

export function AttendanceListsRow({
  perfect,
  low,
  topSections,
}: {
  perfect: PerfectAttendanceRow[];
  low: LowAttendanceRow[];
  topSections: TopSection[];
}) {
  return (
    <div className={styles.listsGrid}>
      {perfect.length > 0 ? (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h4 className={styles.cardTitle}>
                <BadgeCheck className={styles.cardTitleIcon} />
                Perfect Attendance
              </h4>
              <p className={styles.cardSubtitle}>100% attendance across all school days so far this year</p>
            </div>
            <span className={styles.peakBadge}>{perfect.length} students</span>
          </div>

          {perfect.length === 0 ? (
            <p className={styles.emptyText}>No students with perfect attendance yet.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.tableHeadRow}>
                    <th className={styles.tableHead}>Student</th>
                    <th className={styles.tableHead}>Grade &amp; Section</th>
                    <th className={`${styles.tableHead} ${styles.center}`}>Days Present</th>
                    <th className={`${styles.tableHead} ${styles.center}`}>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {perfect.map((s) => (
                    <tr key={s.studentId} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        <span className={styles.studentName}>{s.fullName}</span>
                      </td>
                      <td className={styles.tableCell}>
                        {s.gradeLabel} &ndash; {s.sectionName}
                      </td>
                      <td className={`${styles.tableCell} ${styles.center}`}>
                        <span className={`${styles.count} ${styles.countGood}`}>
                          {s.daysPresent} / {s.totalSchoolDays} days
                        </span>
                      </td>
                      <td className={`${styles.tableCell} ${styles.center}`}>
                        <span className={`${styles.count} ${styles.countGood}`}>100%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <AttendanceTopSections sections={topSections} />
      )}

      <AttendanceNeedsAttention low={low} />
    </div>
  );
}

export function AttendanceListsRowLoading() {
  return (
    <div className={styles.listsGrid}>
      <div className={`${styles.card} ${styles.skCard}`}>
        <div className={`${styles.skeleton} ${styles.skHeaderLine}`} />
        <div className={`${styles.skeleton} ${styles.skTable}`} />
      </div>
      <div className={`${styles.card} ${styles.skCard}`}>
        <div className={`${styles.skeleton} ${styles.skHeaderLine}`} />
        <div className={`${styles.skeleton} ${styles.skTable}`} />
      </div>
    </div>
  );
}