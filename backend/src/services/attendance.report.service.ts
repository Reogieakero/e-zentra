import { AttendanceStatus, GradeLevel } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { cacheKey, getCached } from './cache.service';
import {
  DASHBOARD_CACHE_TTL,
  GRADE_LABELS,
  MONTH_LONG,
  WEEKDAYS,
  addStatus,
  countEnrolledStudents,
  dayKey,
  monthKey,
  rateOf,
  round1,
} from '../lib/school';

export async function getAttendanceReport(
  view: 'monthly' | 'daily' = 'monthly',
  gradeLevel?: string,
  sectionId?: string
) {
  const key = cacheKey('dashboard', `attendance-report:${view}:${gradeLevel ?? 'all'}:${sectionId ?? 'all'}`);
  return getCached<{ data: unknown }>(key, DASHBOARD_CACHE_TTL, async () => ({
    data: await loadAttendanceReport(view, gradeLevel, sectionId),
  }));
}

export async function listSectionsByGrade(gradeLevel: string) {
  const sections = await prisma.section.findMany({
    where: {
      gradeLevel: gradeLevel as GradeLevel,
      status: 'active',
      schoolYear: { status: 'active' },
    },
    select: { id: true, sectionName: true },
    orderBy: { sectionName: 'asc' },
  });
  return sections;
}

export async function loadAttendanceReport(
  view: 'monthly' | 'daily' = 'monthly',
  gradeLevel?: string,
  sectionId?: string
) {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { status: 'active' },
    select: { id: true, yearLabel: true, startDate: true, endDate: true },
  });

  const emptyReport = {
    schoolYear: null,
    term: null,
    targetRate: 95,
    granularity: view,
    enrollmentTotal: 0,
    series: [],
    statBlocks: {
      averageRate: 0,
      bestPeriod: null,
      lowestPeriod: null,
      periodsAboveTarget: 0,
      periodsTracked: 0,
    },
    gradeLevels: [],
    insights: [],
  };

  if (!activeYear) return emptyReport;

  const target = 95;
  const start = new Date(activeYear.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(activeYear.endDate);
  end.setHours(0, 0, 0, 0);
  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);

  const sectionFilter = sectionId
    ? { sectionId }
    : gradeLevel
    ? { section: { gradeLevel: gradeLevel as GradeLevel } }
    : {};

  const [records, enrollmentTotal, activeTerm] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        term: { schoolYearId: activeYear.id },
        attendanceDate: { gte: start, lt: endExclusive },
        ...sectionFilter,
      },
      select: { status: true, attendanceDate: true, section: { select: { gradeLevel: true } } },
    }),
    countEnrolledStudents(activeYear.id),
    prisma.term.findFirst({
      where: { schoolYearId: activeYear.id, status: 'active' },
      orderBy: { startDate: 'asc' },
      select: { termLabel: true },
    }),
  ]);

  const bucketKey = view === 'monthly' ? monthKey : dayKey;
  const byBucket = new Map<string, { present: number; absent: number; late: number; excused: number }>();
  const byGrade = new Map<string, { present: number; absent: number; late: number; excused: number }>();
  for (const r of records) {
    const bKey = bucketKey(r.attendanceDate);
    let bb = byBucket.get(bKey);
    if (!bb) {
      bb = { present: 0, absent: 0, late: 0, excused: 0 };
      byBucket.set(bKey, bb);
    }
    addStatus(bb, r.status);

    let gb = byGrade.get(r.section.gradeLevel);
    if (!gb) {
      gb = { present: 0, absent: 0, late: 0, excused: 0 };
      byGrade.set(r.section.gradeLevel, gb);
    }
    addStatus(gb, r.status);
  }

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const seriesEnd = tomorrow < endExclusive ? tomorrow : endExclusive;

  const series = view === 'monthly' ? buildMonthlySeries(byBucket) : buildDailySeries(byBucket, start, seriesEnd);

  const tracked = series.filter((s) => s.rate !== null);
  const rates = tracked.map((s) => s.rate as number);
  const averageRate = rates.length > 0 ? round1(rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
  const bestPeriod =
    rates.length > 0
      ? tracked.reduce((a, b) => ((b.rate as number) > (a.rate as number) ? b : a))
      : null;
  const lowestPeriod =
    rates.length > 0
      ? tracked.reduce((a, b) => ((b.rate as number) < (a.rate as number) ? b : a))
      : null;
  const periodsAboveTarget = rates.filter((r) => r >= target).length;

  const gradesOrder = [
    'grade_7',
    'grade_8',
    'grade_9',
    'grade_10',
    'grade_11',
    'grade_12',
  ];
  const gradeLevels = gradesOrder
    .filter((g) => byGrade.has(g) && rateOf(byGrade.get(g)!) > 0)
    .map((g) => {
      const counts = byGrade.get(g)!;
      const total = counts.present + counts.absent + counts.late + counts.excused;
      return {
        gradeLevel: g,
        label: GRADE_LABELS[g],
        presentCount: counts.present,
        absentCount: counts.absent,
        totalCount: total,
        rate: rateOf(counts),
      };
    });

  const insights = buildReportInsights(
    averageRate,
    bestPeriod?.label,
    bestPeriod?.rate,
    lowestPeriod?.label,
    lowestPeriod?.rate,
    periodsAboveTarget,
    tracked.length,
    target,
    gradeLevels,
    view
  );

  return {
    schoolYear: activeYear.yearLabel,
    term: activeTerm?.termLabel ?? null,
    targetRate: target,
    granularity: view,
    enrollmentTotal,
    series,
    statBlocks: {
      averageRate,
      bestPeriod,
      lowestPeriod,
      periodsAboveTarget,
      periodsTracked: tracked.length,
    },
    gradeLevels,
    insights,
  };
}

