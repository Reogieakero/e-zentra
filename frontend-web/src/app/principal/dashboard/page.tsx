"use client";

import { useState } from "react";
import Analytics from "@/components/dashboard/analytics";
import DashboardHeader from "@/components/dashboard/principal/dashboard-header";
import KpiCards, { type AttendanceView } from "@/components/dashboard/principal/kpi-cards";
import AtRiskCard from "@/components/dashboard/principal/at-risk-card";
import QuickActions from "@/components/dashboard/principal/quick-actions";
import AdmApprovalCard from "@/components/dashboard/principal/adm-approval-card";
import { DashboardLoading, DashboardError } from "@/components/dashboard/principal/dashboard-states";
import { useDashboardOverview } from "@/lib/dashboard";
import styles from "./page.module.css";

export default function DashboardPage() {
  const [month, setMonth] = useState("");
  const [attendanceView, setAttendanceView] = useState<AttendanceView>("presentAbsent");
  const [railOpen, setRailOpen] = useState(true);
  const { data, error, refresh } = useDashboardOverview(month || undefined);

  const loading = !data && !error;

  if (loading) {
    return <DashboardLoading />;
  }

  if (error || !data) {
    return <DashboardError error={error} onRetry={refresh} />;
  }

  return (
    <>
      <DashboardHeader railOpen={railOpen} onToggleRail={() => setRailOpen((o) => !o)} />

      <KpiCards
        stats={data.stats}
        attendanceView={attendanceView}
        onAttendanceViewChange={setAttendanceView}
      />

      <div className={`${styles.dashboardGrid} ${!railOpen ? styles.dashboardGridWide : ""}`}>
        <div className={`${styles.leftRail} ${!railOpen ? styles.leftRailCollapsed : ""}`}>
          <AtRiskCard
            students={data.atRiskStudents}
            count={data.stats.atRiskCount}
            term={data.term}
            schoolYear={data.schoolYear}
          />
          <QuickActions />
          <AdmApprovalCard items={data.admForApproval} pendingCount={data.admForApproval.length} />
        </div>

        <Analytics
          trend={data.dailyTrend.map((t) => ({
            label: t.label,
            day: t.day,
            present: t.present,
            absent: t.absent,
            late: t.late,
            excused: t.excused,
            notLogged: t.notLogged,
            rate: t.rate,
          }))}
          sections={data.sectionAttendance.map((s) => ({
            sectionName: s.sectionName,
            rate: s.rate,
            absentRate: s.absentRate,
            lateRate: s.lateRate,
            excusedRate: s.excusedRate,
          }))}
          heatmap={data.heatmap}
          schoolYear={data.schoolYear}
          month={month}
          onMonthChange={setMonth}
        />
      </div>
    </>
  );
}