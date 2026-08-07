import { CustomSelect } from "@/components/ui/select";
import { SearchInput } from "@/components/ui/search-input";
import type { StudentsQuery } from "@/lib/use-students-query";
import styles from "./students-toolbar.module.css";

export const GRADE_OPTIONS = [
  { value: "all", label: "All Grades" },
  { value: "grade_7", label: "Grade 7" },
  { value: "grade_8", label: "Grade 8" },
  { value: "grade_9", label: "Grade 9" },
  { value: "grade_10", label: "Grade 10" },
  { value: "grade_11", label: "Grade 11" },
  { value: "grade_12", label: "Grade 12" },
];

export const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

interface StudentsToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  query: StudentsQuery;
  sections: Array<{ id: string; sectionName: string; gradeLevel: string; schoolYearId: string }>;
  years: Array<{ id: string; yearLabel: string }>;
  onFilterChange: (patch: Partial<StudentsQuery>) => void;
}

export default function StudentsToolbar({
  search,
  onSearchChange,
  query,
  sections,
  years,
  onFilterChange,
}: StudentsToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarTitle}>
        <h2 className={styles.cardTitle}>Student Records</h2>
        <p className={styles.cardSubtitle}>Manage all enrolled students.</p>
      </div>
      <div className={styles.toolbarFilters}>
        <SearchInput
          value={search}
          onChange={onSearchChange}
          placeholder="Search student name or ID…"
          aria-label="Search students"
          className={styles.searchWrap}
        />
        <CustomSelect
          value={query.grade}
          options={GRADE_OPTIONS}
          onChange={(v) => onFilterChange({ grade: v, sectionId: v === "all" ? "" : query.sectionId })}
          size="sm"
          showCheck={false}
          className={styles.filterSelect}
        />
        <CustomSelect
          value={query.sectionId}
          options={[
            { value: "", label: "Section: All" },
            ...sections.map((s) => ({ value: s.id, label: s.sectionName })),
          ]}
          onChange={(v) => onFilterChange({ sectionId: v })}
          size="sm"
          showCheck={false}
          className={styles.filterSelect}
        />
        <CustomSelect
          value={query.schoolYearId}
          options={[
            { value: "", label: "Year: All" },
            ...(years.map((y) => ({ value: y.id, label: y.yearLabel })) ?? []),
          ]}
          onChange={(v) => onFilterChange({ schoolYearId: v })}
          size="sm"
          showCheck={false}
          className={styles.filterSelect}
        />
        <CustomSelect
          value={query.status}
          options={STATUS_OPTIONS}
          onChange={(v) => onFilterChange({ status: v })}
          size="sm"
          showCheck={false}
          className={styles.filterSelect}
        />
      </div>
    </div>
  );
}