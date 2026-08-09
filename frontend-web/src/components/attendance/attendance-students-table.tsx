"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { useSectionRoster } from "@/lib/dashboard";
import { initials } from "@/lib/students-format";
import { AttendanceStudentModal } from "@/components/attendance/attendance-student-modal";
import { TablePagination } from "@/components/ui/table-pagination";
import styles from "./attendance-students-table.module.css";

const PAGE_SIZE = 10;

function rateTone(rate: number): string {
  if (rate >= 90) return styles.rateGood;
  if (rate >= 80) return styles.rateWarn;
  return styles.rateDanger;
}

export function AttendanceStudentsTable({ sectionId }: { sectionId: string }) {
  const { data: students, isLoading } = useSectionRoster(sectionId);
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(students.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = students.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const fromCount = students.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const toCount = Math.min((safePage + 1) * PAGE_SIZE, students.length);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h4 className={styles.cardTitle}>
            <Users className={styles.cardTitleIcon} />
            Section Roster
          </h4>
          <p className={styles.cardSubtitle}>Active school year · click a student to view their trend</p>
        </div>
        <span className={styles.countBadge}>{students.length.toLocaleString()} students</span>
      </div>

      {isLoading ? (
        <div className={styles.skRows}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skRow}>
              <div className={`${styles.skeleton} ${styles.skAvatar}`} />
              <div className={`${styles.skeleton} ${styles.skName}`} />
              <div className={`${styles.skeleton} ${styles.skRate}`} />
            </div>
          ))}
        </div>
      ) : students.length === 0 ? (
        <p className={styles.empty}>No students enrolled in this section.</p>
      ) : (
        <div className={styles.tableBody}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.headRow}>
                <th className={styles.th}>Student</th>
                <th className={styles.th}>LRN</th>
                <th className={`${styles.th} ${styles.thCenter}`}>Present</th>
                <th className={`${styles.th} ${styles.thCenter}`}>Late</th>
                <th className={`${styles.th} ${styles.thCenter}`}>Absent</th>
                <th className={`${styles.th} ${styles.thCenter}`}>Excused</th>
                <th className={`${styles.th} ${styles.thCenter}`}>Not logged</th>
                <th className={`${styles.th} ${styles.thRight}`}>Attendance Rate</th>
              </tr>
            </thead>
            <tbody className={styles.body}>
              {pageRows.map((s) => (
                <tr key={s.studentId} className={styles.row} onClick={() => setSelected(s.studentId)}>
                  <td className={styles.td}>
                    <div className={styles.studentCell}>
                      <div className={styles.avatar}>{initials(s.firstName, s.lastName)}</div>
                      <span className={styles.studentName}>
                        {s.firstName} {s.lastName}
                      </span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.lrn}>{s.lrn}</span>
                  </td>
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <span className={`${styles.count} ${styles.countGood}`}>{s.present}</span>
                  </td>
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <span className={`${styles.count} ${styles.countWarn}`}>{s.late}</span>
                  </td>
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <span className={`${styles.count} ${styles.countDanger}`}>{s.absent}</span>
                  </td>
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <span className={`${styles.count} ${styles.countInfo}`}>{s.excused}</span>
                  </td>
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    <span className={`${styles.count} ${styles.countMuted}`}>{s.notLogged}</span>
                  </td>
                  <td className={`${styles.td} ${styles.tdRight}`}>
                    {s.rate != null ? (
                      <span className={`${styles.rate} ${rateTone(s.rate)}`}>{s.rate.toFixed(1)}%</span>
                    ) : (
                      <span className={styles.noData}>No records</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && (
        <TablePagination
          page={safePage}
          pageCount={totalPages}
          info={students.length > 0 ? `${fromCount}–${toCount} of ${students.length}` : "No students"}
          onPageChange={setPage}
          className={styles.footer}
        />
      )}

      {selected ? (
        <AttendanceStudentModal
          sectionId={sectionId}
          studentId={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}