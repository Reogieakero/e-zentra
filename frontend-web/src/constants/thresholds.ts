export const ATTENDANCE = {
  flagRate: 80,
  highRiskRate: 70,
  targetRate: 95,
} as const;

export const RISK = {
  attendanceRate: 80,
  academicAvg: 75,
} as const;

export function attendanceRiskTone(rate: number): "danger" | "warn" {
  return rate < ATTENDANCE.highRiskRate ? "danger" : "warn";
}
