"use client";

import { BarChart2, Calendar, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SectionHeatmap } from "@/lib/dashboard";
import styles from "./analytics.module.css";

interface TrendPoint {
  label: string;
  rate: number | null;
}

interface SectionRate {
  sectionName: string;
  rate: number;
  absentRate: number;
}

interface AnalyticsProps {
  trend: TrendPoint[];
  sections: SectionRate[];
  heatmap: SectionHeatmap[];
  schoolYear: string | null;
}

interface ChartTooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipEntry[];
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className={styles.chartTooltip}>
      <span className={styles.chartTooltipLabel}>{label}</span>
      {payload.map((entry, i) => (
        <div key={i} className={styles.chartTooltipRow}>
          <span className={styles.chartTooltipDot} style={{ background: entry.color ?? "#16a34a" }} />
          <span className={styles.chartTooltipName}>{entry.name}</span>
          <span className={styles.chartTooltipValue}>
            {entry.value == null ? "No data yet" : `${entry.value}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const heatLevels = ["heat1", "heat2", "heat3", "heat4", "heat5", "heat6"];
const TOOLTIP_CURSOR = { stroke: "#d1d5db" };

export default function Analytics({ trend, sections, heatmap, schoolYear }: AnalyticsProps) {
  const peakRate = heatmap.reduce(
    (max, col) => Math.max(max, ...col.days.map((d) => d.rate)),
    0
  );

  const trendData = trend.map((t) => ({ day: t.label, rate: t.rate }));
  const sectionData = sections.map((s) => ({ name: s.sectionName, present: s.rate, absent: s.absentRate }));

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h3 className={styles.panelTitle}>
            <BarChart2 className={styles.panelTitleIcon} />
            Performance &amp; Attendance Analytics
          </h3>
          <p className={styles.panelSubtitle}>Comprehensive view of attendance trends, activity heatmap, and section breakdowns</p>
        </div>
        <span className={styles.syBadge}>{schoolYear ? `SY ${schoolYear}` : "SY —"}</span>
      </div>

      <div className={styles.charts}>
        <div className={styles.chartGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartCardHeader}>
              <div>
                <h4 className={styles.chartTitle}>
                  <TrendingUp className={styles.chartTitleIcon} />
                  Daily Attendance Trend
                </h4>
                <p className={styles.chartSubtitle}>Monday – Friday · current week</p>
              </div>
              <span className={styles.link}>Report</span>
            </div>

            <div className={styles.chartBody}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis hide domain={[0, 100]} />
                  <Tooltip cursor={TOOLTIP_CURSOR} content={<ChartTooltip />} />
                  <ReferenceLine y={95} stroke="#86efac" strokeDasharray="4 2" />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    name="Rate"
                    stroke="#16a34a"
                    strokeWidth={2.5}
                    fill="url(#trendGradient)"
                    dot={{ r: 3.5, fill: "#ffffff", stroke: "#16a34a", strokeWidth: 2 }}
                    activeDot={{ r: 5, fill: "#ffffff", stroke: "#16a34a", strokeWidth: 2.5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotSolid}`} />
                Daily Rate
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotLine}`} />
                95% Target
              </span>
            </div>
          </div>

          <div className={`${styles.chartCard} ${styles.heatmapCard}`}>
            <div className={styles.chartCardHeader}>
              <div>
                <h4 className={styles.chartTitle}>
                  <Calendar className={styles.chartTitleIcon} />
                  Section Attendance Heatmap
                </h4>
                <p className={styles.chartSubtitle}>Weekly daily log intensity by section (Mon – Fri)</p>
              </div>
              <span className={styles.peakBadge}>{peakRate}% peak</span>
            </div>

            <div className={styles.heatmap}>
              <div className={styles.heatmapDays}>
                {dayLabels.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className={styles.heatmapColumns}>
                {heatmap.map((col) => (
                  <div key={col.sectionId} className={styles.heatmapCol}>
                    <div className={styles.heatmapCells}>
                      {col.days.map((cell) => (
                        <span
                          key={cell.day}
                          className={
                            cell.level > 0
                              ? `${styles.heatCell} ${styles[heatLevels[cell.level - 1]]}`
                              : styles.heatCell
                          }
                          title={`${cell.day}: ${cell.rate}%`}
                        />
                      ))}
                    </div>
                    <span className={styles.heatmapLabel}>{col.sectionName}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.heatmapFooter}>
              <span>Mon – Fri school logs</span>
              <div className={styles.heatmapScale}>
                <span>Less</span>
                {heatLevels.map((l) => (
                  <span key={l} className={`${styles.heatCell} ${styles.heatmapScaleCell} ${styles[l]}`} />
                ))}
                <span>More</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div>
              <h4 className={styles.chartTitle}>
                <BarChart2 className={styles.chartTitleIcon} />
                Section Performance Breakdown
              </h4>
              <p className={styles.chartSubtitle}>Present vs absent rate by section, with angled X-axis section labels</p>
            </div>
            <span className={styles.link}>View All</span>
          </div>

          <div className={styles.chartBodyBars}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectionData} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={44}
                  tick={{ fontSize: 10, fill: "#4b5563" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip cursor={TOOLTIP_CURSOR} content={<ChartTooltip />} />
                <Bar dataKey="present" name="Present" fill="#16a34a" radius={[2, 2, 0, 0]} />
                <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.barFooter}>
            <div className={styles.barLegend}>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotSolid}`} />
                Present
              </span>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotRed}`} />
                Absent
              </span>
            </div>
            <span className={styles.barHint}>Hover bars to view exact percentages</span>
          </div>
        </div>
      </div>

      <div className={styles.panelFooter}>
        Data is aggregated from daily attendance logs across all sections for School Year 2025-2026. Figures update
        automatically at the end of each school day and are used to flag at-risk students and sections falling below the
        95% target.
      </div>
    </div>
  );
}
