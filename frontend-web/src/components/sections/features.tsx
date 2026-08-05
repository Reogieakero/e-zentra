import {
  CalendarCheck2,
  FolderOpen,
  FileText,
  BookOpen,
  AlertTriangle,
  Bell,
  LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { FeatureTabs } from "./feature-tabs";
import styles from "./features.module.css";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: CalendarCheck2,
    title: "Daily Attendance",
    description:
      "AM and PM session logging per adviser, rolled up into real-time attendance rates per section and per learner.",
  },
  {
    icon: FolderOpen,
    title: "SF10 Records",
    description:
      "Permanent academic records kept current and split by grade band between Record Keeper and Registrar.",
  },
  {
    icon: FileText,
    title: "Anecdotal Reports",
    description:
      "Advisers log GCForm-01 observations in minutes, with confidentiality controls built in from the start.",
  },
  {
    icon: BookOpen,
    title: "ADM Referral & Approval",
    description:
      "The full path from referral to parent consultation to Coordinator certification to Principal approval, tracked end to end.",
  },
  {
    icon: AlertTriangle,
    title: "Automatic Risk Flags",
    description:
      "Academic, attendance, and behavioral risk calculated live from real data, aligned with DepEd Order No. 8, s. 2015.",
  },
  {
    icon: Bell,
    title: "Real-Time Notifications",
    description:
      "Every new record, referral, or approval notifies the right role immediately — nothing waits for a memo.",
  },
];

export function Features() {
  return (
    <section className={styles.section} id="features">
      <div className={styles.container}>
        <SectionHeading
          eyebrow="Features"
          title="Everything the guidance office already tracks, now automatic"
          description="Each module mirrors a form your school already uses — just faster to fill out, and impossible to lose."
        />

        <div className={styles.grid}>
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Reveal key={feature.title} delay={(i % 3) * 60}>
                <article className={styles.card}>
                  <div className={styles.iconWrap}>
                    <Icon size={20} className={styles.icon} />
                  </div>
                  <h3 className={styles.cardTitle}>{feature.title}</h3>
                  <p className={styles.cardDesc}>{feature.description}</p>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal className={styles.tabsWrap}>
          <FeatureTabs />
        </Reveal>
      </div>
    </section>
  );
}