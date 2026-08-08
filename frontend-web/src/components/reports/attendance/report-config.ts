export const fmt = (n: number) => `${n.toFixed(1)}%`;

export const STATUS_KEYS: Array<{ key: "present" | "absent" | "late" | "excused" | "notLogged"; name: string; color: string }> = [
  { key: "present", name: "Present", color: "#16a34a" },
  { key: "absent", name: "Absent", color: "#ef4444" },
  { key: "late", name: "Late", color: "#f59e0b" },
  { key: "excused", name: "Excused", color: "#3b82f6" },
  { key: "notLogged", name: "Not logged", color: "#94a3b8" },
];

export const GRADE_OPTIONS = [
  { value: "all", label: "All Grades" },
  { value: "grade_7", label: "Grade 7" },
  { value: "grade_8", label: "Grade 8" },
  { value: "grade_9", label: "Grade 9" },
  { value: "grade_10", label: "Grade 10" },
  { value: "grade_11", label: "Grade 11" },
  { value: "grade_12", label: "Grade 12" },
];

export const PAGE_SIZE = 8;

export const FILTER_KEYS = {
  view: "zentra.attendance-report.view",
  grade: "zentra.attendance-report.grade",
  section: "zentra.attendance-report.section",
} as const;

export const storedFilter = (key: string) => {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};

export const AI_RECOMMENDATIONS_ENABLED = false;