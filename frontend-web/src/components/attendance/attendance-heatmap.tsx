"use client";

import { useMemo, useRef } from "react";
import { CalendarDays } from "lucide-react";
import { SCHOOL_WEEKDAYS } from "@/constants/dates";
import type { HeatmapCell } from "@/lib/dashboard";
import styles from "./attendance-heatmap.module.css";

const HEAT_LEVELS = ["heat1", "heat2", "heat3", "heat4", "heat5", "heat6"];

const WEEKDAYS = SCHOOL_WEEKDAYS;

export function AttendanceHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { weeks, monthSpans } = useMemo(() => {
    const weeks: HeatmapCell[][] = [];
    let week: HeatmapCell[] = [];
    for (const cell of cells) {
      week.push(cell);
      if (week.length === 5) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) weeks.push(week);

    const spans: Array<{ label: string; width: number }> = [];
    for (const w of weeks) {
      if (w.length === 0) continue;
      const monthLabels = new Map<string, number>();
      for (const c of w) {
        const m = c.label.split(" ")[0];
        monthLabels.set(m, (monthLabels.get(m) ?? 0) + 1);
      }
      for (const [label, count] of monthLabels) {
        spans.push({ label, width: count });
      }
    }
    return { weeks, monthSpans: spans };
  }, [cells]);

  const peak = cells.reduce((mx, c) => (c.rate > mx ? c.rate : mx), 0);

  return (
    <section className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h4 className={styles.cardTitle}>
            <CalendarDays className={styles.cardTitleIcon} />
            Daily Attendance Heatmap
          </h4>
          <p className={styles.cardSubtitle}>School-wide attendance rate for every school day this year</p>
        </div>
        <div className={styles.cardHeaderRight}>
          {peak > 0 && <span className={styles.peakBadge}>{peak.toFixed(1)}% peak</span>}
          <div className={styles.heatmapScale}>
<span>Less</span>
            {HEAT_LEVELS.map((lv) => (
              <span key={lv} className={`${styles.heatCellSmall} ${styles[lv]}`} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      <div className={styles.heatmapScroll} ref={scrollRef}>
        <div className={styles.heatmapMonths}>
          {monthSpans.map((s, i) => (
            <span key={`${s.label}-${i}`} style={{ width: `${s.width * 14 + (s.width - 1) * 3}px` }}>
              {s.label}
            </span>
          ))}
        </div>
        <div className={styles.heatmapBody}>
          <div className={styles.heatmapWeekdays}>
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className={styles.heatmapGrid}>
            {weeks.map((week, k) => (
              <div key={k} className={styles.heatmapColumn}>
                {week.map((cell) => (
                  <span
                    key={cell.key}
                    className={`${styles.heatCell} ${cell.level > 0 ? styles[HEAT_LEVELS[cell.level - 1]] : ""}`}
                    title={`${cell.label} — ${cell.rate.toFixed(1)}%`}
                  />
                ))}
                {week.length < 5 &&
                  Array.from({ length: 5 - week.length }).map((_, i) => (
                    <span key={i} className={`${styles.heatCell} ${styles.heatEmpty}`} />
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.heatmapFooter}>
        <span>Mon – Fri school logs</span>
        <span>Hover a cell to view exact attendance</span>
      </div>
    </section>
  );
}

export function AttendanceHeatmapLoading() {
  return (
    <div className={`${styles.card} ${styles.skCard}`}>
      <div className={`${styles.skeleton} ${styles.skHeaderLine}`} />
      <div className={`${styles.skeleton} ${styles.skHeatmap}`} />
    </div>
  );
}