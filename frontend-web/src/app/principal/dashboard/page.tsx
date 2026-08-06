"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  CalendarX,
  Clock,
  Download,
  FileCheck2,
  FilePlus,
  FileText,
  FolderOpen,
  QrCode,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import Analytics from "@/components/dashboard/analytics";
import { InfoDialog } from "@/components/ui/info-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { fetchDashboardOverview, type DashboardOverview } from "@/lib/dashboard";
import { ApiClientError } from "@/lib/api";
import styles from "./page.module.css";

const quickActions = [
  { label: "Add Student", hint: "New profile", icon: UserPlus },
  { label: "Scan Attendance", hint: "Log entry", icon: QrCode },
  { label: "Generate SF10", hint: "Form 137", icon: FilePlus },
  { label: "Anecdotal Report", hint: "Behavior log", icon: FileText },
  { label: "ADM Records", hint: "Modules", icon: BookOpen },
  { label: "Export Reports", hint: "PDF / CSV", icon: Download },
];

function initials(firstName: string, lastName: string): string {
  return `${(firstName[0] ?? "").toUpperCase()}${(lastName[0] ?? "").toUpperCase()}` || "?";
}

function kpiCards(stats: DashboardOverview["stats"]) {
  return [
    {
      title: "Enrollment Stats",
      icon: Users,
      stats: [
        { label: "Total", value: stats.totalStudents.toLocaleString(), icon: Users, note: { icon: TrendingUp, text: "Enrolled learners", strong: true }, desc: "Learners on the active school-year roster (assigned to an active section)." },
        { label: "ADM", value: stats.admActive.toLocaleString(), icon: BookOpen, note: { text: "Active profiles" }, desc: "ADM learner profiles currently in approved status." },
      ],
    },
    {
      title: "Attendance & ADM",
      icon: CalendarX,
      stats: [
        { label: "Absent", value: stats.absentToday.toLocaleString(), icon: UserX, note: { icon: TrendingDown, text: "Today", strong: true }, desc: "Learners marked absent in today's attendance logs." },
        { label: "Present", value: stats.presentToday.toLocaleString(), icon: UserCheck, note: { text: `${stats.presentRate}% rate today` }, desc: "Learners marked present today; the % is present out of everyone logged today." },
      ],
    },
    {
      title: "Action Items",
      icon: AlertCircle,
      stats: [
        { label: "Pending", value: stats.pendingActions.toLocaleString(), icon: Clock, note: { text: "Needs review" }, desc: "Open record flags + submitted ADM awaiting approval + pending accounts." },
        { label: "At Risk", value: stats.atRiskCount.toLocaleString(), icon: AlertTriangle, note: { text: "Follow-up" }, desc: "Unique learners with a moderate/high risk assessment in the active year." },
      ],
    },
    {
      title: "Documentation",
      icon: FileCheck2,
      stats: [
        { label: "Anecdotal", value: stats.anecdotalThisMonth.toLocaleString(), icon: FileText, note: { text: "This month" }, desc: "Anecdotal/behavior records created this month." },
        { label: "SF10", value: stats.sf10Count.toLocaleString(), icon: FolderOpen, note: { icon: TrendingUp, text: "Ready / released", strong: true }, desc: "SF10 (Form 137) records marked ready or released." },
      ],
    },
  ];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchDashboardOverview()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiClientError ? err.message : "Could not load the dashboard. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const retry = () => {
    setLoading(true);
    setRefresh((r) => r + 1);
  };

  if (loading && !data) {
    return (
      <div className={styles.pageHeading}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageSubtitle}>Loading the latest aggregates from the school records…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.errorCard}>
        <AlertTriangle className={styles.errorIcon} />
        <p className={styles.errorText}>{error ?? "No dashboard data yet."}</p>
        <button className={styles.retryButton} onClick={retry}>
          <RefreshCw className={styles.retryIcon} />
          Retry
        </button>
      </div>
    );
  }

  const cards = kpiCards(data.stats);
  const atRisk = data.atRiskStudents.map((student) => ({
    initials: initials(student.firstName, student.lastName),
    name: `${student.firstName} ${student.lastName}`.trim(),
    meta: `${student.sectionName ?? "No section"} · ${student.attendanceRate ?? 0}% attendance`,
    risk: student.riskLevel,
  }));
  const admBadgeCount = data.admForApproval.length;

  return (
    <>
      <div className={styles.pageHeaderRow}>
        <div className={styles.pageHeading}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Monitor attendance, student records, and school activities from a centralized dashboard.</p>
        </div>
        <InfoDialog title="Principal Dashboard — What You See">
          <p className={styles.modalIntro}>
            This dashboard aggregates live school records so you can monitor enrollment, attendance, student risk, and
            approval workflows from a single view. Every figure updates after each school day ends.
          </p>

          <h3 className={styles.modalSection}>Top cards (KPIs)</h3>
          <ul className={styles.modalList}>
            <li><strong>Enrollment Stats</strong> — Total learners on the active school-year roster (assigned to an active section) and ADM profiles that are approved.</li>
            <li><strong>Attendance &amp; ADM</strong> — Learners marked Present or Absent in today&apos;s logs, plus the Present rate as a percentage of everyone logged today.</li>
            <li><strong>Action Items</strong> — Pending = open record flags + ADM profiles awaiting approval + accounts still pending; At Risk = unique learners with a moderate/high risk assessment.</li>
            <li><strong>Documentation</strong> — Anecdotal/behavior records created this month and SF10 (Form 137) records marked Ready or Released.</li>
          </ul>
          <p className={styles.modalNote}>Hover any KPI stat to see a short explanation of what it measures.</p>

          <h3 className={styles.modalSection}>At Risk Students</h3>
          <p>Lists up to 3 learners flagged with a moderate/high risk in the active year, with their section and attendance rate. The displayed threshold is below 85%.</p>

          <h3 className={styles.modalSection}>Quick Actions</h3>
          <p>Shortcuts to common tasks: add a student, scan attendance, generate SF10, write an anecdotal report, open ADM records, and export reports.</p>

          <h3 className={styles.modalSection}>ADM for Approval</h3>
          <p>ADM learner profiles submitted by staff and awaiting your approval/signature (up to 3).</p>

          <h3 className={styles.modalSection}>Analytics</h3>
          <ul className={styles.modalList}>
            <li><strong>Daily Attendance Trend</strong> — the school week (Mon–Fri). Each dot is that day&apos;s Present-to-logged rate; days with no logs yet show &quot;No data yet&quot;. The dashed line is the 95% target.</li>
            <li><strong>Section Attendance Heatmap</strong> — colour intensity shows each section&apos;s attendance per weekday of the current week.</li>
            <li><strong>Section Performance Breakdown</strong> — for each section, the green (Present) and red (Absent) bars show those statuses as % of all attendance it has logged.</li>
          </ul>
        </InfoDialog>
      </div>

      <div className={styles.kpiGrid}>
        {cards.map((card) => (
          <div key={card.title} className={styles.kpiCard}>
            <div className={styles.kpiCardHeader}>
              <span>{card.title}</span>
              <card.icon className={styles.kpiCardIcon} />
            </div>
            <div className={styles.kpiStats}>
              {card.stats.map((stat) => (
                <Tooltip key={stat.label} label={stat.desc}>
                  <div className={styles.kpiStat}>
                    <div className={styles.kpiStatHeader}>
                      <span>{stat.label}</span>
                      <stat.icon className={styles.kpiStatIcon} />
                    </div>
                    <div className={styles.kpiValue}>{stat.value}</div>
                    <div className={`${styles.kpiNote} ${stat.note.strong ? styles.kpiNoteStrong : ""}`}>
                      {stat.note.icon && <stat.note.icon className={styles.kpiNoteIcon} />}
                      <span>{stat.note.text}</span>
                    </div>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.leftRail}>
          <div className={styles.atRiskCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>At Risk Students</h3>
              <span className={`${styles.badge} ${styles.badgeDanger}`}>{data.stats.atRiskCount} Students</span>
            </div>
            <div className={styles.atRiskList}>
              {atRisk.length === 0 ? (
                <span className={styles.emptyText}>No at-risk students detected.</span>
              ) : (
                atRisk.map((student) => (
                  <div key={student.name} className={styles.atRiskItem}>
                    <div className={`${styles.avatar} ${styles.avatarDanger}`}>{student.initials}</div>
                    <div className={styles.atRiskInfo}>
                      <span className={styles.atRiskName}>{student.name}</span>
                      <span className={styles.atRiskMeta}>{student.meta}</span>
                    </div>
                    <AlertTriangle className={styles.atRiskIcon} />
                  </div>
                ))
              )}
            </div>
            <div className={styles.cardFooter}>
              <span>Threshold: &lt;85%</span>
              <span className={styles.cardLink}>View all</span>
            </div>
          </div>

          <div className={styles.quickActions}>
            <h3 className={styles.cardTitle}>Quick Actions</h3>
            <div className={styles.quickGrid}>
              {quickActions.map((action) => (
                <a key={action.label} href="#" className={styles.quickItem}>
                  <div className={styles.quickIcon}>
                    <action.icon className={styles.quickIconGlyph} />
                  </div>
                  <div className={styles.quickInfo}>
                    <span className={styles.quickLabel}>{action.label}</span>
                    <span className={styles.quickHint}>{action.hint}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className={styles.admCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>ADM for Approval</h3>
              <span className={`${styles.badge} ${styles.badgeWarning}`}>{admBadgeCount} Pending</span>
            </div>
            <div className={styles.admList}>
              {data.admForApproval.length === 0 ? (
                <div className={styles.emptyText}>No modules awaiting approval.</div>
              ) : (
                data.admForApproval.map((item) => (
                  <div key={item.id} className={styles.admItem}>
                    <div className={styles.admIcon}>
                      <FileText className={styles.admIconGlyph} />
                    </div>
                    <div className={styles.admInfo}>
                      <span className={styles.admTitle}>{item.studentName}</span>
                      <span className={styles.admMeta}>{item.sectionName} · Submitted by {item.preparedBy}</span>
                    </div>
                    <span className={styles.admStatus}>{item.status}</span>
                  </div>
                ))
              )}
            </div>
            <div className={styles.cardFooter}>
              <span>Awaiting principal&apos;s signature</span>
              <span className={styles.cardLink}>Review all</span>
            </div>
          </div>
        </div>

        <Analytics
          trend={data.dailyTrend.map((t) => ({ label: t.label, rate: t.rate }))}
          sections={data.sectionAttendance.map((s) => ({
            sectionName: s.sectionName,
            rate: s.rate,
            absentRate: s.absentRate,
          }))}
          heatmap={data.heatmap}
          schoolYear={data.schoolYear}
        />
      </div>
    </>
  );
}