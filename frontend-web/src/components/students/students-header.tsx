import { Download } from "lucide-react";
import styles from "./students-header.module.css";

interface StudentsHeaderProps {
  onExport: () => void;
  exportDisabled: boolean;
}

export default function StudentsHeader({ onExport, exportDisabled }: StudentsHeaderProps) {
  return (
    <div className={styles.pageHeaderRow}>
      <div className={styles.pageHeading}>
        <h1 className={styles.pageTitle}>Students</h1>
        <p className={styles.pageSubtitle}>Manage student information, enrollment records, and academic documents.</p>
      </div>
      <div className={styles.headerActions}>
        <button className={styles.exportButton} onClick={onExport} disabled={exportDisabled}>
          <Download size={16} /> Export
        </button>
      </div>
    </div>
  );
}