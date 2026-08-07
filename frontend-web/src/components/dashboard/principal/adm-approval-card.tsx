import { FileText } from "lucide-react";
import type { AdmApproval } from "@/lib/dashboard";
import styles from "./adm-approval-card.module.css";

interface AdmApprovalCardProps {
  items: AdmApproval[];
  pendingCount: number;
}

export default function AdmApprovalCard({ items, pendingCount }: AdmApprovalCardProps) {
  return (
    <div className={styles.admCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>ADM for Approval</h3>
        <span className={`${styles.badge} ${styles.badgeWarning}`}>{pendingCount} Pending</span>
      </div>

      <div className={styles.admList}>
        {items.length === 0 ? (
          <div className={styles.emptyText}>No modules awaiting approval.</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className={styles.admItem}>
              <div className={styles.admIcon}>
                <FileText className={styles.admIconGlyph} />
              </div>
              <div className={styles.admInfo}>
                <span className={styles.admTitle}>{item.studentName}</span>
                <span className={styles.admMeta}>
                  {item.sectionName} · Submitted by {item.preparedBy}
                </span>
              </div>
              <span className={styles.admStatus}>{item.status}</span>
            </div>
          ))
        )}
      </div>

      <div className={styles.cardFooter}>
        <span>Awaiting principal&apos;s signature</span>
        <span className={styles.cardLink}>Review all</span>
      </div>
    </div>
  );
}