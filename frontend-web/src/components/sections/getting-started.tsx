import { Calendar, FileCog, UserCog, Rocket, LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import styles from "./getting-started.module.css";

interface Step {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
}

const STEPS: Step[] = [
  {
    icon: Calendar,
    step: "STEP 01",
    title: "Request a walkthrough",
    description: "We map Zentra to how your school already runs attendance, grading, and referrals.",
  },
  {
    icon: FileCog,
    step: "STEP 02",
    title: "Match your forms",
    description:
      "GCForm-01, GCForm-12, SF10, and the ADM Learner's Profile are set up to mirror your originals.",
  },
  {
    icon: UserCog,
    step: "STEP 03",
    title: "Provision accounts",
    description: "Every staff position gets an account scoped to their role from day one.",
  },
  {
    icon: Rocket,
    step: "STEP 04",
    title: "Go live",
    description: "Start the current grading period inside Zentra — no waiting for a new school year.",
  },
];

export function GettingStarted() {
  return (
    <section className={styles.section} id="getting-started">
      <div className={styles.container}>
        <SectionHeading
          eyebrow="Getting Started"
          title="Live with your current school year, not a blank slate"
        />

        <div className={styles.grid}>
          {STEPS.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.step} delay={i * 50}>
                <div className={styles.step}>
                  <div className={styles.iconWrap}>
                    <Icon size={20} className={styles.icon} />
                  </div>
                  <div className={styles.stepLabel}>{item.step}</div>
                  <h4 className={styles.title}>{item.title}</h4>
                  <p className={styles.desc}>{item.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}