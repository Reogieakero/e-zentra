import { BarChart2, Calendar, TrendingUp } from "lucide-react";
import styles from "./analytics.module.css";

const linePoints = "M0,65 L37,50 L75,38 L113,25 L151,15 L189,22 L227,32 L265,18 L303,12 L340,20";
const lineMonths = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

interface LineCirclePoint {
  cx: number;
  cy: number;
  big?: boolean;
}

const lineCirclePoints: LineCirclePoint[] = [
  { cx: 0, cy: 65 },
  { cx: 37, cy: 50 },
  { cx: 75, cy: 38 },
  { cx: 113, cy: 25 },
  { cx: 151, cy: 15, big: true },
  { cx: 189, cy: 22 },
  { cx: 227, cy: 32 },
  { cx: 265, cy: 18 },
  { cx: 303, cy: 12, big: true },
  { cx: 340, cy: 20 },
];

interface HeatmapColumn {
  section: string;
  levels: number[];
  titles?: string[];
}

const heatmap: HeatmapColumn[] = [
  { section: "7-Rizal", levels: [2, 4, 6, 5, 3], titles: ["Mon: 93%", "Tue: 95%", "Wed: 98%", "Thu: 97%", "Fri: 94%"] },
  { section: "7-Bonifacio", levels: [1, 3, 4, 6, 2], titles: ["Mon: 90%", "Tue: 93%", "Wed: 95%", "Thu: 98%", "Fri: 92%"] },
  { section: "8-Luna", levels: [4, 6, 5, 3, 4] },
  { section: "8-Mabini", levels: [2, 3, 2, 4, 1] },
  { section: "9-DelPilar", levels: [6, 5, 6, 4, 6] },
  { section: "9-Aquino", levels: [3, 4, 5, 3, 2] },
  { section: "10-Silang", levels: [4, 6, 6, 5, 6] },
  { section: "10-Quezon", levels: [2, 3, 4, 3, 2] },
  { section: "11-STEM A", levels: [3, 6, 4, 6, 5] },
  { section: "12-HUMSS B", levels: [4, 5, 6, 4, 3] },
];

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const heatLevels = ["heat1", "heat2", "heat3", "heat4", "heat5", "heat6"];

const sections = [
  { name: "7-Rizal", pct: 96 },
  { name: "7-Bonifacio", pct: 92 },
  { name: "8-Luna", pct: 95 },
  { name: "8-Mabini", pct: 89 },
  { name: "9-DelPilar", pct: 97 },
  { name: "9-Aquino", pct: 94 },
  { name: "10-Silang", pct: 98 },
  { name: "10-Quezon", pct: 93 },
  { name: "11-STEM A", pct: 95 },
  { name: "12-HUMSS B", pct: 96 },
];

export default function Analytics() {
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
        <span className={styles.syBadge}>SY 2025-2026</span>
      </div>

      <div className={styles.charts}>
        <div className={styles.chartGrid}>
          <div className={styles.chartCard}>
            <div className={styles.chartCardHeader}>
              <div>
                <h4 className={styles.chartTitle}>
                  <TrendingUp className={styles.chartTitleIcon} />
                  Monthly Attendance Trend
                </h4>
                <p className={styles.chartSubtitle}>Average Rate: 94.8% (10 Months)</p>
              </div>
              <span className={styles.link}>Report</span>
            </div>

            <svg className={styles.lineChart} viewBox="0 0 340 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
                </linearGradient>
              </defs>
              <line x1="0" y1="10" x2="340" y2="10" stroke="#e5e7eb" strokeDasharray="3 3" />
              <line x1="0" y1="35" x2="340" y2="35" stroke="#e5e7eb" strokeDasharray="3 3" />
              <line x1="0" y1="60" x2="340" y2="60" stroke="#e5e7eb" strokeDasharray="3 3" />
              <line x1="0" y1="85" x2="340" y2="85" stroke="#d1d5db" />
              <line x1="0" y1="25" x2="340" y2="25" stroke="#86efac" strokeWidth="1.5" strokeDasharray="4 2" />
              <path d={`${linePoints} L340,85 L0,85 Z`} fill="url(#chartGradient)" />
              <path d={linePoints} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {lineCirclePoints.map((p, i) => (
                <circle
                  key={i}
                  cx={p.cx}
                  cy={p.cy}
                  r={p.big ? 3.5 : 3}
                  fill="#ffffff"
                  stroke="#16a34a"
                  strokeWidth="2"
                />
              ))}
            </svg>
            <div className={styles.lineLabels}>
              {lineMonths.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>

            <div className={styles.legend}>
              <span className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.legendDotSolid}`} />
                Monthly Rate
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
              <span className={styles.peakBadge}>98.2% peak</span>
            </div>

            <div className={styles.heatmap}>
              <div className={styles.heatmapDays}>
                {dayLabels.map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className={styles.heatmapColumns}>
                {heatmap.map((col) => (
                  <div key={col.section} className={styles.heatmapCol}>
                    <div className={styles.heatmapCells}>
                      {col.levels.map((level, i) => (
                        <span
                          key={i}
                          className={`${styles.heatCell} ${styles[heatLevels[level - 1]]}`}
                          title={col.titles?.[i]}
                        />
                      ))}
                    </div>
                    <span className={styles.heatmapLabel}>{col.section}</span>
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

          <div className={styles.barChart}>
            {sections.map((s) => (
              <div key={s.name} className={styles.barGroup}>
                <div className={styles.barTrack}>
                  <div className={`${styles.bar} ${s.pct >= 95 ? styles.barStrong : styles.barSoft}`} style={{ height: `${s.pct}%` }}>
                    <span className={styles.barTooltip}>{s.pct}%</span>
                  </div>
                </div>
                <span className={styles.barLabel}>{s.name}</span>
              </div>
            ))}
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