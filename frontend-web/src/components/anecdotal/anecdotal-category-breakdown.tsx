import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { CATEGORY_META, type AnecdotalCategory } from "@/lib/anecdotal";
import styles from "./anecdotal-category-breakdown.module.css";

interface CategoryDatum {
  category: AnecdotalCategory;
  count: number;
}

interface AnecdotalCategoryBreakdownProps {
  data: CategoryDatum[];
  total: number;
  scopeLabel?: string;
}

export default function AnecdotalCategoryBreakdown({
  data,
  total,
  scopeLabel = "2025-2026",
}: AnecdotalCategoryBreakdownProps) {
  const chartData = data.map((d) => ({
    name: d.category,
    value: d.count,
    color: CATEGORY_META[d.category].color,
  }));

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>Category Breakdown</h3>
        <span className={styles.scope}>{scopeLabel}</span>
      </div>

      <div className={styles.chartWrap}>
        <ResponsiveContainer width="100%" height={176}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={3}
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload as { name: string; value: number };
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <div className={styles.tooltip}>
                    <span className={styles.tooltipName}>{item.name}</span>
                    <span className={styles.tooltipValue}>
                      {item.value} · {pct}%
                    </span>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.center}>
          <span className={styles.centerValue}>{total}</span>
          <span className={styles.centerLabel}>Records</span>
        </div>
      </div>

      <div className={styles.legend}>
        {data.map((d) => {
          const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
          return (
            <div key={d.category} className={styles.legendRow}>
              <span className={styles.legendLabel}>
                <span className={styles.legendDot} style={{ background: CATEGORY_META[d.category].color }} />
                {d.category}
              </span>
              <span className={styles.legendValue}>
                {d.count} <span className={styles.legendPct}>· {pct}%</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
