"use client";

import { useState } from "react";
import { AlertTriangle, BarChart3, Lightbulb, Sparkles } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { fetchAiRecommendations, type AiRecommendationResult, type ReportGradeLevel } from "@/lib/dashboard";
import { AI_RECOMMENDATIONS_ENABLED, fmt } from "./report-config";
import styles from "./report-side-panel.module.css";

interface ReportSidePanelProps {
  gradeLevels: ReportGradeLevel[];
  insights: string[];
  targetRate: number;
  view: "monthly" | "daily";
  grade: string;
  section: string;
  reportLoading: boolean;
  aiEnabled?: boolean;
  onGenerate?: (
    view: "monthly" | "daily",
    grade: string,
    section: string
  ) => Promise<AiRecommendationResult>;
}

export default function ReportSidePanel({
  gradeLevels,
  insights,
  targetRate,
  view,
  grade,
  section,
  reportLoading,
  aiEnabled = AI_RECOMMENDATIONS_ENABLED,
  onGenerate = fetchAiRecommendations,
}: ReportSidePanelProps) {
  const [aiResult, setAiResult] = useState<AiRecommendationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const generateAi = async () => {
    setAiLoading(true);
    try {
      const res = await onGenerate(view, grade, section);
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

  return (
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

      {aiEnabled && (
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
                disabled={aiLoading || reportLoading}
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
  );
}