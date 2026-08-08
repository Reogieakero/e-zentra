export const STORAGE_KEY = "zentra.theme";

export const TOKENS_KEY = "zentra.tokens";

export const USER_KEY = "zentra.user";

export const GOOGLE_SIGNUP_KEY = "zentra.google.signup";

export const FILTER_KEYS = {
  attendanceSummary: {
    view: "zentra.attendance-summary.view",
    grade: "zentra.attendance-summary.grade",
    section: "zentra.attendance-summary.section",
  },
  attendanceReport: {
    view: "zentra.attendance-report.view",
    grade: "zentra.attendance-report.grade",
    section: "zentra.attendance-report.section",
  },
} as const;

export const storedFilter = (key: string) => {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
};