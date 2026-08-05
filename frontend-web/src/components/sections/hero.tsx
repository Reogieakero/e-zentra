import { ShieldCheck, ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import styles from "./hero.module.css";

const HERO_STATS = [
  { value: "Grades 7–12", label: "Junior & Senior High coverage" },
  { value: "9 Roles", label: "One login per person, scoped access" },
  { value: "3 Risk Axes", label: "Academic, attendance, behavioral" },
];

const DASHBOARD_KPIS = [
  { label: "Present Today", value: "94.5%" },
  { label: "Pending ADM", value: "3" },
  { label: "At Risk", value: "8" },
];

const RISK_ROWS = [
  { label: "Academic average", value: "72 · below 75", tone: "danger" },
  { label: "Attendance rate", value: "78% · below 80%", tone: "warning" },
  { label: "Behavioral incidents", value: "0 logged", tone: "neutral" },
];

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.dotGrid} />
      <div className={`${styles.inner} ${styles.container}`}>
        <div className={styles.grid}>
          <div className={styles.copy}>
            <span className={styles.eyebrow}>
              <ShieldCheck size={12} />
              Built around DepEd forms &amp; workflows
            </span>
            <h1 className={styles.title}>
              Every learner&apos;s record,{" "}
              <span className={styles.titleAccent}>one system,</span> not a filing cabinet.
            </h1>
            <p className={styles.lede}>
              Zentra brings attendance, grades, SF10 records, anecdotal reports, and ADM referrals
              into a single platform — so risk is caught early, and every role, from adviser to
              principal, always sees the current story of a student.
            </p>

            <div className={styles.ctas}>
              <Button href="#contact" variant="primary">
                Request a Demo
                <ArrowRight size={16} />
              </Button>
              <Button href="#workflow" variant="secondary">
                <PlayCircle size={16} />
                See How It Works
              </Button>
            </div>

            <div className={styles.stats}>
              {HERO_STATS.map((stat, i) => (
                <div key={stat.value} className={styles.statItem}>
                  <div className={styles.statValue}>{stat.value}</div>
                  <div className={styles.statLabel}>{stat.label}</div>
                  {i < HERO_STATS.length - 1 && <div className={styles.divider} />}
                </div>
              ))}
            </div>
          </div>

          <HeroMockup />
        </div>
      </div>
    </section>
  );
}

function HeroMockup() {
  return (
    <div className={styles.mockupWrap}>
      <div className={styles.glowA} />
      <div className={styles.glowB} />

      <div className={styles.window}>
        <div className={styles.windowBar}>
          <span className={styles.dotRed} />
          <span className={styles.dotAmber} />
          <span className={styles.dotGreen} />
          <span className={styles.url}>zentra.app/dashboard</span>
        </div>

        <div className={styles.body}>
          <div className={styles.greeting}>
            <div>
              <div className={styles.greetName}>Good morning, Ma&apos;am Vance</div>
              <div className={styles.greetDate}>Monday, August 4 · SY 2025-2026</div>
            </div>
            <div className={styles.avatar}>EV</div>
          </div>

          <div className={styles.kpiGrid}>
            {DASHBOARD_KPIS.map((kpi) => (
              <div key={kpi.label} className={styles.kpi}>
                <div className={styles.kpiLabel}>{kpi.label}</div>
                <div className={styles.kpiValue}>{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span>Risk Snapshot · J. Santos</span>
              <Badge tone="danger">High</Badge>
            </div>
            <div className={styles.riskList}>
              {RISK_ROWS.map((row) => (
                <div key={row.label} className={styles.riskRow}>
                  <span className={styles.riskLabel}>{row.label}</span>
                  <span className={`${styles.riskValue} ${styles[row.tone]}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}