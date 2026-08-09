import { X } from "lucide-react";
import styles from "./close-button.module.css";

interface CloseButtonProps {
  onClose: () => void;
  label?: string;
  className?: string;
}

export function CloseButton({ onClose, label = "Close", className }: CloseButtonProps) {
  return (
    <button type="button" className={`${styles.closeButton} ${className ?? ""}`} onClick={onClose} aria-label={label}>
      <X className={styles.closeIcon} />
    </button>
  );
}