"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, CircleDashed } from "lucide-react";
import styles from "./feature-tabs.module.css";

type TabId = "attendance" | "grades" | "adm" | "risk";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "attendance", label: "Attendance" },
  { id: "grades", label: "SF10 & Grades" },
  { id: "adm", label: "Anecdotal & ADM" },
  { id: "risk", label: "Risk Alerts" },
];

interface PanelData {
  eyebrow: string;
  title: string;
  bullets: string[];
  summary: { label: string; value: string };
}

const PANELS: Record<TabId, PanelData> = {
  attendance: {
    eyebrow: "Attendance",
    title: "Two taps a day, not a paper logbook per section",
    bullets: [
      "Advisers log AM and PM sessions per half-day, not per subject",
      "Attendance rate recalculates live and feeds the risk engine below 80%",
      "Section-level trends roll up for advisers, the Record Keeper, Registrar, and Principal",
    ],
    summary: { label: "School Year rate", value: "95%" },
  },
  grades: {
    eyebrow: "SF10 & Grades",
    title: "Weighted grades in, transmuted grades out",
    bullets: [
      "Quiz, performance task, and exam weights set per subject",
      "The DepEd transmutation table is applied automatically at finalization",
      "SF10 stays current all year, split by grade band between Record Keeper and Registrar",
    ],
    summary: { label: "Final grade (transmuted)", value: "92" },
  },
  adm: {
    eyebrow: "Anecdotal & ADM",
    title: "From a written observation to a certified referral",
    bullets: [
      "GCForm-01 observations logged by the adviser in minutes",
      "A referral carries the case to Guidance, the Nurse, or the ADM Coordinator automatically",
      "The Administrator gives the final approval before modules are released",
    ],
    summary: { label: "Awaiting", value: "Administrator approval" },
  },
  risk: {
    eyebrow: "Risk Alerts",
    title: "Risk that's calculated, not guessed at",
    bullets: [
      "Recalculated live as grades and attendance are entered, not on a fixed schedule",
      "High, Moderate, or Low based on how many of the three axes are triggered",
      "Shown directly to students and parents, never hidden or softened",
    ],
    summary: { label: "Risk Level", value: "High · 2 of 3" },
  },
};

function SummaryCard({ tab, data }: { tab: TabId; data: PanelData }) {
  if (tab === "attendance") {
    return (
      <div className={styles.panelCard}>
        <div className={styles.panelCardTitle}>Grade 10 – Sampaguita · Aug 4</div>
        <div className={styles.rows}>
          <div className={`${styles.row} ${styles.rowSuccess}`}>
            <span>AM Session</span>
            <strong>38 / 40 present</strong>
          </div>
          <div className={`${styles.row} ${styles.rowSuccess}`}>
            <span>PM Session</span>
            <strong>37 / 40 present</strong>
          </div>
        </div>
        <div className={styles.summary}>
          <span className={styles.summaryLabel}>{data.summary.label}</span>
          <strong>{data.summary.value}</strong>
        </div>
      </div>
    );
  }

  if (tab === "grades") {
    return (
      <div className={styles.panelCard}>
        <div className={styles.panelCardTitle}>Mathematics 10 · Q1</div>
        <div className={styles.rows}>
          <div className={styles.row}>
            <span>Quiz (30%)</span>
            <strong>88%</strong>
          </div>
          <div className={styles.row}>
            <span>Performance Task (40%)</span>
            <strong>91%</strong>
          </div>
          <div className={styles.row}>
            <span>Exam (30%)</span>
            <strong>84%</strong>
          </div>
        </div>
        <div className={styles.summary}>
          <span className={styles.summaryLabel}>{data.summary.label}</span>
          <strong className={styles.summaryBrand}>{data.summary.value}</strong>
        </div>
      </div>
    );
  }

  if (tab === "adm") {
    const steps: { done: boolean; label: string }[] = [
      { done: true, label: "Anecdotal report filed" },
      { done: true, label: "Guidance consultation complete" },
      { done: true, label: "Coordinator certified" },
      { done: false, label: "Awaiting Administrator approval" },
    ];
    return (
      <div className={styles.panelCard}>
        <div className={styles.panelCardTitle}>Case Progress · K. Villanueva</div>
        <div className={styles.rows}>
          {steps.map((step) => (
            <div key={step.label} className={`${styles.row} ${styles.stepRow}`}>
              {step.done ? (
                <CheckCircle2 size={14} className={styles.checkDone} />
              ) : (
                <CircleDashed size={14} className={styles.checkPending} />
              )}
              <span className={step.done ? undefined : styles.rowPending}>{step.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panelCard}>
      <div className={styles.panelCardTitle}>Risk Level</div>
      <div className={styles.rows}>
        <div className={`${styles.row} ${styles.rowDanger}`}>
          <span>Academic average</span>
          <strong>Triggered</strong>
        </div>
        <div className={`${styles.row} ${styles.rowDanger}`}>
          <span>Attendance rate</span>
          <strong>Triggered</strong>
        </div>
        <div className={`${styles.row} ${styles.rowNeutral}`}>
          <span>Behavioral incidents</span>
          <strong>Clear</strong>
        </div>
      </div>
    </div>
  );
}

export function FeatureTabs() {
  const [active, setActive] = useState<TabId>("attendance");
  const data = PANELS[active];
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startAuto = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setActive((prev) => TABS[(TABS.findIndex((t) => t.id === prev) + 1) % TABS.length].id);
    }, 4500);
  };

  useEffect(() => {
    startAuto();
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const handleSelect = (id: TabId) => {
    setActive(id);
    startAuto();
  };

  return (
    <div>
      <div className={styles.tabs} role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => handleSelect(tab.id)}
            className={`${styles.tab} ${active === tab.id ? styles.tabActive : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.panel}>
        <div className={styles.panelText}>
          <span className={styles.panelEyebrow}>{data.eyebrow}</span>
          <h3 className={styles.panelTitle}>{data.title}</h3>
          <ul className={styles.bullets}>
            {data.bullets.map((bullet) => (
              <li key={bullet} className={styles.bullet}>
                <Check size={16} className={styles.bulletIcon} />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
        <SummaryCard tab={active} data={data} />
      </div>
    </div>
  );
}