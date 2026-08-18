import { FileText } from "lucide-react";
import styles from "./animated-folder.module.css";

interface AnimatedFolderProps {
  label?: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  title?: string;
  size?: "md" | "sm";
  variant?: "default" | "danger";
}

export function AnimatedFolder({
  label,
  count,
  active = false,
  onClick,
  className,
  title,
  size = "md",
  variant = "default",
}: AnimatedFolderProps) {
  return (
    <button
      type="button"
      className={`${styles.folder} ${size === "sm" ? styles.folderSm : ""} ${variant === "danger" ? styles.danger : ""} ${active ? styles.active : ""} ${className ?? ""}`}
      onClick={onClick}
      title={title}
    >
      <span className={styles.stage}>
        <span className={`${styles.file} ${styles.file1}`}>
          <FileText className={styles.fileIcon} />
        </span>
        <span className={`${styles.file} ${styles.file2}`}>
          <FileText className={styles.fileIcon} />
        </span>
        <span className={`${styles.file} ${styles.file3}`}>
          <FileText className={styles.fileIcon} />
        </span>
        <svg className={styles.back} viewBox="0 0 50 40" fill="none" aria-hidden="true">
          <path
            d="M0 4C0 1.79086 1.79086 0 4 0H16.524C17.721 0 18.8415 0.54051 19.574 1.4673L22.426 5.0654C23.1585 5.99219 24.279 6.5327 25.476 6.5327H46C48.2091 6.5327 50 8.32356 50 10.5327V36C50 38.2091 48.2091 40 46 40H4C1.79086 40 0 38.2091 0 36V4Z"
            fill={variant === "danger" ? "#b91c1c" : "#15803d"}
          />
        </svg>
        <span className={styles.frontWrapper}>
          <svg className={styles.front} viewBox="0 0 50 34" fill="none" aria-hidden="true">
            <path
              d="M0 4C0 1.79086 1.79086 0 4 0H46C48.2091 0 50 1.79086 50 4V30C50 32.2091 48.2091 34 46 34H4C1.79086 34 0 32.2091 0 30V4Z"
              fill={variant === "danger" ? "rgba(220, 38, 38, 0.65)" : "rgba(22, 163, 74, 0.65)"}
            />
          </svg>
          <span className={styles.frontLabel} />
        </span>
      </span>
      {label ? <span className={styles.name}>{label}</span> : null}
      <span className={styles.count}>{count.toLocaleString()} files</span>
    </button>
  );
}