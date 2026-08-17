import { FILTER_KEYS as REPORT_FILTER_KEYS, storedFilter } from "@/constants/storage";

export const fmt = (n: number) => `${n.toFixed(1)}%`;

export const STATUS_KEYS: Array<{ key: "present" | "absent" | "late" | "excused" | "notLogged"; name: string; color: string }> = [
  { key: "present", name: "Present", color: "#16a34a" },
  { key: "absent", name: "Absent", color: "#ef4444" },
  { key: "late", name: "Late", color: "#f59e0b" },
  { key: "excused", name: "Excused", color: "#3b82f6" },
  { key: "notLogged", name: "Not logged", color: "#94a3b8" },
];

export const PAGE_SIZE = 10;

export const FILTER_KEYS = REPORT_FILTER_KEYS.attendanceReport;

export { storedFilter };

export const AI_RECOMMENDATIONS_ENABLED = false;