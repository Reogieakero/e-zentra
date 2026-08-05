import { SectionHeading } from "@/components/ui/section-heading";
import styles from "./workflow.module.css";

interface Step {
  step: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    step: "1",
    title: "Adviser Observes",
    description: "An anecdotal report is filed and, if warranted, a referral is raised.",
  },
  {
    step: "2",
    title: "Consultation",
    description: "Guidance Counselor verifies through HEEADSS, CSSRS, or a referral form.",
  },
  {
    step: "3",
    title: "Meet or Visit",
    description: "Parents meet with the ADM Coordinator, or a home visitation is logged instead.",
  },
  {
    step: "4",
    title: "Certify",
    description: "The ADM Coordinator recommends and certifies the application.",
  },
  {
    step: "5",
    title: "Approve & Support",
    description: "The Principal approves, modules are released, and follow-up counseling continues.",
  },
];

export function Workflow() {
  return (
    <section className={styles.section} id="workflow">
      <div className={styles.container}>
        <SectionHeading
          eyebrow="How It Works"
          title="From a quiet concern to a documented decision"
          description="The ADM referral path, end to end — the same flow your guidance office already follows, just never dropped mid-way."
        />

        <div className={styles.grid}>
          {STEPS.map((item, i) => (
            <div key={item.step} className={styles.step}>
              <div className={styles.badge}>{item.step}</div>
              {i < STEPS.length - 1 && <div className={styles.connector} />}
              <h4 className={styles.title}>{item.title}</h4>
              <p className={styles.desc}>{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}