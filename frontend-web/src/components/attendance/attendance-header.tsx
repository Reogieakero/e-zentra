import { CalendarCheck2 } from "lucide-react";
import { InfoDialog } from "@/components/ui/info-dialog";
import styles from "./attendance.module.css";

export function AttendanceHeader({ schoolYear, totalEnrolled }: { schoolYear: string | null; totalEnrolled: number }) {
  return (
    <div className={styles.header}>
      <div className={styles.headerTitleWrap}>
        <div className={styles.titleIconWrap}>
          <CalendarCheck2 className={styles.titleIcon} />
        </div>
        <div>
          <h1 className={styles.title}>Attendance</h1>
          <p className={styles.subtitle}>
            Track daily attendance patterns, trends, and school-wide analytics.
          </p>
        </div>
      </div>

      <div className={styles.headerControls}>
        {schoolYear && (
          <span className={styles.yearBadge}>
            Year: {schoolYear}
            <span className={styles.yearBadgeMeta}>{totalEnrolled.toLocaleString()} enrolled</span>
          </span>
        )}
        <InfoDialog title="Attendance — What You See" bare>
          <p className={styles.modalIntro}>
            This page aggregates live attendance records for the active school year. Every figure is computed only
            from attendance that was actually logged.
          </p>
          <h3 className={styles.modalSection}>Attendance Overview</h3>
          <ul className={styles.modalList}>
            <li>
              <strong>Today</strong> — the donut shows how today&apos;s logged records split between present, late,
              absent, and excused, with the present rate in the middle.
            </li>
            <li>
              <strong>Monthly trend</strong> — school-wide present rate per month across the school year, compared
              against the 95% target line.
            </li>
          </ul>
          <h3 className={styles.modalSection}>Daily Attendance Heatmap</h3>
          <p>School-wide attendance rate for every school day (Mon&ndash;Fri) this year. Deeper green = higher rate.</p>
          <h3 className={styles.modalSection}>Perfect &amp; low attendance</h3>
          <ul className={styles.modalList}>
            <li>
              <strong>Perfect Attendance</strong> — students present on every logged day (100% rate).
            </li>
            <li>
              <strong>Needs Attention</strong> — students whose logged attendance is below the 80% threshold.
            </li>
          </ul>
          <h3 className={styles.modalSection}>Top Sections</h3>
          <p>Highest average attendance rate by section this school year.</p>
        </InfoDialog>
      </div>
    </div>
  );
}

export function AttendanceHeaderLoading() {
  return (
    <div className={styles.header}>
      <div className={styles.headerTitleWrap}>
        <div className={`${styles.skeleton} ${styles.skTitleIcon}`} />
        <div>
          <div className={`${styles.skeleton} ${styles.skTitle}`} />
          <div className={`${styles.skeleton} ${styles.skSubtitle}`} />
        </div>
      </div>
      <div className={`${styles.skeleton} ${styles.skBadge}`} />
    </div>
  );
}