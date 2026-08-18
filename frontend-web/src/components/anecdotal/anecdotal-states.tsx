import { AlertTriangle, FileText, RefreshCw } from "lucide-react";
import { ApiClientError } from "@/lib/api";
import styles from "./anecdotal-states.module.css";

export function AnecdotalError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message =
    error instanceof ApiClientError ? error.message : "Could not load anecdotal records. Please try again.";
  return (
    <div className={styles.errorCard}>
      <AlertTriangle size={26} className={styles.errorIcon} />
      <p className={styles.errorText}>{message}</p>
      <button className={styles.retryButton} onClick={onRetry}>
        <RefreshCw size={14} className={styles.retryIcon} />
        Retry
      </button>
    </div>
  );
}

export function AnecdotalEmpty() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <FileText size={26} />
      </div>
      <p className={styles.emptyTitle}>No anecdotal records found.</p>
      <p className={styles.emptyText}>Try adjusting your filters or search terms.</p>
    </div>
  );
}

export function AnecdotalTableLoading() {
  return (
    <div className={styles.loading}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={`${styles.skeleton} ${styles.skAvatar}`} />
          <div className={styles.skLines}>
            <div className={`${styles.skeleton} ${styles.skLineWide}`} />
            <div className={`${styles.skeleton} ${styles.skLineNarrow}`} />
          </div>
        </div>
      ))}
    </div>
  );
}
