import { AttendanceStatus } from '@prisma/client';
import { prisma } from './prisma';

export async function countEnrolledStudents(activeYearId: string | null): Promise<number> {
  if (!activeYearId) return 0;
  return prisma.studentProfile.count({
    where: { section: { status: 'active', schoolYearId: activeYearId } },
  });
}

export const DASHBOARD_CACHE_TTL = 30;
export const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const GRADE_LABELS: Record<string, string> = {
  grade_7: 'Grade 7',
  grade_8: 'Grade 8',
  grade_9: 'Grade 9',
  grade_10: 'Grade 10',
  grade_11: 'Grade 11',
  grade_12: 'Grade 12',
};

export interface StatusCount {
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export function addStatus(counts: StatusCount, status: AttendanceStatus): void {
  switch (status) {
    case AttendanceStatus.present:
      counts.present += 1;
      break;
    case AttendanceStatus.absent:
      counts.absent += 1;
      break;
    case AttendanceStatus.late:
      counts.late += 1;
      break;
    case AttendanceStatus.excused:
      counts.excused += 1;
      break;
  }
}

export function rateOf(counts: StatusCount): number {
  const total = counts.present + counts.absent + counts.late + counts.excused;
  return total > 0 ? Math.round((counts.present / total) * 1000) / 10 : 0;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function shortDate(d: Date): string {
  return `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function isWeekendDayKey(key: string): boolean {
  const [y, m, d] = key.split('-').map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return dow === 0 || dow === 6;
}