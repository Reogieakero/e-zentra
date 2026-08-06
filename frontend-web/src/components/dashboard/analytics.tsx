import { BarChart2, Calendar, TrendingUp } from "lucide-react";
import type { SectionHeatmap } from "@/lib/dashboard";
import styles from "./analytics.module.css";

interface TrendPoint {
  label: string;
  rate: number;
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

const WIDTH = 340;
const BASELINE = 85;
const RANGE = 70;

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const heatLevels = ["heat1", "heat2", "heat3", "heat4", "heat5", "heat6"];

function toY(rate: number): number {
  return BASELINE - (rate / 100) * RANGE;
}

function buildLine(pts: TrendPoint[]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${WIDTH / 2},${toY(pts[0].rate)}`;
  return pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${(WIDTH / (pts.length - 1)) * i},${toY(p.rate)}`)
    .join(" ");
}

export default function Analytics({ trend, sections, heatmap, schoolYear }: AnalyticsProps) {
  const linePoints = buildLine(trend);
  const peakRate = heatmap.reduce(
    (max, col) => Math.max(max, ...col.days.map((d) => d.rate)),
    0
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
                <p className={styles.chartSubtitle}>Monday – Friday · current week</p>
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
              <line x1="0" y1={toY(95)} x2="340" y2={toY(95)} stroke="#86efac" strokeWidth="1.5" strokeDasharray="4 2" />
              <path d={`${linePoints} L340,85 L0,85 Z`} fill="url(#chartGradient)" />
              <path d={linePoints} fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {trend.length === 1 && (
                <circle cx={WIDTH / 2} cy={toY(trend[0].rate)} r={3.5} fill="#ffffff" stroke="#16a34a" strokeWidth="2" />
              )}
            </svg>
            <div className={styles.lineLabels}>
              {trend.map((t) => (
                <span key={t.label}>{t.label}</span>
              ))}
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

          <div className={styles.barChart}>
            {sections.map((s) => (
              <div key={s.sectionName} className={styles.barGroup}>
                <div className={styles.barTrack}>
                  <div className={`${styles.bar} ${s.rate >= 95 ? styles.barStrong : styles.barSoft}`} style={{ height: `${s.rate}%` }}>
                    <span className={styles.barTooltip}>{s.rate}%</span>
                  </div>
                </div>
                <span className={styles.barLabel}>{s.sectionName}</span>
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
