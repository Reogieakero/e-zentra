import { AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import type { Sf10Record, Sf10StatusCode } from "@/lib/dashboard";
import { SearchInput } from "@/components/ui/search-input";
import { TablePagination } from "@/components/ui/table-pagination";
import { AnimatedFolder } from "@/components/ui/animated-folder";
import styles from "./sf10-records.module.css";

export function Sf10StatusPill({ status }: { status: Sf10StatusCode }) {
  const map = {
    released: { icon: CheckCircle2, cls: styles.statusReleased },
    ready: { icon: FileText, cls: styles.statusReady },
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
  onOpen,
}: {
  record: Sf10Record;
  selected: boolean;
  onOpen: () => void;
}) {
  return (
    <div
      className={`${styles.recordCard} ${selected ? styles.recordCardSelected : ""}`}
      onClick={onOpen}
      role="button"
      tabIndex={0}
    >
      <div className={styles.recordBody}>
        <AnimatedFolder
          count={record.status === "released" ? 1 : record.status === "ready" ? 1 : 0}
          variant={record.status === "missing" ? "danger" : "default"}
          title={`${record.fullName} - ${record.status}`}
        />
        <div className={styles.recordName}>{record.fullName}</div>
        <div className={styles.recordMeta}>
          {record.gradeLabel}
          {record.sectionName ? ` - ${record.sectionName}` : ""}
        </div>
      </div>
      <div className={styles.recordStatusWrap}>
        <Sf10StatusPill status={record.status} />
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
  onPageChange,
  selectedId,
  onSelect,
  isValidating,
  stats,
  title = "All SF10 Records",
  subtitle = "Directory of released learner's permanent academic records.",
}: {
  records: Sf10Record[];
  total: number;
  page: number;
  pageSize: number;
  search: string;
  onSearchChange: (v: string) => void;
  onPageChange: (p: number) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  isValidating: boolean;
  stats?: { label: string; value: number }[];
  title?: string;
  subtitle?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / (pageSize || 12)));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

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
            <h2 className={styles.recordsTitle}>{title}</h2>
            <p className={styles.recordsSubtitle}>{subtitle}</p>
          </div>
          {stats && stats.length > 0 && (
            <div className={styles.kpiGroup}>
              {stats.map((s) => (
                <div key={s.label} className={styles.kpi}>
                  <span className={styles.kpiValue}>{s.value.toLocaleString()}</span>
                  <span className={styles.kpiLabel}>{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.toolbar}>
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder="Search student name or LRN..."
            aria-label="Search SF10 records"
            className={styles.searchWrap}
          />
        </div>
      </div>

      {records.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FileText size={22} />
          </div>
          <p className={styles.emptyTitle}>No records found</p>
          <p className={styles.emptyText}>Try adjusting your search terms.</p>
        </div>
      ) : (
        <div className={styles.recordsGrid}>
          {records.map((r) => (
            <RecordCard
              key={r.studentId}
              record={r}
              selected={selectedId === r.studentId}
              onOpen={() => onSelect(r.studentId)}
            />
          ))}
        </div>
      )}

      <TablePagination
        page={page - 1}
        pageCount={totalPages}
        info={`Showing ${from}–${to} of ${total.toLocaleString()} records`}
        onPageChange={(p) => onPageChange(p + 1)}
        className={styles.recordsPager}
      />
    </div>
  );
}

export function Sf10RecordsLoading() {
  return (
    <div className={styles.recordsCard}>
      <div className={styles.recordsTop}>
        <div className={styles.recordsHeader}>
          <div className={styles.recordsMeta}>
            <div className={`${styles.skeleton} ${styles.skCardTitle}`} />
            <div className={`${styles.skeleton} ${styles.skRecordsSub}`} />
          </div>
          <div className={`${styles.skeleton} ${styles.skBadge}`} />
        </div>
        <div className={`${styles.skeleton} ${styles.skSearch}`} />
      </div>
      <div className={styles.skOverlay}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={`${styles.skeleton} ${styles.skRecordCard}`} />
        ))}
      </div>
      <div className={styles.pagination}>
        <div className={`${styles.skeleton} ${styles.skPageInfo}`} />
        <div className={styles.pageControls}>
          <div className={`${styles.skeleton} ${styles.skPageBtn}`} />
          <div className={`${styles.skeleton} ${styles.skPageBtn}`} />
        </div>
      </div>
    </div>
  );
}