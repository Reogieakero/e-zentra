"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/components/theme-provider";
import type { MonthlyTrendPoint, TodayAttendance } from "@/lib/dashboard";
import styles from "./attendance.module.css";

const DONUT_COLORS = {
  present: "#16a34a",
  late: "#fbbf24",
  absent: "#cbd5e1",
  excused: "#38bdf8",
};

export function AttendanceOverviewRow({
  today,
  monthlyTrend,
}: {
  today: TodayAttendance;
  monthlyTrend: MonthlyTrendPoint[];
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

  const trendData = monthlyTrend.map((p) => ({ label: p.label, rate: p.rate ?? 0 }));

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
            <h4 className={styles.cardTitle}>Attendance Analytics</h4>
            <p className={styles.cardSubtitle}>Monthly attendance rate trend</p>
          </div>
          <span className={`${styles.sectionHint} ${styles.chartHint}`}>Hover to view exact %</span>
        </div>

        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="attendanceTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: tickFill }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis hide domain={[0, 100]} />
              <ChartTip cursor={cursor} />
              <ReferenceLine y={95} stroke="#86efac" strokeDasharray="4 2" />
              <Area
                type="monotone"
                dataKey="rate"
                name="Rate"
                stroke="#16a34a"
                strokeWidth={2.5}
                fill="url(#attendanceTrendGradient)"
                dot={{ r: 3, fill: "#ffffff", stroke: "#16a34a", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "#ffffff", stroke: "#16a34a", strokeWidth: 2.5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendDotSolid}`} />
            Attendance Rate
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendDotLine}`} />
            95% Target
          </span>
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