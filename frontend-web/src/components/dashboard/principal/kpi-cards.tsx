"use client";

import type { LucideIcon } from "lucide-react";
import { AlertCircle, AlertTriangle, BookOpen, CalendarX, Clock, FileCheck2, FileText, FolderOpen, TrendingDown, TrendingUp, UserCheck, Users, UserX } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import type { DashboardStats } from "@/lib/dashboard";
import styles from "./kpi-cards.module.css";

export type AttendanceView = "presentAbsent" | "lateExcused";

interface KpiStatConfig {
  label: string;
  value: string;
  icon: LucideIcon;
  note: { icon?: LucideIcon; text: string; strong?: boolean };
  desc: string;
}

interface KpiCardConfig {
  title: string;
  icon: LucideIcon;
  flipEnabled?: boolean;
  faces: KpiStatConfig[][];
}

function buildKpiCards(stats: DashboardStats): KpiCardConfig[] {
  const attendanceStats: KpiStatConfig[] = [
    {
      label: "Present",
      value: stats.presentToday.toLocaleString(),
      icon: UserCheck,
      note: { text: `${stats.presentRate}% rate today` },
      desc: "Learners marked present today; the % is present out of everyone logged today.",
    },
    {
      label: "Absent",
      value: stats.absentToday.toLocaleString(),
      icon: UserX,
      note: { icon: TrendingDown, text: "Today", strong: true },
      desc: "Learners marked absent in today's attendance logs.",
    },
  ];

  const lateExcusedStats: KpiStatConfig[] = [
    {
      label: "Late",
      value: stats.lateToday.toLocaleString(),
      icon: Clock,
      note: { icon: TrendingDown, text: "Today", strong: true },
      desc: "Learners marked late in today's attendance logs.",
    },
    {
      label: "Excused",
      value: stats.excusedToday.toLocaleString(),
      icon: FileCheck2,
      note: { text: "Today" },
      desc: "Learners marked excused in today's attendance logs.",
    },
  ];

  return [
    {
      title: "Enrollment Stats",
      icon: Users,
      faces: [
        [
          {
            label: "Total",
            value: stats.totalStudents.toLocaleString(),
            icon: Users,
            note: { icon: TrendingUp, text: "Enrolled learners", strong: true },
            desc: "Learners on the active school-year roster (assigned to an active section).",
          },
          {
            label: "ADM",
            value: stats.admActive.toLocaleString(),
            icon: BookOpen,
            note: { text: "Active profiles" },
            desc: "ADM learner profiles currently in approved status.",
          },
        ],
      ],
    },
    {
      title: "Attendance",
      icon: CalendarX,
      flipEnabled: true,
      faces: [attendanceStats, lateExcusedStats],
    },
    {
      title: "Action Items",
      icon: AlertCircle,
      faces: [
        [
          {
            label: "Pending",
            value: stats.pendingActions.toLocaleString(),
            icon: Clock,
            note: { text: "Needs review" },
            desc: "Open record flags + submitted ADM awaiting approval + pending accounts.",
          },
          {
            label: "At Risk",
            value: stats.atRiskCount.toLocaleString(),
            icon: AlertTriangle,
            note: { text: "Follow-up" },
            desc: "Unique learners with a risk assessment in the active year.",
          },
        ],
      ],
    },
    {
      title: "Documentation",
      icon: FileCheck2,
      faces: [
        [
          {
            label: "Anecdotal",
            value: stats.anecdotalThisMonth.toLocaleString(),
            icon: FileText,
            note: { text: "This month" },
            desc: "Anecdotal records created this month.",
          },
          {
            label: "SF10",
            value: stats.sf10Count.toLocaleString(),
            icon: FolderOpen,
            note: { icon: TrendingUp, text: "Ready / released", strong: true },
            desc: "SF10 (Form 137) records marked ready or released.",
          },
        ],
      ],
    },
  ];
}

interface KpiCardsProps {
  stats: DashboardStats;
  attendanceView: AttendanceView;
  onAttendanceViewChange: (view: AttendanceView) => void;
}

function StatTiles({ stats }: { stats: KpiStatConfig[] }) {
  return (
    <>
      {stats.map((stat) => (
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
    </>
  );
}

export default function KpiCards({ stats, attendanceView, onAttendanceViewChange }: KpiCardsProps) {
  const cards = buildKpiCards(stats);
  const flipped = attendanceView === "lateExcused";

  return (
    <div className={styles.kpiGrid}>
      {cards.map((card) => (
        <div key={card.title} className={styles.kpiCard}>
          <div className={styles.kpiCardHeader}>
            <span>{card.title}</span>
            <div className={styles.kpiCardActions}>
              {card.flipEnabled ? (
                <a
                  href="#flip"
                  className={styles.kpiFlipLink}
                  aria-label="Flip attendance view"
                  title={flipped ? "Show Present / Absent" : "Show Late / Excused"}
                  onClick={(e) => {
                    e.preventDefault();
                    onAttendanceViewChange(flipped ? "presentAbsent" : "lateExcused");
                  }}
                >
                  <card.icon className={styles.kpiFlipIcon} />
                  <span>Flip</span>
                </a>
              ) : (
                <card.icon className={styles.kpiCardIcon} />
              )}
            </div>
          </div>
          {card.flipEnabled ? (
            <div className={`${styles.kpiFlip} ${flipped ? styles.kpiFlipFlipped : ""}`}>
              <div className={styles.kpiFlipInner}>
                <div className={`${styles.kpiFace} ${styles.kpiFaceFront}`}>
                  <div className={styles.kpiStats}>
                    <StatTiles stats={card.faces[0]} />
                  </div>
                </div>
                <div className={`${styles.kpiFace} ${styles.kpiFaceBack}`}>
                  <div className={styles.kpiStats}>
                    <StatTiles stats={card.faces[1]} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.kpiStats}>
              <StatTiles stats={card.faces[0]} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}