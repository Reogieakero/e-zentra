"use client";

import { useAttendanceSummary } from "@/lib/dashboard";
import { AttendanceHeader, AttendanceHeaderLoading } from "@/components/attendance/attendance-header";
import { AttendanceOverviewRow, AttendanceOverviewRowLoading } from "@/components/attendance/attendance-overview-row";
import { AttendanceHeatmap, AttendanceHeatmapLoading } from "@/components/attendance/attendance-heatmap";
import { AttendanceListsRow, AttendanceListsRowLoading } from "@/components/attendance/attendance-lists-row";
import { AttendanceTopSections, AttendanceTopSectionsLoading } from "@/components/attendance/attendance-top-sections";
import { AttendancePageError } from "@/components/attendance/attendance-error";
import styles from "./attendance.module.css";

export default function AttendanceHomePage() {
  const { data, error, refresh, isLoading } = useAttendanceSummary();

  if (isLoading && !data) {
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
      <AttendanceHeader schoolYear={data.schoolYear} totalEnrolled={data.totalEnrolled} />
      <AttendanceOverviewRow today={data.today} monthlyTrend={data.monthlyTrend} />
      <AttendanceHeatmap cells={data.heatmap} />
      <AttendanceListsRow perfect={data.perfectAttendance} low={data.lowAttendance} />
      <AttendanceTopSections sections={data.topSections} />
    </div>
  );
}