function monthlyOrder(a: string, b: string): number {
  return a.localeCompare(b);
}

function dailyOrder(a: string, b: string): number {
  return a.localeCompare(b);
}

function buildMonthlySeries(byMonth: Map<string, { present: number; absent: number; late: number; excused: number }>) {
  const keys = Array.from(byMonth.keys()).sort(monthlyOrder);
  return keys.map((mKey) => {
    const [year, monthNum] = mKey.split('-').map(Number);
    const counts = byMonth.get(mKey);
    const total = counts ? counts.present + counts.absent + counts.late + counts.excused : 0;
    return {
      key: mKey,
      shortLabel: MONTH_LONG[monthNum - 1].slice(0, 3),
      label: `${MONTH_LONG[monthNum - 1]} ${year}`,
      year,
      month: monthNum,
      total,
      present: counts?.present ?? 0,
      absent: counts?.absent ?? 0,
      late: counts?.late ?? 0,
      excused: counts?.excused ?? 0,
      rate: total > 0 ? rateOf(counts!) : null,
    };
  });
}

function buildDailySeries(
  byDay: Map<string, { present: number; absent: number; late: number; excused: number }>,
  start: Date,
  endExclusive: Date
) {
  const keys: string[] = [];
  const cur = new Date(start);
  while (cur < endExclusive) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) keys.push(dayKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  keys.sort(dailyOrder);
  return keys.map((dKey) => {
    const counts = byDay.get(dKey);
    const total = counts ? counts.present + counts.absent + counts.late + counts.excused : 0;
    const [year, monthNum, dayNum] = dKey.split('-').map(Number);
    const date = new Date(year, monthNum - 1, dayNum);
    return {
      key: dKey,
      shortLabel: `${MONTH_LONG[monthNum - 1].slice(0, 3)} ${dayNum}`,
      label: `${WEEKDAYS[date.getDay()]}, ${MONTH_LONG[monthNum - 1]} ${dayNum}, ${year}`,
      year,
      month: monthNum,
      total,
      present: counts?.present ?? 0,
      absent: counts?.absent ?? 0,
      late: counts?.late ?? 0,
      excused: counts?.excused ?? 0,
      rate: total > 0 ? rateOf(counts!) : null,
    };
  });
}

