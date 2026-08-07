import { CalendarCheck2, FileText, FolderOpen, X } from "lucide-react";
import type { StudentDetail } from "@/lib/students";
import { formatDate, initials, sessionLabel } from "@/lib/students-format";
import { RiskBadge, StatusBadge } from "@/components/students/badges";
import styles from "./students-drawer.module.css";

interface StudentDrawerProps {
  student: StudentDetail["data"] | undefined;
  onClose: () => void;
}

export default function StudentDrawer({ student, onClose }: StudentDrawerProps) {
  const risk = student?.risk;
  const flags = risk
    ? [
        {
          label: "Academic average",
          ok: !risk.academicRisk,
          value: student.generalAverage != null ? String(student.generalAverage) : "—",
          detail: risk.academicRisk ? "Below passing 75" : "On or above 75",
        },
        {
          label: "Attendance rate",
          ok: !risk.attendanceRisk,
          value: student.attendance != null ? `${student.attendance}%` : "—",
          detail: risk.attendanceRisk ? "Below 80%" : "At or above 80%",
        },
        {
          label: "Behavioral incidents",
          ok: !risk.behavioralRisk,
          value: String(student.anecdotalCount),
          detail: risk.behavioralRisk ? "Logged concerns" : "No logged concerns",
        },
      ]
    : [];
  const flaggedCount = flags.filter((f) => !f.ok).length;
  const riskLevelLabel = risk ? risk.riskLevel.charAt(0).toUpperCase() + risk.riskLevel.slice(1) : "";

  return (
    <div className={styles.drawerRoot} role="dialog" aria-modal="true">
      <div className={styles.drawerBackdrop} onClick={onClose} />
      <aside className={styles.drawer}>
        <div className={styles.drawerHeader}>
          <h3 className={styles.drawerTitle}>Student Information</h3>
          <button className={styles.iconBtn} onClick={onClose} aria-label="Close drawer">
            <X className={styles.iconBtnIcon} />
          </button>
        </div>

        <div className={styles.drawerBody}>
          {!student ? (
            <div className={styles.drawerLoading}>
              <div className={`${styles.skeleton} ${styles.skAvatar}`} />
              <div className={`${styles.skeleton} ${styles.skName}`} />
              <div className={`${styles.skeleton} ${styles.skSub}`} />
            </div>
          ) : (
            <>
              <div className={styles.drawerProfile}>
                {student.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={student.photoUrl} alt={student.fullName} className={styles.drawerAvatar} />
                ) : (
                  <div className={styles.drawerAvatar}>
                    {initials(student.firstName, student.lastName)}
                  </div>
                )}
                <div className={styles.drawerName}>{student.fullName}</div>
                <div className={styles.drawerBadges}>
                  <StatusBadge status={student.accountStatus} />
                  {student.risk && <RiskBadge tone={student.risk.riskLevel} />}
                </div>
              </div>

              <div className={styles.quickStats}>
                <div className={styles.quickStat}>
                  <div className={styles.quickStatValue}>{student.attendance != null ? `${student.attendance}%` : "—"}</div>
                  <div className={styles.quickStatLabel}>Attendance</div>
                </div>
                <div className={styles.quickStat}>
                  <div className={styles.quickStatValue}>{student.generalAverage != null ? student.generalAverage : "—"}</div>
                  <div className={styles.quickStatLabel}>General Average</div>
                </div>
                <div className={styles.quickStat}>
                  <div className={styles.quickStatValue}>{student.anecdotalCount}</div>
                  <div className={styles.quickStatLabel}>Anecdotal{student.anecdotalCount === 1 ? " Entry" : " Entries"}</div>
                </div>
              </div>

              <section className={styles.drawerSection}>
                <div className={styles.sectionLabelRow}>
                  <span className={styles.sectionLabel}>Risk Snapshot</span>
                  {risk ? (
                    <span className={`${styles.riskChip} ${styles[`riskChip_${risk.riskLevel}`]}`}>
                      {riskLevelLabel} Risk · {flaggedCount} of 3
                    </span>
                  ) : (
                    <span className={styles.muted}>No assessment</span>
                  )}
                </div>
                <div className={styles.riskPanel}>
                  {flags.length === 0 ? (
                    <span className={styles.muted}>No risk assessment recorded for this student yet.</span>
                  ) : (
                    flags.map((row) => (
                      <div key={row.label} className={styles.riskRow}>
                        <span className={styles.riskRowLabel}>{row.label}</span>
                        <span className={styles.riskRowValueWrap}>
                          <span className={`${styles.riskRowValue} ${row.ok ? styles.riskRowValueOk : styles.riskRowValueBad}`}>
                            {row.value}
                          </span>
                          <span className={styles.riskRowDetail}>{row.detail}</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {student.recentAttendance.length > 0 && (
                <section className={styles.drawerSection}>
                  <div className={styles.sectionLabelRow}>
                    <span className={styles.sectionLabel}>Attendance Records</span>
                    <span className={styles.sectionHint}>Showing last 7 days of attendance</span>
                  </div>
                  <div className={styles.attendanceCard}>
                    <div className={styles.attendanceColHead}>
                      <span className={styles.attColDate}>Date</span>
                      <span className={styles.attColSession}>Morning Session</span>
                      <span className={styles.attColBreak}>Break</span>
                      <span className={styles.attColSession}>Afternoon Session</span>
                    </div>
                    {student.recentAttendance.map((day) => (
                      <div key={day.date} className={styles.attendanceDay}>
                        <div className={styles.attendanceDate}>{formatDate(day.date)}</div>
                        <div className={styles.attendanceSlots}>
                          <span
                            className={`${styles.attSession} ${day.morning ? styles[`att_${day.morning}`] : styles.att_missing}`}
                          >
                            {day.morning ? sessionLabel(day.morning) : "No Record"}
                          </span>
                          <span className={styles.attBreak}>Break</span>
                          <span
                            className={`${styles.attSession} ${day.afternoon ? styles[`att_${day.afternoon}`] : styles.att_missing}`}
                          >
                            {day.afternoon ? sessionLabel(day.afternoon) : "No Record"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className={styles.drawerActions}>
                <button className={styles.drawerActionBtn}>
                  <CalendarCheck2 size={16} className={styles.drawerActionIcon} /> View Attendance
                </button>
                <button className={styles.drawerActionBtn}>
                  <FolderOpen size={16} className={styles.drawerActionIcon} /> View SF10
                </button>
                <button className={styles.drawerActionBtn}>
                  <FileText size={16} className={styles.drawerActionIcon} /> Anecdotal Records
                </button>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}