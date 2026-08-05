import { ReactNode } from "react";
import styles from "./badge.module.css";

type Tone = "brand" | "danger" | "warning" | "info" | "neutral" | "light";

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
}

export function Badge({ tone = "brand", children }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[tone]}`}>{children}</span>;
}