"use client";

import { useEffect, useState } from "react";
import { BellRing, CheckCircle2 } from "lucide-react";
import { useNeedsAttention, useSectionsByGrade, useAdviserAlerts } from "@/lib/dashboard";
import type { AdviserAlertSendResult } from "@/lib/dashboard";
import NeedsAttentionHeader from "@/components/reports/attendance/needs-attention-header";
import NeedsAttentionStats from "@/components/reports/attendance/needs-attention-stats";
import NeedsAttentionTable from "@/components/reports/attendance/needs-attention-table";
import AlertAdvisersDialog from "@/components/reports/attendance/alert-advisers-dialog";
import { ReportError } from "@/components/reports/attendance/report-states";

import styles from "./page.module.css";

export default function NeedsAttentionReportPage() {
  const [mounted, setMounted] = useState(false);
  const [grade, setGrade] = useState("all");
  const [section, setSection] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sentNotice, setSentNotice] = useState<AdviserAlertSendResult | null>(null);
  const { data, error, isLoading } = useNeedsAttention(grade, section);
  const { data: sectionOptions, isLoading: sectionsLoading } = useSectionsByGrade(grade);
  const { data: alerts, refresh: refreshAlerts } = useAdviserAlerts(grade, section);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSection("");
  }, [grade]);

  const showSkeleton = !mounted || isLoading;

  return (
    <div className={styles.page}>
      <NeedsAttentionHeader
        grade={grade}
        section={section}
        sectionOptions={sectionOptions ?? []}
        sectionsLoading={sectionsLoading}
        schoolYear={data?.schoolYear ?? null}
        onGradeChange={setGrade}
        onSectionChange={setSection}
      />

      {sentNotice ? (
        <div className={styles.sentBanner} role="status">
          <CheckCircle2 size={16} />
          <span>
            Alerted <strong>{sentNotice.notified}</strong> adviser{sentNotice.notified === 1 ? "" : "s"} across{" "}
            <strong>{sentNotice.created}</strong> student{sentNotice.created === 1 ? "" : "s"}.{" "}
            {sentNotice.skippedNoAdviser > 0 && (
              <>{sentNotice.skippedNoAdviser} student{sentNotice.skippedNoAdviser === 1 ? " has" : "s have"} no class adviser assigned.</>
            )}
          </span>
        </div>
      ) : null}

      {showSkeleton ? (
        <div className={styles.skGrid}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skCard}>
              <div className={`${styles.skeleton} ${styles.skLineSm}`} />
              <div className={`${styles.skeleton} ${styles.skLineLg}`} />
              <div className={`${styles.skeleton} ${styles.skLineXs}`} />
            </div>
          ))}
        </div>
      ) : (
        <NeedsAttentionStats
          totalFlagged={data?.totalFlagged ?? 0}
          dangerCount={data?.dangerCount ?? 0}
          warnCount={data?.warnCount ?? 0}
          hasFilters={Boolean(grade !== "all" || section)}
        />
      )}

      {error && !data ? (
        <ReportError message={error.message} />
      ) : (
        <NeedsAttentionTable rows={data?.rows ?? []} alerts={alerts} isLoading={showSkeleton} />
      )}

      <button type="button" className={styles.alertBtn} onClick={() => setDialogOpen(true)} disabled={showSkeleton}>
        <BellRing size={14} />
        Alert Class Advisers
      </button>

      {dialogOpen ? (
        <AlertAdvisersDialog
          grade={grade}
          section={section}
          sectionOptions={sectionOptions ?? []}
          sectionsLoading={sectionsLoading}
          flagged={data?.rows ?? []}
          onSent={(result) => {
            setSentNotice(result);
            setDialogOpen(false);
            refreshAlerts();
          }}
          onClose={() => setDialogOpen(false)}
        />
      ) : null}
    </div>
  );
}