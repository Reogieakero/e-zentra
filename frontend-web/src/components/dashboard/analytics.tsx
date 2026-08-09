"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BarChart2, Calendar, ChevronRight, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SectionHeatmap } from "@/lib/dashboard";
import { useTheme } from "@/components/theme-provider";
import { CustomSelect } from "@/components/ui/select";
import { MonthPicker } from "@/components/ui/month-picker";
import { HeatmapCard, HEAT_LEVELS as UI_HEAT_LEVELS } from "@/components/ui/heatmap-card";
import uiStyles from "@/components/ui/heatmap-card.module.css";
import { Tooltip } from "@/components/ui/tooltip";
import { ThreeDOverlay } from "@/components/dashboard/three-d-bar-chart";
import { ThreeDTrendOverlay } from "@/components/dashboard/three-d-trend-chart";
import styles from "./analytics.module.css";

interface TrendPoint {
  label: string;
  day: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  notLogged: number;
  rate: number | null;
}

interface SectionRate {
  sectionName: string;
  rate: number;
  absentRate: number;
  lateRate: number;
  excusedRate: number;
}

interface AnalyticsProps {
  trend: TrendPoint[];
  sections: SectionRate[];
  heatmap: SectionHeatmap[];
  schoolYear: string | null;
  month: string;
  onMonthChange: (month: string) => void;
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

const STATUS_KEYS: Array<{ key: "present" | "absent" | "late" | "excused" | "notLogged"; name: string; color: string }> = [
  { key: "present", name: "Present", color: "#16a34a" },
  { key: "absent", name: "Absent", color: "#ef4444" },
  { key: "late", name: "Late", color: "#f59e0b" },
  { key: "excused", name: "Excused", color: "#3b82f6" },
  { key: "notLogged", name: "Not logged", color: "#94a3b8" },
];

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload ?? {};
  return (
    <div className={styles.chartTooltip}>
      <span className={styles.chartTooltipLabel}>{String(p.label ?? label ?? "")}</span>
      {STATUS_KEYS.map(({ key, name, color }) => {
        const v = p[key];
        return (
          <div key={key} className={styles.chartTooltipRow}>
            <span className={styles.chartTooltipDot} style={{ background: color }} />
            <span className={styles.chartTooltipName}>{name}</span>
            <span className={styles.chartTooltipValue}>{typeof v === "number" ? v.toLocaleString() : "—"}</span>
          </div>
        );
      })}
    </div>
  );
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

type AttendanceView = "presentAbsent" | "lateExcused";

export default function Analytics({ trend, sections, heatmap, schoolYear, month, onMonthChange }: AnalyticsProps) {
  const [view, setView] = useState<AttendanceView>("presentAbsent");
  const [chartMode, setChartMode] = useState<"2d" | "3d">("2d");
  const [trendMode, setTrendMode] = useState<"2d" | "3d">("2d");
  const { theme } = useTheme();
  const dark = theme === "dark";
  const TOOLTIP_CURSOR = { stroke: dark ? "rgba(255,255,255,0.25)" : "#d1d5db" };
  const gridStroke = dark ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const tickFill = dark ? "#94a3b8" : "#6b7280";
  const tickAltFill = dark ? "#a1a1aa" : "#4b5563";

  const peakRate = heatmap.reduce(
    (max, col) => Math.max(max, ...col.days.map((d) => d.rate)),
    0
  );

  const trendData = useMemo(
    () =>
      trend.map((t) => ({
        day: t.label,
        label: t.label,
        rate: t.rate ?? 0,
        present: t.present,
        absent: t.absent,
        late: t.late,
        excused: t.excused,
        notLogged: t.notLogged,
      })),
    [trend]
  );
  const sectionData = useMemo(
    () =>
      sections.map((s) => ({
        name: s.sectionName,
        present: s.rate,
        absent: s.absentRate,
        late: s.lateRate,
        excused: s.excusedRate,
      })),
    [sections]
  );

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
                <p className={styles.chartSubtitle}>Monday – Friday · current week · status counts</p>
              </div>
              <div className={styles.chartCardActions}>
                <CustomSelect
                  id="trend-mode"
                  value={trendMode}
                  options={[
                    { value: "2d", label: "2D" },
                    { value: "3d", label: "3D" },
                  ]}
                  onChange={(v) => setTrendMode(v as "2d" | "3d")}
                  className={styles.modeSelect}
                  size="sm"
                  showCheck={false}
                />
                <Link href="/principal/reports/attendance" className={styles.link}>
                  Report <ChevronRight className={styles.linkChevron} />
                </Link>
              </div>
            </div>

            <div className={styles.chartBody}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    {STATUS_KEYS.map(({ key, name, color }) => (
                      <linearGradient key={key} id={`trendGradient-${name}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: tickFill }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis hide />
                  <RechartsTooltip cursor={TOOLTIP_CURSOR} content={<TrendTooltip />} />
                  {STATUS_KEYS.map(({ key, name, color }) => (
                    <Area
                      key={key}
                      type="monotone"
                      dataKey={key}
                      name={name}
                      stroke={color}
                      strokeWidth={2}
                      fill={`url(#trendGradient-${name})`}
                      dot={{ r: 2, fill: "#ffffff", stroke: color, strokeWidth: 1.5 }}
                      activeDot={{ r: 4, fill: "#ffffff", stroke: color, strokeWidth: 2 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.legend}>
              {STATUS_KEYS.map(({ key, name, color }) => (
                <span key={key} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: color }} />
                  {name}
                </span>
              ))}
            </div>
          </div>

          <HeatmapCard
            title="Section Attendance Heatmap"
            subtitle="Weekly daily log intensity by section (Mon – Fri)"
            icon={<Calendar />}
            badge={`${peakRate}% peak`}
            className={styles.heatmapCard}
          >
            <div className={styles.heatmap}>
              <div className={styles.heatmapDays}>
                {heatmap[0]?.days.map((d) => (
                  <span key={d.day}>{d.label}</span>
                ))}
              </div>
              <div className={styles.heatmapColumns}>
                {heatmap.map((col) => (
                  <div key={col.sectionId} className={styles.heatmapCol}>
                    <div className={styles.heatmapCells}>
                      {col.days.map((cell) => (
                        <Tooltip key={cell.day} label={`${cell.label}: ${cell.rate}% present`}>
                          <span
                            className={
                              cell.level > 0
                                ? `${styles.heatCell} ${uiStyles[UI_HEAT_LEVELS[cell.level - 1]]}`
                                : styles.heatCell
                            }
                          />
                        </Tooltip>
                      ))}
                    </div>
                    <span className={styles.heatmapLabel}>{col.sectionName}</span>
                  </div>
                ))}
              </div>
            </div>
          </HeatmapCard>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartCardHeader}>
            <div>
              <h4 className={styles.chartTitle}>
                <BarChart2 className={styles.chartTitleIcon} />
                Section Performance Breakdown
              </h4>
              <p className={styles.chartSubtitle}>
                {view === "presentAbsent" ? "Present vs absent rate" : "Late vs excused rate"} by section
                {month ? ` · ${month}` : " · all time"}
              </p>
            </div>

            <div className={styles.chartControls}>
              <CustomSelect
                id="section-mode"
                value={chartMode}
                options={[
                  { value: "2d", label: "2D" },
                  { value: "3d", label: "3D" },
                ]}
                onChange={(v) => setChartMode(v as "2d" | "3d")}
                className={styles.modeSelect}
                size="sm"
                showCheck={false}
              />
              <CustomSelect
                id="section-view"
                value={view}
                options={[
                  { value: "presentAbsent", label: "Present / Absent" },
                  { value: "lateExcused", label: "Late / Excused" },
                ]}
              onChange={(v) => setView(v as AttendanceView)}
              className={styles.viewSelect}
              size="sm"
              showCheck={false}
            />
              <MonthPicker
                id="section-month"
                value={month}
                onChange={onMonthChange}
                className={styles.monthPicker}
                size="sm"
              />
            </div>
          </div>

          <div className={styles.chartBodyBars}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectionData} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={44}
                  tick={{ fontSize: 10, fill: tickAltFill }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={[0, 100]} />
                <RechartsTooltip cursor={TOOLTIP_CURSOR} content={<ChartTooltip />} />
                {view === "presentAbsent" ? (
                  <>
                    <Bar dataKey="present" name="Present" fill="#16a34a" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="absent" name="Absent" fill="#ef4444" radius={[2, 2, 0, 0]} />
                  </>
                ) : (
                  <>
                    <Bar dataKey="late" name="Late" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="excused" name="Excused" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          {chartMode === "3d" && (
            <ThreeDOverlay
              data={sectionData}
              initialView={view}
              onClose={() => setChartMode("2d")}
            />
          )}
          {trendMode === "3d" && (
            <ThreeDTrendOverlay
              data={trendData}
              onClose={() => setTrendMode("2d")}
            />
          )}

          <div className={styles.barFooter}>
            <div className={styles.barLegend}>
              {view === "presentAbsent" ? (
                <>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.legendDotSolid}`} />
                    Present
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.legendDotRed}`} />
                    Absent
                  </span>
                </>
              ) : (
                <>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.legendDotAmber}`} />
                    Late
                  </span>
                  <span className={styles.legendItem}>
                    <span className={`${styles.legendDot} ${styles.legendDotViolet}`} />
                    Excused
                  </span>
                </>
              )}
            </div>
            <span className={styles.barHint}>Hover bars to view exact percentages</span>
          </div>
        </div>
      </div>

      <div className={styles.panelFooter}>
        Daily trend and heatmap cover the current school week (Mon – Fri). Section breakdown shows statuses as % of all
        logged attendance in the selected month, or all time when no month is chosen. Figures update automatically at the
        end of each school day and are used to flag at-risk students and sections falling below the 95% target.
      </div>
    </div>
  );
}
