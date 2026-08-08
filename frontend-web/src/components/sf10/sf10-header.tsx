import { Download, FileText } from "lucide-react";
import { InfoDialog } from "@/components/ui/info-dialog";
import styles from "./sf10.module.css";

interface Sf10HeaderProps {
  schoolYear: string | null;
  total: number;
}

export function Sf10Header({ schoolYear, total }: Sf10HeaderProps) {
  return (
    <div className={styles.header}>
      <div className={styles.headerTitleWrap}>
        <div className={styles.titleIconWrap}>
          <FileText className={styles.titleIcon} />
        </div>
        <div>
          <h1 className={styles.title}>SF10 Records</h1>
          <p className={styles.subtitle}>Track learner&apos;s permanent academic records across all grade levels.</p>
        </div>
      </div>

      <div className={styles.headerControls}>
        {schoolYear && (
          <span className={styles.yearBadge}>
            Year: {schoolYear}
            <span className={styles.yearBadgeMeta}>{total.toLocaleString()} records</span>
          </span>
        )}
        <button className={styles.exportButton} disabled aria-label="Export all SF10 records">
          <Download className={styles.exportButtonIcon} />
          Export All
        </button>
        <InfoDialog title="SF10 Records — What You See" bare>
          <p className={styles.sectionHint}>
            This page is the registrar&apos;s view of learner&apos;s permanent academic records (SF10) across all grade
            levels for the selected school year.
          </p>
          <h3 className={styles.sectionTitle}>Folders</h3>
          <p>Every grade level ships with its own folder, holding each learner&apos;s SF10 organized by section.</p>
          <h3 className={styles.sectionTitle}>Summary</h3>
          <ul className={styles.sectionList}>
            <li>
              <strong>Total Records</strong> — every enrolled learner with a permanent record.
            </li>
            <li>
              <strong>Complete</strong> — records whose SF10 file is final.
            </li>
            <li>
              <strong>Pending Review</strong> — records awaiting registrar review.
            </li>
            <li>
              <strong>Missing Documents</strong> — learners without an uploaded SF10.
            </li>
          </ul>
          <h3 className={styles.sectionTitle}>All SF10 Records</h3>
          <p>Filter, sort, and paginate through every learner record. Open a record to preview its metadata.</p>
        </InfoDialog>
      </div>
    </div>
  );
}

export function Sf10HeaderLoading() {
  return (
    <div className={styles.header}>
      <div className={styles.headerTitleWrap}>
        <div className={`${styles.skeleton} ${styles.skTitleIcon}`} />
        <div>
          <div className={`${styles.skeleton} ${styles.skTitle}`} />
          <div className={`${styles.skeleton} ${styles.skSubtitle}`} />
        </div>
      </div>
      <div className={`${styles.skeleton} ${styles.skBadge}`} />
    </div>
  );
}