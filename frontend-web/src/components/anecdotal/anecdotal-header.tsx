import { Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InfoDialog } from "@/components/ui/info-dialog";
import styles from "./anecdotal-header.module.css";

export default function AnecdotalHeader() {
  return (
    <div className={styles.header}>
      <div className={styles.titleBlock}>
        <div className={styles.titleWithBadge}>
          <h1 className={styles.title}>Anecdotal Records</h1>
          <Badge tone="neutral">
            <Lock size={11} className={styles.lockIcon} />
            View Only
          </Badge>
        </div>
        <p className={styles.subtitle}>
          Read-only overview of behavioral and observational notes submitted by class advisers.
        </p>
      </div>
      <div className={styles.headerActions}>
        <InfoDialog title="Anecdotal Records — What You See" bare>
          <p className={styles.modalIntro}>
            This page aggregates anecdotal entries filed by class advisers. As an administrator you have read-only
            access for reporting and monitoring. Adding, editing, or deleting entries is restricted to the assigned
            class adviser.
          </p>
          <h3 className={styles.modalSection}>Top cards</h3>
          <ul className={styles.modalList}>
            <li>
              <strong>Total Records</strong> — every anecdotal entry logged in the active scope.
            </li>
            <li>
              <strong>Positive Behavior</strong> — entries categorized as positive observations.
            </li>
            <li>
              <strong>Behavioral Concerns</strong> — entries flagged for behavioral follow-up.
            </li>
            <li>
              <strong>Needs Follow-up</strong> — entries that already have a follow-up recorded.
            </li>
          </ul>
          <h3 className={styles.modalSection}>Records table</h3>
          <p>
            Search by student, section, adviser, or note text, filter by category, then open a record to view the full
            observation detail.
          </p>
        </InfoDialog>
      </div>
    </div>
  );
}
