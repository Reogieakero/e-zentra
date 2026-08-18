import { ShieldCheck } from "lucide-react";
import styles from "./anecdotal-notice.module.css";

export default function AnecdotalNotice() {
  return (
    <div className={styles.notice}>
      <div className={styles.iconWrap}>
        <ShieldCheck size={15} className={styles.icon} />
      </div>
      <p className={styles.text}>
        As an Administrator, you have <span className={styles.strong}>read-only access</span> to anecdotal records for
        reporting and monitoring purposes. Adding, editing, or deleting entries is restricted to class advisers.
      </p>
    </div>
  );
}
