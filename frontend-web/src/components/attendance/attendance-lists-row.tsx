"use client";

import { BadgeCheck, AlertTriangle } from "lucide-react";
import type { LowAttendanceRow, PerfectAttendanceRow } from "@/lib/dashboard";
import styles from "./attendance-lists-row.module.css";

export function AttendanceListsRow({
  perfect,
  low,
}: {
  perfect: PerfectAttendanceRow[];
  low: LowAttendanceRow[];
}) {
  return (
    <div className={styles.listsGrid}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h4 className={styles.cardTitle}>
              <BadgeCheck className={styles.cardTitleIcon} />
              Perfect Attendance
            </h4>
            <p className={styles.cardSubtitle}>Students with 100% attendance this school year</p>
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
                  <th className={styles.tableHead}>Days Present</th>
                  <th className={`${styles.tableHead} ${styles.right}`}>Rate</th>
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
                    <td className={styles.tableCell}>{s.daysPresent} days</td>
                    <td className={`${styles.tableCell} ${styles.right} ${styles.rateGood}`}>100%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h3 className={styles.cardTitle}>Needs Attention</h3>
            <p className={styles.cardSubtitle}>Students with low attendance</p>
          </div>
          <span className={styles.flagBadge}>{low.length} flagged</span>
        </div>

        {low.length === 0 ? (
          <p className={styles.emptyText}>No students below the attendance threshold.</p>
        ) : (
          <div className={styles.lowList}>
            {low.map((s) => (
              <div
                key={s.studentId}
                className={`${styles.lowItem} ${s.tone === "danger" ? styles.lowDanger : styles.lowWarn}`}
              >
                <span className={styles.lowAvatar}>
                  <AlertTriangle className={styles.lowAvatarIcon} />
                </span>
                <div className={styles.lowInfo}>
                  <p className={styles.lowName}>{s.fullName}</p>
                  <p className={styles.lowMeta}>
                    {s.gradeLabel} &ndash; {s.sectionName}
                  </p>
                </div>
                <span className={`${styles.lowRate} ${s.tone === "danger" ? styles.lowRateDanger : styles.lowRateWarn}`}>
                  {s.rate}%
                </span>
              </div>
            ))}
          </div>
        )}

        <div className={styles.lowFooter}>
          <AlertTriangle className={styles.lowFooterIcon} />
          Below 80% attendance threshold
        </div>
      </section>
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