"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import type { ReportSection } from "@/lib/dashboard";
import { CustomSelect } from "@/components/ui/select";
import { InfoDialog } from "@/components/ui/info-dialog";
import { GRADE_OPTIONS } from "@/constants/grades";
import styles from "./needs-attention-header.module.css";

interface NeedsAttentionHeaderProps {
  grade: string;
  section: string;
  sectionOptions: ReportSection[];
  sectionsLoading: boolean;
  schoolYear: string | null;
  onGradeChange: (grade: string) => void;
  onSectionChange: (section: string) => void;
}

export default function NeedsAttentionHeader({
  grade,
  section,
  sectionOptions,
  sectionsLoading,
  schoolYear,
  onGradeChange,
  onSectionChange,
}: NeedsAttentionHeaderProps) {
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
            <AlertTriangle className={styles.titleIcon} />
            Needs Attention Report
          </h1>
          <p className={styles.subtitle}>
            Students whose logged attendance is below the 80% threshold
            {schoolYear ? ` · School Year ${schoolYear}` : ""}.
          </p>
        </div>
      </div>

      <div className={styles.headerControls}>
        <CustomSelect
          id="need-grade"
          value={grade}
          options={GRADE_OPTIONS}
          onChange={onGradeChange}
          className={styles.filterSelect}
          size="sm"
          showCheck={false}
        />
        <CustomSelect
          id="need-section"
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
        <InfoDialog title="Needs Attention Report — What You See" label="How is this report built?" bare>
          <p className={styles.modalIntro}>
            This report lists every student whose logged attendance rate is below the 80% target. Flagged students are
            computed from attendance records that were actually logged in the active school year; students with no logged
            records are excluded.
          </p>

          <h3 className={styles.modalSection}>Filters</h3>
          <ul className={styles.modalList}>
            <li><strong>Grade</strong> — All Grades (school-wide) or a specific grade level.</li>
            <li><strong>Section</strong> — choosing a grade automatically lists its sections; pick one to zoom into that section&apos;s flagged students.</li>
          </ul>

          <h3 className={styles.modalSection}>Flags &amp; severity</h3>
          <ul className={styles.modalList}>
            <li><strong>&lt;70% &ndash; High risk</strong> — shown in red, students needing immediate attention.</li>
            <li><strong>70&ndash;79% &ndash; At risk</strong> — shown in amber, students trending below target.</li>
          </ul>

          <h3 className={styles.modalSection}>Rate</h3>
          <p>The attendance rate is <em>present ÷ (present + late + absent + excused)</em>. Late arrivals still count as attended for the rate, but their full day counts are listed for context.</p>

          <h3 className={styles.modalSection}>Student drill-down</h3>
          <p>Click any row to open that student&apos;s attendance trend, including present / late / absent / excused totals and their month-by-month rate.</p>
        </InfoDialog>
      </div>
    </div>
  );
}