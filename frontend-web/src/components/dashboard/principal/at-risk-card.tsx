"use client";

import type { AtRiskStudent } from "@/lib/dashboard";
import { useRiskCarousel } from "@/lib/use-risk-carousel";
import styles from "./at-risk-card.module.css";

interface AtRiskCardProps {
  students: AtRiskStudent[];
  count: number;
  term: string | null;
  schoolYear: string | null;
}

function initials(firstName: string, lastName: string): string {
  return `${(firstName[0] ?? "").toUpperCase()}${(lastName[0] ?? "").toUpperCase()}` || "?";
}

function riskTone(risk: string): "high" | "moderate" | "low" {
  if (risk === "high") return "high";
  if (risk === "moderate") return "moderate";
  return "low";
}

export default function AtRiskCard({ students, count, term, schoolYear }: AtRiskCardProps) {
  const { index, setIndex } = useRiskCarousel(students.length);
  const current = students.length > 0 ? students[index % students.length] : undefined;
  const tone = current ? riskTone(current.riskLevel) : "low";

  return (
    <div className={styles.atRiskCard}>
      <div className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>At Risk Students</h3>
          {term || schoolYear ? (
            <p className={styles.cardSubtitle}>
              {term ? `${term} · ` : ""}
              {schoolYear ?? ""}
            </p>
          ) : null}
        </div>
        <span className={`${styles.badge} ${styles.badgeDanger}`}>{count} Students</span>
      </div>

      <div className={styles.atRiskList}>
        {!current ? (
          <span className={styles.emptyText}>No at-risk students detected.</span>
        ) : (
          <div className={styles.atRiskCarousel}>
            <div className={`${styles.atRiskItem} ${styles[`atRiskItem${capitalize(tone)}`]}`}>
              <div className={styles.atRiskTop}>
                <div className={`${styles.avatar} ${styles[`avatar${capitalize(tone)}`]} ${styles.atRiskAvatar}`}>
                  {initials(current.firstName, current.lastName)}
                </div>
                <span className={styles.atRiskName}>
                  {current.firstName} {current.lastName}
                </span>
              </div>
              <div className={styles.atRiskDetail}>
                <div className={styles.atRiskDetailCol}>
                  <span className={styles.atRiskDetailLabel}>Attendance</span>
                  <span className={styles.atRiskDetailValue}>{current.attendanceRate ?? 0}%</span>
                </div>
                <div className={styles.atRiskDetailCol}>
                  <span className={styles.atRiskDetailLabel}>Level</span>
                  <span className={`${styles.atRiskDetailValue} ${styles[`atRiskDetailValue${capitalize(tone)}`]}`}>
                    {capitalize(current.riskLevel)}
                  </span>
                </div>
                <div className={styles.atRiskDetailCol}>
                  <span className={styles.atRiskDetailLabel}>Section</span>
                  <span className={styles.atRiskDetailValue}>{current.sectionName ?? "No section"}</span>
                </div>
              </div>
            </div>
            {students.length > 1 && (
              <div className={styles.atRiskDots}>
                {students.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.atRiskDot} ${i === index ? styles.atRiskDotActive : ""}`}
                    onClick={() => setIndex(i)}
                    aria-label={`At-risk student ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.cardFooter}>
        <span>Threshold: &lt;85%</span>
        <span className={styles.cardLink}>View all</span>
      </div>
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}