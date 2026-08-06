import { ReactNode } from "react";
import styles from "./tooltip.module.css";

interface TooltipProps {
  label: string;
  children: ReactNode;
}

export function Tooltip({ label, children }: TooltipProps) {
  return (
    <span className={styles.tooltipWrap}>
      {children}
      <span className={styles.tooltip} role="tooltip">
        {label}
      </span>
    </span>
  );
}
