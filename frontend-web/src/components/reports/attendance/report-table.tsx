"use client";

import { useMemo, useState } from "react";
import { Target } from "lucide-react";
import type { ReportSeriesPoint } from "@/lib/dashboard";
import { fmt, PAGE_SIZE } from "./report-config";
import { TablePagination } from "@/components/ui/table-pagination";
import styles from "./report-table.module.css";

function vsTone(diff: number): "good" | "warn" | "danger" {
  if (diff >= 0) return "good";
  if (diff >= -1) return "warn";
  return "danger";
}

function rateTone(rate: number): string {
  if (rate >= 90) return styles.rateGood;
  if (rate >= 80) return styles.rateWarn;
  return styles.rateDanger;
}

interface ReportTableProps {
  rows: ReportSeriesPoint[];
  targetRate: number;
  enrollmentTotal: number;
  isDaily: boolean;
}

export default function ReportTable({ rows, targetRate, enrollmentTotal, isDaily }: ReportTableProps) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const cur = Math.min(page, pageCount - 1);
    return rows.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);
  }, [rows, page, pageCount]);

  const from = page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, rows.length);

  return (
    <div className={`${styles.card} ${styles.breakdownCard}`}>
      <div className={styles.cardHeader}>
        <div>
          <h4 className={styles.cardTitle}>
            <Target className={styles.cardTitleIcon} />
            {isDaily ? "Day-by-Day" : "Month-by-Month"} Breakdown
          </h4>
          <p className={styles.cardSubtitle}>Enrollment base: {enrollmentTotal.toLocaleString()}</p>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHeadRow}>
              <th className={styles.tableHead}>Month</th>
              <th className={`${styles.tableHead} ${styles.center}`}>Present</th>
              <th className={`${styles.tableHead} ${styles.center}`}>Absent</th>
              <th className={`${styles.tableHead} ${styles.center}`}>Late</th>
              <th className={`${styles.tableHead} ${styles.center}`}>Excused</th>
              <th className={`${styles.tableHead} ${styles.center}`}>Not Logged</th>
              <th className={`${styles.tableHead} ${styles.center}`}>Rate</th>
              <th className={`${styles.tableHead} ${styles.center}`}>vs. Target</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((s) => {
              const diff = (s.rate ?? 0) - targetRate;
              const tone = vsTone(diff);
              return (
                <tr key={s.key} className={styles.tableRow}>
                  <td className={styles.cellMonth}>{s.label}</td>
                  <td className={`${styles.cellNum} ${styles.center}`}>
                    <span className={`${styles.count} ${styles.countGood}`}>{s.present.toLocaleString()}</span>
                  </td>
                  <td className={`${styles.cellNum} ${styles.center}`}>
                    <span className={`${styles.count} ${styles.countDanger}`}>{s.absent.toLocaleString()}</span>
                  </td>
                  <td className={`${styles.cellNum} ${styles.center}`}>
                    <span className={`${styles.count} ${styles.countWarn}`}>{s.late.toLocaleString()}</span>
                  </td>
                  <td className={`${styles.cellNum} ${styles.center}`}>
                    <span className={`${styles.count} ${styles.countInfo}`}>{s.excused.toLocaleString()}</span>
                  </td>
                  <td className={`${styles.cellNum} ${styles.center}`}>
                    <span className={`${styles.count} ${styles.countMuted}`}>{s.notLogged.toLocaleString()}</span>
                  </td>
                  <td className={`${styles.cellRate} ${styles.center}`}>
                    {s.rate != null ? (
                      <span className={`${styles.rate} ${rateTone(s.rate)}`}>{fmt(s.rate)}</span>
                    ) : (
                      <span className={styles.vsNone}>—</span>
                    )}
                  </td>
                  <td className={`${styles.cellVs} ${styles.center}`}>
                    {s.rate == null ? (
                      <span className={styles.vsNone}>—</span>
                    ) : (
                      <span className={`${styles.vsBadge} ${styles[`vsBadge${tone === "good" ? "Good" : tone === "warn" ? "Warn" : "Danger"}`]}`}>
                        {diff >= 0 ? "+" : ""}
                        {diff.toFixed(1)} pts
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isDaily && (
        <TablePagination
          page={page}
          pageCount={pageCount}
          info={rows.length === 0 ? "No school days logged" : `Showing ${from}–${to} of ${rows.length} school days`}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}