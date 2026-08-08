"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReportSeriesPoint } from "@/lib/dashboard";
import { useTheme } from "@/components/theme-provider";
import { CustomSelect } from "@/components/ui/select";
import { ThreeDTrendOverlay } from "@/components/dashboard/three-d-trend-chart";
import { STATUS_KEYS } from "./report-config";
import styles from "./report-trend-chart.module.css";

interface ChartDataPoint {
  name: string;
  full: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  notLogged: number;
  total: number;
  rate: number;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload ?? {};
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipLabel}>{String(p.full ?? label ?? "")}</span>
      {STATUS_KEYS.map(({ key, name, color }) => {
        const v = p[key];
        return (
          <div key={key} className={styles.tooltipRow}>
            <span className={styles.tooltipDot} style={{ background: color }} />
            <span>{name}</span>
            <span className={styles.tooltipValue}>{typeof v === "number" ? v.toLocaleString() : "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

interface ReportTrendChartProps {
  series: ReportSeriesPoint[];
  isDaily: boolean;
}

export default function ReportTrendChart({ series, isDaily }: ReportTrendChartProps) {
  const [chartMode, setChartMode] = useState<"2d" | "3d">("2d");
  const { theme } = useTheme();
  const dark = theme === "dark";
  const gridStroke = dark ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const tickFill = dark ? "#94a3b8" : "#6b7280";
  const cursor = { stroke: dark ? "rgba(255,255,255,0.25)" : "#d1d5db" };

  const chartData: ChartDataPoint[] = useMemo(
    () =>
      series.map((s) => ({
        name: s.shortLabel,
        full: s.label,
        present: s.present,
        absent: s.absent,
        late: s.late,
        excused: s.excused,
        notLogged: s.notLogged,
        total: s.total,
        rate: s.rate ?? 0,
      })),
    [series]
  );
  const chartMinWidth = chartData.length * 48;

  const trendFilter = useMemo(() => chartData.map((c) => ({ day: c.name, label: c.full, present: c.present, absent: c.absent, late: c.late, excused: c.excused, notLogged: c.notLogged })), [chartData]);

  const chartScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chartScrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [chartData]);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div>
          <h4 className={styles.cardTitle}>
            <BarChart3 className={styles.cardTitleIcon} />
            {isDaily ? "Daily" : "Monthly"} Attendance Counts
          </h4>
          <p className={styles.cardSubtitle}>Present, absent, late, excused, and not-logged students per {isDaily ? "day" : "month"}</p>
        </div>
        <div className={styles.cardActions}>
          <CustomSelect
            id="report-chart-mode"
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
        </div>
      </div>

      <div className={styles.chartScroll} ref={chartScrollRef}>
        <div className={styles.chartCanvas} style={{ minWidth: `max(100%, ${chartMinWidth}px)` }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
              <defs>
                {STATUS_KEYS.map(({ key, name, color }) => (
                  <linearGradient key={key} id={`reportGradient-${name}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.16} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: tickFill }}
                axisLine={false}
                tickLine={false}
                interval={isDaily ? Math.max(Math.ceil(chartData.length / 12) - 1, 0) : 0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: tickFill }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <ChartTip cursor={cursor} content={<ChartTooltip />} />
              {STATUS_KEYS.map(({ key, name, color }) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={name}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#reportGradient-${name})`}
                  dot={{ r: 2, fill: "#ffffff", stroke: color, strokeWidth: 1.5 }}
                  activeDot={{ r: 4, fill: "#ffffff", stroke: color, strokeWidth: 2 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.legend}>
        {STATUS_KEYS.map(({ key, name, color }) => (
          <span key={key} className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendDotSolid}`} style={{ background: color }} />
            {name}
          </span>
        ))}
      </div>

      {chartMode === "3d" && (
        <ThreeDTrendOverlay
          data={trendFilter}
          title={`${isDaily ? "Daily" : "Monthly"} Attendance Trend — 3D View`}
          onClose={() => setChartMode("2d")}
        />
      )}
    </div>
  );
}