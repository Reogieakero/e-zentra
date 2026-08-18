import { Download, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";
import { deriveCategory, studentName, type AnecdotalRecord } from "@/lib/anecdotal";
import { formatDate } from "@/lib/students-format";
import styles from "./anecdotal-drawer.module.css";

interface AnecdotalDrawerProps {
  record: AnecdotalRecord;
  onClose: () => void;
  onExport: (record: AnecdotalRecord) => void;
}

function toneFor(category: string): "brand" | "info" | "warning" | "danger" {
  switch (category) {
    case "Academic":
      return "info";
    case "Behavioral Concern":
      return "warning";
    case "Needs Follow-up":
      return "danger";
    default:
      return "brand";
  }
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={styles.detailRow}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

export default function AnecdotalDrawer({ record, onClose, onExport }: AnecdotalDrawerProps) {
  const category = deriveCategory(record);
  const noteBlocks = [
    { label: "Observation Note", value: record.incidentDescription },
    ...(record.notesRecommendationsActions
      ? [{ label: "Notes, Recommendations & Actions", value: record.notesRecommendationsActions }]
      : []),
    ...(record.classPerformance
      ? [{ label: "Class Performance", value: record.classPerformance }]
      : []),
    ...(record.attendanceSummary
      ? [{ label: "Attendance Summary", value: record.attendanceSummary }]
      : []),
  ];

  return (
    <div className={styles.root} role="dialog" aria-modal="true">
      <div className={styles.backdrop} onClick={onClose} />
      <aside className={styles.drawer}>
        <div className={styles.header}>
          <h3 className={styles.title}>Anecdotal Record</h3>
          <CloseButton onClose={onClose} label="Close drawer" />
        </div>

        <div className={styles.body}>
          <div className={styles.lockNote}>
            <Lock size={14} className={styles.lockIcon} />
            <span>View only · editing is restricted to the assigned adviser</span>
          </div>

          <div className={styles.rows}>
            <DetailRow label="Student" value={studentName(record.student)} />
            <DetailRow
              label="Grade & Section"
              value={`${record.section.gradeLevel} – ${record.section.sectionName}`}
            />
            <DetailRow label="Date Logged" value={formatDate(record.observationDate)} />
            <DetailRow label="Category" value={<Badge tone={toneFor(category)}>{category}</Badge>} />
            <DetailRow label="Adviser" value={studentName(record.observer)} />
          </div>

          {noteBlocks.map((block) => (
            <div key={block.label} className={styles.noteBlock}>
              <span className={styles.noteLabel}>{block.label}</span>
              <p className={styles.noteText}>{block.value}</p>
            </div>
          ))}

          {record.followups.length > 0 && (
            <div className={styles.noteBlock}>
              <span className={styles.noteLabel}>Follow-ups ({record.followups.length})</span>
              <div className={styles.followups}>
                {record.followups.map((f) => (
                  <div key={f.id} className={styles.followup}>
                    <div className={styles.followupHead}>
                      <span className={styles.followupDate}>{formatDate(f.followupDate)}</span>
                    </div>
                    <p className={styles.followupText}>{f.followupNotes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button variant="secondary" size="sm" className={styles.exportBtn} onClick={() => onExport(record)}>
            <Download size={14} />
            Export This Record
          </Button>
        </div>
      </aside>
    </div>
  );
}
