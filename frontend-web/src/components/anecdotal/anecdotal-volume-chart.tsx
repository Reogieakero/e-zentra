import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import styles from "./anecdotal-volume-chart.module.css";

interface VolumePoint {
  key: string;
  label: string;
  total: number;
}

interface AnecdotalVolumeChartProps {
  data: VolumePoint[];
}

export default function AnecdotalVolumeChart({ data }: AnecdotalVolumeChartProps) {
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h4 className={styles.title}>
            <TrendingUp size={14} className={styles.titleIcon} />
            Monthly Record Volume
          </h4>
          <p className={styles.subtitle}>Number of anecdotal entries logged by advisers each month</p>
        </div>
      </div>

      <div className={styles.chartBody}>
        {data.length === 0 ? (
          <div className={styles.empty}>No records to chart yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                domain={[0, Math.ceil(max / 5) * 5 || 5]}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={28}
              />
              <RechartsTooltip
                cursor={{ fill: "rgba(22, 163, 74, 0.08)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const value = payload[0].value as number;
                  return (
                    <div className={styles.tooltip}>
                      <span className={styles.tooltipLabel}>{label}</span>
                      <span className={styles.tooltipValue}>Records Logged: {value}</span>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" name="Records Logged" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.legendItem}>
          <span className={styles.legendDot} />
          Records Logged
        </span>
        <span className={styles.hint}>Hover bars to view exact counts</span>
      </div>
    </div>
  );
}
