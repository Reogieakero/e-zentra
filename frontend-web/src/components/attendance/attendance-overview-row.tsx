"use client";

import { useMemo, useRef, useEffect, useState } from "react";
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
import { ArrowUpRight, MousePointer2 } from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/components/theme-provider";
import { DatePicker } from "@/components/ui/date-picker";
import { ATTENDANCE_COACH_KEY, FILTER_KEYS, storedFilter } from "@/constants/storage";
import type { MonthlyTrendPoint, TodayAttendance } from "@/lib/dashboard";
import styles from "./attendance-overview-row.module.css";

const STATUS_COLORS = {
  present: "#16a34a",
  absent: "#ef4444",
  late: "#f59e0b",
  excused: "#3b82f6",
};

const NOT_LOGGED_COLOR = "#94a3b8";

const STATUS_KEYS: Array<{ key: "present" | "absent" | "late" | "excused" | "notLogged"; name: string; color: string }> = [
  { key: "present", name: "Present", color: STATUS_COLORS.present },
  { key: "absent", name: "Absent", color: STATUS_COLORS.absent },
  { key: "late", name: "Late", color: STATUS_COLORS.late },
  { key: "excused", name: "Excused", color: STATUS_COLORS.excused },
  { key: "notLogged", name: "Not logged", color: NOT_LOGGED_COLOR },
];

function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function DonutTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ name?: string | number; value?: number }>;
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const name = String(entry.name ?? "");
  const value = typeof entry.value === "number" ? entry.value : 0;
  const pct = total > 0 ? Math.round((value / total) * 1000) / 10 : 0;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipLabel}>{name}</span>
      <span className={styles.tooltipStat}>
        {value.toLocaleString()} records · {pct.toFixed(1)}%
      </span>
    </div>
  );
}

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
  date,
  onDateChange,
  grade,
  section,
}: {
  today: TodayAttendance;
  monthlyTrend: MonthlyTrendPoint[];
  view?: "monthly" | "daily";
  date?: string;
  onDateChange?: (value: string) => void;
  grade?: string;
  section?: string;
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const gridStroke = dark ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const tickFill = dark ? "#94a3b8" : "#6b7280";
  const cursor = { stroke: dark ? "rgba(255,255,255,0.25)" : "#d1d5db" };
  const selectedDate = date ?? toISODate(new Date());
  const isToday = selectedDate === toISODate(new Date());

  const hasFilters = Boolean(grade && grade !== "all" && section);
  const [coachVisible, setCoachVisible] = useState(() => storedFilter(ATTENDANCE_COACH_KEY) !== "1");
  const coachSeen = () => {
    setCoachVisible(false);
    try {
      window.localStorage.setItem(ATTENDANCE_COACH_KEY, "1");
    } catch {}
  };
  const openReport = () => {
    coachSeen();
    try {
      window.localStorage.setItem(FILTER_KEYS.attendanceReport.view, view ?? "monthly");
      window.localStorage.setItem(FILTER_KEYS.attendanceReport.grade, grade ?? "");
      window.localStorage.setItem(FILTER_KEYS.attendanceReport.section, section ?? "");
    } catch {}
  };

  useEffect(() => {
    if (!hasFilters || !coachVisible) return;
    const t = window.setTimeout(coachSeen, 8000);
    return () => window.clearTimeout(t);
  }, [hasFilters, coachVisible]);

  const notLogged = today.notLogged ?? 0;
  const enrolledToday = today.total + notLogged;
  const presentRate = enrolledToday > 0 ? Math.round((today.present / enrolledToday) * 1000) / 10 : 0;

  const donutData = [
    { name: "Present", value: today.present, color: STATUS_COLORS.present },
    { name: "Late", value: today.late, color: STATUS_COLORS.late },
    { name: "Absent", value: today.absent, color: STATUS_COLORS.absent },
    { name: "Excused", value: today.excused, color: STATUS_COLORS.excused },
    { name: "Not logged", value: notLogged, color: NOT_LOGGED_COLOR },
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
          {onDateChange ? (
            <DatePicker
              value={selectedDate}
              onChange={onDateChange}
              size="sm"
              max={toISODate(new Date())}
              className={styles.overviewDate}
            />
          ) : (
            <span className={styles.todayBadge}>Today</span>
          )}
        </div>

        <div className={styles.donutWrap}>
          <div className={styles.donutContainer}>
            <ResponsiveContainer key={`donut-${selectedDate}`} width="100%" height="100%">
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
                <ChartTip content={<DonutTooltip total={enrolledToday} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.donutCenter}>
            <span className={styles.donutCenterValue}>{presentRate.toFixed(1)}%</span>
            <span className={styles.donutCenterLabel}>{enrolledToday.toLocaleString()} enrolled</span>
          </div>
        </div>

        <div className={styles.noticeArea}>
          {today.total === 0 ? (
            <p className={styles.emptyNotice}>
              {isToday
                ? "No attendance records logged yet today."
                : `No attendance records for ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`}
            </p>
          ) : null}
        </div>

        <div className={styles.legendList}>
          <LegendRow color={STATUS_COLORS.present} name="Present" value={today.present} total={enrolledToday} />
          <LegendRow color={STATUS_COLORS.late} name="Late" value={today.late} total={enrolledToday} />
          <LegendRow color={STATUS_COLORS.absent} name="Absent" value={today.absent} total={enrolledToday} />
          <LegendRow color={STATUS_COLORS.excused} name="Excused" value={today.excused} total={enrolledToday} />
          <LegendRow color={NOT_LOGGED_COLOR} name="Not logged" value={notLogged} total={enrolledToday} />
        </div>

        <div className={styles.cardFooter}>
          <span className={styles.footerRate}>{presentRate.toFixed(1)}% present</span>
          <span className={styles.footerDesc}>
            across {enrolledToday.toLocaleString()} enrolled students for the selected date.
          </span>
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
          <div className={styles.cardActions}>
            {hasFilters ? (
              <div className={styles.reportWrap}>
                <Link href="/principal/reports/attendance" className={styles.reportLink} onClick={openReport}>
                  Report
                  <ArrowUpRight size={13} />
                </Link>
                {coachVisible ? (
                  <div className={styles.coachHint}>
                    <span className={styles.coachIconWrap}>
                      <span className={styles.coachPulse} />
                      <MousePointer2 size={16} className={styles.coachIcon} />
                    </span>
                    <span className={styles.coachText}>View report</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.chartRow}>
          <div className={styles.chartAxis} aria-hidden>
            {[8, 6, 4, 2].map((v) => (
              <span key={v} className={styles.chartAxisTick}>
                {v}
              </span>
            ))}
            <span className={styles.chartAxisTick} />
          </div>
          <div className={styles.chartScroll} ref={chartScrollRef}>
          <div className={styles.chartCanvas} key={`trend-${selectedDate}-${view}`} style={{ minWidth: `max(100%, ${chartMinWidth}px)` }}>
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
                  hide
                  domain={[0, 8]}
                  ticks={[2, 4, 6, 8]}
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
        </div>

        <div className={styles.legend}>
          {STATUS_KEYS.map(({ key, name, color }) => (
            <span key={key} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: color }} />
              {name}
            </span>
          ))}
        </div>

        <p className={styles.countHint}>Hover to view exact counts</p>
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