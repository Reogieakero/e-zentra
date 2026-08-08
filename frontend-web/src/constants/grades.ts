export type GradeValue = "grade_7" | "grade_8" | "grade_9" | "grade_10" | "grade_11" | "grade_12";

export interface GradeOption {
  value: string;
  label: string;
}

export const GRADE_LEVELS: GradeValue[] = ["grade_7", "grade_8", "grade_9", "grade_10", "grade_11", "grade_12"];

export const GRADE_OPTIONS: GradeOption[] = [
  { value: "all", label: "All Grades" },
  ...GRADE_LEVELS.map((value) => ({ value, label: `Grade ${value.replace("grade_", "")}` })),
];