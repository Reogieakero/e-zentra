"use client";

import { BarChart2, Calendar, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
}

interface AnalyticsProps {
  trend: TrendPoint[];
  sections: SectionRate[];
  heatmap: SectionHeatmap[];
  schoolYear: string | null;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string }>;
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className={styles.chartTooltip}>
      <span className={styles.chartTooltipLabel}>{label}</span>
      <span className={styles.chartTooltipValue}>
        {payload[0].value == null ? "No data yet" : `${payload[0].value}%`}
      </span>
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
  const sectionData = sections.map((s) => ({ name: s.sectionName, rate: s.rate }));

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
              <p className={styles.chartSubtitle}>Section attendance rate comparison with angled X-axis section labels</p>
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
                <Bar dataKey="rate" radius={[2, 2, 0, 0]}>
                  {sectionData.map((s) => (
                    <Cell
                      key={s.name}
                      fill={s.rate >= 95 ? "var(--brand-primary)" : "rgba(22, 163, 74, 0.85)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.barFooter}>
            <span className={styles.legendItem}>
              <span className={`${styles.legendDot} ${styles.legendDotSolid}`} />
              Attendance Rate
            </span>
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
