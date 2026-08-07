import { InfoDialog } from "@/components/ui/info-dialog";
import styles from "./students-header.module.css";

export default function StudentsHeader() {
  return (
    <div className={styles.pageHeaderRow}>
      <div className={styles.pageHeading}>
        <h1 className={styles.pageTitle}>Students</h1>
        <p className={styles.pageSubtitle}>Manage student information, enrollment records, and academic documents.</p>
      </div>
      <div className={styles.headerActions}>
        <InfoDialog title="Students — What You See" bare>
          <p className={styles.modalIntro}>
            This page shows the full student enrollment, with summary cards up top and a searchable, filterable records
            table below. Figures update live as records are added.
          </p>

          <h3 className={styles.modalSection}>Top cards (KPI stats)</h3>
          <ul className={styles.modalList}>
            <li>
              <strong>Total Students</strong> — all enrolled student records in the system.
            </li>
            <li>
              <strong>Active Students</strong> — the number of active student accounts in Zentra.
            </li>
            <li>
              <strong>New Enrollees</strong> — the number of student accounts that are still pending approval.
            </li>
            <li>
              <strong>Graduated Students</strong> — all-time count of graduated students.
            </li>
            <li>
              <strong>At-Risk Students</strong> — students computed to be at risk (academic average below 75, attendance
              below 80%, or logged behavioral concerns) in the active year. Shown as high (2+ signals) and moderate
              (exactly 1 signal).
            </li>
          </ul>

          <h3 className={styles.modalSection}>Student Records table</h3>
          <p>
            Lists each student with their LRN, name, grade &amp; section, gender, account status, SF10 status,
            attendance rate, and live risk level. Use the search bar and filters to narrow the list, and the &ldquo;View&rdquo;
            link to open a student&apos;s full profile and documents.
          </p>
        </InfoDialog>
      </div>
    </div>
  );
}