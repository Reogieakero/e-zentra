import type { ReactNode } from "react";
import styles from "./heatmap-card.module.css";

export const HEAT_LEVELS = ["heat1", "heat2", "heat3", "heat4", "heat5", "heat6"];
export const HEAT_COLORS = ["#064e3b", "#047857", "#059669", "#10b981", "#34d399", "#86efac"];

interface HeatmapCardProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  badge?: string;
  children: ReactNode;
  className?: string;
}

export function HeatmapCard({ title, subtitle, icon, badge, children, className }: HeatmapCardProps) {
  return (
    <section className={`${styles.card} ${className ?? ""}`}>
      <div className={styles.cardHeader}>
        <div>
          <h4 className={styles.cardTitle}>
            {icon}
            {title}
          </h4>
          <p className={styles.cardSubtitle}>{subtitle}</p>
        </div>
        {badge && <span className={styles.peakBadge}>{badge}</span>}
      </div>
      {children}
      <div className={styles.cardFooter}>
        <span>Mon – Fri school logs</span>
        <div className={styles.heatmapScale}>
          <span>Less</span>
          {HEAT_LEVELS.map((lv) => (
            <span key={lv} className={`${styles.heatCell} ${styles.scaleCell} ${styles[lv]}`} />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  );
}