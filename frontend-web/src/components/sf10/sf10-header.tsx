import { FileText } from "lucide-react";
import { InfoDialog } from "@/components/ui/info-dialog";
import styles from "./sf10-header.module.css";

export function Sf10Header() {
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
              <strong>Released</strong> — records whose SF10 has been released by the registrar.
            </li>
            <li>
              <strong>Missing Documents</strong> — learners without a released SF10.
            </li>
          </ul>
          <h3 className={styles.sectionTitle}>Recent Attached</h3>
          <p>The latest released SF10 files, most recent first.</p>
          <h3 className={styles.sectionTitle}>Missing SF10</h3>
          <p>Learners who still need their SF10 file uploaded.</p>
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