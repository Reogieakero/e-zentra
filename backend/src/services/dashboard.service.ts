import { AttendanceStatus, GradeLevel } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { cacheKey, getCached, invalidateByPattern } from './cache.service';
import { classifyLiveRisk } from './risk.service';
import { HEATMAP_DAYS, countEnrolledStudents, shortDate } from '../lib/school';
import { logger } from '../lib/logger';

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
    prisma.attendanceRecord.findMany({ where: { attendanceDate: today }, select: { status: true, studentId: true } }),
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

  const loggedTodayDistinct = new Set(todayAttendance.map((r) => r.studentId)).size;
  const notLoggedToday = Math.max(0, totalStudents - loggedTodayDistinct);

  const todayTotal = todayAttendance.length;
  const presentToday = statusCounts[AttendanceStatus.present] ?? 0;
  const absentToday = statusCounts[AttendanceStatus.absent] ?? 0;
  const lateToday = statusCounts[AttendanceStatus.late] ?? 0;
  const excusedToday = statusCounts[AttendanceStatus.excused] ?? 0;
  const presentRate = totalStudents > 0 ? Math.round((presentToday / totalStudents) * 1000) / 10 : 0;

  const [atRiskStudents, admForApproval, sectionAttendance, weekRecords] = await Promise.all([
    getAtRiskStudents(activeYear?.id ?? null),
    getAdmForApproval(),
    getSectionAttendance(monthFilter),
    getWeekAttendance(),
  ]);

  const atRiskCount = atRiskStudents.length;
  const [dailyTrend, heatmap] = await Promise.all([
    Promise.resolve(buildDailyTrend(weekRecords, today, totalStudents)),
    buildSectionHeatmap(weekRecords),
  ]);

  return {
    data: {
      stats: {
        totalStudents,
        presentToday,
        absentToday,
        lateToday,
        excusedToday,
        notLoggedToday,
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

function countSchoolDays(start: Date, endExclusive: Date): number {
  let days = 0;
  const cur = new Date(start);
  while (cur < endExclusive) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

async function getAtRiskStudents(schoolYearId: string | null) {
  if (!schoolYearId) return [];
  const schoolYear = await prisma.schoolYear.findFirst({
    where: { id: schoolYearId },
    select: { startDate: true, endDate: true },
  });
  const yearStart = schoolYear ? new Date(schoolYear.startDate) : new Date();
  yearStart.setHours(0, 0, 0, 0);
  const yearEnd = schoolYear ? new Date(schoolYear.endDate) : new Date();
  yearEnd.setHours(0, 0, 0, 0);
  yearEnd.setDate(yearEnd.getDate() + 1);
  const schoolDays = countSchoolDays(yearStart, yearEnd);
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
      const attendanceRate =
        total > 0 && schoolDays > 0 ? Math.round((present / schoolDays) * 1000) / 10 : null;
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
  const [sections, attendanceByStatus, enrollments] = await Promise.all([
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
    prisma.studentProfile.groupBy({
      by: ['sectionId'],
      where: { section: { status: 'active' } },
      _count: { _all: true },
    }),
  ]);

  const enrolledBySection = new Map(enrollments.map((g) => [g.sectionId, g._count._all]));

  let monthSchoolDays = 0;
  if (monthFilter) {
    const cur = new Date(monthFilter.start);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(monthFilter.end);
    end.setHours(0, 0, 0, 0);
    while (cur < end) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) monthSchoolDays += 1;
      cur.setDate(cur.getDate() + 1);
    }
  }

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
    const enrolled = enrolledBySection.get(s.id) ?? 0;
    const denominator = enrolled * monthSchoolDays;
    const rateOf = (n: number) => (denominator > 0 ? Math.round((n / denominator) * 1000) / 10 : 0);
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

interface WeekAttendanceRecord {
  sectionId: string;
  attendanceDate: Date;
  status: AttendanceStatus;
  studentId: string;
}

async function getWeekAttendance(): Promise<WeekAttendanceRecord[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + HEATMAP_DAYS.length - 1);
  sunday.setHours(23, 59, 59, 999);

  return prisma.attendanceRecord.findMany({
    where: { attendanceDate: { gte: monday, lte: sunday } },
    select: { sectionId: true, attendanceDate: true, status: true, studentId: true },
  });
}

function weekDays(today: Date): Date[] {
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const days: Date[] = [];
  for (let i = 0; i < HEATMAP_DAYS.length; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return days;
}

function buildDailyTrend(records: WeekAttendanceRecord[], today: Date, totalStudents: number) {
  const days = weekDays(today);
  const byDate = new Map<
    string,
    { present: number; absent: number; late: number; excused: number; students: Set<string> }
  >();
  for (const r of records) {
    const key = r.attendanceDate.toISOString().slice(0, 10);
    let bucket = byDate.get(key);
    if (!bucket) {
      bucket = { present: 0, absent: 0, late: 0, excused: 0, students: new Set() };
      byDate.set(key, bucket);
    }
    switch (r.status) {
      case AttendanceStatus.present:
        bucket.present += 1;
        break;
      case AttendanceStatus.absent:
        bucket.absent += 1;
        break;
      case AttendanceStatus.late:
        bucket.late += 1;
        break;
      case AttendanceStatus.excused:
        bucket.excused += 1;
        break;
    }
    bucket.students.add(r.studentId);
  }

  return days.map((d, i) => {
    const key = d.toISOString().slice(0, 10);
    const bucket = byDate.get(key);
    const present = bucket?.present ?? 0;
    const absent = bucket?.absent ?? 0;
    const late = bucket?.late ?? 0;
    const excused = bucket?.excused ?? 0;
    const logged = bucket?.students.size ?? 0;
    return {
      day: HEATMAP_DAYS[i],
      label: `${shortDate(d)} - ${HEATMAP_DAYS[i]}`,
      present,
      absent,
      late,
      excused,
      notLogged: Math.max(0, totalStudents - logged),
      rate: totalStudents > 0 ? Math.round((present / totalStudents) * 1000) / 10 : null,
    };
  });
}

async function buildSectionHeatmap(records: WeekAttendanceRecord[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = weekDays(today);
  const weekKeys = days.map((d) => d.toISOString().slice(0, 10));

  const sections = await prisma.section.findMany({
    where: { status: 'active' },
    select: { id: true, sectionName: true },
    orderBy: { sectionName: 'asc' },
  });

  const sectionEnrollments = await prisma.studentProfile.groupBy({
    by: ['sectionId'],
    where: { section: { status: 'active' } },
    _count: { _all: true },
  });
  const sectionEnrolled = new Map(sectionEnrollments.map((g) => [g.sectionId, g._count._all]));

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
    const enrolled = sectionEnrolled.get(s.id) ?? 0;
    const dayMap = bySectionDay.get(s.id);
    const outDays = HEATMAP_DAYS.map((day, i) => {
      const bucket = dayMap?.get(weekKeys[i]);
      if (!bucket || enrolled === 0) {
        return { day, label: `${shortDate(days[i])} - ${day}`, present: 0, total: 0, rate: 0, level: 0 };
      }
      const present = bucket.present;
      const total = bucket.total;
      const rate = Math.round((present / enrolled) * 1000) / 10;
      return { day, label: `${shortDate(days[i])} - ${day}`, present, total, rate, level: heatmapLevel(rate) };
    });
    return { sectionId: s.id, sectionName: s.sectionName, days: outDays };
  });
}

const DASHBOARD_WARM_INTERVAL_MS = 20_000;
let warmerHandle: ReturnType<typeof setInterval> | null = null;

export function startDashboardCacheWarmer(): void {
  if (process.env.NODE_ENV === 'test') return;
  if (warmerHandle) return;
  const warm = () => {
    getDashboardOverview().catch((err) => logger.warn({ err }, 'dashboard cache warm failed'));
  };
  warm();
  warmerHandle = setInterval(warm, DASHBOARD_WARM_INTERVAL_MS);
}

export function stopDashboardCacheWarmer(): void {
  if (warmerHandle) {
    clearInterval(warmerHandle);
    warmerHandle = null;
  }
}