import { BookOpen, Download, FilePlus, FileText, QrCode, UserPlus } from "lucide-react";
import styles from "./quick-actions.module.css";

const quickActions = [
  { label: "Add Student", hint: "New profile", icon: UserPlus },
  { label: "Scan Attendance", hint: "Log entry", icon: QrCode },
  { label: "Generate SF10", hint: "Form 137", icon: FilePlus },
  { label: "Anecdotal Report", hint: "Behavior log", icon: FileText },
  { label: "ADM Records", hint: "Modules", icon: BookOpen },
  { label: "Export Reports", hint: "PDF / CSV", icon: Download },
];

export default function QuickActions() {
  return (
    <div className={styles.quickActions}>
      <h3 className={styles.cardTitle}>Quick Actions</h3>
      <div className={styles.quickGrid}>
        {quickActions.map((action) => (
          <a key={action.label} href="#" className={styles.quickItem}>
            <div className={styles.quickIcon}>
              <action.icon className={styles.quickIconGlyph} />
            </div>
            <div className={styles.quickInfo}>
              <span className={styles.quickLabel}>{action.label}</span>
              <span className={styles.quickHint}>{action.hint}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}