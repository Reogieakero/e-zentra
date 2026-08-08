"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Target } from "lucide-react";
import type { ReportSeriesPoint } from "@/lib/dashboard";
import { fmt, PAGE_SIZE } from "./report-config";
import styles from "./report-table.module.css";

function vsTone(diff: number): "good" | "warn" | "danger" {
  if (diff >= 0) return "good";
  if (diff >= -1) return "warn";
  return "danger";
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
              <th className={styles.tableHead}>Present</th>
              <th className={styles.tableHead}>Absent</th>
              <th className={styles.tableHead}>Late</th>
              <th className={styles.tableHead}>Excused</th>
              <th className={styles.tableHead}>Not Logged</th>
              <th className={styles.tableHead}>Rate</th>
              <th className={`${styles.tableHead} ${styles.right}`}>vs. Target</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((s) => {
              const diff = (s.rate ?? 0) - targetRate;
              const tone = vsTone(diff);
              return (
                <tr key={s.key} className={styles.tableRow}>
                  <td className={styles.cellMonth}>{s.label}</td>
                  <td className={styles.cellNum}>{s.present.toLocaleString()}</td>
                  <td className={styles.cellNum}>{s.absent.toLocaleString()}</td>
                  <td className={styles.cellNum}>{s.late.toLocaleString()}</td>
                  <td className={styles.cellNum}>{s.excused.toLocaleString()}</td>
                  <td className={styles.cellNum}>{s.notLogged.toLocaleString()}</td>
                  <td className={styles.cellRate}>{s.rate != null ? fmt(s.rate) : "—"}</td>
                  <td className={`${styles.cellVs} ${styles.right}`}>
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
        <div className={styles.tableFooter}>
          <span className={styles.paginationInfo}>
            {rows.length === 0 ? "No school days logged" : `Showing ${from}–${to} of ${rows.length} school days`}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page === 0 || Math.min(pageCount, rows.length) === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page >= pageCount - 1 || rows.length === 0}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}