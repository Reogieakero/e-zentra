"use client";

import { useEffect } from "react";
import type { Sf10Record } from "@/lib/dashboard";
import { Sf10StatusPill } from "./sf10-records";
import { AnimatedFolder } from "@/components/ui/animated-folder";
import { CloseButton } from "@/components/ui/close-button";
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

  const released = record.status === "released";

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-label="SF10 Preview">
      <div className={styles.backdrop} onClick={onClose} />
      <aside className={styles.drawer}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>SF10 Preview</h3>
            <p className={styles.subtitle}>Learner&apos;s Permanent Academic Record</p>
          </div>
          <CloseButton onClose={onClose} label="Close preview" />
        </div>

        <div className={styles.body}>
          <div className={styles.previewHead}>
            <AnimatedFolder
              count={released ? 1 : 0}
              variant={released ? "default" : "danger"}
              title={record.fileName}
            />
            <div className={styles.previewFileName}>{record.fileName}</div>
            <Sf10StatusPill status={record.status} />
          </div>

          <section className={styles.sectionCard}>
            <h4 className={styles.sectionLabel}>Student</h4>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>LRN</span>
              <span className={styles.fieldValue}>{record.lrn}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Full Name</span>
              <span className={styles.fieldValue}>{record.fullName}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Grade &amp; Section</span>
              <span className={styles.fieldValue}>
                {record.gradeLabel}
                {record.sectionName ? ` - ${record.sectionName}` : ""}
              </span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>School Year</span>
              <span className={styles.fieldValue}>{record.schoolYear || "—"}</span>
            </div>
          </section>

          <section className={styles.sectionCard}>
            <h4 className={styles.sectionLabel}>File</h4>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>File Size</span>
              <span className={styles.fieldValue}>{formatBytes(record.fileSizeBytes)}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Handled By</span>
              <span className={styles.fieldValue}>{record.handledBy || "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Last Updated</span>
              <span className={styles.fieldValue}>{formatDate(record.lastUpdated)}</span>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}