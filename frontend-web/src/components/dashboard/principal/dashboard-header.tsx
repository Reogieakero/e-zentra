"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { InfoDialog } from "@/components/ui/info-dialog";
import styles from "./dashboard-header.module.css";

interface DashboardHeaderProps {
  railOpen: boolean;
  onToggleRail: () => void;
}

export default function DashboardHeader({ railOpen, onToggleRail }: DashboardHeaderProps) {
  return (
    <div className={styles.pageHeaderRow}>
      <div className={styles.pageHeading}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p className={styles.pageSubtitle}>
          Monitor attendance, student records, and school activities from a centralized dashboard.
        </p>
      </div>
      <div className={styles.headerActions}>
        <button
          type="button"
          className={`${styles.railBtn} ${!railOpen ? styles.railBtnActive : ""}`}
          onClick={onToggleRail}
          aria-label={railOpen ? "Hide side panel" : "Show side panel"}
          aria-pressed={!railOpen}
        >
          {railOpen ? (
            <PanelLeftClose className={styles.railBtnIcon} />
          ) : (
            <PanelLeftOpen className={styles.railBtnIcon} />
          )}
        </button>
        <InfoDialog title="Principal Dashboard — What You See" bare>
          <p className={styles.modalIntro}>
            This dashboard aggregates live school records so you can monitor enrollment, attendance, student risk, and
            approval workflows from a single view. Every figure updates after each school day ends.
          </p>

          <h3 className={styles.modalSection}>Top cards (KPIs)</h3>
          <ul className={styles.modalList}>
            <li>
              <strong>Enrollment Stats</strong> — Total learners on the active school-year roster (assigned to an
              active section) and ADM profiles that are approved.
            </li>
            <li>
              <strong>Attendance</strong> — nested cards for today&apos;s logs. Use the select to view Present/Absent or
              Late/Excused, and the Present rate as a percentage of everyone logged today.
            </li>
            <li>
              <strong>Action Items</strong> — Pending = open record flags + ADM profiles awaiting approval + accounts
              still pending; At Risk = unique learners with a risk assessment in the active year.
            </li>
            <li>
              <strong>Documentation</strong> — Anecdotal/behavior records created this month and SF10 (Form 137)
              records marked Ready or Released.
            </li>
          </ul>
          <p className={styles.modalNote}>Hover any KPI stat to see a short explanation of what it measures.</p>

          <h3 className={styles.modalSection}>At Risk Students</h3>
          <p>
            Carousel of learners with an active-year risk assessment (any level — low, moderate, or high), one at a
            time, with their section and attendance rate.
          </p>

          <h3 className={styles.modalSection}>Quick Actions</h3>
          <p>
            Shortcuts to common tasks: add a student, scan attendance, generate SF10, write an anecdotal report, open
            ADM records, and export reports.
          </p>

          <h3 className={styles.modalSection}>ADM for Approval</h3>
          <p>
            ADM learner profiles submitted by staff and awaiting your approval/signature (up to 3).
          </p>

          <h3 className={styles.modalSection}>Analytics</h3>
          <ul className={styles.modalList}>
            <li>
              <strong>Daily Attendance Trend</strong> — the school week (Mon–Fri). Each dot is that day&apos;s
              Present-to-logged rate; days with no logs yet show &quot;No data yet&quot;. The dashed line is the 95%
              target.
            </li>
            <li>
              <strong>Section Attendance Heatmap</strong> — colour intensity shows each section&apos;s attendance per
              weekday of the current week.
            </li>
            <li>
              <strong>Section Performance Breakdown</strong> — for each section, the bars show statuses as % of all
              attendance it logged. Switch between Present/Absent and Late/Excused with the tabs, and filter to a
              specific month with the month picker (blank = all time).
            </li>
          </ul>
        </InfoDialog>
      </div>
    </div>
  );
}