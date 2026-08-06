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
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import Analytics from "@/components/dashboard/analytics";
import styles from "./page.module.css";

const kpiCards = [
  {
    title: "Enrollment Stats",
    icon: Users,
    stats: [
      { label: "Total", value: "1,248", icon: Users, note: { icon: TrendingUp, text: "+3.2%", strong: true } },
      { label: "Present", value: "1,180", icon: UserCheck, note: { text: "94.5% rate" } },
    ],
  },
  {
    title: "Attendance & ADM",
    icon: CalendarX,
    stats: [
      { label: "Absent", value: "68", icon: UserX, note: { icon: TrendingDown, text: "5.5% today", strong: true } },
      { label: "ADM", value: "42", icon: BookOpen, note: { text: "Alternative" } },
    ],
  },
  {
    title: "Action Items",
    icon: AlertCircle,
    stats: [
      { label: "Pending", value: "15", icon: Clock, note: { text: "Needs review" } },
      { label: "At Risk", value: "8", icon: AlertTriangle, note: { text: "Follow-up" } },
    ],
  },
  {
    title: "Documentation",
    icon: FileCheck2,
    stats: [
      { label: "Anecdotal", value: "29", icon: FileText, note: { text: "This month" } },
      { label: "SF10", value: "312", icon: FolderOpen, note: { icon: TrendingUp, text: "Up to date", strong: true } },
    ],
  },
];

const atRiskStudents = [
  { initials: "JD", name: "Juan Dela Cruz", meta: "7-Bonifacio · 79% attendance" },
  { initials: "MS", name: "Maria Santos", meta: "8-Mabini · 82% attendance" },
  { initials: "RT", name: "Ramon Tolentino", meta: "10-Quezon · 84% attendance" },
];

const quickActions = [
  { label: "Add Student", hint: "New profile", icon: UserPlus },
  { label: "Scan Attendance", hint: "Log entry", icon: QrCode },
  { label: "Generate SF10", hint: "Form 137", icon: FilePlus },
  { label: "Anecdotal Report", hint: "Behavior log", icon: FileText },
  { label: "ADM Records", hint: "Modules", icon: BookOpen },
  { label: "Export Reports", hint: "PDF / CSV", icon: Download },
];

const admApprovals = [
  { title: "Module Batch 4", meta: "7-Rizal · Submitted by T. Reyes" },
  { title: "Module Batch 5", meta: "8-Mabini · Submitted by L. Cruz" },
  { title: "Learning Packet 2", meta: "10-Quezon · Submitted by J. Ramos" },
];

export default function DashboardPage() {
  return (
    <>
      <div className={styles.pageHeading}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageSubtitle}>Monitor attendance, student records, and school activities from a centralized dashboard.</p>
      </div>

      <div className={styles.kpiGrid}>
        {kpiCards.map((card) => (
          <div key={card.title} className={styles.kpiCard}>
            <div className={styles.kpiCardHeader}>
              <span>{card.title}</span>
              <card.icon className={styles.kpiCardIcon} />
            </div>
            <div className={styles.kpiStats}>
              {card.stats.map((stat) => (
                <div key={stat.label} className={styles.kpiStat}>
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
              <span className={`${styles.badge} ${styles.badgeDanger}`}>8 Students</span>
            </div>
            <div className={styles.atRiskList}>
              {atRiskStudents.map((student) => (
                <div key={student.name} className={styles.atRiskItem}>
                  <div className={`${styles.avatar} ${styles.avatarDanger}`}>{student.initials}</div>
                  <div className={styles.atRiskInfo}>
                    <span className={styles.atRiskName}>{student.name}</span>
                    <span className={styles.atRiskMeta}>{student.meta}</span>
                  </div>
                  <AlertTriangle className={styles.atRiskIcon} />
                </div>
              ))}
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
              <span className={`${styles.badge} ${styles.badgeWarning}`}>5 Pending</span>
            </div>
            <div className={styles.admList}>
              {admApprovals.map((item) => (
                <div key={item.title} className={styles.admItem}>
                  <div className={styles.admIcon}>
                    <FileText className={styles.admIconGlyph} />
                  </div>
                  <div className={styles.admInfo}>
                    <span className={styles.admTitle}>{item.title}</span>
                    <span className={styles.admMeta}>{item.meta}</span>
                  </div>
                  <span className={styles.admStatus}>Pending</span>
                </div>
              ))}
            </div>
            <div className={styles.cardFooter}>
              <span>Awaiting principal&apos;s signature</span>
              <span className={styles.cardLink}>Review all</span>
            </div>
          </div>
        </div>

        <Analytics />
      </div>
    </>
  );
}