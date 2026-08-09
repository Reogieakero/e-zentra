"use client";

import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import type { LowAttendanceRow, PerfectAttendanceRow } from "@/lib/dashboard";
import { useRiskCarousel } from "@/hooks/use-risk-carousel";
import styles from "./attendance-lists-row.module.css";

function nameInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts[1]?.[0] ?? "";
  return `${first.toUpperCase()}${last.toUpperCase()}` || "?";
}

function neqTone(tone: "danger" | "warn"): "high" | "moderate" {
  return tone === "danger" ? "high" : "moderate";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function AttendanceNeedsAttention({ low }: { low: LowAttendanceRow[] }) {
  const { index, setIndex } = useRiskCarousel(low.length);
  const current = low.length > 0 ? low[index % low.length] : undefined;
  const level = current ? neqTone(current.tone) : "moderate";
  const tone = capitalize(level);

  return (
    <section className={`${styles.card} ${styles.fillCard}`}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>Needs Attention</h3>
          <p className={styles.cardSubtitle}>Students with low attendance</p>
        </div>
        <span className={styles.flagBadge}>{low.length} flagged</span>
      </div>

      <div className={styles.needsList}>
        {!current ? (
          <p className={styles.emptyText}>No students below the attendance threshold.</p>
        ) : (
          <div className={styles.needsCarousel}>
            <div className={`${styles.needsItem} ${styles[`needsItem${tone}`]}`}>
              <div className={styles.needsTop}>
                <div className={`${styles.avatar} ${styles[`avatar${tone}`]} ${styles.needsAvatar}`}>
                  {nameInitials(current.fullName)}
                </div>
                <span className={styles.needsName}>{current.fullName}</span>
              </div>
              <div className={styles.needsDetail}>
                <div className={styles.needsDetailCol}>
                  <span className={styles.needsDetailLabel}>Attendance</span>
                  <span className={`${styles.needsDetailValue} ${styles[`needsDetailValue${tone}`]}`}>{current.rate}%</span>
                </div>
                <div className={styles.needsDetailCol}>
                  <span className={styles.needsDetailLabel}>Grade</span>
                  <span className={styles.needsDetailValue}>{current.gradeLabel}</span>
                </div>
                <div className={styles.needsDetailCol}>
                  <span className={styles.needsDetailLabel}>Section</span>
                  <span className={styles.needsDetailValue}>{current.sectionName ?? "—"}</span>
                </div>
              </div>
            </div>
            {low.length > 1 && (
              <div className={styles.needsDots}>
                {low.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.needsDot} ${i === index ? styles.needsDotActive : ""}`}
                    onClick={() => setIndex(i)}
                    aria-label={`Low attendance student ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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