import type { StudentsPage } from "@/lib/students";
import { initials } from "@/lib/students-format";
import { RiskBadge, Sf10Badge, StatusBadge } from "@/components/students/badges";
import styles from "./students-table.module.css";

interface StudentsTableProps {
  page: NonNullable<StudentsPage>;
  onSelect: (id: string) => void;
}

function rateTone(rate: number): string {
  if (rate >= 90) return styles.countGood;
  if (rate >= 80) return styles.countWarn;
  return styles.countDanger;
}

export default function StudentsTable({ page, onSelect }: StudentsTableProps) {
  const students = page.data;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.tableHeadRow}>
            <th className={`${styles.th} ${styles.thCenter}`}>Student ID</th>
            <th className={styles.th}>Student</th>
            <th className={`${styles.th} ${styles.thCenter}`}>Grade & Section</th>
            <th className={`${styles.th} ${styles.thCenter}`}>Gender</th>
            <th className={`${styles.th} ${styles.thCenter}`}>Account Status</th>
            <th className={`${styles.th} ${styles.thCenter}`}>SF10</th>
            <th className={`${styles.th} ${styles.thCenter}`}>Attendance</th>
            <th className={`${styles.th} ${styles.thCenter}`}>Risk Level</th>
            <th className={`${styles.th} ${styles.thRight}`}>Actions</th>
          </tr>
        </thead>
        <tbody className={styles.tableBody}>
          {students.map((s) => (
            <tr key={s.studentId} className={styles.tableRow}>
              <td className={`${styles.td} ${styles.tdCenter}`}>
                <span className={styles.tdId}>{s.lrn}</span>
              </td>
              <td className={styles.td}>
                <div className={styles.studentCell}>
                  {s.photoUrl ? (

                    <img src={s.photoUrl} alt={s.firstName} className={styles.avatar} />
                  ) : (
                    <div className={styles.avatar}>{initials(s.firstName, s.lastName)}</div>
                  )}
                  <div className={styles.studentCellInfo}>
                    <div className={styles.studentName}>
                      {s.firstName} {s.lastName}
                    </div>
                  </div>
                </div>
              </td>
              <td className={`${styles.td} ${styles.tdCenter}`}>
                <span className={styles.tdText}>
                  {s.gradeLabel}
                  {s.sectionName ? ` - ${s.sectionName}` : ""}
                </span>
              </td>
              <td className={`${styles.td} ${styles.tdCenter}`}>
                <span className={styles.tdText}>{s.sex.charAt(0).toUpperCase() + s.sex.slice(1)}</span>
              </td>
              <td className={`${styles.td} ${styles.tdCenter}`}>
                <StatusBadge status={s.accountStatus} />
              </td>
              <td className={`${styles.td} ${styles.tdCenter}`}>
                <Sf10Badge status={s.sf10} />
              </td>
              <td className={`${styles.td} ${styles.tdCenter}`}>
                {s.attendance != null ? (
                  <span className={`${styles.count} ${rateTone(s.attendance)}`}>{s.attendance}%</span>
                ) : (
                  <span className={`${styles.count} ${styles.countMuted}`}>—</span>
                )}
              </td>
              <td className={`${styles.td} ${styles.tdCenter}`}>
                <RiskBadge
                  tone={s.riskLevel ?? "neutral"}
                  academicAvg={s.academicAvg}
                  attendance={s.attendance}
                  anecdotalCount={s.anecdotalCount}
                />
              </td>
              <td className={`${styles.td} ${styles.tdRight}`}>
                <button className={styles.viewLink} onClick={() => onSelect(s.studentId)}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}