function buildReportInsights(
  averageRate: number,
  bestLabel: string | null | undefined,
  bestRate: number | null | undefined,
  lowestLabel: string | null | undefined,
  lowestRate: number | null | undefined,
  aboveTarget: number,
  tracked: number,
  target: number,
  gradeLevels: Array<{ label: string; rate: number }>,
  view: 'monthly' | 'daily'
): string[] {
  const period = view === 'monthly' ? 'month' : 'day';
  const out: string[] = [];
  if (tracked > 0) {
    out.push(
      `School-wide attendance averaged ${averageRate}% across ${tracked} tracked ${period}${tracked === 1 ? '' : 's'}.`
    );
  }
  if (bestRate !== undefined && bestLabel) {
    out.push(
      view === 'monthly'
        ? `${bestLabel} was the strongest month at ${bestRate}%.`
        : `${bestLabel} was the strongest day at ${bestRate}%.`
    );
  }
  if (lowestRate !== undefined && lowestLabel) {
    out.push(
      view === 'monthly'
        ? `${lowestLabel} recorded the lowest rate at ${lowestRate}%.`
        : `${lowestLabel} recorded the lowest rate at ${lowestRate}%.`
    );
  }
  out.push(
    `${aboveTarget} of ${tracked} tracked ${period}${tracked === 1 ? '' : 's'} met or exceeded the ${target}% target.`
  );
  const below = gradeLevels.filter((g) => g.rate < target);
  if (below.length > 0) {
    out.push(
      `Grade level${below.length === 1 ? '' : 's'} below target: ${below.map((g) => `${g.label} (${g.rate}%)`).join(', ')}.`
    );
  } else if (gradeLevels.length > 0) {
    out.push('All grade levels averaged at or above the attendance target this year.');
  }
  return out;
}

export async function getAttendanceSummary() {
  const key = cacheKey('dashboard', 'attendance-summary');
  return getCached<{ data: unknown }>(key, DASHBOARD_CACHE_TTL, async () => ({
    data: await loadAttendanceSummary(),
  }));
}

