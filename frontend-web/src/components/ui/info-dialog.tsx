"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";
import styles from "./info-dialog.module.css";

interface InfoDialogProps {
  title: string;
  label?: string;
  bare?: boolean;
  children: ReactNode;
}

export function InfoDialog({ title, label = "More information", bare = false, children }: InfoDialogProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={`${styles.infoButton} ${bare ? styles.infoButtonBare : ""}`}
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-haspopup="dialog"
      >
        <Info className={styles.infoButtonIcon} />
      </button>

      {open && (
        <div className={styles.modalOverlay} onClick={() => setOpen(false)}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{title}</h2>
              <button type="button" className={styles.modalClose} onClick={() => setOpen(false)} aria-label="Close">
                <X className={styles.modalCloseIcon} />
              </button>
            </div>
            <div className={styles.modalBody}>{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
