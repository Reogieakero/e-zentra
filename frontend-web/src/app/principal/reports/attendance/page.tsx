"use client";

import { useEffect, useState } from "react";
import { useAttendanceReport, useSectionsByGrade } from "@/lib/dashboard";
import ReportHeader from "@/components/reports/attendance/report-header";
import ReportStatCards from "@/components/reports/attendance/report-stat-cards";
import ReportTrendChart from "@/components/reports/attendance/report-trend-chart";
import ReportTable from "@/components/reports/attendance/report-table";
import ReportSidePanel from "@/components/reports/attendance/report-side-panel";
import { ReportLoading, ReportError } from "@/components/reports/attendance/report-states";
import { FILTER_KEYS, storedFilter } from "@/components/reports/attendance/report-config";
import styles from "./page.module.css";

export default function AttendanceReportPage() {
  const [view, setView] = useState<"monthly" | "daily">(
    () => (storedFilter(FILTER_KEYS.view) === "daily" ? "daily" : "monthly"),
  );
  const [grade, setGrade] = useState(() => storedFilter(FILTER_KEYS.grade) || "all");
  const [section, setSection] = useState(() => storedFilter(FILTER_KEYS.section));
  const { data, error, isLoading } = useAttendanceReport(view, grade, section);
  const { data: sectionOptions, isLoading: sectionsLoading } = useSectionsByGrade(grade);

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_KEYS.view, view);
      window.localStorage.setItem(FILTER_KEYS.grade, grade);
      window.localStorage.setItem(FILTER_KEYS.section, section);
    } catch {}
  }, [view, grade, section]);

  const switchView = (next: "monthly" | "daily") => setView(next);
  const switchGrade = (next: string) => {
    setGrade(next);
    setSection("");
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <ReportLoading />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <ReportError message={error ? error.message : "Could not load the attendance report."} />
      </div>
    );
  }

  const isDaily = view === "daily";
  const rows = data.series.slice().reverse();
  const sectionName = sectionOptions?.find((s) => s.id === section)?.sectionName ?? "";

  return (
    <div className={styles.page}>
      <ReportHeader
        view={view}
        grade={grade}
        section={section}
        sectionOptions={sectionOptions}
        sectionsLoading={sectionsLoading}
        isDaily={isDaily}
        schoolYear={data.schoolYear}
        onViewChange={switchView}
        onGradeChange={switchGrade}
        onSectionChange={(v) => setSection(v)}
      />

      <ReportStatCards
        statBlocks={data.statBlocks}
        targetRate={data.targetRate}
        isDaily={isDaily}
        enrollmentTotal={data.enrollmentTotal}
        hasSection={Boolean(section)}
      />

      <ReportTrendChart series={data.series} isDaily={isDaily} />

      <div className={styles.twoCol}>
        <ReportTable
          rows={rows}
          targetRate={data.targetRate}
          enrollmentTotal={data.enrollmentTotal}
          isDaily={isDaily}
        />
        <ReportSidePanel
          gradeLevels={data.gradeLevels}
          insights={data.insights}
          targetRate={data.targetRate}
          view={view}
          grade={grade}
          section={section}
          averagePresentPerDay={data.averagePresentPerDay}
          presentTotal={data.presentTotal}
          trackedSchoolDays={data.trackedSchoolDays}
          sectionName={sectionName}
          reportLoading={isLoading}
        />
      </div>
    </div>
  );
}