async function loadAttendanceSummary() {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { status: 'active' },
    select: { id: true, yearLabel: true, startDate: true, endDate: true },
  });

  const empty = {
    schoolYear: null,
    totalEnrolled: 0,
    today: { total: 0, present: 0, late: 0, absent: 0, excused: 0, presentRate: 0 },
    monthlyTrend: [],
    heatmap: [],
    perfectAttendance: [],
    lowAttendance: [],
    topSections: [],
  };

  if (!activeYear) return empty;

  const start = new Date(activeYear.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(activeYear.endDate);
  end.setHours(0, 0, 0, 0);
  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [records, enrolledStudents] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: {
        term: { schoolYearId: activeYear.id },
        attendanceDate: { gte: start, lt: endExclusive },
      },
      select: {
        status: true,
        attendanceDate: true,
        studentId: true,
        sectionId: true,
        student: { select: { firstName: true, lastName: true, profilePhotoUrl: true } },
        section: { select: { sectionName: true, gradeLevel: true } },
      },
    }),
    countEnrolledStudents(activeYear.id),
  ]);

  const todayKey = dayKey(today);
  const todayCounts = { present: 0, absent: 0, late: 0, excused: 0 };
  const byMonth = new Map<string, { present: number; absent: number; late: number; excused: number }>();
  const byDay = new Map<string, { present: number; absent: number; late: number; excused: number }>();
  const bySection = new Map<
    string,
    { sectionName: string; gradeLevel: string; counts: { present: number; absent: number; late: number; excused: number }; students: Set<string> }
  >();
  const byStudent = new Map<
    string,
    {
      firstName: string;
      lastName: string;
      photo: string | null;
      sectionName: string;
      gradeLevel: string;
    }
  >();

  for (const r of records) {
    const mKey = monthKey(r.attendanceDate);
    const dKey = dayKey(r.attendanceDate);
    let mb = byMonth.get(mKey);
    if (!mb) {
      mb = { present: 0, absent: 0, late: 0, excused: 0 };
      byMonth.set(mKey, mb);
    }
    addStatus(mb, r.status);

    let db = byDay.get(dKey);
    if (!db) {
      db = { present: 0, absent: 0, late: 0, excused: 0 };
      byDay.set(dKey, db);
    }
    addStatus(db, r.status);

    if (dKey === todayKey) addStatus(todayCounts, r.status);

    let sec = bySection.get(r.sectionId);
    if (!sec) {
      sec = {
        sectionName: r.section.sectionName,
        gradeLevel: r.section.gradeLevel,
        counts: { present: 0, absent: 0, late: 0, excused: 0 },
        students: new Set(),
      };
      bySection.set(r.sectionId, sec);
    }
    addStatus(sec.counts, r.status);
    sec.students.add(r.studentId);

    if (!byStudent.has(r.studentId)) {
      byStudent.set(r.studentId, {
        firstName: r.student.firstName,
        lastName: r.student.lastName,
        photo: r.student.profilePhotoUrl,
        sectionName: r.section.sectionName,
        gradeLevel: r.section.gradeLevel,
      });
    }
  }

  const monthlyTrend = buildMonthlySeries(byMonth)
    .filter((s) => s.rate !== null)
    .map((s) => ({ key: s.key, label: s.shortLabel, rate: s.rate }));

  const heatmap = buildSchoolYearHeatmap(byDay, start, endExclusive, today);

  const perfectAttendance = buildPerfectAttendance(records, byStudent);
  const lowAttendance = buildLowAttendance(records, byStudent);
  const topSections = buildTopSections(bySection);

  const totals = todayCounts;
  const todayTotal = totals.present + totals.absent + totals.late + totals.excused;
  const todayRate = todayTotal > 0 ? round1((totals.present / todayTotal) * 100) : 0;

  return {
    schoolYear: activeYear.yearLabel,
    totalEnrolled: enrolledStudents,
    today: {
      total: todayTotal,
      present: totals.present,
      late: totals.late,
      absent: totals.absent,
      excused: totals.excused,
      presentRate: todayRate,
    },
    monthlyTrend,
    heatmap,
    perfectAttendance,
    lowAttendance,
    topSections,
  };
}

