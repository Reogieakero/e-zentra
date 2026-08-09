"use client";

import { useEffect, useMemo, useState } from "react";
import { Flag, MailCheck, MessageSquareReply, BellRing } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AdviserAlert, NeedsAttentionStudent } from "@/lib/dashboard";
import { CustomSelect } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import { initials } from "@/lib/students-format";
import { AttendanceStudentModal } from "@/components/attendance/attendance-student-modal";
import { TablePagination } from "@/components/ui/table-pagination";
import styles from "./needs-attention-table.module.css";

const PAGE_SIZE = 10;

interface NeedsAttentionTableProps {
  rows: NeedsAttentionStudent[];
  alerts?: AdviserAlert[];
  isLoading?: boolean;
}

const ALERT_STATUS_META: Record<string, { label: string; className: string; icon: LucideIcon }> = {
  pending: { label: "Alerted", className: "alertPending", icon: BellRing },
  acknowledged: { label: "Acknowledged", className: "alertAcked", icon: MailCheck },
  commented: { label: "Replied", className: "alertReplied", icon: MessageSquareReply },
};

function AlertBadge({ alert }: { alert: AdviserAlert }) {
  const meta = ALERT_STATUS_META[alert.status] ?? ALERT_STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`${styles.alertBadge} ${styles[meta.className]}`} title={alert.note ?? undefined}>
      <Icon size={12} aria-hidden />
      {meta.label}
    </span>
  );
}

export default function NeedsAttentionTable({ rows, alerts = [], isLoading = false }: NeedsAttentionTableProps) {
  const [tone, setTone] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<NeedsAttentionStudent | null>(null);

  const alertByStudent = useMemo(() => {
    const map = new Map<string, AdviserAlert>();
    for (const a of alerts) map.set(a.studentId, a);
    return map;
  }, [alerts]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (tone !== "all" && r.tone !== tone) return false;
      if (!q) return true;
      return r.fullName.toLowerCase().includes(q) || r.lrn.toLowerCase().includes(q);
    });
  }, [rows, tone, query]);

  useEffect(() => {
    setPage(0);
  }, [tone, query]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const cur = Math.min(page, pageCount - 1);
    return filteredRows.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);
  }, [filteredRows, page, pageCount]);

  const from = filteredRows.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min((page + 1) * PAGE_SIZE, filteredRows.length);

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
<div className={styles.cardControls}>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search name or LRN…"
              aria-label="Search flagged students"
              className={styles.searchInput}
            />
            <CustomSelect
              id="need-level"
              value={tone}
              onChange={setTone}
              size="sm"
              showCheck={false}
              className={styles.filterSelect}
              options={[
                { value: "all", label: "All Levels" },
                { value: "danger", label: "Below 70% · High Risk" },
                { value: "warn", label: "70–79% · At Risk" },
              ]}
            />
          </div>
        </div>

        {isLoading ? (
          <div className={styles.skRows}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skRow}>
                <div className={`${styles.skeleton} ${styles.skAvatar}`} />
                <div className={`${styles.skeleton} ${styles.skName}`} />
                <div className={`${styles.skeleton} ${styles.skBars}`}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <span key={j} className={`${styles.skeleton} ${styles.skChunk}`} />
                  ))}
                </div>
                <div className={`${styles.skeleton} ${styles.skRate}`} />
              </div>
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <p className={styles.empty}>No flagged students match this search or filter.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHeadRow}>
                  <th className={styles.tableHead}>Student</th>
                  <th className={styles.tableHead}>Grade &amp; Section</th>
                  <th className={`${styles.tableHead} ${styles.center}`}>Present</th>
                  <th className={`${styles.tableHead} ${styles.center}`}>Late</th>
                  <th className={`${styles.tableHead} ${styles.center}`}>Absent</th>
                  <th className={`${styles.tableHead} ${styles.center}`}>Excused</th>
                  <th className={`${styles.tableHead} ${styles.center}`}>Not logged</th>
                  <th className={styles.tableHead}>Rate</th>
                  <th className={`${styles.tableHead} ${styles.right}`}>Level</th>
                  <th className={`${styles.tableHead} ${styles.right}`}>Adviser</th>
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
                    <td className={`${styles.cellNum} ${styles.center}`}>
                      <span className={`${styles.count} ${styles.countGood}`}>{s.present}</span>
                    </td>
                    <td className={`${styles.cellNum} ${styles.center}`}>
                      <span className={`${styles.count} ${styles.countWarn}`}>{s.late}</span>
                    </td>
                    <td className={`${styles.cellNum} ${styles.center}`}>
                      <span className={`${styles.count} ${styles.countDanger}`}>{s.absent}</span>
                    </td>
                    <td className={`${styles.cellNum} ${styles.center}`}>
                      <span className={`${styles.count} ${styles.countInfo}`}>{s.excused}</span>
                    </td>
                    <td className={`${styles.cellNum} ${styles.center}`}>
                      <span className={`${styles.count} ${styles.countMuted}`}>{s.notLogged}</span>
                    </td>
                    <td className={styles.cellRate}>{s.rate}%</td>
                    <td className={`${styles.cellLevel} ${styles.right}`}>
                      <span className={`${styles.levelBadge} ${s.tone === "danger" ? styles.levelBadgeDanger : styles.levelBadgeWarn}`}>
                        {s.tone === "danger" ? "High Risk" : "At Risk"}
                      </span>
                    </td>
                    <td className={`${styles.cellLevel} ${styles.right}`}>
                      {alertByStudent.get(s.studentId) ? (
                        <AlertBadge alert={alertByStudent.get(s.studentId)!} />
                      ) : (
                        <span className={styles.noAlert}>—</span>
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
            page={page}
            pageCount={pageCount}
            info={filteredRows.length === 0 ? "No flagged students" : `Showing ${from}–${to} of ${filteredRows.length} flagged`}
            onPageChange={setPage}
          />
        )}
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