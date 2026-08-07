import { AlertTriangle, RefreshCw } from "lucide-react";
import { ApiClientError } from "@/lib/api";
import styles from "./dashboard-states.module.css";

export function DashboardLoading() {
  return (
    <>
      <div className={styles.skHeaderRow}>
        <div className={styles.pageHeading}>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Loading the latest aggregates from the school records…</p>
        </div>
      </div>

      <div className={styles.skKpiGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skCard}>
            <div className={`${styles.skeleton} ${styles.skCardHeaderLine}`} />
            <div className={styles.skStatGrid}>
              <div className={`${styles.skStat} ${styles.skeleton}`}>
                <div className={`${styles.skeleton} ${styles.skStatLineSm}`} />
                <div className={`${styles.skeleton} ${styles.skStatLineLg}`} />
              </div>
              <div className={`${styles.skStat} ${styles.skeleton}`}>
                <div className={`${styles.skeleton} ${styles.skStatLineSm}`} />
                <div className={`${styles.skeleton} ${styles.skStatLineLg}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className={`${styles.dashboardGrid} ${styles.skLayoutGrid}`}>
        <div className={styles.skRail}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skRailItem}>
              <div className={`${styles.skeleton} ${styles.skRailTitle}`} />
              <div className={`${styles.skeleton} ${i === 1 ? styles.skRailRowSm : styles.skRailRow}`} />
              <div className={`${styles.skeleton} ${styles.skRailRowSm}`} />
            </div>
          ))}
        </div>

        <div className={styles.skPanel}>
          <div className={styles.skPanelHeader}>
            <div className={`${styles.skeleton} ${styles.skPanelTitle}`} />
            <div className={`${styles.skeleton} ${styles.skBadge}`} />
          </div>
          <div className={styles.skChartGrid}>
            <div className={`${styles.skeleton} ${styles.skChart}`} />
            <div className={`${styles.skeleton} ${styles.skChart}`} />
          </div>
          <div className={`${styles.skeleton} ${styles.skFullChart}`} />
        </div>
      </div>
    </>
  );
}

export function DashboardError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message = error instanceof ApiClientError ? error.message : "Could not load the dashboard. Please try again.";

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