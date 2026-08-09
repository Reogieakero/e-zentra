"use client";

import { useMemo, useRef } from "react";
import { CalendarDays } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { HeatmapCard, HEAT_LEVELS } from "@/components/ui/heatmap-card";
import uiStyles from "@/components/ui/heatmap-card.module.css";
import { SCHOOL_WEEKDAYS } from "@/constants/dates";
import type { HeatmapCell } from "@/lib/dashboard";
import styles from "./attendance-heatmap.module.css";

const WEEKDAYS = SCHOOL_WEEKDAYS;

const CELL_PITCH = 15;

export function AttendanceHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const { weeks, months } = useMemo(() => {
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

    const months: Array<{ label: string; index: number }> = [];
    let prevMonth = "";
    for (let i = 0; i < weeks.length; i++) {
      const first = weeks[i][0];
      if (!first) continue;
      const m = first.label.split(" ")[0];
      if (m !== prevMonth) {
        months.push({ label: m, index: i });
        prevMonth = m;
      }
    }
    return { weeks, months };
  }, [cells]);

  const peak = cells.reduce((mx, c) => (c.rate > mx ? c.rate : mx), 0);

  return (
    <HeatmapCard
      title="Daily Attendance Heatmap"
      subtitle="School-wide attendance rate for every school day this year"
      icon={<CalendarDays />}
      badge={peak > 0 ? `${peak.toFixed(1)}% peak` : undefined}
    >
      <div className={`${styles.heatmapCardBody} ${styles.heatmapScroll}`} ref={scrollRef}>
        <div className={styles.heatmapBody}>
          <div className={styles.heatmapWeekdays}>
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className={styles.heatmapMain}>
            <div className={styles.heatmapMonths}>
              {months.map((s) => (
                <span key={s.label} style={{ left: `${s.index * CELL_PITCH}px` }}>
                  {s.label}
                </span>
              ))}
            </div>
            <div className={styles.heatmapGrid}>
              {weeks.map((week, k) => (
                <div key={k} className={styles.heatmapColumn}>
                  {week.map((cell) => (
                    <Tooltip key={cell.key} label={`${cell.label} — ${cell.rate.toFixed(1)}% present`}>
                      <span
                        className={`${styles.heatCell} ${cell.level > 0 ? uiStyles[HEAT_LEVELS[cell.level - 1]] : ""}`}
                      />
                    </Tooltip>
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
      </div>
    </HeatmapCard>
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