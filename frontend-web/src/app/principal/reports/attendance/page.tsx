"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Crown,
  Lightbulb,
  Percent,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTip,
  XAxis,
  YAxis,
} from "recharts";
import { useAttendanceReport, useSectionsByGrade, type AttendanceReport, fetchAiRecommendations, type AiRecommendationResult } from "@/lib/dashboard";
import { useTheme } from "@/components/theme-provider";
import { CustomSelect } from "@/components/ui/select";
import { InfoDialog } from "@/components/ui/info-dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { ThreeDTrendOverlay } from "@/components/dashboard/three-d-trend-chart";
import styles from "./report.module.css";

const fmt = (n: number) => `${n.toFixed(1)}%`;

const GRADE_OPTIONS = [
  { value: "all", label: "All Grades" },
  { value: "grade_7", label: "Grade 7" },
  { value: "grade_8", label: "Grade 8" },
  { value: "grade_9", label: "Grade 9" },
  { value: "grade_10", label: "Grade 10" },
  { value: "grade_11", label: "Grade 11" },
  { value: "grade_12", label: "Grade 12" },
];

function ReportStatCard({
  icon: Icon,
  label,
  value,
  sub,
  subTone = "neutral",
  hint,
}: {
  icon: typeof Percent;
  label: string;
  value: string;
  sub: string;
  subTone?: "neutral" | "good" | "warn" | "danger";
  hint?: string;
}) {
  const body = (
    <div className={styles.statCard}>
      <div className={styles.statHead}>
        <span className={styles.statLabel}>{label}</span>
        <Icon className={styles.statIcon} />
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={`${styles.statSub} ${styles[`statSub${subTone === "good" ? "Good" : subTone === "warn" ? "Warn" : subTone === "danger" ? "Danger" : ""}`]}`}>
        {sub}
      </div>
    </div>
  );
  return hint ? <Tooltip label={hint}>{body}</Tooltip> : body;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ payload?: { full?: string; total?: number; rate?: number | null } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipLabel}>{p?.full ?? label}</span>
      <span className={styles.tooltipValue}>{p?.rate != null ? fmt(p.rate) : "—"}</span>
      {p?.total != null && <span className={styles.tooltipMeta}>{p.total.toLocaleString()} records</span>}
    </div>
  );
}

function vsTone(diff: number): "good" | "warn" | "danger" {
  if (diff >= 0) return "good";
  if (diff >= -1) return "warn";
  return "danger";
}

