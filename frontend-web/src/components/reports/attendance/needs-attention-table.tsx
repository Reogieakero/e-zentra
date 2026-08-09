"use client";

import { useMemo, useState } from "react";
import { Flag } from "lucide-react";
import type { NeedsAttentionStudent } from "@/lib/dashboard";
import { initials } from "@/lib/students-format";
import { AttendanceStudentModal } from "@/components/attendance/attendance-student-modal";
import { TablePagination } from "@/components/ui/table-pagination";
import styles from "./needs-attention-table.module.css";

const PAGE_SIZE = 8;

interface NeedsAttentionTableProps {
  rows: NeedsAttentionStudent[];
}

export default function NeedsAttentionTable({ rows }: NeedsAttentionTableProps) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<NeedsAttentionStudent | null>(null);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const cur = Math.min(page, pageCount - 1);
    return rows.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);
  }, [rows, page, pageCount]);

  const from = rows.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, rows.length);

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h4 className={styles.cardTitle}>
              <Flag className={styles.cardTitleIcon} />
              Flagged Students
            </h4>
            <p className={styles.cardSubtitle}>Sorted by lowest attendance rate first · click a row for the full trend</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className={styles.empty}>No flagged students in this view.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHeadRow}>
                  <th className={styles.tableHead}>Student</th>
                  <th className={styles.tableHead}>Grade &amp; Section</th>
                  <th className={`${styles.tableHead} ${styles.center}`}>Present</th>
                  <th className={`${styles.tableHead} ${styles.center}`}>Absent</th>
                  <th className={`${styles.tableHead} ${styles.center}`}>Late</th>
                  <th className={`${styles.tableHead} ${styles.center}`}>Excused</th>
                  <th className={styles.tableHead}>Rate</th>
                  <th className={`${styles.tableHead} ${styles.right}`}>Level</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((s) => (
                  <tr key={s.studentId} className={styles.tableRow} onClick={() => setSelected(s)}>
                    <td className={styles.cellStudent}>
                      <div className={styles.studentCell}>
                        <div className={styles.avatar}>{initials(s.fullName.split(" ")[0], s.fullName.split(" ")[1] ?? "")}</div>
                        <div className={styles.studentInfo}>
                          <span className={styles.studentName}>{s.fullName}</span>
                          <span className={styles.studentLrn}>{s.lrn}</span>
                        </div>
                      </div>
                    </td>
                    <td className={styles.cellText}>
                      {s.gradeLabel} &ndash; {s.sectionName || "—"}
                    </td>
                    <td className={`${styles.cellNum} ${styles.center}`}>{s.present}</td>
                    <td className={`${styles.cellNum} ${styles.center}`}>{s.absent}</td>
                    <td className={`${styles.cellNum} ${styles.center}`}>{s.late}</td>
                    <td className={`${styles.cellNum} ${styles.center}`}>{s.excused}</td>
                    <td className={styles.cellRate}>{s.rate}%</td>
                    <td className={`${styles.cellLevel} ${styles.right}`}>
                      <span className={`${styles.levelBadge} ${s.tone === "danger" ? styles.levelBadgeDanger : styles.levelBadgeWarn}`}>
                        {s.tone === "danger" ? "High Risk" : "At Risk"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <TablePagination
          page={page}
          pageCount={pageCount}
          info={rows.length === 0 ? "No flagged students" : `Showing ${from}–${to} of ${rows.length} flagged`}
          onPageChange={setPage}
        />
      </div>

      {selected ? (
        <AttendanceStudentModal
          sectionId={selected.sectionId}
          studentId={selected.studentId}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </>
  );
}