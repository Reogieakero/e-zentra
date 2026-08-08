"use client";

import { useEffect } from "react";
import { Download, FileText, Users, Pencil, Printer, X } from "lucide-react";
import type { Sf10Record } from "@/lib/dashboard";
import { Sf10StatusPill } from "./sf10-records";
import styles from "./sf10-preview.module.css";

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function Sf10Preview({ record, onClose }: { record: Sf10Record; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label="SF10 Preview">
      <div className={styles.backdrop} onClick={onClose} />
      <aside className={styles.drawer}>
        <div className={styles.header}>
          <h3 className={styles.title}>SF10 Preview</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close preview">
            <X className={styles.closeIcon} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.profile}>
            <div className={styles.fileIcon}>
              <FileText className={styles.fileIconIcon} />
            </div>
            <div className={styles.fileName}>{record.fileName}</div>
            <Sf10StatusPill status={record.status} />
          </div>

          <div className={styles.meta}>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>LRN</span>
              <span className={styles.metaValue}>{record.lrn}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Full Name</span>
              <span className={styles.metaValue}>{record.fullName}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Grade &amp; Section</span>
              <span className={styles.metaValue}>
                {record.gradeLabel}
                {record.sectionName ? ` - ${record.sectionName}` : ""}
              </span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>School Year</span>
              <span className={styles.metaValue}>{record.schoolYear || "—"}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>File Size</span>
              <span className={styles.metaValue}>{formatBytes(record.fileSizeBytes)}</span>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Handled By</span>
              <span className={styles.metaValue}>{record.handledBy || "—"}</span>
            </div>
            <div className={`${styles.metaRow} ${styles.metaRowLast}`}>
              <span className={styles.metaLabel}>Last Updated</span>
              <span className={styles.metaValue}>{formatDate(record.lastUpdated)}</span>
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.actionBtn} disabled={!record.fileUrl}>
              <Download className={styles.actionIcon} />
              Download
            </button>
            <button type="button" className={styles.actionBtn} disabled={!record.fileUrl}>
              <Printer className={styles.actionIcon} />
              Print
            </button>
            <button type="button" className={styles.actionBtn}>
              <Users className={styles.actionIcon} />
              View Student
            </button>
            <button type="button" className={styles.actionBtn}>
              <Pencil className={styles.actionIcon} />
              Edit Record
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}