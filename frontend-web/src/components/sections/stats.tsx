import { Reveal } from "@/components/ui/reveal";
import styles from "./stats.module.css";

const STATS = [
  { value: "22+", label: "Linked data tables, one source of truth" },
  { value: "4", label: "DepEd forms digitized end to end" },
  { value: "2", label: "Platforms — web for staff, mobile for the field" },
  { value: "Real-time", label: "Risk recalculated as data is entered" },
];

export function Stats() {
  return (
    <section className={styles.strip}>
      <div className={`${styles.container}`}>
        <div className={styles.grid}>
          {STATS.map((stat, i) => (
            <Reveal key={stat.value} delay={i * 50}>
              <div className={styles.item}>
                <div className={styles.value}>{stat.value}</div>
                <div className={styles.label}>{stat.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}