"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  DownloadCloud,
  FileSpreadsheet,
  HardDrive,
  Loader2,
  RefreshCw,
  Unplug,
  XCircle,
} from "lucide-react";
import {
  fetchBackupStatus,
  fetchBackupOAuthUrl,
  runBackupNow,
  fetchBackupHistory,
  disconnectBackupDrive,
  type BackupJob,
  type BackupStatus,
} from "@/lib/backup";
import { runReadableExport, fetchExportHistory, type ExportJob } from "@/lib/export";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import styles from "./backup.module.css";

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function BackupPage() {
  return (
    <Suspense fallback={<div className={styles.page}><div className={`${styles.card} ${styles.center}`}><p className={styles.muted}>Loading…</p></div></div>}>
      <BackupPageContent />
    </Suspense>
  );
}

function BackupPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [history, setHistory] = useState<BackupJob[]>([]);
  const [exports, setExports] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const refresh = useCallback(async () => {
    const [st, h, ex] = await Promise.all([fetchBackupStatus(), fetchBackupHistory(), fetchExportHistory()]);
    setStatus(st);
    setHistory(h);
    setExports(ex);
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      const flag = params.get("google");
      if (flag) {
        router.replace("/principal/backup");
        if (flag === "connected") {
          setToast({ tone: "ok", text: "Google Drive connected." });
        } else if (flag === "denied") {
          setToast({ tone: "err", text: "Google Drive connection was cancelled." });
        } else if (flag === "error") {
          setToast({ tone: "err", text: "Could not connect Google Drive. Please try again." });
        }
      }
      void refresh();
    });
  }, [refresh, params, router]);

  const connect = async () => {
    const { url } = await fetchBackupOAuthUrl();
    window.location.href = url;
  };

  const backupNow = async () => {
    if (running) return;
    setRunning(true);
    setToast(null);
    try {
      await runBackupNow();
      setToast({ tone: "ok", text: "Backup completed and uploaded to Google Drive." });
      await refresh();
    } catch (err) {
      setToast({ tone: "err", text: err instanceof Error ? err.message : "Backup failed." });
    } finally {
      setRunning(false);
    }
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect Google Drive? Backups will stop.")) return;
    await disconnectBackupDrive();
    setToast({ tone: "ok", text: "Google Drive disconnected." });
    await refresh();
  };

  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    setToast(null);
    try {
      const job = await runReadableExport();
      setToast({
        tone: "ok",
        text: job.folderUrl
          ? `Export ready (${job.fileCount} files). Open your Drive folder to view them.`
          : "Export complete.",
      });
      await refresh();
    } catch (err) {
      setToast({ tone: "err", text: err instanceof Error ? err.message : "Export failed." });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={`${styles.card} ${styles.center}`}>
          <Loader2 className={styles.spin} />
          <p className={styles.muted}>Loading backup settings…</p>
        </div>
      </div>
    );
  }

  if (!status?.enabled) {
    return (
      <div className={styles.page}>
        <div className={styles.pageTitleRow}>
          <h1 className={styles.title}>Backup to Google Drive</h1>
        </div>
        <div className={`${styles.card} ${styles.center}`}>
          <Cloud className={styles.mutedIcon} />
          <p className={styles.muted}>The backup feature is currently disabled on this deployment.</p>
          <p className={styles.muted}>Set <code>BACKUP_ENABLED=true</code> and OAuth credentials to enable it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {toast && (
        <div className={`${styles.toast} ${toast.tone === "ok" ? styles.toastOk : styles.toastErr}`}>
          {toast.tone === "ok" ? <CheckCircle2 className={styles.toastIcon} /> : <XCircle className={styles.toastIcon} />}
          <span>{toast.text}</span>
        </div>
      )}

      <div className={styles.pageTitleRow}>
        <h1 className={styles.pageTitle}>Backup to Google Drive</h1>
        <button type="button" className={styles.refreshBtn} onClick={() => void refresh()} aria-label="Refresh">
          <RefreshCw className={styles.refreshIcon} />
        </button>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <Cloud className={styles.headIcon} />
            <h2 className={styles.cardTitle}>Google Drive Connection</h2>
          </div>
          {status.connected ? (
            <div className={styles.body}>
              <div className={`${styles.pill} ${styles.pillOk}`}>
                <CheckCircle2 className={styles.pillIcon} /> Connected
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Account</span>
                <span className={styles.metaValue}>{status.email ?? "—"}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Connected since</span>
                <span className={styles.metaValue}>{formatDate(status.connectedAt)}</span>
              </div>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Drive folder</span>
                <span className={styles.metaValue}>Zentra Backups</span>
              </div>
              <p className={styles.note}>
                Automatic backups are enabled. A snapshot of the school&apos;s Zentra data is uploaded to a private
                &ldquo;Zentra Backups&rdquo; folder in your Google Drive.
              </p>
              <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={() => void disconnect()}>
                <Unplug className={styles.btnIcon} /> Disconnect Google Drive
              </button>
            </div>
          ) : (
            <div className={styles.body}>
              <div className={`${styles.row} ${styles.pillOff}`}>
                <AlertCircle className={styles.pillIcon} /> Not connected
              </div>
              <p className={styles.note}>
                Connect your Google Drive to enable automatic backups of the school&apos;s authorized Zentra data.
              </p>
              <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => void connect()}>
                <DownloadCloud className={styles.btnIcon} /> Connect Google Drive
              </button>
            </div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.statusHead}>
            <HardDrive className={styles.headIcon} />
            <h2 className={styles.cardTitle}>Backup</h2>
          </div>
          <div className={styles.body}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Last backup</span>
              <span className={styles.metaValue}>
                {status.lastBackup
                  ? `${status.lastBackup.status === "succeeded" ? "Successful" : status.lastBackup.status} · ${formatDate(status.lastBackup.completedAt ?? status.lastBackup.createdAt)}`
                  : "No backup yet"}
              </span>
            </div>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => void backupNow()}
              disabled={running || !status.connected}
            >
              {running ? <Loader2 className={`${styles.btnIcon} ${styles.spin}`} /> : <DownloadCloud className={styles.btnIcon} />}
              {running ? "Backing up…" : "Back up now"}
            </button>
          </div>
        </section>
      </div>

      <section className={styles.card}>
        <div className={styles.statusHead}>
          <HardDrive className={styles.headIcon} />
          <h2 className={styles.cardTitle}>Backup History</h2>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Time</th>
                <th className={styles.th}>Type</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Size</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td className={styles.tdMuted} colSpan={4}>
                    No backups yet.
                  </td>
                </tr>
              ) : (
                history.map((job) => (
                  <tr key={job.id}>
                    <td className={styles.td}>{formatDate(job.createdAt)}</td>
                    <td className={styles.td}>{job.kind === "automatic" ? "Automatic" : "Manual"}</td>
                    <td className={styles.td}>
                      {job.status === "succeeded" ? (
                        <span className={`${styles.badge} ${styles.badgeOk}`}>Success</span>
                      ) : job.status === "failed" ? (
                        <span className={`${styles.badge} ${styles.badgeErr}`} title={job.errorMessage ?? undefined}>
                          Failed
                        </span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeRun}`}>Running</span>
                      )}
                    </td>
                    <td className={styles.td}>{formatBytes(job.sizeBytes)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.statusHead}>
          <FileSpreadsheet className={styles.headIcon} />
          <h2 className={styles.cardTitle}>Readable Export</h2>
        </div>
        <div className={styles.body}>
          <p className={styles.note}>
            Generate a readable copy of <em>your own</em> authorized data as one Excel workbook (a sheet per table)
            plus one PDF per table, uploaded to a folder in your Google Drive.
          </p>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => void exportData()}
            disabled={exporting || !status.connected}
          >
            {exporting ? <Loader2 className={`${styles.btnIcon} ${styles.spin}`} /> : <FileSpreadsheet className={styles.btnIcon} />}
            {exporting ? "Exporting…" : "Export my data (Excel + PDF)"}
          </button>
          {exports.length > 0 && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Exported</th>
                    <th className={styles.th}>Status</th>
                    <th className={styles.th}>Files</th>
                    <th className={styles.th}>Folder</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.map((job) => (
                    <tr key={job.id}>
                      <td className={styles.td}>{formatDate(job.createdAt)}</td>
                      <td className={styles.td}>
                        {job.status === "succeeded" ? (
                          <span className={`${styles.badge} ${styles.badgeOk}`}>Success</span>
                        ) : job.status === "failed" ? (
                          <span className={`${styles.badge} ${styles.badgeErr}`} title={job.errorMessage ?? undefined}>
                            Failed
                          </span>
                        ) : (
                          <span className={`${styles.badge} ${styles.badgeRun}`}>Running</span>
                        )}
                      </td>
                      <td className={styles.td}>{job.fileCount}</td>
                      <td className={styles.td}>
                        {job.folderUrl ? (
                          <a className={styles.link} href={job.folderUrl} target="_blank" rel="noreferrer">
                            Open in Drive
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}