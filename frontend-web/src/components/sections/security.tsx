import { Lock, EyeOff, History, WifiOff, ShieldCheck, LucideIcon } from "lucide-react";
import styles from "./security.module.css";

interface SecurityPoint {
  icon: LucideIcon;
  title: string;
  description: string;
}

const POINTS: SecurityPoint[] = [
  {
    icon: Lock,
    title: "Access follows the role",
    description:
      "A Subject Teacher only sees grades for their own subjects; a Guidance Counselor sees behavioral records other roles don't.",
  },
  {
    icon: EyeOff,
    title: "Confidential stays confidential",
    description:
      "The Principal sees that an ADM or health case exists and its progress, never the private write-up behind it.",
  },
  {
    icon: History,
    title: "Every change is logged",
    description: "A clear trail of who edited what, and when, for records that matter.",
  },
  {
    icon: WifiOff,
    title: "Works even when the signal doesn't",
    description:
      "The mobile app keeps working offline for advisers in remote barangays, and syncs the moment they're back online.",
  },
];

const VIEWS = [
  { role: "Guidance Counselor · anecdotal note", tag: "Full detail", tone: "brand" },
  { role: "Principal · same case", tag: "Progress only", tone: "warning" },
  { role: "Student / Parent · risk status", tag: "Category, not the note", tone: "info" },
  { role: "Other students · any case", tag: "No access", tone: "neutral" },
];

export function Security() {
  return (
    <section className={styles.section} id="security">
      <div className={styles.container}>
        <div className={styles.grid}>
          <div className={styles.left}>
            <span className={styles.eyebrow}>Security &amp; Confidentiality</span>
            <h2 className={styles.title}>Sensitive records stay sensitive</h2>
            <p className={styles.lede}>
              Confidentiality isn&apos;t a setting someone can forget to check — it&apos;s built into
              how each role sees the system.
            </p>

            <div className={styles.points}>
              {POINTS.map((point) => {
                const Icon = point.icon;
                return (
                  <div key={point.title} className={styles.point}>
                    <div className={styles.iconWrap}>
                      <Icon size={16} className={styles.icon} />
                    </div>
                    <div>
                      <div className={styles.pointTitle}>{point.title}</div>
                      <div className={styles.pointDesc}>{point.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <ShieldCheck size={14} />
              Confidentiality in practice
            </div>
            <div className={styles.rows}>
              {VIEWS.map((view) => (
                <div key={view.role} className={styles.viewRow}>
                  <span className={styles.role}>{view.role}</span>
                  <span className={`${styles.tag} ${styles[`tone_${view.tone}`]}`}>{view.tag}</span>
                </div>
              ))}
            </div>
            <p className={styles.cardFootnote}>
              Same case, four different views — each one exactly as detailed as that role should see.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}