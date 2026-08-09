"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import type { ReportSection } from "@/lib/dashboard";
import { CustomSelect } from "@/components/ui/select";
import { InfoDialog } from "@/components/ui/info-dialog";
import { GRADE_OPTIONS } from "@/constants/grades";
import styles from "./report-header.module.css";

interface ReportHeaderProps {
  view: "monthly" | "daily";
  grade: string;
  section: string;
  sectionOptions: ReportSection[];
  sectionsLoading: boolean;
  isDaily: boolean;
  schoolYear: string | null;
  onViewChange: (view: "monthly" | "daily") => void;
  onGradeChange: (grade: string) => void;
  onSectionChange: (section: string) => void;
}

export default function ReportHeader({
  view,
  grade,
  section,
  sectionOptions,
  sectionsLoading,
  isDaily,
  schoolYear,
  onViewChange,
  onGradeChange,
  onSectionChange,
}: ReportHeaderProps) {
  const router = useRouter();
  return (
    <div className={styles.header}>
      <div className={styles.headerTitleWrap}>
        <button
          type="button"
          className={styles.backChevron}
          aria-label="Go back"
          onClick={() => router.back()}
        >
          <ChevronLeft size={16} />
        </button>
        <div>
          <h1 className={styles.title}>
            {isDaily ? "Daily" : "Monthly"} Attendance Trend Report
          </h1>
          <p className={styles.subtitle}>
            {grade === "all" ? "School-wide" : GRADE_OPTIONS.find((o) => o.value === grade)?.label ?? "School-wide"} attendance rate by{" "}
            {isDaily ? "day" : "month"}{schoolYear ? ` · School Year ${schoolYear}` : ""}.
          </p>
        </div>
      </div>

      <div className={styles.headerControls}>
        <CustomSelect
          id="report-granularity"
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
          id="report-grade"
          value={grade}
          options={GRADE_OPTIONS}
          onChange={onGradeChange}
          className={styles.filterSelect}
          size="sm"
          showCheck={false}
        />
        <CustomSelect
          id="report-section"
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
        <InfoDialog title="Attendance Trend Report — What You See" label="What data does the principal see?" bare>
          <p className={styles.modalIntro}>
            This report breaks down the school-wide attendance rate so you can spot weeks or months that fall below the
            target. Pick a grade from the dropdown to zoom into that year level. Every figure is computed only from
            attendance records that were actually logged.
          </p>

          <h3 className={styles.modalSection}>Filters</h3>
          <ul className={styles.modalList}>
            <li><strong>Granularity</strong> — switch between Month and Day totals.</li>
            <li><strong>Grade</strong> — All Grades (school-wide) or a specific grade level.</li>
            <li><strong>Section</strong> — choosing a grade automatically lists its sections; pick one to zoom into that section&apos;s daily attendance.</li>
          </ul>

          <h3 className={styles.modalSection}>Header stats (KPIs)</h3>
          <ul className={styles.modalList}>
            <li><strong>Average Rate</strong> — average attendance rate across all tracked {isDaily ? "days" : "months"}.</li>
            <li><strong>Best {isDaily ? "Day" : "Month"}</strong> — the {isDaily ? "day" : "month"} with the highest logged rate.</li>
            <li><strong>Lowest {isDaily ? "Day" : "Month"}</strong> — the {isDaily ? "day" : "month"} with the lowest logged rate and how far it is below the target.</li>
            <li><strong>{isDaily ? "Days" : "Months"} Above Target</strong> — how many {isDaily ? "days" : "months"} met or exceeded the target rate.</li>
          </ul>
          <p className={styles.modalNote}>The header shows which school year and term the report covers.</p>

          <h3 className={styles.modalSection}>{isDaily ? "Daily" : "Monthly"} Attendance Counts</h3>
          <p>Line chart of the real counts of present, absent, late, excused, and not-logged students per {isDaily ? "day" : "month"}. Each line is one status; {"\u201C"}Not logged{"\u201D"} counts enrolled students without a record that {isDaily ? "day" : "month"}.</p>

          <h3 className={styles.modalSection}>Breakdown table</h3>
          <ul className={styles.modalList}>
            <li><strong>{isDaily ? "Day-by-Day" : "Month-by-Month"}</strong> — newest on top. Shows logged {isDaily ? "days" : "months"}, present/absent/late/excused/not-logged counts, the rate, and the gap vs. target.</li>
            <li><strong>School days only</strong> — {isDaily ? "weekends (Sat–Sun) are excluded because school is not in session." : "each month rate is the average of its logged school days."}</li>
            {isDaily && <li><strong>Pagination</strong> — the table lists 8 school days per page.</li>}
          </ul>

          <h3 className={styles.modalSection}>Grade breakdown</h3>
          <p>Average rate by grade level (Grade 7–12), so you can spot which year levels are drifting below the target.</p>
        </InfoDialog>
      </div>
    </div>
  );
}