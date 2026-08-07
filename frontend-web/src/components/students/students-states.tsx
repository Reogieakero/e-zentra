import { AlertTriangle, RefreshCw, Users } from "lucide-react";
import { ApiClientError } from "@/lib/api";
import styles from "./students-states.module.css";

export function StudentsError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message =
    error instanceof ApiClientError ? error.message : "Could not load student records. Please try again.";
  return (
    <div className={styles.errorCard}>
      <AlertTriangle className={styles.errorIcon} />
      <p className={styles.errorText}>{message}</p>
      <button className={styles.retryButton} onClick={onRetry}>
        <RefreshCw size={14} className={styles.retryIcon} /> Retry
      </button>
    </div>
  );
}

export function StudentsEmpty() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <Users size={26} />
      </div>
      <p className={styles.emptyTitle}>No students found.</p>
      <p className={styles.emptyText}>Try adjusting your filters or search terms.</p>
    </div>
  );
}

export function StudentsTableLoading() {
  return (
    <div className={styles.card}>
      <div className={styles.toolbar}>
        <div className={styles.skeleton} style={{ width: 160, height: 14 }} />
      </div>
      <div className={styles.skeleton} style={{ height: 320, borderRadius: 0 }} />
    </div>
  );
}