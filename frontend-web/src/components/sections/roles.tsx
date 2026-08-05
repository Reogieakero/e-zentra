import {
  User,
  Users,
  Presentation,
  HeartHandshake,
  BookOpen,
  Stethoscope,
  Archive,
  ClipboardCheck,
  ShieldCheck,
  LucideIcon,
} from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import styles from "./roles.module.css";

interface Role {
  icon: LucideIcon;
  title: string;
  description: string;
}

const ROLES: Role[] = [
  {
    icon: User,
    title: "Student",
    description: "Sees grades, attendance, and risk status, with the reason behind it.",
  },
  {
    icon: Users,
    title: "Parent / Guardian",
    description: "Transparent, always-current view of their child's academic and behavior record.",
  },
  {
    icon: Presentation,
    title: "Teacher / Adviser",
    description:
      "Grades, attendance, and anecdotal reports for their subjects and advisory section.",
  },
  {
    icon: HeartHandshake,
    title: "Guidance Counselor",
    description: "Full behavioral and academic record access for early, informed intervention.",
  },
  {
    icon: BookOpen,
    title: "ADM Coordinator",
    description: "Organizes learner profiling, applies interventions, and certifies ADM referrals.",
  },
  {
    icon: Stethoscope,
    title: "School Nurse",
    description: "Health records and referrals, kept confidential and separate from academic data.",
  },
  {
    icon: Archive,
    title: "Record Keeper",
    description: "Approvals, assignments, and SF10 records for Grades 7–10, school-wide archiving.",
  },
  {
    icon: ClipboardCheck,
    title: "Registrar",
    description: "Approvals and SF10 records for Grades 11–12, plus report card digitization.",
  },
  {
    icon: ShieldCheck,
    title: "Principal / Admin",
    description: "School-wide oversight, ADM approvals, and a log of who changed what, and when.",
  },
];

export function Roles() {
  return (
    <section className={styles.section} id="roles">
      <div className={styles.container}>
        <SectionHeading
          eyebrow="Roles"
          title="One account per person, scoped to what they need"
          description="Access follows the school's real workflow, not a single admin dumping ground."
        />

        <div className={styles.grid}>
          {ROLES.map((role, i) => {
            const Icon = role.icon;
            return (
              <Reveal key={role.title} delay={(i % 3) * 50}>
                <div className={styles.card}>
                  <div className={styles.iconWrap}>
                    <Icon size={16} className={styles.icon} />
                  </div>
                  <div className={styles.copy}>
                    <div className={styles.cardTitle}>{role.title}</div>
                    <div className={styles.cardDesc}>{role.description}</div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}