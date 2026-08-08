"use client";

import { useEffect, useState } from "react";
import { useAttendanceSummary, useSectionsByGrade } from "@/lib/dashboard";
import { AttendanceHeader, AttendanceHeaderLoading } from "@/components/attendance/attendance-header";
import { AttendanceOverviewRow, AttendanceOverviewRowLoading } from "@/components/attendance/attendance-overview-row";
import { AttendanceHeatmap, AttendanceHeatmapLoading } from "@/components/attendance/attendance-heatmap";
import { AttendanceListsRow, AttendanceListsRowLoading } from "@/components/attendance/attendance-lists-row";
import { AttendanceTopSections, AttendanceTopSectionsLoading } from "@/components/attendance/attendance-top-sections";
import { AttendancePageError } from "@/components/attendance/attendance-error";
import styles from "./attendance.module.css";

const FILTER_KEYS = {
  view: "zentra.attendance-summary.view",
  grade: "zentra.attendance-summary.grade",
  section: "zentra.attendance-summary.section",
} as const;

const storedFilter = (key: string) => {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};

export default function AttendanceHomePage() {
  const [view, setView] = useState<"monthly" | "daily">(
    () => (storedFilter(FILTER_KEYS.view) === "daily" ? "daily" : "monthly"),
  );
  const [grade, setGrade] = useState(() => storedFilter(FILTER_KEYS.grade) || "all");
  const [section, setSection] = useState(() => storedFilter(FILTER_KEYS.section));
  const { data: sectionOptions, isLoading: sectionsLoading } = useSectionsByGrade(grade);
  const { data, error, refresh } = useAttendanceSummary(view, grade, section);

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_KEYS.view, view);
      window.localStorage.setItem(FILTER_KEYS.grade, grade);
      window.localStorage.setItem(FILTER_KEYS.section, section);
    } catch {

    }
  }, [view, grade, section]);

  const changeGrade = (next: string) => {
    setGrade(next);
    setSection("");
  };
  const changeSection = (next: string) => {
    setSection(next);
  };

  const loading = !data && !error;

  if (loading) {
    return (
      <div className={styles.page}>
        <AttendanceHeaderLoading />
        <AttendanceOverviewRowLoading />
        <AttendanceHeatmapLoading />
        <AttendanceListsRowLoading />
        <AttendanceTopSectionsLoading />
      </div>
    );
  }

  if (error || !data) {
    return <AttendancePageError error={error} onRetry={refresh} />;
  }

  return (
    <div className={styles.page}>
      <AttendanceHeader
        view={view}
        onViewChange={setView}
        grade={grade}
        onGradeChange={changeGrade}
        section={section}
        onSectionChange={changeSection}
        sectionOptions={sectionOptions ?? []}
        sectionsLoading={sectionsLoading}
      />
      <AttendanceOverviewRow today={data.today} monthlyTrend={data.monthlyTrend} view={view} />
      <AttendanceHeatmap cells={data.heatmap} />
      <AttendanceListsRow perfect={data.perfectAttendance} low={data.lowAttendance} />
      <AttendanceTopSections sections={data.topSections} />
    </div>
  );
}