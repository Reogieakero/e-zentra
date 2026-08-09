"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BellRing } from "lucide-react";
import type { AdviserAlertSendResult, NeedsAttentionStudent, ReportSection } from "@/lib/dashboard";
import { sendAdviserAlerts } from "@/lib/dashboard";
import { CustomSelect } from "@/components/ui/select";
import { CloseButton } from "@/components/ui/close-button";
import styles from "./alert-advisers-dialog.module.css";

type Tone = "danger" | "warn" | "all";

export interface AlertAdvisersDialogProps {
  grade: string;
  section: string;
  sectionOptions: ReportSection[];
  sectionsLoading: boolean;
  flagged: NeedsAttentionStudent[];
  onSent: (result: AdviserAlertSendResult) => void;
  onClose: () => void;
}

export default function AlertAdvisersDialog({
  grade,
  section,
  sectionOptions,
  sectionsLoading,
  flagged,
  onSent,
  onClose,
}: AlertAdvisersDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [tone, setTone] = useState<Tone>("all");
  const [sectionScope, setSectionScope] = useState(section || "all");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const gradeLocked = grade !== "all";
  const scopedFlagged = flagged.filter((f) => (tone === "all" ? true : f.tone === tone));
  const adviserCount = new Set(scopedFlagged.map((f) => f.sectionName)).size;

  if (!mounted) return null;

  async function handleConfirm() {
    setSending(true);
    setError(null);
    try {
      const result = await sendAdviserAlerts({
        grade: grade === "all" ? undefined : grade,
        section: gradeLocked ? (sectionScope === "all" ? undefined : sectionScope) : undefined,
        tone,
      });
      onSent(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send alerts. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return createPortal(
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Alert class advisers"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>
              <BellRing className={styles.titleIcon} />
              Alert Class Advisers
            </h2>
            <p className={styles.modalSub}>
              Notify the class adviser of each flagged student so they can review and follow up.
            </p>
          </div>
          <CloseButton onClose={onClose} />
        </div>

        <div className={styles.modalBody}>
          <div className={styles.field}>
            <span className={styles.label}>Risk level</span>
            <CustomSelect
              value={tone}
              onChange={(v) => setTone(v as Tone)}
              size="sm"
              showCheck={false}
              options={[
                { value: "all", label: "All levels" },
                { value: "danger", label: "Below 70% · High Risk" },
                { value: "warn", label: "70–79% · At Risk" },
              ]}
            />
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Sections</span>
            <CustomSelect
              value={sectionScope}
              onChange={setSectionScope}
              size="sm"
              showCheck={false}
              disabled={!gradeLocked}
              options={[
                { value: "all", label: "All active sections" },
                ...sectionOptions.map((s) => ({ value: s.id, label: s.sectionName })),
              ]}
              placeholder={sectionsLoading ? "Loading…" : grade === "all" ? "Pick a grade first" : "All active sections"}
            />
            {!gradeLocked && <p className={styles.hint}>Pick a grade on the report header to scope by section.</p>}
          </div>

          <div className={styles.summaryCard}>
            <p className={styles.summaryLine}>
              <strong>{scopedFlagged.length}</strong> flagged student{scopedFlagged.length === 1 ? "" : "s"}
            </p>
            <p className={styles.summaryLine}>
              <strong>{adviserCount}</strong> class adviser{adviserCount === 1 ? "" : "s"} will be notified
            </p>
          </div>

          {error ? <p className={styles.error}>{error}</p> : null}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={sending}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.confirmBtn}
              onClick={handleConfirm}
              disabled={sending || scopedFlagged.length === 0}
            >
              {sending ? "Sending…" : `Alert ${adviserCount} adviser${adviserCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}