function TableRows({
  rows,
  targetRate,
}: {
  rows: NonNullable<AttendanceReport>["series"];
  targetRate: number;
}) {
  return (
    <>
      {rows.map((s) => {
        const diff = (s.rate ?? 0) - targetRate;
        const tone = vsTone(diff);
        return (
          <tr key={s.key} className={styles.tableRow}>
            <td className={styles.cellMonth}>{s.label}</td>
            <td className={styles.cellNum}>{s.present.toLocaleString()}</td>
            <td className={styles.cellNum}>{s.absent.toLocaleString()}</td>
            <td className={styles.cellNum}>{s.late.toLocaleString()}</td>
            <td className={styles.cellNum}>{s.excused.toLocaleString()}</td>
            <td className={styles.cellRate}>{s.rate != null ? fmt(s.rate) : "—"}</td>
            <td className={`${styles.cellVs} ${styles.right}`}>
              {s.rate == null ? (
                <span className={styles.vsNone}>—</span>
              ) : (
                <span className={`${styles.vsBadge} ${styles[`vsBadge${tone === "good" ? "Good" : tone === "warn" ? "Warn" : "Danger"}`]}`}>
                  {diff >= 0 ? "+" : ""}
                  {diff.toFixed(1)} pts
                </span>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}

function TablePagination({
  cur,
  pageCount,
  total,
  isDaily,
  onPrev,
  onNext,
}: {
  cur: number;
  pageCount: number;
  total: number;
  isDaily: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (!isDaily) return null;
  const from = cur * PAGE_SIZE + 1;
  const to = Math.min((cur + 1) * PAGE_SIZE, total);
  return (
    <div className={styles.tableFooter}>
      <span className={styles.paginationInfo}>
        {total === 0 ? "No school days logged" : `Showing ${from}–${to} of ${total} school days`}
      </span>
      <button
        type="button"
        className={styles.pageBtn}
        disabled={cur === 0 || Math.min(pageCount, total) === 0}
        onClick={onPrev}
        aria-label="Previous page"
      >
        <ChevronLeft size={14} />
      </button>
      <button
        type="button"
        className={styles.pageBtn}
        disabled={cur >= pageCount - 1 || total === 0}
        onClick={onNext}
        aria-label="Next page"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

const PAGE_SIZE = 8;

const FILTER_KEYS = {
  view: "zentra.attendance-report.view",
  grade: "zentra.attendance-report.grade",
  section: "zentra.attendance-report.section",
} as const;

const storedFilter = (key: string) => {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};

// AI Recommendations is kept in the codebase but disabled by default.
// Flip to true to enable (also set AI_RECOMMENDATIONS_ENABLED=true on the backend).
const AI_RECOMMENDATIONS_ENABLED = false;

export default function AttendanceReportPage() {
  const [view, setView] = useState<"monthly" | "daily">(
    () => (storedFilter(FILTER_KEYS.view) === "daily" ? "daily" : "monthly"),
  );
  const [grade, setGrade] = useState(() => storedFilter(FILTER_KEYS.grade) || "all");
  const [section, setSection] = useState(() => storedFilter(FILTER_KEYS.section));
  const [page, setPage] = useState(0);
  const [chartMode, setChartMode] = useState<"2d" | "3d">("2d");
  const { data, error, isLoading } = useAttendanceReport(view, grade, section);
  const { data: sectionOptions, isLoading: sectionsLoading } = useSectionsByGrade(grade);
  const { theme } = useTheme();
  const dark = theme === "dark";
  const gridStroke = dark ? "rgba(255,255,255,0.1)" : "#e5e7eb";
  const tickFill = dark ? "#94a3b8" : "#6b7280";
  const cursor = { stroke: dark ? "rgba(255,255,255,0.25)" : "#d1d5db" };
  const [aiResult, setAiResult] = useState<AiRecommendationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const generateAi = async () => {
    setAiLoading(true);
    try {
      const res = await fetchAiRecommendations(view, grade, section);
      setAiResult(res);
    } catch {
      setAiResult({
        ok: false,
        summary: "",
        recommendations: [],
        model: "",
        reason: "Could not reach the AI service. Please try again.",
      });
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(FILTER_KEYS.view, view);
      window.localStorage.setItem(FILTER_KEYS.grade, grade);
      window.localStorage.setItem(FILTER_KEYS.section, section);
    } catch {
      /* storage unavailable */
    }
  }, [view, grade, section]);

  const rows = data?.series.slice().reverse() ?? [];
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const cur = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(cur * PAGE_SIZE, cur * PAGE_SIZE + PAGE_SIZE);

  const switchView = (next: "monthly" | "daily") => {
    setView(next);
    setPage(0);
  };

  const switchGrade = (next: string) => {
    setGrade(next);
    setSection("");
    setPage(0);
  };

const chartData = useMemo(
    () =>
      data?.series.map((s) => ({ name: s.shortLabel, full: s.label, rate: s.rate ?? 0, total: s.total })) ?? [],
    [data],
  );
  const chartMinWidth = chartData.length * 48;

  const trendBars = useMemo(
    () => chartData.map((c) => ({ day: c.name, rate: c.rate })),
    [chartData],
  );

  const chartScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chartScrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [chartData]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.skHeaderRow}>
          <div className={styles.pageHeading}>
            <h1 className={styles.pageTitle}>Attendance Trend Report</h1>
            <p className={styles.pageSubtitle}>Loading the latest attendance rates from the school records…</p>
          </div>
        </div>

        <div className={styles.skKpiGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skCard}>
              <div className={`${styles.skeleton} ${styles.skCardHeaderLine}`} />
              <div className={styles.skStatGrid}>
                <div className={`${styles.skStat} ${styles.skeleton}`}>
                  <div className={`${styles.skeleton} ${styles.skStatLineSm}`} />
                  <div className={`${styles.skeleton} ${styles.skStatLineLg}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.skPanel}>
          <div className={`${styles.skeleton} ${styles.skPanelTitle}`} />
          <div className={`${styles.skeleton} ${styles.skFullChart}`} />
        </div>

        <div className={styles.skTwoCol}>
          <div className={`${styles.skeleton} ${styles.skTable}`} />
          <div className={`${styles.skeleton} ${styles.skTable}`} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.page}>
        <div className={styles.errorCard}>
          <AlertTriangle className={styles.errorIcon} />
          <p className={styles.errorText}>{error ? error.message : "Could not load the attendance report."}</p>
          <Link href="/principal/dashboard" className={styles.backLinkBtn}>
            <ArrowLeft size={14} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { statBlocks: sb, targetRate, gradeLevels, insights } = data;
  const above = sb.periodsAboveTarget;
  const below = sb.periodsTracked - above;
  const avgAbove = sb.averageRate >= targetRate;
  const isDaily = view === "daily";
  const periodName = isDaily ? "Day" : "Month";
  const periodsName = isDaily ? "Days" : "Months";
  const bestLabel = sb.bestPeriod ? sb.bestPeriod.label.split(",")[0] : null;
  const lowestLabel = sb.lowestPeriod ? sb.lowestPeriod.label.split(",")[0] : null;
  const bestValue = bestLabel ? `${bestLabel} · ${fmt(sb.bestPeriod!.rate)}` : "—";

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerTitleWrap}>
          <Link href="/principal/dashboard" className={styles.backChevron} aria-label="Back to Dashboard">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className={styles.title}>
              <TrendingUp className={styles.titleIcon} />
              {isDaily ? "Daily" : "Monthly"} Attendance Trend Report
            </h1>
            <p className={styles.subtitle}>
              {grade === "all" ? "School-wide" : GRADE_OPTIONS.find((o) => o.value === grade)?.label ?? "School-wide"} attendance rate by{" "}
              {isDaily ? "day" : "month"}{data.schoolYear ? ` · School Year ${data.schoolYear}` : ""}.
            </p>
          </div>
        </div>

        <div className={styles.headerControls}>
          <CustomSelect
            id="report-granularity"
            value={view}
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "daily", label: "Daily" },
            ]}
            onChange={(v) => switchView(v as "monthly" | "daily")}
            className={styles.filterSelect}
            size="sm"
            showCheck={false}
          />
          <CustomSelect
            id="report-grade"
            value={grade}
            options={GRADE_OPTIONS}
            onChange={switchGrade}
            className={styles.filterSelect}
            size="sm"
            showCheck={false}
          />
          <CustomSelect
            id="report-section"
            value={section}
            options={[
              { value: "", label: "All Sections" },
              ...sectionOptions.map((s) => ({ value: s.id, label: s.sectionName })),
            ]}
            onChange={(v) => {
              setSection(v);
              setPage(0);
            }}
            className={styles.filterSelect}
            size="sm"
            showCheck={false}
            placeholder={sectionsLoading ? "Loading…" : grade === "all" ? "Pick a grade first" : "Select a section"}
          />
          <InfoDialog
            title="Attendance Trend Report — What You See"
            label="What data does the principal see?"
            bare
          >
            <p className={styles.modalIntro}>
              This report breaks down the school-wide attendance rate so you can spot weeks or months that fall below the
              target. Pick a grade from the dropdown to zoom into that year level. Every figure is computed only from
              attendance records that were actually logged.
            </p>

<h3 className={styles.modalSection}>Filters</h3>
            <ul className={styles.modalList}>
              <li><strong>Granularity</strong> — switch between Month and Day totals.</li>
              <li><strong>Grade</strong> — All Grades (school-wide) or a specific grade level.</li>
              <li><strong>Section</strong> — choosing a grade automatically lists its sections; pick one to zoom into that section&apos;s daily attendance.</li>
            </ul>

            <h3 className={styles.modalSection}>Header stats (KPIs)</h3>
            <ul className={styles.modalList}>
              <li><strong>Average Rate</strong> — average attendance rate across all tracked {isDaily ? "days" : "months"}.</li>
              <li><strong>Best {isDaily ? "Day" : "Month"}</strong> — the {isDaily ? "day" : "month"} with the highest logged rate.</li>
              <li><strong>Lowest {isDaily ? "Day" : "Month"}</strong> — the {isDaily ? "day" : "month"} with the lowest logged rate and how far it is below the target.</li>
              <li><strong>{isDaily ? "Days" : "Months"} Above Target</strong> — how many {isDaily ? "days" : "months"} met or exceeded the {isDaily ? "target" : "target"} rate.</li>
            </ul>
            <p className={styles.modalNote}>The header shows which school year and term the report covers.</p>

            <h3 className={styles.modalSection}>{isDaily ? "Daily" : "Monthly"} Attendance Rate</h3>
            <p>Line chart of the {targetRate}% target. Each point is the rate for a {isDaily ? "day" : "month"}; the dashed line is the target.</p>

            <h3 className={styles.modalSection}>Breakdown table</h3>
            <ul className={styles.modalList}>
              <li><strong>{isDaily ? "Day-by-Day" : "Month-by-Month"}</strong> — newest on top. Shows logged {isDaily ? "days" : "months"}, present/absent counts, the rate, and the gap vs. target.</li>
              <li><strong>School days only</strong> — {isDaily ? "weekends (Sat–Sun) are excluded because school is not in session." : "each month rate is the average of its logged school days."}</li>
              {isDaily && <li><strong>Pagination</strong> — the table lists 8 school days per page.</li>}
            </ul>

            <h3 className={styles.modalSection}>Grade breakdown</h3>
            <p>Average rate by grade level (Grade 7–12), so you can spot which year levels are drifting below the target.</p>
          </InfoDialog>
        </div>
      </div>

      <div className={styles.statGrid}>
        <ReportStatCard
          icon={Percent}
          label="Average Rate"
          value={fmt(sb.averageRate)}
          sub={`${sb.periodsTracked} tracked ${periodName.toLowerCase()}${sb.periodsTracked === 1 ? "" : "s"}`}
          subTone="good"
          hint="The mean attendance rate across the current filter (grade/section) over the tracked periods. Computed as present ÷ (attended + late + excused)."
        />
        <ReportStatCard
          icon={Crown}
          label={`Best ${periodName}`}
          value={bestValue}
          sub="Highest rate"
          hint={`Highest ${periodName.toLowerCase()} attendance rate in the filtered range.`}
        />
        <ReportStatCard
          icon={AlertTriangle}
          label={`Lowest ${periodName}`}
          value={lowestLabel ? `${lowestLabel} · ${fmt(sb.lowestPeriod!.rate)}` : "—"}
          sub={sb.lowestPeriod ? `${(targetRate - sb.lowestPeriod.rate).toFixed(1)} pts below target` : "No data yet"}
          subTone={sb.lowestPeriod && sb.lowestPeriod.rate < targetRate ? "danger" : "neutral"}
          hint={`Lowest ${periodName} attendance rate in the filtered range; compared against the ${targetRate}% target.`}
        />
        <ReportStatCard
          icon={Target}
          label={`${periodsName} Above Target`}
          value={`${above} / ${sb.periodsTracked}`}
          sub={`${below} below ${targetRate}%`}
          subTone={avgAbove ? "good" : "warn"}
          hint={`How many of the tracked ${periodName.toLowerCase()}s met or exceeded the ${targetRate}% attendance target.`}
        />
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div>
            <h4 className={styles.cardTitle}>
              <BarChart3 className={styles.cardTitleIcon} />
              {isDaily ? "Daily" : "Monthly"} Attendance Rate
            </h4>
            <p className={styles.cardSubtitle}>School-wide daily attendance rate compared against the {targetRate}% target</p>
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
                <linearGradient id="reportGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#16a34a" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
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
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: tickFill }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <ChartTip cursor={cursor} content={<ChartTooltip />} />
              <ReferenceLine y={targetRate} stroke="#86efac" strokeDasharray="5 3" label={{ value: `${targetRate}% target`, position: "insideTopRight", fill: "#16a34a", fontSize: 10, fontWeight: 600 }} />
              <Area
                type="monotone"
                dataKey="rate"
                name="Rate"
                stroke="#16a34a"
                strokeWidth={2.5}
                fill="url(#reportGradient)"
                dot={{ r: 3.5, fill: "#ffffff", stroke: "#16a34a", strokeWidth: 2 }}
                activeDot={{ r: 5, fill: "#ffffff", stroke: "#16a34a", strokeWidth: 2.5 }}
              />
            </AreaChart>
            </ResponsiveContainer>
            </div>
          </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendDotSolid}`} />
            {isDaily ? "Daily" : "Monthly"} Rate
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendDotLine}`} />
            {targetRate}% Target
          </span>
        </div>

        {chartMode === "3d" && (
          <ThreeDTrendOverlay
            data={trendBars}
            title={`${isDaily ? "Daily" : "Monthly"} Attendance Trend — 3D View`}
            onClose={() => setChartMode("2d")}
          />
        )}
      </div>

      <div className={styles.twoCol}>
        <div className={`${styles.card} ${styles.breakdownCard}`}>
          <div className={styles.cardHeader}>
            <div>
              <h4 className={styles.cardTitle}>
                <Target className={styles.cardTitleIcon} />
                {isDaily ? "Day-by-Day" : "Month-by-Month"} Breakdown
              </h4>
              <p className={styles.cardSubtitle}>Enrollment base: {data.enrollmentTotal.toLocaleString()}</p>
            </div>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHeadRow}>
                  <th className={styles.tableHead}>Month</th>
                  <th className={styles.tableHead}>Present</th>
                  <th className={styles.tableHead}>Absent</th>
                  <th className={styles.tableHead}>Late</th>
                  <th className={styles.tableHead}>Excused</th>
                  <th className={styles.tableHead}>Rate</th>
                  <th className={`${styles.tableHead} ${styles.right}`}>vs. Target</th>
                </tr>
              </thead>
              <tbody>
                <TableRows rows={pageRows} targetRate={targetRate} />
              </tbody>
            </table>
          </div>
          <TablePagination
            cur={cur}
            pageCount={pageCount}
            total={rows.length}
            isDaily={isDaily}
            onPrev={() => setPage(cur - 1)}
            onNext={() => setPage(cur + 1)}
          />
        </div>

        <div className={styles.sideCol}>
          <div className={styles.card}>
            <h4 className={styles.cardTitle}>
              <BarChart3 className={styles.cardTitleIcon} />
              Average Rate by Grade Level
            </h4>
            <div className={styles.gradeList}>
              {gradeLevels.length === 0 ? (
                <p className={styles.emptyText}>No attendance data recorded yet for this school year.</p>
              ) : (
                gradeLevels.map((g) => {
                  const low = g.rate < targetRate;
                  return (
                    <div key={g.gradeLevel} className={styles.gradeRow}>
                      <div className={styles.gradeLabelRow}>
                        <span className={styles.gradeName}>{g.label}</span>
                        <span className={`${styles.gradeRate} ${low ? styles.gradeRateWarn : ""}`}>{fmt(g.rate)}</span>
                      </div>
                      <div className={styles.gradeTrack}>
                        <div
                          className={`${styles.gradeFill} ${low ? styles.gradeFillWarn : ""}`}
                          style={{ width: `${Math.min(g.rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className={styles.insights}>
            <h4 className={styles.cardTitle}>
              <Lightbulb className={styles.cardTitleIcon} />
              Report Insights
            </h4>
            <ul className={styles.insightList}>
              {insights.map((line, i) => (
                <li key={i} className={styles.insightItem}>
                  <span className={styles.insightDot} />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {AI_RECOMMENDATIONS_ENABLED && (
            <div className={`${styles.card} ${styles.aiCard}`}>
            <div className={styles.aiHeader}>
              <h4 className={styles.cardTitle}>
                <Sparkles className={styles.cardTitleIcon} />
                AI Recommendations
              </h4>
              <Tooltip label="Open-source model (Ollama) analyzes the current report aggregate and suggests next steps. No student-level data is sent.">
                <button
                  type="button"
                  className={styles.aiBtn}
                  onClick={generateAi}
                  disabled={aiLoading || isLoading}
                >
                  {aiLoading ? "Thinking…" : aiResult ? "Regenerate" : "Generate insights"}
                </button>
              </Tooltip>
            </div>

            {aiLoading ? (
              <div className={styles.aiLoading}>
                <span className={styles.aiSpinner} />
                <p>Analyzing attendance data…</p>
              </div>
            ) : aiResult ? (
              aiResult.ok ? (
                <div className={styles.aiBody}>
                  {aiResult.summary && <p className={styles.aiSummary}>{aiResult.summary}</p>}
                  {aiResult.recommendations.length > 0 && (
                    <ul className={styles.aiList}>
                      {aiResult.recommendations.map((rec, i) => (
                        <li key={i} className={styles.aiItem}>
                          <span className={styles.aiIndex}>{i + 1}</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  )}
                  {aiResult.recommendations.length === 0 && (
                    <p className={styles.aiEmpty}>No recommendations returned. Try again.</p>
                  )}
                </div>
              ) : (
                <div className={styles.aiError}>
                  <AlertTriangle className={styles.aiErrorIcon} />
                  <span>{aiResult.reason ?? "AI service unavailable."}</span>
                </div>
              )
            ) : (
              <p className={styles.aiEmpty}>
                Generate a quick analysis of this report compiled by an open-source AI model running locally.
              </p>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
