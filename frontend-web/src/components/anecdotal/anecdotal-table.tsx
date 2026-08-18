import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { deriveCategory, studentName, type AnecdotalRecord } from "@/lib/anecdotal";
import { formatDate } from "@/lib/students-format";
import styles from "./anecdotal-table.module.css";

interface AnecdotalTableProps {
  records: AnecdotalRecord[];
  onSelect: (record: AnecdotalRecord) => void;
}

function initials(first: string, last: string): string {
  return `${(first[0] ?? "").toUpperCase()}${(last[0] ?? "").toUpperCase()}` || "?";
}

export default function AnecdotalTable({ records, onSelect }: AnecdotalTableProps) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headRow}>
            <th className={styles.th}>Student</th>
            <th className={styles.th}>Grade &amp; Section</th>
            <th className={styles.th}>Date</th>
            <th className={styles.th}>Category</th>
            <th className={styles.th}>Adviser</th>
            <th className={styles.th}>Note</th>
            <th className={`${styles.th} ${styles.thRight}`}>Action</th>
          </tr>
        </thead>
        <tbody className={styles.body}>
          {records.map((r) => {
            const category = deriveCategory(r);
            return (
              <tr key={r.id} className={styles.row}>
                <td className={styles.td}>
                  <div className={styles.student}>
                    <span className={styles.avatar}>{initials(r.student.firstName, r.student.lastName)}</span>
                    <span className={styles.studentName}>{studentName(r.student)}</span>
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={styles.muted}>
                    {r.section.gradeLevel} – {r.section.sectionName}
                  </span>
                </td>
                <td className={styles.td}>
                  <span className={styles.muted}>{formatDate(r.observationDate)}</span>
                </td>
                <td className={styles.td}>
                  <Badge tone={toneFor(category)}>{category}</Badge>
                </td>
                <td className={styles.td}>
                  <span className={styles.muted}>{studentName(r.observer)}</span>
                </td>
                <td className={styles.td}>
                  <span className={styles.note} title={r.incidentDescription}>
                    {r.incidentDescription}
                  </span>
                </td>
                <td className={`${styles.td} ${styles.tdRight}`}>
                  <button className={styles.viewBtn} onClick={() => onSelect(r)} title="View">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
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
