import { AlertTriangle, RefreshCw } from "lucide-react";
import { ApiClientError } from "@/lib/api";
import styles from "./attendance-error.module.css";

export function AttendancePageError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiClientError ? error.message : "Could not load the attendance page. Please try again.";
  return (
    <div className={styles.errorCard}>
      <AlertTriangle className={styles.errorIcon} />
      <p className={styles.errorText}>{message}</p>
      <button className={styles.retryButton} onClick={onRetry}>
        <RefreshCw className={styles.retryIcon} />
        Retry
      </button>
    </div>
  );
}