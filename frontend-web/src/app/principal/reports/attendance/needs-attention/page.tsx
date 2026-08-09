"use client";

import { useEffect, useState } from "react";
import { useNeedsAttention, useSectionsByGrade } from "@/lib/dashboard";
import NeedsAttentionHeader from "@/components/reports/attendance/needs-attention-header";
import NeedsAttentionStats from "@/components/reports/attendance/needs-attention-stats";
import NeedsAttentionTable from "@/components/reports/attendance/needs-attention-table";
import { ReportError } from "@/components/reports/attendance/report-states";

import styles from "./page.module.css";

export default function NeedsAttentionReportPage() {
  const [grade, setGrade] = useState("all");
  const [section, setSection] = useState("");
  const { data, error, isLoading } = useNeedsAttention(grade, section);
  const { data: sectionOptions, isLoading: sectionsLoading } = useSectionsByGrade(grade);

  useEffect(() => {
    setSection("");
  }, [grade]);

  return (
    <div className={styles.page}>
      <NeedsAttentionHeader
        grade={grade}
        section={section}
        sectionOptions={sectionOptions ?? []}
        sectionsLoading={sectionsLoading}
        schoolYear={data?.schoolYear ?? null}
        onGradeChange={setGrade}
        onSectionChange={setSection}
      />

      {isLoading ? (
        <div className={styles.skGrid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skCard}>
              <div className={`${styles.skeleton} ${styles.skLineSm}`} />
              <div className={`${styles.skeleton} ${styles.skLineLg}`} />
              <div className={`${styles.skeleton} ${styles.skLineXs}`} />
            </div>
          ))}
        </div>
      ) : error || !data ? (
        <ReportError message={error ? error.message : "Could not load the needs-attention report."} />
      ) : (
        <>
          <NeedsAttentionStats
            totalFlagged={data.totalFlagged}
            dangerCount={data.dangerCount}
            warnCount={data.warnCount}
            hasFilters={Boolean(grade !== "all" || section)}
          />
          <NeedsAttentionTable rows={data.rows} />
        </>
      )}
    </div>
  );
}