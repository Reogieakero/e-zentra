"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import styles from "./info-dialog.module.css";

interface InfoDialogProps {
  title: string;
  label?: string;
  bare?: boolean;
  wide?: boolean;
  trigger?: ReactNode;
  children: ReactNode;
}

export function InfoDialog({ title, label = "More information", bare = false, wide = false, trigger, children }: InfoDialogProps) {
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
      {trigger ? (
        <div
          className={styles.trigger}
          role="button"
          tabIndex={0}
          aria-haspopup="dialog"
          aria-label={label}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          {trigger}
        </div>
      ) : (
        <button
          type="button"
          className={`${styles.infoButton} ${bare ? styles.infoButtonBare : ""}`}
          onClick={() => setOpen(true)}
          aria-label={label}
          aria-haspopup="dialog"
        >
          <Info className={styles.infoButtonIcon} />
        </button>
      )}

      {open && (
        <div className={styles.modalOverlay} onClick={() => setOpen(false)}>
          <div
            className={`${styles.modal} ${wide ? styles.modalWide : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{title}</h2>
              <CloseButton onClose={() => setOpen(false)} />
            </div>
            <div className={styles.modalBody}>{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
