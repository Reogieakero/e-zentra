import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  FileText,
  MoreVertical,
  Printer,
} from "lucide-react";
import type { Sf10Record, Sf10StatusCode } from "@/lib/dashboard";
import { CustomSelect } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import {
  SF10_GRADE_OPTIONS,
  SF10_SORT_OPTIONS,
  SF10_STATUS_OPTIONS,
  SF10_YEAR_OPTIONS,
} from "@/app/principal/sf10/page";
import styles from "./sf10.module.css";

export function Sf10StatusPill({ status }: { status: Sf10StatusCode }) {
  const map = {
    complete: { icon: CheckCircle2, cls: styles.statusComplete },
    pending: { icon: Clock, cls: styles.statusPending },
    missing: { icon: AlertTriangle, cls: styles.statusMissing },
  }[status];
  const Icon = map.icon;
  return (
    <span className={`${styles.statusPill} ${map.cls}`}>
      <Icon className={styles.statusIcon} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function RecordCard({
  record,
  selected,
  onToggle,
  onOpen,
}: {
  record: Sf10Record;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const fileCls =
    record.status === "complete"
      ? styles.fileComplete
      : record.status === "pending"
        ? styles.filePending
        : styles.fileMissing;

  return (
    <div className={`${styles.recordCard} ${selected ? styles.recordCardSelected : ""}`}>
      <div className={styles.recordTop}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={selected}
          onChange={onToggle}
          aria-label={`Select ${record.fullName}`}
        />
        <button type="button" className={styles.moreBtn} aria-label="More options">
          <MoreVertical className={styles.moreIcon} />
        </button>
      </div>
      <div className={styles.recordBody}>
        <div className={`${styles.fileIcon} ${fileCls}`}>
          <FileText className={styles.fileIconInner} />
        </div>
        <div style={{ minWidth: 0, width: "100%" }}>
          <div className={styles.recordName}>{record.fullName}</div>
          <div className={styles.recordMeta}>
            {record.gradeLabel}
            {record.sectionName ? ` - ${record.sectionName}` : ""}
          </div>
        </div>
      </div>
      <div className={styles.recordStatusWrap}>
        <Sf10StatusPill status={record.status} />
      </div>
      <div className={styles.recordActions}>
        <button type="button" className={styles.actionBtn} title="View" onClick={onOpen}>
          <Eye className={styles.actionIcon} />
        </button>
        <button type="button" className={styles.actionBtn} title="Download" disabled={!record.fileUrl}>
          <Download className={styles.actionIcon} />
        </button>
        <button type="button" className={styles.actionBtn} title="Print" disabled={!record.fileUrl}>
          <Printer className={styles.actionIcon} />
        </button>
      </div>
    </div>
  );
}

export function Sf10Records({
  records,
  total,
  page,
  pageSize,
  search,
  onSearchChange,
  grade,
  onGradeChange,
  status,
  onStatusChange,
  year,
  onYearChange,
  sort,
  onSortChange,
  onPageChange,
  selectedId,
  onSelect,
  isValidating,
}: {
  records: Sf10Record[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  onSearchChange: (v: string) => void;
  grade: string;
  onGradeChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  year: string;
  onYearChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  onPageChange: (p: number) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isValidating: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 12)));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) pages.push(i);
    else if (pages[pages.length - 1] !== "...") pages.push("...");
  }

  return (
    <div className={styles.recordsCard}>
      {isValidating && (
        <div className={styles.loadingStrip}>
          <div className={styles.loadingBar} />
        </div>
      )}
      <div className={styles.recordsTop}>
        <div className={styles.recordsHeader}>
          <div className={styles.recordsMeta}>
            <h2 className={styles.recordsTitle}>All SF10 Records</h2>
            <p className={styles.recordsSubtitle}>
              Learner&apos;s Permanent Academic Record for every enrolled student.
            </p>
          </div>
          <div className={styles.toolbarRight}>
            <span className={styles.selectedCount}>{selectedId ? 1 : 0} selected</span>
            <button type="button" className={styles.downloadBtn} disabled>
              <Download className={styles.downloadBtnIcon} />
              Download
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="Search student name or LRN..."
            aria-label="Search SF10 records"
            className={styles.searchWrap}
          />
          <CustomSelect
            value={grade}
            options={SF10_GRADE_OPTIONS}
            onChange={onGradeChange}
            size="sm"
            showCheck={false}
            className={styles.filterSelect}
          />
          <CustomSelect
            value={status}
            options={SF10_STATUS_OPTIONS}
            onChange={onStatusChange}
            size="sm"
            showCheck={false}
            className={styles.filterSelect}
          />
          <CustomSelect
            value={year}
            options={SF10_YEAR_OPTIONS}
            onChange={onYearChange}
            size="sm"
            showCheck={false}
            className={styles.filterSelect}
          />
          <CustomSelect
            value={sort}
            options={SF10_SORT_OPTIONS}
            onChange={onSortChange}
            size="sm"
            showCheck={false}
            className={styles.filterSelect}
          />
        </div>
      </div>

      {records.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FileText size={22} />
          </div>
          <p className={styles.emptyTitle}>No records found</p>
          <p className={styles.emptyText}>Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className={styles.recordsGrid}>
          {records.map((r) => (
            <RecordCard
              key={r.studentId}
              record={r}
              selected={selectedId === r.studentId}
              onToggle={() => onSelect(selectedId === r.studentId ? "" : r.studentId)}
              onOpen={() => onSelect(r.studentId)}
            />
          ))}
        </div>
      )}

      <div className={styles.pagination}>
        <span className={styles.pageInfo}>
          Showing {from}&ndash;{to} of {total.toLocaleString()} records
        </span>
        <div className={styles.pageControls}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className={styles.pageBtnIcon} />
            Previous
          </button>
          {pages.map((p, idx) =>
            p === "..." ? (
              <span key={`e-${idx}`} className={styles.pageEllipsis}>
                ...
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`${styles.pageNum} ${p === page ? styles.pageNumActive : ""}`}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
            <ChevronRight className={styles.pageBtnIcon} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sf10RecordsLoading() {
  return (
    <div className={styles.card}>
      <div className={`${styles.skeleton} ${styles.skSearch}`} />
      <div className={styles.skOverlay}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`${styles.skeleton} ${styles.skRecordCard}`} />
        ))}
      </div>
    </div>
  );
}