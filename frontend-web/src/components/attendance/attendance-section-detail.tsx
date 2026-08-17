"use client";

import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip as ChartTip } from "recharts";
import { useAttendanceSummary } from "@/lib/dashboard";
import styles from "./attendance-section-detail.module.css";

const STATUS_ITEMS = [
  { key: "present", name: "Present", color: "#16a34a" },
  { key: "late", name: "Late", color: "#f59e0b" },
  { key: "absent", name: "Absent", color: "#ef4444" },
  { key: "excused", name: "Excused", color: "#3b82f6" },
  { key: "notLogged", name: "Not logged", color: "#94a3b8" },
] as const;

type CountKey = (typeof STATUS_ITEMS)[number]["key"];

export function AttendanceSectionDetail({
  sectionId,
  avgPresent,
  adviserName,
  studentCount,
}: {
  sectionId: string;
  avgPresent: number;
  adviserName: string | null;
  studentCount: number;
}) {
  const { data, isLoading } = useAttendanceSummary("monthly", "all", sectionId);

  if (isLoading && !data) {
    return (
      <div className={styles.skArea}>
        <div className={`${styles.skeleton} ${styles.skTiles}`} />
        <div className={`${styles.skeleton} ${styles.skDonut}`} />
      </div>
    );
  }

  const totals = (data?.monthlyTrend ?? []).reduce(
    (acc, p) => {
      acc.present += p.present ?? 0;
      acc.late += p.late ?? 0;
      acc.absent += p.absent ?? 0;
      acc.excused += p.excused ?? 0;
      acc.notLogged += p.notLogged ?? 0;
      return acc;
    },
    { present: 0, late: 0, absent: 0, excused: 0, notLogged: 0 }
  );
  const denominator = totals.present + totals.late + totals.absent + totals.excused + totals.notLogged;
  const rate = denominator > 0 ? Math.round((totals.present / denominator) * 1000) / 10 : 0;

  const donutData = STATUS_ITEMS.map(({ key, name, color }) => ({
    name,
    color,
    value: totals[key as CountKey],
  })).filter((d) => d.value > 0);
  const shownData = donutData.length > 0 ? donutData : [{ name: "No records", color: "rgba(255,255,255,0.06)", value: 1 }];

  const trendData = (data?.monthlyTrend ?? []).map((p) => ({ label: p.label, present: p.present ?? 0, rate: p.rate }));

  return (
    <div className={styles.detail}>
      <div className={styles.adviserRow}>
        <span>Adviser: {adviserName ?? "—"}</span>
        <span>Population: {studentCount}</span>
      </div>

      <div className={styles.tiles}>
        <div className={styles.tile}>
          <span className={styles.tileValue}>{avgPresent.toFixed(1)}</span>
          <span className={styles.tileLabel}>Avg. present / day</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileValue}>{rate.toFixed(1)}%</span>
          <span className={styles.tileLabel}>Attendance rate</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileValue}>{data?.today.total ?? 0}</span>
          <span className={styles.tileLabel}>Logged today</span>
        </div>
        <div className={styles.tile}>
          <span className={styles.tileValue}>{studentCount}</span>
          <span className={styles.tileLabel}>Population</span>
        </div>
      </div>

      <div className={styles.donutArea}>
        <div className={styles.donutInner}>
          <div className={styles.donutContainer}>
            <ResponsiveContainer width="100%" height="100%">
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
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.donutCenter}>
            <span className={styles.donutCenterValue}>{rate.toFixed(1)}%</span>
            <span className={styles.donutCenterLabel}>present</span>
          </div>
        </div>
        <div className={styles.legendList}>
          {STATUS_ITEMS.map(({ key, name, color }) => {
            const value = totals[key as CountKey];
            const pct = denominator > 0 ? Math.round((value / denominator) * 1000) / 10 : 0;
            return (
              <div key={key} className={styles.legendRow}>
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
          })}
        </div>
      </div>

      <div className={styles.trend}>
        <p className={styles.trendTitle}>Monthly present</p>
        <div className={styles.trendChart}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                fontSize={9}
                tick={{ fill: "var(--muted-foreground)" }}
              />
              <YAxis hide />
              <ChartTip
                cursor={{ fill: "rgba(255,255,255,0.06)" }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "var(--foreground)",
                }}
              />
              <Bar dataKey="present" fill="#10b981" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}