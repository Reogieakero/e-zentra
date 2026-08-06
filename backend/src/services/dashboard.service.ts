import { AttendanceStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

const AT_RISK_LIMIT = 3;
const ADM_APPROVAL_LIMIT = 3;
const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export async function getDashboardOverview() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const activeYear = await prisma.schoolYear.findFirst({
    where: { status: 'active' },
    select: { id: true, yearLabel: true, startDate: true, endDate: true },
  });

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
    getSectionAttendance(),
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
    },
  };
}

async function countEnrolledStudents(activeYearId: string | null): Promise<number> {
  if (!activeYearId) return 0;
  return prisma.studentProfile.count({
    where: { section: { status: 'active', schoolYearId: activeYearId } },
  });
}

function buildAtRiskWhere(schoolYearId: string | null): Prisma.StudentRiskAssessmentWhereInput {
  return {
    riskLevel: { in: ['moderate', 'high'] },
    ...(schoolYearId ? { term: { schoolYearId } } : {}),
    section: { status: 'active' },
    student: {
      accountStatus: 'active',
      OR: [{ finalGradeStudents: { some: {} } }, { attendanceStudents: { some: {} } }],
    },
  };
}

async function countAtRiskStudents(schoolYearId: string | null): Promise<number> {
  if (!schoolYearId) return 0;
  const rows = await prisma.studentRiskAssessment.findMany({
    where: buildAtRiskWhere(schoolYearId),
    select: { studentId: true },
  });
  return new Set(rows.map((r) => r.studentId)).size;
}

async function getAtRiskStudents(schoolYearId: string | null) {
  if (!schoolYearId) return [];
  const rows = await prisma.studentRiskAssessment.findMany({
    where: buildAtRiskWhere(schoolYearId),
    orderBy: { computedAt: 'desc' },
    take: 200,
    select: { studentId: true, riskLevel: true, student: { select: { id: true, firstName: true, lastName: true } } },
  });

  const seen = new Set<string>();
  const students: Array<{ studentId: string; riskLevel: string }> = [];
  for (const r of rows) {
    if (seen.has(r.studentId)) continue;
    seen.add(r.studentId);
    students.push({ studentId: r.studentId, riskLevel: r.riskLevel });
    if (students.length >= AT_RISK_LIMIT) break;
  }

  if (students.length === 0) return [];

  const ids = students.map((s) => s.studentId);
  const [profiles, attendanceByStatus] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { id: { in: ids } },
      select: { id: true, section: { select: { sectionName: true } } },
    }),
    prisma.attendanceRecord.groupBy({
      by: ['studentId', 'status'],
      where: { studentId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.id, p.section?.sectionName ?? null]));
  const attendanceMap = new Map<string, Map<string, number>>();
  for (const a of attendanceByStatus) {
    if (!attendanceMap.has(a.studentId)) attendanceMap.set(a.studentId, new Map());
    attendanceMap.get(a.studentId)!.set(a.status, a._count._all);
  }

  const studentNames = new Map(rows.map((r) => [r.studentId, r.student]));
  return students.map((s) => {
    const counts = attendanceMap.get(s.studentId);
    const present = counts?.get(AttendanceStatus.present) ?? 0;
    const total = counts ? Array.from(counts.values()).reduce((sum, n) => sum + n, 0) : 0;
    const student = studentNames.get(s.studentId);
    return {
      studentId: s.studentId,
      firstName: student?.firstName ?? '',
      lastName: student?.lastName ?? '',
      sectionName: profileMap.get(s.studentId) ?? null,
      riskLevel: s.riskLevel,
      attendanceRate: total > 0 ? Math.round((present / total) * 1000) / 10 : null,
    };
  });
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

async function getSectionAttendance() {
  const [sections, attendanceByStatus] = await Promise.all([
    prisma.section.findMany({
      where: { status: 'active' },
      select: { id: true, sectionName: true },
      orderBy: { sectionName: 'asc' },
    }),
    prisma.attendanceRecord.groupBy({
      by: ['sectionId', 'status'],
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
    const total = counts ? Array.from(counts.values()).reduce((sum, n) => sum + n, 0) : 0;
    return {
      sectionId: s.id,
      sectionName: s.sectionName,
      presentCount: present,
      absentCount: absent,
      totalCount: total,
      rate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
      absentRate: total > 0 ? Math.round((absent / total) * 1000) / 10 : 0,
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

  const weekKeys: string[] = [];
  for (let i = 0; i < HEATMAP_DAYS.length; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
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
      if (!bucket || bucket.total === 0) return { day, rate: 0, level: 0 };
      const rate = Math.round((bucket.present / bucket.total) * 1000) / 10;
      return { day, rate, level: heatmapLevel(rate) };
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
      label: HEATMAP_DAYS[i],
      rate: bucket && bucket.total > 0 ? Math.round((bucket.present / bucket.total) * 1000) / 10 : null,
    };
  });
}
