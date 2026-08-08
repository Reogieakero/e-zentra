"use client";

import { useMemo, useRef, useEffect } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/components/theme-provider";
import type { MonthlyTrendPoint, TodayAttendance } from "@/lib/dashboard";
import styles from "./attendance-overview-row.module.css";

const DONUT_COLORS = {
  present: "#16a34a",
  late: "#fbbf24",
  absent: "#cbd5e1",
  excused: "#38bdf8",
};

const STATUS_COLORS = {
  present: "#16a34a",
  absent: "#ef4444",
  late: "#f59e0b",
  excused: "#3b82f6",
};

const STATUS_KEYS: Array<{ key: "present" | "absent" | "late" | "excused" | "notLogged"; name: string; color: string }> = [
  { key: "present", name: "Present", color: STATUS_COLORS.present },
  { key: "absent", name: "Absent", color: STATUS_COLORS.absent },
  { key: "late", name: "Late", color: STATUS_COLORS.late },
  { key: "excused", name: "Excused", color: STATUS_COLORS.excused },
  { key: "notLogged", name: "Not logged", color: "#94a3b8" },
];

function TrendTooltip({
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

export function AttendanceOverviewRow({
  today,
  monthlyTrend,
  view = "monthly",
}: {
  today: TodayAttendance;
  monthlyTrend: MonthlyTrendPoint[];
  view?: "monthly" | "daily";
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const gridStroke = dark ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const tickFill = dark ? "#94a3b8" : "#6b7280";
  const cursor = { stroke: dark ? "rgba(255,255,255,0.25)" : "#d1d5db" };

  const donutData = [
    { name: "Present", value: today.present, color: DONUT_COLORS.present },
    { name: "Late", value: today.late, color: DONUT_COLORS.late },
    { name: "Absent", value: today.absent, color: DONUT_COLORS.absent },
    { name: "Excused", value: today.excused, color: DONUT_COLORS.excused },
  ].filter((d) => d.value > 0);

  const shownData =
    donutData.length > 0
      ? donutData
      : [{ name: "No records", value: 1, color: "rgba(255,255,255,0.06)" }];

  const trendData = useMemo(
    () =>
      monthlyTrend.map((p) => ({
        name: p.label,
        full: p.full ?? p.label,
        total: p.total ?? 0,
        present: p.present ?? 0,
        absent: p.absent ?? 0,
        late: p.late ?? 0,
        excused: p.excused ?? 0,
        notLogged: p.notLogged ?? 0,
      })),
    [monthlyTrend],
  );
  const chartMinWidth = trendData.length * 48;
  const chartScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = chartScrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [trendData]);

  return (
    <div className={styles.overviewGrid}>
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Attendance Overview</h3>
          <span className={styles.todayBadge}>Today</span>
        </div>

        <div className={styles.donutWrap}>
          <div className={styles.donutContainer}>
            <PieChart>
              <Pie
                data={shownData}
                dataKey="value"
                nameKey="name"
                innerRadius="70%"
                outerRadius="100%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {shownData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <ChartTip
                formatter={(value, name) => [`${value} records`, String(name)]}
              />
            </PieChart>
          </div>
          <div className={styles.donutCenter}>
            <span className={styles.donutCenterValue}>{(today.presentRate ?? 0).toFixed(1)}%</span>
            <span className={styles.donutCenterLabel}>{today.total.toLocaleString()} logged</span>
          </div>
        </div>

        {today.total === 0 && (
          <p className={styles.mutedText}>No attendance records logged yet today.</p>
        )}

        <div className={styles.legendList}>
          <LegendRow color={DONUT_COLORS.present} name="Present" value={today.present} total={today.total} />
          <LegendRow color={DONUT_COLORS.late} name="Late" value={today.late} total={today.total} />
          <LegendRow color={DONUT_COLORS.absent} name="Absent" value={today.absent} total={today.total} />
          <LegendRow color={DONUT_COLORS.excused} name="Excused" value={today.excused} total={today.total} />
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h4 className={styles.cardTitle}>
              {view === "daily" ? "Daily" : "Monthly"} Status Breakdown
            </h4>
            <p className={styles.cardSubtitle}>
              {view === "daily" ? "Daily" : "Monthly"} count of present, absent, late, excused, and not-logged students
            </p>
          </div>
          <span className={`${styles.sectionHint} ${styles.chartHint}`}>Hover to view exact counts</span>
        </div>

        <div className={styles.chartScroll} ref={chartScrollRef}>
          <div className={styles.chartCanvas} style={{ minWidth: `max(100%, ${chartMinWidth}px)` }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
                <defs>
                  {STATUS_KEYS.map(({ key, name, color }) => (
                    <linearGradient key={key} id={`attendanceTrendGradient-${name}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.18} />
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
                  interval={view === "daily" ? Math.max(Math.ceil(trendData.length / 12) - 1, 0) : 0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: tickFill }}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <ChartTip cursor={cursor} content={<TrendTooltip />} />
                {STATUS_KEYS.map(({ key, name, color }) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    name={name}
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#attendanceTrendGradient-${name})`}
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
              <span className={styles.legendDot} style={{ background: color }} />
              {name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function LegendRow({ color, name, value, total }: { color: string; name: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
  return (
    <div className={styles.legendRow}>
      <span className={styles.legendRowLabel}>
        <span className={styles.legendRowDot} style={{ background: color }} />
        {name}
      </span>
      <span className={styles.legendRowValue}>
        {value.toLocaleString()}
        <span className={styles.legendRowPct}> · {pct.toFixed(1)}%</span>
      </span>
    </div>
  );
}

export function AttendanceOverviewRowLoading() {
  return (
    <div className={styles["grid-overview"]}>
      <div className={`${styles.card} ${styles.skCard}`}>
        <div className={`${styles.skeleton} ${styles.skHeaderLine}`} />
        <div className={`${styles.skeleton} ${styles.skDonut}`} />
        <div className={`${styles.skeleton} ${styles.skLegendRow}`} />
        <div className={`${styles.skeleton} ${styles.skLegendRow}`} />
      </div>
      <div className={`${styles.card} ${styles.skCard}`}>
        <div className={`${styles.skeleton} ${styles.skHeaderLine}`} />
        <div className={`${styles.skeleton} ${styles.skChart}`} />
      </div>
    </div>
  );
}