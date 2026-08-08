"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import styles from "./report-states.module.css";

function SkeletonCard() {
  return (
    <div className={styles.skCard}>
      <div className={`${styles.skeleton} ${styles.skCardHeaderLine}`} />
      <div className={styles.skStatGrid}>
        <div className={`${styles.skStat} ${styles.skeleton}`}>
          <div className={`${styles.skeleton} ${styles.skStatLineSm}`} />
          <div className={`${styles.skeleton} ${styles.skStatLineLg}`} />
        </div>
      </div>
    </div>
  );
}

export function ReportLoading() {
  return (
    <>
      <div className={styles.skHeaderRow}>
        <div className={styles.pageHeading}>
          <h1 className={styles.pageTitle}>Attendance Trend Report</h1>
          <p className={styles.pageSubtitle}>Loading the latest attendance rates from the school records…</p>
        </div>
      </div>

      <div className={styles.skKpiGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
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
    </>
  );
}

export function ReportError({ message }: { message: string }) {
  return (
    <div className={styles.errorCard}>
      <AlertTriangle className={styles.errorIcon} />
      <p className={styles.errorText}>{message}</p>
      <Link href="/principal/dashboard" className={styles.backLinkBtn}>
        <ArrowLeft size={14} /> Back to Dashboard
      </Link>
    </div>
  );
}