function buildSchoolYearHeatmap(
  byDay: Map<string, { present: number; absent: number; late: number; excused: number }>,
  start: Date,
  endExclusive: Date,
  today: Date
) {
  const cells: Array<{ key: string; label: string; rate: number; level: number }> = [];
  const cur = new Date(start);
  while (cur < endExclusive && cur <= today) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) {
      const key = dayKey(cur);
      const c = byDay.get(key);
      const total = c ? c.present + c.absent + c.late + c.excused : 0;
      const rate = total > 0 ? Math.round((c!.present / total) * 1000) / 10 : 0;
      let level = 0;
      if (total > 0) {
        if (rate >= 95) level = 6;
        else if (rate >= 90) level = 5;
        else if (rate >= 85) level = 4;
        else if (rate >= 75) level = 3;
        else if (rate >= 60) level = 2;
        else level = 1;
      }
      cells.push({ key, label: shortDate(cur), rate, level });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

function shortDate(d: Date): string {
  return `${MONTH_LONG[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

function buildPerfectAttendance(
  records: Array<{ studentId: string; status: AttendanceStatus; attendanceDate: Date }>,
  byStudent: Map<
    string,
    { firstName: string; lastName: string; photo: string | null; sectionName: string; gradeLevel: string }
  >
) {
  const studentDays = new Map<string, Map<string, { present: number; absent: number; late: number; excused: number }>>();
  for (const r of records) {
    const key = dayKey(r.attendanceDate);
    let days = studentDays.get(r.studentId);
    if (!days) {
      days = new Map();
      studentDays.set(r.studentId, days);
    }
    let c = days.get(key);
    if (!c) {
      c = { present: 0, absent: 0, late: 0, excused: 0 };
      days.set(key, c);
    }
    addStatus(c, r.status);
  }

  const rows: Array<{
    studentId: string;
    fullName: string;
    sectionName: string;
    gradeLabel: string;
    daysPresent: number;
    rate: number;
  }> = [];
  for (const [studentId, days] of studentDays) {
    let presentDays = 0;
    const totalDays = days.size;
    for (const c of days.values()) {
      if (c.present > 0 && c.absent === 0 && c.late === 0 && c.excused === 0) presentDays += 1;
    }
    if (totalDays === 0) continue;
    const ratePercent = Math.round((presentDays / totalDays) * 100);
    const info = byStudent.get(studentId);
    if (!info) continue;
    rows.push({
      studentId,
      fullName: `${info.firstName} ${info.lastName}`,
      sectionName: info.sectionName,
      gradeLabel: GRADE_LABELS[info.gradeLevel] ?? info.gradeLevel,
      daysPresent: presentDays,
      rate: ratePercent,
    });
  }
  return rows
    .filter((r) => r.rate === 100)
    .sort((a, b) => b.daysPresent - a.daysPresent)
    .slice(0, 18);
}

function buildLowAttendance(
  records: Array<{ studentId: string; status: AttendanceStatus; attendanceDate: Date }>,
  byStudent: Map<
    string,
    { firstName: string; lastName: string; photo: string | null; sectionName: string; gradeLevel: string }
  >
) {
  const perStudent = new Map<string, { present: number; absent: number; late: number; excused: number }>();
  for (const r of records) {
    let c = perStudent.get(r.studentId);
    if (!c) {
      c = { present: 0, absent: 0, late: 0, excused: 0 };
      perStudent.set(r.studentId, c);
    }
    addStatus(c, r.status);
  }

  const rows: Array<{
    studentId: string;
    fullName: string;
    sectionName: string;
    gradeLabel: string;
    rate: number;
    tone: 'danger' | 'warn';
  }> = [];
  for (const [studentId, c] of perStudent) {
    const total = c.present + c.absent + c.late + c.excused;
    if (total === 0) continue;
    const rate = Math.round((c.present / total) * 100);
    if (rate >= 80) continue;
    const info = byStudent.get(studentId);
    if (!info) continue;
    rows.push({
      studentId,
      fullName: `${info.firstName} ${info.lastName}`,
      sectionName: info.sectionName,
      gradeLabel: GRADE_LABELS[info.gradeLevel] ?? info.gradeLevel,
      rate,
      tone: rate < 70 ? 'danger' : 'warn',
    });
  }
  return rows.sort((a, b) => a.rate - b.rate).slice(0, 7);
}

function buildTopSections(
  bySection: Map<
    string,
    { sectionName: string; gradeLevel: string; counts: { present: number; absent: number; late: number; excused: number }; students: Set<string> }
  >
) {
  const rows = Array.from(bySection.entries()).map(([sectionId, s]) => {
    const total = s.counts.present + s.counts.absent + s.counts.late + s.counts.excused;
    const rate = total > 0 ? Math.round((s.counts.present / total) * 1000) / 10 : 0;
    return {
      sectionId,
      sectionName: s.sectionName,
      gradeLabel: GRADE_LABELS[s.gradeLevel] ?? s.gradeLevel,
      rate,
      studentCount: s.students.size,
    };
  });
  return rows
    .filter((r) => r.studentCount > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 6);
}