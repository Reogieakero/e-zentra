import { AttendanceStatus, GradeLevel } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { cacheKey, getCached, invalidateByPattern } from './cache.service';
import { classifyLiveRisk } from './risk.service';
import { HEATMAP_DAYS, countEnrolledStudents, shortDate } from '../lib/school';

const ADM_APPROVAL_LIMIT = 5;
const DASHBOARD_CACHE_TTL = 30;
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function parseMonthFilter(month?: string): { start: Date; end: Date } | null {
  if (!month || !MONTH_RE.test(month)) return null;
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(y, m, 1);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

export function dashboardCacheKey(month?: string): string {
  return cacheKey('dashboard', month ?? undefined);
}

export async function invalidateDashboardCache(): Promise<void> {
  await invalidateByPattern('dashboard');
}

export async function getDashboardOverview(month?: string) {
  const key = dashboardCacheKey(month);
  return getCached<{ data: unknown }>(key, DASHBOARD_CACHE_TTL, () => loadDashboardOverview(month));
}

async function loadDashboardOverview(month?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthFilter = parseMonthFilter(month);

  const activeYear = await prisma.schoolYear.findFirst({
    where: { status: 'active' },
    select: { id: true, yearLabel: true, startDate: true, endDate: true },
  });

  const activeTerm = activeYear
    ? await prisma.term.findFirst({
        where: { schoolYearId: activeYear.id, status: 'active' },
        orderBy: { startDate: 'asc' },
        select: { termLabel: true },
      })
    : null;

  const [
    totalStudents,
    todayAttendance,
    anecdotalThisMonth,
    sf10Count,
    admActive,
    admPending,
    openFlags,
    pendingAccounts,
  ] = await Promise.all([
    countEnrolledStudents(activeYear?.id ?? null),
    prisma.attendanceRecord.findMany({ where: { attendanceDate: today }, select: { status: true } }),
    prisma.anecdotalRecord.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.reportCard.count({ where: { status: { in: ['ready', 'released'] } } }),
    prisma.admLearnerProfile.count({ where: { status: 'approved' } }),
    prisma.admLearnerProfile.count({ where: { status: 'submitted' } }),
    prisma.recordFlag.count({ where: { status: 'open' } }),
    prisma.user.count({ where: { accountStatus: 'pending' } }),
  ]);

  const statusCounts = todayAttendance.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const todayTotal = todayAttendance.length;
  const presentToday = statusCounts[AttendanceStatus.present] ?? 0;
  const absentToday = statusCounts[AttendanceStatus.absent] ?? 0;
  const lateToday = statusCounts[AttendanceStatus.late] ?? 0;
  const excusedToday = statusCounts[AttendanceStatus.excused] ?? 0;
  const presentRate = todayTotal > 0 ? Math.round((presentToday / todayTotal) * 1000) / 10 : 0;

  const [atRiskStudents, atRiskCount, admForApproval, sectionAttendance, dailyTrend, heatmap] = await Promise.all([
    getAtRiskStudents(activeYear?.id ?? null),
    countAtRiskStudents(activeYear?.id ?? null),
    getAdmForApproval(),
    getSectionAttendance(monthFilter),
    getDailyTrend(today),
    getSectionHeatmap(),
  ]);

  return {
    data: {
      stats: {
        totalStudents,
        presentToday,
        absentToday,
        lateToday,
        excusedToday,
        todayTotal,
        presentRate,
        anecdotalThisMonth,
        sf10Count,
        admActive,
        admPending,
        atRiskCount,
        pendingActions: openFlags + admPending + pendingAccounts,
      },
      atRiskStudents,
      admForApproval,
      sectionAttendance,
      dailyTrend,
      heatmap,
      schoolYear: activeYear?.yearLabel ?? null,
      term: activeTerm?.termLabel ?? null,
    },
  };
}

async function countAtRiskStudents(schoolYearId: string | null): Promise<number> {
  if (!schoolYearId) return 0;
  const rows = await getAtRiskStudents(schoolYearId);
  return rows.length;
}

async function getAtRiskStudents(schoolYearId: string | null) {
  if (!schoolYearId) return [];
  const activeProfiles = await prisma.studentProfile.findMany({
    where: {
      section: { status: 'active', schoolYearId },
    },
    select: { id: true, user: { select: { firstName: true, lastName: true } }, section: { select: { sectionName: true } } },
  });

  if (activeProfiles.length === 0) return [];
  const ids = activeProfiles.map((p) => p.id);

  const [attendanceRows, finalGradeRows, anecdoteRows] = await Promise.all([
    prisma.attendanceRecord.groupBy({
      by: ['studentId', 'status'],
      where: { studentId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.finalGrade.findMany({
      where: { studentId: { in: ids } },
      select: { studentId: true, transmutedGrade: true },
    }),
    prisma.anecdotalRecord.findMany({
      where: { studentId: { in: ids } },
      select: { studentId: true },
    }),
  ]);

  const attendanceMap = new Map<string, Map<string, number>>();
  for (const a of attendanceRows) {
    if (!attendanceMap.has(a.studentId)) attendanceMap.set(a.studentId, new Map());
    attendanceMap.get(a.studentId)!.set(a.status, a._count._all);
  }

  const academicAvgMap = new Map<string, number | null>();
  for (const p of activeProfiles) {
    const grades = finalGradeRows
      .filter((g) => g.studentId === p.id)
      .map((g) => g.transmutedGrade.toNumber());
    academicAvgMap.set(p.id, grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null);
  }

  const anecdoteCountMap = new Map<string, number>();
  for (const a of anecdoteRows) {
    anecdoteCountMap.set(a.studentId, (anecdoteCountMap.get(a.studentId) ?? 0) + 1);
  }

  return activeProfiles
    .map((p) => {
      const counts = attendanceMap.get(p.id);
      const present = counts?.get(AttendanceStatus.present) ?? 0;
      const total = counts ? Array.from(counts.values()).reduce((sum, n) => sum + n, 0) : 0;
      const attendanceRate = total > 0 ? Math.round((present / total) * 1000) / 10 : null;
      const riskLevel = classifyLiveRisk(
        academicAvgMap.get(p.id) ?? null,
        attendanceRate,
        anecdoteCountMap.get(p.id) ?? 0
      );
      return {
        studentId: p.id,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        sectionName: p.section?.sectionName ?? null,
        riskLevel,
        attendanceRate,
        academicAvg: academicAvgMap.get(p.id) ?? null,
        anecdoteCount: anecdoteCountMap.get(p.id) ?? 0,
      };
    })
    .filter((s) => s.riskLevel === 'high' || s.riskLevel === 'moderate')
    .sort((a, b) => (a.riskLevel === 'high' ? -1 : 1) - (b.riskLevel === 'high' ? -1 : 1))
    .slice(0, 500);
}

async function getAdmForApproval() {
  const profiles = await prisma.admLearnerProfile.findMany({
    where: { status: 'submitted' },
    orderBy: { updatedAt: 'desc' },
    take: ADM_APPROVAL_LIMIT,
    select: {
      id: true,
      student: { select: { firstName: true, lastName: true } },
      section: { select: { sectionName: true } },
      prepared: { select: { firstName: true, lastName: true } },
    },
  });
  return profiles.map((p) => ({
    id: p.id,
    studentName: `${p.student.firstName} ${p.student.lastName}`,
    sectionName: p.section.sectionName,
    preparedBy: `${p.prepared.firstName} ${p.prepared.lastName}`,
    status: 'Pending',
  }));
}

async function getSectionAttendance(monthFilter?: { start: Date; end: Date } | null) {
  const [sections, attendanceByStatus] = await Promise.all([
    prisma.section.findMany({
      where: { status: 'active' },
      select: { id: true, sectionName: true },
      orderBy: { sectionName: 'asc' },
    }),
    prisma.attendanceRecord.groupBy({
      by: ['sectionId', 'status'],
      where: monthFilter ? { attendanceDate: { gte: monthFilter.start, lt: monthFilter.end } } : undefined,
      _count: { _all: true },
    }),
  ]);

  const bySection = new Map<string, Map<string, number>>();
  for (const a of attendanceByStatus) {
    if (!bySection.has(a.sectionId)) bySection.set(a.sectionId, new Map());
    bySection.get(a.sectionId)!.set(a.status, a._count._all);
  }

  return sections.map((s) => {
    const counts = bySection.get(s.id);
    const present = counts?.get(AttendanceStatus.present) ?? 0;
    const absent = counts?.get(AttendanceStatus.absent) ?? 0;
    const late = counts?.get(AttendanceStatus.late) ?? 0;
    const excused = counts?.get(AttendanceStatus.excused) ?? 0;
    const total = counts ? Array.from(counts.values()).reduce((sum, n) => sum + n, 0) : 0;
    const rateOf = (n: number) => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0);
    return {
      sectionId: s.id,
      sectionName: s.sectionName,
      presentCount: present,
      absentCount: absent,
      lateCount: late,
      excusedCount: excused,
      totalCount: total,
      rate: rateOf(present),
      absentRate: rateOf(absent),
      lateRate: rateOf(late),
      excusedRate: rateOf(excused),
    };
  });
}

function heatmapLevel(rate: number): number {
  if (rate >= 95) return 6;
  if (rate >= 90) return 5;
  if (rate >= 85) return 4;
  if (rate >= 75) return 3;
  if (rate >= 60) return 2;
  return 1;
}

async function getSectionHeatmap() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const weekDates: Date[] = [];
  const weekKeys: string[] = [];
  for (let i = 0; i < HEATMAP_DAYS.length; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d);
    weekKeys.push(d.toISOString().slice(0, 10));
  }

  const [sections, records] = await Promise.all([
    prisma.section.findMany({
      where: { status: 'active' },
      select: { id: true, sectionName: true },
      orderBy: { sectionName: 'asc' },
    }),
    prisma.attendanceRecord.findMany({
      where: { attendanceDate: { gte: monday } },
      select: { sectionId: true, attendanceDate: true, status: true },
    }),
  ]);

  const sectionNames = new Map(sections.map((s) => [s.id, s.sectionName]));
  const bySectionDay = new Map<string, Map<string, { present: number; total: number }>>();
  for (const r of records) {
    if (!sectionNames.has(r.sectionId)) continue;
    const key = r.attendanceDate.toISOString().slice(0, 10);
    if (!weekKeys.includes(key)) continue;
    const dayMap = bySectionDay.get(r.sectionId) ?? new Map();
    const bucket = dayMap.get(key) ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (r.status === AttendanceStatus.present) bucket.present += 1;
    dayMap.set(key, bucket);
    bySectionDay.set(r.sectionId, dayMap);
  }

  return sections.map((s) => {
    const dayMap = bySectionDay.get(s.id);
    const days = HEATMAP_DAYS.map((day, i) => {
      const bucket = dayMap?.get(weekKeys[i]);
      if (!bucket || bucket.total === 0) {
        return { day, label: `${shortDate(weekDates[i])} - ${day}`, rate: 0, level: 0 };
      }
      const rate = Math.round((bucket.present / bucket.total) * 1000) / 10;
      return { day, label: `${shortDate(weekDates[i])} - ${day}`, rate, level: heatmapLevel(rate) };
    });
    return { sectionId: s.id, sectionName: s.sectionName, days };
  });
}

async function getDailyTrend(today: Date) {
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dow + 6) % 7));
  monday.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < HEATMAP_DAYS.length; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }

  const records = await prisma.attendanceRecord.findMany({
    where: { attendanceDate: { gte: days[0], lte: days[HEATMAP_DAYS.length - 1] } },
    select: { attendanceDate: true, status: true },
  });

  const byDate = new Map<string, { present: number; total: number }>();
  for (const r of records) {
    const key = r.attendanceDate.toISOString().slice(0, 10);
    const bucket = byDate.get(key) ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (r.status === AttendanceStatus.present) bucket.present += 1;
    byDate.set(key, bucket);
  }

  return days.map((d, i) => {
    const key = d.toISOString().slice(0, 10);
    const bucket = byDate.get(key);
    return {
      day: HEATMAP_DAYS[i],
      label: `${shortDate(d)} - ${HEATMAP_DAYS[i]}`,
      rate: bucket && bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 1000) / 10 : null,
    };
  });
}