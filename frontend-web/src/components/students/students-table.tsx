import type { StudentsPage } from "@/lib/students";
import { initials } from "@/lib/students-format";
import { RiskBadge, Sf10Badge, StatusBadge } from "@/components/students/badges";
import styles from "./students-table.module.css";

interface StudentsTableProps {
  page: NonNullable<StudentsPage>;
  onSelect: (id: string) => void;
}

export default function StudentsTable({ page, onSelect }: StudentsTableProps) {
  const students = page.data;

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.tableHeadRow}>
            <th className={styles.th}>Student ID</th>
            <th className={styles.th}>Student</th>
            <th className={styles.th}>Grade & Section</th>
            <th className={styles.th}>Gender</th>
            <th className={styles.th}>Account Status</th>
            <th className={styles.th}>SF10</th>
            <th className={styles.th}>Attendance</th>
            <th className={styles.th}>Risk Level</th>
            <th className={`${styles.th} ${styles.thRight}`}>Actions</th>
          </tr>
        </thead>
        <tbody className={styles.tableBody}>
          {students.map((s) => (
            <tr key={s.studentId} className={styles.tableRow}>
              <td className={styles.td}>
                <span className={styles.tdId}>{s.lrn}</span>
              </td>
              <td className={styles.td}>
                <div className={styles.studentCell}>
                  {s.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
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
              <td className={styles.td}>
                <span className={styles.tdText}>
                  {s.gradeLabel}
                  {s.sectionName ? ` - ${s.sectionName}` : ""}
                </span>
              </td>
              <td className={styles.td}>
                <span className={styles.tdText}>{s.sex.charAt(0).toUpperCase() + s.sex.slice(1)}</span>
              </td>
              <td className={styles.td}>
                <StatusBadge status={s.accountStatus} />
              </td>
              <td className={styles.td}>
                <Sf10Badge status={s.sf10} />
              </td>
              <td className={styles.td}>
                <span className={styles.attendanceValue}>{s.attendance != null ? `${s.attendance}%` : "—"}</span>
              </td>
              <td className={styles.td}>
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