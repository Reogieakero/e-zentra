import { X } from "lucide-react";
import type { StudentDetail } from "@/lib/students";
import { formatDate, initials, sessionLabel } from "@/lib/students-format";
import { RiskBadge, StatusBadge } from "@/components/students/badges";
import styles from "./students-drawer.module.css";

interface StudentDrawerProps {
  student: StudentDetail["data"] | undefined;
  onClose: () => void;
}

export default function StudentDrawer({ student, onClose }: StudentDrawerProps) {
  const generalAverage = student?.generalAverage ?? null;
  const attendance = student?.attendance ?? null;
  const anecdotalCount = student?.anecdotalCount ?? 0;

  const academicRisk = generalAverage != null && generalAverage < 75;
  const attendanceRisk = attendance != null && attendance < 80;
  const behavioralRisk = anecdotalCount >= 1;

  const flags = [
    {
      label: "Academic average",
      ok: !academicRisk,
      value: generalAverage != null ? String(generalAverage) : "—",
      detail: academicRisk ? "Below passing 75" : "On or above 75",
    },
    {
      label: "Attendance rate",
      ok: !attendanceRisk,
      value: attendance != null ? `${attendance}%` : "—",
      detail: attendanceRisk ? "Below 80%" : "At or above 80%",
    },
    {
      label: "Behavioral incidents",
      ok: !behavioralRisk,
      value: String(anecdotalCount),
      detail: behavioralRisk ? "Logged concerns" : "No logged concerns",
    },
  ];
  const flaggedCount = flags.filter((f) => !f.ok).length;
  const riskLevel = flaggedCount >= 2 ? "high" : flaggedCount === 1 ? "moderate" : "low";
  const riskLevelLabel = riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1);
  const hasRiskData = generalAverage != null || attendance != null || anecdotalCount > 0;

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
                <div className={styles.drawerProfileInfo}>
                  <div className={styles.drawerName}>{student.fullName}</div>
                  <div className={styles.drawerBadges}>
                    <StatusBadge status={student.accountStatus} />
                    {hasRiskData && (
                      <RiskBadge
                        tone={riskLevel}
                        academicAvg={generalAverage}
                        attendance={attendance}
                        anecdotalCount={anecdotalCount}
                      />
                    )}
                  </div>
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
                  {hasRiskData ? (
                    <span className={`${styles.riskChip} ${styles[`riskChip_${riskLevel}`]}`}>
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
                    <div className={styles.sectionHintWrap}>
                      <span className={styles.sectionHint}>Showing last 7 days of attendance</span>
                      <button className={styles.viewAllLink}>View All</button>
                    </div>
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
            </>
          )}
        </div>
      </aside>
    </div>
  );
}