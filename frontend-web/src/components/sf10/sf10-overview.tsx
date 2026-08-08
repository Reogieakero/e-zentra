import { AlertTriangle, CheckCircle2, Clock, FolderOpen } from "lucide-react";
import type { Sf10Folder, Sf10SummaryCounts } from "@/lib/dashboard";
import styles from "./sf10.module.css";

interface Sf10OverviewProps {
  folders: Sf10Folder[];
  counts: Sf10SummaryCounts;
  schoolYear: string | null;
  activeGrade: string;
  onGradeClick: (grade: string) => void;
}

export function Sf10Overview({ folders, counts, schoolYear, activeGrade, onGradeClick }: Sf10OverviewProps) {
  return (
    <div className={styles.overviewGrid}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <FolderOpen className={styles.cardTitleIcon} />
            Folders
          </h2>
          <span className={styles.cardHint}>By grade level</span>
        </div>
        <div className={styles.folderGrid}>
          {folders.map((f) => (
            <button
              key={f.gradeLevel}
              type="button"
              className={`${styles.folderBtn} ${activeGrade === f.gradeLevel ? styles.folderBtnActive : ""}`}
              onClick={() => onGradeClick(activeGrade === f.gradeLevel ? "all" : f.gradeLevel)}
            >
              <FolderOpen className={styles.folderIcon} />
              <div style={{ minWidth: 0, width: "100%" }}>
                <div className={styles.folderName}>{f.label}</div>
                <div className={styles.folderCount}>{f.count.toLocaleString()} files</div>
              </div>
            </button>
          ))}
        </div>
        <p className={styles.folderNote}>
          Each folder holds every learner&apos;s SF10 for that grade level, organized by section. Records are synced
          automatically whenever a registrar uploads or updates a file.
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <CheckCircle2 className={styles.cardTitleIcon} />
            Summary
          </h2>
          <span className={styles.cardHint}>{schoolYear ? `School Year ${schoolYear}` : "No active school year"}</span>
        </div>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryStat}>
            <div className={styles.summaryIcon}>
              <FolderOpen className={styles.summaryIconInner} />
            </div>
            <div className={styles.summaryValue}>{counts.total.toLocaleString()}</div>
            <div className={styles.summaryLabel}>Total Records</div>
          </div>
          <div className={styles.summaryStat}>
            <div className={styles.summaryIcon}>
              <CheckCircle2 className={styles.summaryIconInner} />
            </div>
            <div className={styles.summaryValue}>{counts.complete.toLocaleString()}</div>
            <div className={styles.summaryLabel}>Complete &middot; {counts.completePercent}%</div>
          </div>
          <div className={styles.summaryStat}>
            <div className={styles.summaryIcon}>
              <Clock className={styles.summaryIconInner} />
            </div>
            <div className={styles.summaryValue}>{counts.pending.toLocaleString()}</div>
            <div className={styles.summaryLabel}>Pending Review</div>
          </div>
          <div className={styles.summaryStat}>
            <div className={styles.summaryIcon}>
              <AlertTriangle className={styles.summaryIconInner} />
            </div>
            <div className={styles.summaryValue}>{counts.missing.toLocaleString()}</div>
            <div className={styles.summaryLabel}>Missing Documents</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className={styles.overviewGrid}>
      <div className={styles.card}>
        <div className={`${styles.skeleton} ${styles.skCardTitle}`} />
        <div className={styles.folderGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${styles.skeleton} ${styles.skFolder}`} />
          ))}
        </div>
      </div>
      <div className={styles.card}>
        <div className={`${styles.skeleton} ${styles.skCardTitle}`} />
        <div className={styles.summaryGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${styles.skeleton} ${styles.skStat}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function Sf10OverviewLoading() {
  return <OverviewSkeleton />;
}