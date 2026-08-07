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
  PanelLeftClose,
  PanelLeftOpen,
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
import { CustomSelect } from "@/components/ui/select";
import { InfoDialog } from "@/components/ui/info-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { useDashboardOverview, type DashboardOverview } from "@/lib/dashboard";
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

function kpiCards(stats: DashboardOverview["stats"], attendanceView: "presentAbsent" | "lateExcused") {
  const attendanceStats =
    attendanceView === "presentAbsent"
      ? [
          { label: "Present", value: stats.presentToday.toLocaleString(), icon: UserCheck, note: { text: `${stats.presentRate}% rate today` }, desc: "Learners marked present today; the % is present out of everyone logged today." },
          { label: "Absent", value: stats.absentToday.toLocaleString(), icon: UserX, note: { icon: TrendingDown, text: "Today", strong: true }, desc: "Learners marked absent in today's attendance logs." },
        ]
      : [
          { label: "Late", value: stats.lateToday.toLocaleString(), icon: Clock, note: { icon: TrendingDown, text: "Today", strong: true }, desc: "Learners marked late in today's attendance logs." },
          { label: "Excused", value: stats.excusedToday.toLocaleString(), icon: FileCheck2, note: { text: "Today" }, desc: "Learners marked excused in today's attendance logs." },
        ];
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
      title: "Attendance",
      icon: CalendarX,
      showViewSelect: true,
      stats: attendanceStats,
    },
    {
      title: "Action Items",
      icon: AlertCircle,
      stats: [
        { label: "Pending", value: stats.pendingActions.toLocaleString(), icon: Clock, note: { text: "Needs review" }, desc: "Open record flags + submitted ADM awaiting approval + pending accounts." },
        { label: "At Risk", value: stats.atRiskCount.toLocaleString(), icon: AlertTriangle, note: { text: "Follow-up" }, desc: "Unique learners with a risk assessment in the active year." },
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
  const [month, setMonth] = useState("");
  const [attendanceView, setAttendanceView] = useState<"presentAbsent" | "lateExcused">("presentAbsent");
  const [railOpen, setRailOpen] = useState(true);
  const { data, error, refresh } = useDashboardOverview(month || undefined);

  const riskCount = data?.atRiskStudents?.length ?? 0;
  const [riskIndex, setRiskIndex] = useState(0);
  useEffect(() => {
    if (riskCount <= 1) return;
    const timer = setTimeout(() => setRiskIndex((i) => (i + 1) % riskCount), 2000);
    return () => clearTimeout(timer);
  }, [riskCount, riskIndex]);

  const loading = !data && !error;

  if (loading) {
    return (
      <>
        <div className={styles.skHeaderRow}>
          <div className={styles.pageHeading}>
            <h1 className={styles.pageTitle}>Dashboard</h1>
            <p className={styles.pageSubtitle}>Loading the latest aggregates from the school records…</p>
          </div>
        </div>

        <div className={styles.skKpiGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skCard}>
              <div className={`${styles.skeleton} ${styles.skCardHeaderLine}`} />
              <div className={styles.skStatGrid}>
                <div className={`${styles.skStat} ${styles.skeleton}`}>
                  <div className={`${styles.skeleton} ${styles.skStatLineSm}`} />
                  <div className={`${styles.skeleton} ${styles.skStatLineLg}`} />
                </div>
                <div className={`${styles.skStat} ${styles.skeleton}`}>
                  <div className={`${styles.skeleton} ${styles.skStatLineSm}`} />
                  <div className={`${styles.skeleton} ${styles.skStatLineLg}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={`${styles.dashboardGrid} ${styles.skLayoutGrid}`}>
          <div className={styles.skRail}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.skRailItem}>
                <div className={`${styles.skeleton} ${styles.skRailTitle}`} />
                <div className={`${styles.skeleton} ${i === 1 ? styles.skRailRowSm : styles.skRailRow}`} />
                <div className={`${styles.skeleton} ${styles.skRailRowSm}`} />
              </div>
            ))}
          </div>

          <div className={styles.skPanel}>
            <div className={styles.skPanelHeader}>
              <div className={`${styles.skeleton} ${styles.skPanelTitle}`} />
              <div className={`${styles.skeleton} ${styles.skBadge}`} />
            </div>
            <div className={styles.skChartGrid}>
              <div className={`${styles.skeleton} ${styles.skChart}`} />
              <div className={`${styles.skeleton} ${styles.skChart}`} />
            </div>
            <div className={`${styles.skeleton} ${styles.skFullChart}`} />
          </div>
        </div>
      </>
    );
  }

  if (error || !data) {
    const message =
      error instanceof ApiClientError ? error.message : "Could not load the dashboard. Please try again.";
    return (
      <div className={styles.errorCard}>
        <AlertTriangle className={styles.errorIcon} />
        <p className={styles.errorText}>{message}</p>
        <button className={styles.retryButton} onClick={() => refresh()}>
          <RefreshCw className={styles.retryIcon} />
          Retry
        </button>
      </div>
    );
  }

  const cards = kpiCards(data.stats, attendanceView);
  const atRisk = data.atRiskStudents.map((student) => ({
    initials: initials(student.firstName, student.lastName),
    name: `${student.firstName} ${student.lastName}`.trim(),
    attendance: student.attendanceRate ?? 0,
    risk: student.riskLevel,
    section: student.sectionName ?? "No section",
  }));
  const currentRisk = atRisk.length > 0 ? atRisk[riskIndex % atRisk.length] : undefined;
  const riskTone =
    currentRisk?.risk === "high" ? "high" : currentRisk?.risk === "moderate" ? "moderate" : "low";
  const admBadgeCount = data.admForApproval.length;

  return (
    <>
      <div className={styles.pageHeaderRow}>
        <div className={styles.pageHeading}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Monitor attendance, student records, and school activities from a centralized dashboard.</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.railBtn} ${!railOpen ? styles.railBtnActive : ""}`}
            onClick={() => setRailOpen((o) => !o)}
            aria-label={railOpen ? "Hide side panel" : "Show side panel"}
            aria-pressed={!railOpen}
          >
            {railOpen ? (
              <PanelLeftClose className={styles.railBtnIcon} />
            ) : (
              <PanelLeftOpen className={styles.railBtnIcon} />
            )}
          </button>
          <InfoDialog title="Principal Dashboard — What You See">
          <p className={styles.modalIntro}>
            This dashboard aggregates live school records so you can monitor enrollment, attendance, student risk, and
            approval workflows from a single view. Every figure updates after each school day ends.
          </p>

          <h3 className={styles.modalSection}>Top cards (KPIs)</h3>
          <ul className={styles.modalList}>
            <li><strong>Enrollment Stats</strong> — Total learners on the active school-year roster (assigned to an active section) and ADM profiles that are approved.</li>
            <li><strong>Attendance</strong> — nested cards for today&apos;s logs. Use the select to view Present/Absent or Late/Excused, and the Present rate as a percentage of everyone logged today.</li>
            <li><strong>Action Items</strong> — Pending = open record flags + ADM profiles awaiting approval + accounts still pending; At Risk = unique learners with a risk assessment in the active year.</li>
            <li><strong>Documentation</strong> — Anecdotal/behavior records created this month and SF10 (Form 137) records marked Ready or Released.</li>
          </ul>
          <p className={styles.modalNote}>Hover any KPI stat to see a short explanation of what it measures.</p>

          <h3 className={styles.modalSection}>At Risk Students</h3>
          <p>Carousel of learners with an active-year risk assessment (any level — low, moderate, or high), one at a time, with their section and attendance rate.</p>

          <h3 className={styles.modalSection}>Quick Actions</h3>
          <p>Shortcuts to common tasks: add a student, scan attendance, generate SF10, write an anecdotal report, open ADM records, and export reports.</p>

          <h3 className={styles.modalSection}>ADM for Approval</h3>
          <p>ADM learner profiles submitted by staff and awaiting your approval/signature (up to 3).</p>

          <h3 className={styles.modalSection}>Analytics</h3>
          <ul className={styles.modalList}>
            <li><strong>Daily Attendance Trend</strong> — the school week (Mon–Fri). Each dot is that day&apos;s Present-to-logged rate; days with no logs yet show &quot;No data yet&quot;. The dashed line is the 95% target.</li>
            <li><strong>Section Attendance Heatmap</strong> — colour intensity shows each section&apos;s attendance per weekday of the current week.</li>
            <li><strong>Section Performance Breakdown</strong> — for each section, the bars show statuses as % of all attendance it logged. Switch between Present/Absent and Late/Excused with the tabs, and filter to a specific month with the month picker (blank = all time).</li>
          </ul>
        </InfoDialog>
        </div>
      </div>

      <div className={styles.kpiGrid}>
        {cards.map((card) => (
          <div key={card.title} className={styles.kpiCard}>
            <div className={styles.kpiCardHeader}>
              <span>{card.title}</span>
              {card.showViewSelect ? (
                <CustomSelect
                  id="kpi-attendance-view"
                  value={attendanceView}
                  options={[
                    { value: "presentAbsent", label: "Present / Absent" },
                    { value: "lateExcused", label: "Late / Excused" },
                  ]}
                  onChange={(v) => setAttendanceView(v as "presentAbsent" | "lateExcused")}
                  size="sm"
                  showCheck={false}
                  className={styles.kpiAttendanceSelect}
                />
              ) : (
                <card.icon className={styles.kpiCardIcon} />
              )}
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

      <div className={`${styles.dashboardGrid} ${!railOpen ? styles.dashboardGridWide : ""}`}>
        <div className={`${styles.leftRail} ${!railOpen ? styles.leftRailCollapsed : ""}`}>
          <div className={styles.atRiskCard}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>At Risk Students</h3>
                {data.term || data.schoolYear ? (
                  <p className={styles.cardSubtitle}>
                    {data.term ? `${data.term} · ` : ""}
                    {data.schoolYear ?? ""}
                  </p>
                ) : null}
              </div>
              <span className={`${styles.badge} ${styles.badgeDanger}`}>{data.stats.atRiskCount} Students</span>
            </div>
            <div className={styles.atRiskList}>
              {!currentRisk ? (
                <span className={styles.emptyText}>No at-risk students detected.</span>
              ) : (
                <div className={styles.atRiskCarousel}>
                  <div
                    className={`${styles.atRiskItem} ${styles[riskTone === "high" ? "atRiskItemHigh" : riskTone === "moderate" ? "atRiskItemModerate" : "atRiskItemLow"]}`}
                  >
                    <div className={styles.atRiskTop}>
                      <div
                        className={`${styles.avatar} ${
                          styles[
                            riskTone === "high"
                              ? "avatarDanger"
                              : riskTone === "moderate"
                              ? "avatarModerate"
                              : "avatarLow"
                          ]
                        } ${styles.atRiskAvatar}`}
                      >
                        {currentRisk.initials}
                      </div>
                      <span className={styles.atRiskName}>{currentRisk.name}</span>
                    </div>
                    <div className={styles.atRiskDetail}>
                      <div className={styles.atRiskDetailCol}>
                        <span className={styles.atRiskDetailLabel}>Attendance</span>
                        <span className={styles.atRiskDetailValue}>{currentRisk.attendance}%</span>
                      </div>
                      <div className={styles.atRiskDetailCol}>
                        <span className={styles.atRiskDetailLabel}>Level</span>
                        <span
                          className={`${styles.atRiskDetailValue} ${
                            styles[
                              riskTone === "high"
                                ? "atRiskDetailValueDanger"
                                : riskTone === "moderate"
                                  ? "atRiskDetailValueModerate"
                                  : "atRiskDetailValueLow"
                            ]
                          }`}
                        >
                          {currentRisk.risk.charAt(0).toUpperCase() + currentRisk.risk.slice(1)}
                        </span>
                      </div>
                      <div className={styles.atRiskDetailCol}>
                        <span className={styles.atRiskDetailLabel}>Section</span>
                        <span className={styles.atRiskDetailValue}>{currentRisk.section}</span>
                      </div>
                    </div>
                  </div>
                  {atRisk.length > 1 && (
                    <div className={styles.atRiskDots}>
                      {atRisk.map((_, i) => (
                        <button
                          key={i}
                          className={`${styles.atRiskDot} ${i === riskIndex ? styles.atRiskDotActive : ""}`}
                          onClick={() => setRiskIndex(i)}
                          aria-label={`At-risk student ${i + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
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