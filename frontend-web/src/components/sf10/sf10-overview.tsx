import { AlertTriangle, CheckCircle2, FileCheck2, FileX2, FolderOpen } from "lucide-react";
import type { Sf10Folder, Sf10Record, Sf10SummaryCounts } from "@/lib/dashboard";
import { AnimatedFolder } from "@/components/ui/animated-folder";
import styles from "./sf10-overview.module.css";

interface Sf10OverviewProps {
  folders: Sf10Folder[];
  counts: Sf10SummaryCounts;
  readyList: Sf10Record[];
  missingList: Sf10Record[];
  schoolYear: string | null;
  onGradeClick: (grade: string) => void;
  onShowReady?: () => void;
  onShowMissing?: () => void;
}

export function Sf10Overview({
  folders,
  counts,
  readyList,
  missingList,
  schoolYear,
  onGradeClick,
  onShowReady,
  onShowMissing,
}: Sf10OverviewProps) {
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
            <AnimatedFolder
              key={f.gradeLevel}
              label={f.label}
              count={f.count}
              onClick={() => onGradeClick(f.gradeLevel)}
              title={`${f.label} sections`}
            />
          ))}
        </div>
        <p className={styles.folderNote}>
          Each folder holds every learner&apos;s SF10 for that grade level, organized by section. Records are synced
          automatically whenever a registrar uploads or updates a file.
        </p>
      </div>

      <div className={styles.sideColumn}>
        <div className={`${styles.card} ${styles.summaryCard}`}>
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
              <div className={styles.summaryText}>
                <div className={styles.summaryValue}>{counts.total.toLocaleString()}</div>
                <div className={styles.summaryLabel}>Total Records</div>
              </div>
            </div>
            <div className={styles.summaryStat}>
              <div className={styles.summaryIcon}>
                <CheckCircle2 className={styles.summaryIconInner} />
              </div>
              <div className={styles.summaryText}>
                <div className={styles.summaryValue}>{counts.released.toLocaleString()}</div>
                <div className={styles.summaryLabel}>Released &middot; {counts.releasedPercent}%</div>
              </div>
            </div>
            <div className={styles.summaryStat}>
              <div className={styles.summaryIcon}>
                <AlertTriangle className={styles.summaryIconInner} />
              </div>
              <div className={styles.summaryText}>
                <div className={styles.summaryValue}>{counts.missing.toLocaleString()}</div>
                <div className={styles.summaryLabel}>Missing Documents</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.subGrid}>
          <div className={`${styles.card} ${styles.listCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <FileCheck2 className={styles.cardTitleIcon} />
                Mark as Ready SF10
              </h2>
            </div>
            {readyList.length === 0 ? (
              <div className={styles.listEmptyWrap}>
                <div className={styles.listEmptyIcon}>
                  <FileCheck2 className={styles.listEmptyIconInner} />
                </div>
                <p className={styles.listEmpty}>No SF10 files marked ready yet.</p>
              </div>
            ) : (
              <ul className={styles.listRows}>
                {readyList.slice(0, 2).map((r) => (
                  <li key={r.studentId} className={styles.missingRow}>
                    <div className={styles.listRowMain}>
                      <div className={styles.listRowTitle}>{r.fullName}</div>
                      <div className={styles.listRowSub}>
                        {r.gradeLabel}
                        {r.sectionName ? ` - ${r.sectionName}` : ""}
                      </div>
                      <div className={styles.listRowLrn}>{r.lrn}</div>
                    </div>
                    <AnimatedFolder
                      count={1}
                      size="sm"
                      className={styles.missingFolder}
                      title={`${r.fullName} - SF10 ready`}
                    />
                  </li>
                ))}
              </ul>
            )}
            {readyList.length > 0 && (
              <div className={styles.cardFooter}>
                <span>Showing {Math.min(readyList.length, 2)} of {readyList.length} ready</span>
                <span className={styles.cardLink} onClick={onShowReady} role="button" tabIndex={0}>
                  View all
                </span>
              </div>
            )}
          </div>

          <div className={`${styles.card} ${styles.listCard}`}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <FileX2 className={styles.cardTitleIcon} />
                Missing SF10
              </h2>
            </div>
            {missingList.length === 0 ? (
              <div className={styles.listEmptyWrap}>
                <div className={styles.listEmptyIcon}>
                  <CheckCircle2 className={styles.listEmptyIconInner} />
                </div>
                <p className={styles.listEmpty}>No missing SF10 records for this view.</p>
              </div>
            ) : (
              <ul className={styles.listRows}>
                {missingList.slice(0, 2).map((r) => (
                  <li key={r.studentId} className={styles.missingRow}>
                    <div className={styles.listRowMain}>
                      <div className={styles.listRowTitle}>{r.fullName}</div>
                      <div className={styles.listRowSub}>
                        {r.gradeLabel}
                        {r.sectionName ? ` - ${r.sectionName}` : ""}
                      </div>
                      <div className={styles.listRowLrn}>{r.lrn}</div>
                    </div>
                    <AnimatedFolder
                      count={0}
                      size="sm"
                      variant="danger"
                      className={styles.missingFolder}
                      title={`${r.fullName} - no SF10 attached`}
                    />
                  </li>
                ))}
              </ul>
            )}
            {missingList.length > 0 && (
              <div className={styles.cardFooter}>
                <span>Showing {Math.min(missingList.length, 2)} of {counts.missing.toLocaleString()} missing</span>
                <span className={styles.cardLink} onClick={onShowMissing} role="button" tabIndex={0}>
                  View all
                </span>
              </div>
            )}
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
        <div className={styles.cardHeader}>
          <div className={`${styles.skeleton} ${styles.skCardTitle}`} />
        </div>
        <div className={styles.folderGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`${styles.skeleton} ${styles.skFolder}`} />
          ))}
        </div>
      </div>
      <div className={styles.sideColumn}>
        <div className={`${styles.card} ${styles.summaryCard}`}>
          <div className={styles.cardHeader}>
            <div className={`${styles.skeleton} ${styles.skCardTitle}`} />
            <div className={`${styles.skeleton} ${styles.skCardHint}`} />
          </div>
          <div className={styles.summaryGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={`${styles.skeleton} ${styles.skStat}`} />
            ))}
          </div>
        </div>
        <div className={styles.subGrid}>
          <div className={`${styles.card} ${styles.listCard}`}>
            <div className={styles.cardHeader}>
              <div className={`${styles.skeleton} ${styles.skCardTitle}`} />
            </div>
            <div className={styles.skListRows}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`${styles.skeleton} ${styles.skListRow}`} />
              ))}
            </div>
          </div>
          <div className={`${styles.card} ${styles.listCard}`}>
            <div className={styles.cardHeader}>
              <div className={`${styles.skeleton} ${styles.skCardTitle}`} />
            </div>
            <div className={styles.skListRows}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`${styles.skeleton} ${styles.skListRow}`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Sf10OverviewLoading() {
  return <OverviewSkeleton />;
}