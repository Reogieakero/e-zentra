import { SectionHeading } from "@/components/ui/section-heading";
import styles from "./comparison.module.css";

interface ComparisonRow {
  label: string;
  before: string;
  after: string;
}

const ROWS: ComparisonRow[] = [
  {
    label: "Attendance",
    before: "Logbook per section, tallied by hand at the end of the month",
    after: "Logged per AM/PM session, rate visible the same day",
  },
  {
    label: "Risk detection",
    before: "Noticed when a report card or a home visit finally surfaces it",
    after: "Flagged automatically the moment a threshold is crossed",
  },
  {
    label: "Records storage",
    before: "Physical folders across the guidance office, registrar, and clinic",
    after: "One digital record per learner, scoped by role",
  },
  {
    label: "ADM referrals",
    before: "Slips passed between offices, easy to lose mid-process",
    after: "One case file tracked from referral to Principal approval",
  },
  {
    label: "Parent visibility",
    before: "Only at the report card, or when called in",
    after: "Live view of grades, attendance, and risk status",
  },
];

export function Comparison() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <SectionHeading
          eyebrow="Before & After"
          title="What actually changes on the ground"
        />

        <div className={styles.table}>
          <div className={`${styles.headerRow} ${styles.row}`}>
            <div className={styles.cellLabel} />
            <div className={`${styles.cellCol} ${styles.headerCell}`}>Without Zentra</div>
            <div className={`${styles.cellCol} ${styles.headerCell} ${styles.headerAfter}`}>
              With Zentra
            </div>
          </div>

          {ROWS.map((row) => (
            <div key={row.label} className={`${styles.datarow} ${styles.row}`}>
              <div className={`${styles.cellLabel} ${styles.dataLabel}`}>{row.label}</div>
              <div className={`${styles.cellCol} ${styles.dataBefore}`}>{row.before}</div>
              <div className={`${styles.cellCol} ${styles.dataAfter}`}>{row.after}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}