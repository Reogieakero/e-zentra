import { InfoDialog } from "@/components/ui/info-dialog";
import { CustomSelect } from "@/components/ui/select";
import { GRADE_OPTIONS } from "@/constants/grades";
import type { ReportSection } from "@/lib/dashboard";
import styles from "./attendance-header.module.css";

export function AttendanceHeader({
  view,
  onViewChange,
  grade,
  onGradeChange,
  section,
  onSectionChange,
  sectionOptions,
  sectionsLoading,
}: {
  view: "monthly" | "daily";
  onViewChange: (view: "monthly" | "daily") => void;
  grade: string;
  onGradeChange: (grade: string) => void;
  section: string;
  onSectionChange: (section: string) => void;
  sectionOptions: ReportSection[];
  sectionsLoading: boolean;
}) {
  return (
    <div className={styles.header}>
      <div className={styles.headerTitleWrap}>
        <div>
          <h1 className={styles.title}>Attendance</h1>
          <p className={styles.subtitle}>
            Track daily attendance patterns, trends, and school-wide analytics.
          </p>
        </div>
      </div>

      <div className={styles.headerControls}>
        <CustomSelect
          id="attendance-granularity"
          value={view}
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "daily", label: "Daily" },
          ]}
          onChange={(v) => onViewChange(v as "monthly" | "daily")}
          className={styles.filterSelect}
          size="sm"
          showCheck={false}
        />
        <CustomSelect
          id="attendance-grade"
          value={grade}
          options={GRADE_OPTIONS}
          onChange={onGradeChange}
          className={styles.filterSelect}
          size="sm"
          showCheck={false}
        />
        <CustomSelect
          id="attendance-section"
          value={section}
          options={[
            { value: "", label: "All Sections" },
            ...sectionOptions.map((s) => ({ value: s.id, label: s.sectionName })),
          ]}
          onChange={onSectionChange}
          className={styles.filterSelect}
          size="sm"
          showCheck={false}
          placeholder={sectionsLoading ? "Loading…" : grade === "all" ? "Pick a grade first" : "Select a section"}
        />
        <InfoDialog title="Attendance — What You See" bare>
          <p className={styles.modalIntro}>
            This page aggregates live attendance records for the active school year. Every figure is computed only
            from attendance that was actually logged.
          </p>
          <h3 className={styles.modalSection}>Filters</h3>
          <ul className={styles.modalList}>
            <li>
              <strong>View</strong> — switch the trend chart between monthly and daily attendance rate.
            </li>
            <li>
              <strong>Grade</strong> — zoom into a single grade level or keep it school-wide.
            </li>
            <li>
              <strong>Section</strong> — narrow down to one section once a grade is picked.
            </li>
          </ul>
          <h3 className={styles.modalSection}>Attendance Overview</h3>
          <ul className={styles.modalList}>
            <li>
              <strong>Today</strong> — the donut shows how today&apos;s logged records split between present, late,
              absent, and excused, with the present rate in the middle.
            </li>
            <li>
              <strong>Trend</strong> — present rate per month (or per day) across the school year, compared
              against the 95% target line.
            </li>
          </ul>
          <h3 className={styles.modalSection}>Daily Attendance Heatmap</h3>
          <p>Present count for every school day (Mon&ndash;Fri) this year. Deeper green = more students present.</p>
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
        <div>
          <div className={`${styles.skeleton} ${styles.skTitle}`} />
          <div className={`${styles.skeleton} ${styles.skSubtitle}`} />
        </div>
      </div>
      <div className={styles.headerControls}>
        <div className={`${styles.skeleton} ${styles.skSelect}`} />
        <div className={`${styles.skeleton} ${styles.skSelect}`} />
        <div className={`${styles.skeleton} ${styles.skSelectWide}`} />
      </div>
    </div>
  );
}