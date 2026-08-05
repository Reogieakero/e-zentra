import Link from "next/link";
import { ArrowLeft, BookOpen, CalendarCheck2, GraduationCap, ShieldAlert, Star } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./auth-shell.module.css";

const FEATURES = [
  { icon: CalendarCheck2, text: "Attendance recorded in real time, every AM and PM session" },
  { icon: BookOpen, text: "SF10, anecdotal reports, and ADM referrals in one case file" },
  { icon: ShieldAlert, text: "Academic, attendance, and behavioral risk, flagged automatically" },
];

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footNote?: ReactNode;
}

export function AuthShell({ title, subtitle, children, footNote }: AuthShellProps) {
  return (
    <div className={styles.shell}>
      <div className={styles.brandPanel}>
        <div className={styles.dotGrid} />
        <div className={styles.blobTop + " " + styles.blob} />
        <div className={styles.blobBottom + " " + styles.blob} />

        <div className={styles.brandInner}>
          <Link href="/" className={styles.brandTop}>
            <span className={styles.brandMark}>
              <GraduationCap size={18} />
            </span>
            <span className={styles.brandName}>Zentra</span>
          </Link>

          <h1 className={styles.headline}>Every learner&apos;s record, one system, not a filing cabinet.</h1>
          <p className={styles.subhead}>
            Sign in to pick up right where your school left off — attendance, grades, SF10, anecdotal
            reports, and ADM referrals, all in one place.
          </p>

          <div className={styles.features}>
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className={styles.featureRow}>
                <span className={styles.featureIcon}>
                  <Icon size={16} />
                </span>
                <span className={styles.featureText}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.quote}>
          <div className={styles.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={12} className="fill-current" />
            ))}
          </div>
          <p className={styles.quoteText}>
            &ldquo;I approve or send a case back for follow-up the same afternoon it reaches me, with the
            full history in front of me.&rdquo;
          </p>
          <div className={styles.quoteAuthor}>
            <span className={styles.featureIcon}>
              <GraduationCap size={14} />
            </span>
            <span className={styles.featureText}>Elena Vance · School Principal</span>
          </div>
        </div>
      </div>

      <div className={styles.formPanel}>
        <Link href="/" className={styles.mobileBrand}>
          <span className={styles.mobileMark}>
            <GraduationCap size={16} />
          </span>
          <span className={styles.brandName}>Zentra</span>
        </Link>

        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} />
          Back to homepage
        </Link>

        <div className={styles.formWrap}>
          <h2 className={styles.formTitle}>{title}</h2>
          <p className={styles.formSub}>{subtitle}</p>
          {children}
          {footNote ? <p className={styles.footNote}>{footNote}</p> : null}
        </div>

        <p className={styles.footerCopy}>&copy; 2026 Zentra. All rights reserved.</p>
      </div>
    </div>
  );
}