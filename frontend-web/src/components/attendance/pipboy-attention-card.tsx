"use client";

import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useRiskCarousel } from "@/hooks/use-risk-carousel";
import type { LowAttendanceRow } from "@/lib/dashboard";
import styles from "./pipboy-attention-card.module.css";

export function PipBoyAttentionCard({ students }: { students: LowAttendanceRow[] }) {
  const { index, setIndex } = useRiskCarousel(students.length);
  const current = students[index % students.length];
  const toneKey = current.tone === "danger" ? "danger" : "warn";
  const tone = current.tone === "danger" ? "High" : "Moderate";

  return (
    <div className={styles.wrapper}>
      <div className={styles.chassis}>
        <div className={`${styles.screw} ${styles.tl}`} />
        <div className={`${styles.screw} ${styles.tr}`} />
        <div className={`${styles.screw} ${styles.bl}`} />
        <div className={`${styles.screw} ${styles.br}`} />

        <div className={styles.screen}>
          <div className={styles.screenGlass} />
          <div className={styles.scanlines} />

          <div className={styles.bootSequence}>
            <header className={styles.topBar}>
              <div className={styles.barTitle}>Student</div>
              <div className={styles.lineFlex} />
              <div className={styles.statsInfo}>
                <span>
                  Rate <strong>{current.rate}%</strong>
                </span>
                <span>
                  Risk <strong className={styles[`riskText${toneKey}`]}>{tone.toUpperCase()}</strong>
                </span>
              </div>
            </header>

            <main className={styles.middleSection}>
              <aside className={styles.sideMenu}>
                <span>GRD</span>
                <span>SEC</span>
                <span className={styles.activeBox}>ATT</span>
                <span>RSK</span>
              </aside>

              <section className={styles.clockDisplay}>
                <div className={styles.name}>{current.fullName}</div>
                <div className={styles.meta}>
                  {current.gradeLabel} &middot; {current.sectionName ?? "—"}
                </div>
                <div className={styles.terminalBlock}>
                  <div className={styles.time}>
                    {current.rate}
                    <span className={styles.blinkColon}>%</span>
                  </div>
                </div>
              </section>

              <aside className={styles.rightMenu}>
                <div className={`${styles.seal} ${styles[`seal${toneKey}`]}`}>
                  <AlertTriangle className={styles.sealIcon} />
                </div>
                <div className={styles.radText}>RISK</div>
              </aside>
            </main>

            <footer className={styles.bottomBar}>
              <button
                type="button"
                className={styles.navItem}
                onClick={() => setIndex((index - 1 + students.length) % students.length)}
                aria-label="Previous student"
              >
                <ChevronLeft className={styles.navIcon} />
              </button>
              <div className={styles.lineFlex} />
              <span className={styles.counter}>
                {String(index + 1).padStart(2, "0")}/{String(students.length).padStart(2, "0")}
              </span>
              <div className={styles.lineFlex} />
              <button
                type="button"
                className={styles.navItem}
                onClick={() => setIndex((index + 1) % students.length)}
                aria-label="Next student"
              >
                <ChevronRight className={styles.navIcon} />
              </button>
              <div className={styles.radioVisualizer} aria-hidden="true">
                <span className={styles.bar} style={{ animationDelay: "0.1s" }} />
                <span className={styles.bar} style={{ animationDelay: "0.3s" }} />
                <span className={styles.bar} style={{ animationDelay: "0s" }} />
                <span className={styles.bar} style={{ animationDelay: "0.4s" }} />
              </div>
            </footer>
          </div>
        </div>
      </div>

      {students.length > 1 && (
        <div className={styles.dots}>
          {students.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Low attendance student ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}