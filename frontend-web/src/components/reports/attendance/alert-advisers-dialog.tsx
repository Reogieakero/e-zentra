"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BellRing, CheckCircle2, XCircle } from "lucide-react";
import type { AdviserAlertSendResult, NeedsAttentionStudent, ReportSection } from "@/lib/dashboard";
import { sendAdviserAlerts } from "@/lib/dashboard";
import { sileo } from "sileo";
import { Button } from "@/components/ui/button";
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

  const advisers = useMemo(() => {
    const map = new Map<string, { name: string; sectionName: string }>();
    for (const f of scopedFlagged) {
      if (!f.sectionId) continue;
      const sectionKey = `${f.sectionId}::${f.sectionName}`;
      if (f.adviserName) {
        map.set(sectionKey, { name: f.adviserName, sectionName: f.sectionName });
      } else if (!map.has(sectionKey)) {
        map.set(sectionKey, { name: "No adviser assigned", sectionName: f.sectionName });
      }
    }
    return Array.from(map.values());
  }, [scopedFlagged]);

  if (!mounted) return null;

  async function handleConfirm() {
    setSending(true);
    try {
      const result = await sileo.promise<AdviserAlertSendResult>(
        sendAdviserAlerts({
          grade: grade === "all" ? undefined : grade,
          section: gradeLocked ? (sectionScope === "all" ? undefined : sectionScope) : undefined,
          tone,
        }),
        {
          loading: {
            title: "Alerting class advisers…",
            description: "Sending attendance alerts to the flagged students' class advisers.",
            icon: <BellRing size={18} />,
          },
          success: (data) => ({
            title: "Advisers alerted",
            description: (
              <span className={styles.toastList}>
                {data.advisers.length > 0 ? (
                  <ul className={styles.toastListUl}>
                    {data.advisers.map((a) => (
                      <li key={`${a.id}-${a.sectionId}`}>
                        <strong>{a.name}</strong> · {a.sectionName}
                      </li>
                    ))}
                  </ul>
                ) : (
                  "No class advisers were notified."
                )}
              </span>
            ),
            icon: <CheckCircle2 size={18} />,
          }),
          error: (err) => ({
            title: "Could not alert advisers",
            description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
            icon: <XCircle size={18} />,
          }),
        }
      );
      onSent(result);
    } catch {
      // sileo.promise shows the error toast; nothing else to do here.
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
              <strong>{scopedFlagged.length}</strong> flagged student{scopedFlagged.length === 1 ? "" : "s"} across{" "}
              <strong>{advisers.length}</strong> class adviser{advisers.length === 1 ? "" : "s"}
            </p>
            {advisers.length > 0 ? (
              <ul className={styles.adviserList}>
                {advisers.map((a) => (
                  <li key={`${a.name}-${a.sectionName}`}>
                    <span className={styles.adviserDot} aria-hidden />
                    <span>
                      <strong>{a.name}</strong>
                      <span className={styles.adviserSection}> · {a.sectionName}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.summaryNote}>No flagged students with a class adviser under this scope.</p>
            )}
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={sending}>
              Cancel
            </button>
            <Button onClick={handleConfirm} loading={sending} disabled={scopedFlagged.length === 0}>
              <BellRing size={14} aria-hidden />
              {sending ? "Sending…" : `Alert ${advisers.length} adviser${advisers.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}