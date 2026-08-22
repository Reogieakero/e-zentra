import { AttendanceStatus, GradeLevel, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { cacheKey, getCached } from './cache.service';
import {
  DASHBOARD_CACHE_TTL,
  GRADE_LABELS,
  MONTH_LONG,
  MONTH_SHORT,
  WEEKDAYS,
  addStatus,
  dayKey,
  isWeekendDayKey,
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

export async function getAllSectionsAttendance() {
  const key = cacheKey('dashboard', 'attendance-all-sections');
  return getCached<unknown>(key, DASHBOARD_CACHE_TTL, async () => {
    const activeYear = await prisma.schoolYear.findFirst({
      where: { status: 'active' },
      select: { id: true, startDate: true, endDate: true },
    });
    if (!activeYear) return [];

    const start = new Date(activeYear.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(activeYear.endDate);
    end.setHours(0, 0, 0, 0);
    const endExclusive = new Date(end);
    endExclusive.setDate(endExclusive.getDate() + 1);

    const [sections, records] = await Promise.all([
      prisma.section.findMany({
        where: { status: 'active', schoolYearId: activeYear.id },
        select: {
          id: true,
          sectionName: true,
          gradeLevel: true,
          adviser: { select: { firstName: true, lastName: true } },
        },
        orderBy: { sectionName: 'asc' },
      }),
      prisma.attendanceRecord.findMany({
        where: {
          term: { schoolYearId: activeYear.id },
          attendanceDate: { gte: start, lt: endExclusive },
        },
        select: { status: true, attendanceDate: true, studentId: true, sectionId: true },
      }),
    ]);

    const agg = new Map<
      string,
      {
        counts: { present: number; absent: number; late: number; excused: number };
        students: Set<string>;
        dayKeys: Set<string>;
      }
    >();
    for (const r of records) {
      let a = agg.get(r.sectionId);
      if (!a) {
        a = { counts: { present: 0, absent: 0, late: 0, excused: 0 }, students: new Set(), dayKeys: new Set() };
        agg.set(r.sectionId, a);
      }
      addStatus(a.counts, r.status);
      a.dayKeys.add(dayKey(r.attendanceDate));
      a.students.add(r.studentId);
    }

    return sections
      .map((s) => {
        const a = agg.get(s.id);
        const counts = a?.counts ?? { present: 0, absent: 0, late: 0, excused: 0 };
        const total = counts.present + counts.absent + counts.late + counts.excused;
        const rate = total > 0 ? Math.round((counts.present / total) * 1000) / 10 : 0;
        const dayCount = Array.from(a?.dayKeys ?? []).filter((k) => !isWeekendDayKey(k)).length;
        const avgPresent = dayCount > 0 ? round1(counts.present / dayCount) : 0;
        return {
          sectionId: s.id,
          sectionName: s.sectionName,
          gradeLabel: GRADE_LABELS[s.gradeLevel] ?? s.gradeLevel,
          adviserName: s.adviser ? `${s.adviser.firstName} ${s.adviser.lastName}` : null,
          rate,
          studentCount: a?.students.size ?? 0,
          avgPresent,
        };
      })
      .sort((a, b) => b.avgPresent - a.avgPresent || a.sectionName.localeCompare(b.sectionName));
  });
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
    averagePresentPerDay: 0,
    presentTotal: 0,
    trackedSchoolDays: 0,
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

  const sectionFilter: Prisma.AttendanceRecordWhereInput = sectionId
    ? { section: { status: 'active', schoolYearId: activeYear.id, id: sectionId } }
    : gradeLevel
    ? { section: { status: 'active', schoolYearId: activeYear.id, gradeLevel: gradeLevel as GradeLevel } }
    : { section: { status: 'active', schoolYearId: activeYear.id } };

  const enrollmentScope: Prisma.StudentProfileWhereInput = sectionId
    ? { section: { status: 'active', schoolYearId: activeYear.id, id: sectionId } }
    : gradeLevel
    ? { section: { status: 'active', schoolYearId: activeYear.id, gradeLevel: gradeLevel as GradeLevel } }
    : { section: { status: 'active', schoolYearId: activeYear.id } };

  const [{ records, scopedEnrolled }, activeTerm] = await Promise.all([
    (async () => {
      const [records, scopedEnrolled] = await Promise.all([
        prisma.attendanceRecord.findMany({
          where: {
            term: { schoolYearId: activeYear.id },
            attendanceDate: { gte: start, lt: endExclusive },
            ...sectionFilter,
          },
          select: {
            status: true,
            attendanceDate: true,
            studentId: true,
            section: { select: { gradeLevel: true } },
          },
        }),
        prisma.studentProfile.count({ where: enrollmentScope }),
      ]);
      return { records, scopedEnrolled };
    })(),
    prisma.term.findFirst({
      where: { schoolYearId: activeYear.id, status: 'active' },
      orderBy: { startDate: 'asc' },
      select: { termLabel: true },
    }),
  ]);

  let scopeLabel = 'School-wide';
  if (sectionId) {
    const section = await prisma.section.findFirst({
      where: { id: sectionId },
      select: { sectionName: true, gradeLevel: true },
    });
    scopeLabel = section
      ? `${GRADE_LABELS[section.gradeLevel] ?? section.gradeLevel} - ${section.sectionName}`
      : 'Selected section';
  } else if (gradeLevel) {
    scopeLabel = GRADE_LABELS[gradeLevel as GradeLevel] ?? gradeLevel;
  }

  const byDay = new Map<string, { present: number; absent: number; late: number; excused: number }>();
  const byDayStudents = new Map<string, Set<string>>();
  const byGrade = new Map<string, { present: number; absent: number; late: number; excused: number }>();
  for (const r of records) {
    const dKey = dayKey(r.attendanceDate);
    let db = byDay.get(dKey);
    if (!db) {
      db = { present: 0, absent: 0, late: 0, excused: 0 };
      byDay.set(dKey, db);
    }
    addStatus(db, r.status);

    let dStudents = byDayStudents.get(dKey);
    if (!dStudents) {
      dStudents = new Set();
      byDayStudents.set(dKey, dStudents);
    }
    dStudents.add(r.studentId);

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

  const dailyTrend = buildDailySeries(byDay, start, seriesEnd, scopedEnrolled).map((s) => {
    const loggedStudents = byDayStudents.get(s.key)?.size ?? 0;
    return { ...s, notLogged: Math.max(0, scopedEnrolled - loggedStudents) };
  });
  const series = view === 'monthly' ? buildMonthlySeriesFromDaily(dailyTrend, scopedEnrolled, start, endExclusive) : dailyTrend;

  const activeDays = dailyTrend.filter((s) => s.total > 0);
  const presentTotal = activeDays.reduce((sum, s) => sum + s.present, 0);
  const averagePresentPerDay =
    activeDays.length > 0 ? round1(presentTotal / activeDays.length) : 0;
  const trackedSchoolDays = activeDays.length;

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
    view,
    scopeLabel
  );

  return {
    schoolYear: activeYear.yearLabel,
    term: activeTerm?.termLabel ?? null,
    targetRate: target,
    granularity: view,
    enrollmentTotal: scopedEnrolled,
    averagePresentPerDay,
    presentTotal,
    trackedSchoolDays,
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

function buildMonthlySeriesFromDaily(
  daily: Array<{
    key: string;
    shortLabel: string;
    label: string;
    year: number;
    month: number;
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    notLogged: number;
    rate: number | null;
  }>,
  enrolled: number,
  start: Date,
  endExclusive: Date
) {
  const byMonth = new Map<
    string,
    {
      days: number;
      present: number;
      absent: number;
      late: number;
      excused: number;
      notLogged: number;
    }
  >();
  for (const d of daily) {
    if (d.total === 0 && d.notLogged === 0) continue;
    const mKey = `${d.year}-${String(d.month).padStart(2, '0')}`;
    let agg = byMonth.get(mKey);
    if (!agg) {
      agg = { days: 0, present: 0, absent: 0, late: 0, excused: 0, notLogged: 0 };
      byMonth.set(mKey, agg);
    }
    agg.days += 1;
    agg.present += d.present;
    agg.absent += d.absent;
    agg.late += d.late;
    agg.excused += d.excused;
    agg.notLogged += d.notLogged;
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mKey, agg]) => {
      const [year, monthNum] = mKey.split('-').map(Number);
      const monthStart = new Date(year, monthNum - 1, 1);
      const monthEndExclusive = new Date(year, monthNum, 1);
      const rangeStart = monthStart < start ? start : monthStart;
      const rangeEnd = monthEndExclusive > endExclusive ? endExclusive : monthEndExclusive;
      let schoolDays = 0;
      const cur = new Date(rangeStart);
      while (cur < rangeEnd) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) schoolDays += 1;
        cur.setDate(cur.getDate() + 1);
      }
      const denominator = enrolled * schoolDays;
      return {
        key: mKey,
        shortLabel: MONTH_LONG[monthNum - 1].slice(0, 3),
        label: `${MONTH_LONG[monthNum - 1]} ${year}`,
        year,
        month: monthNum,
        total: denominator,
        present: agg.present,
        absent: agg.absent,
        late: agg.late,
        excused: agg.excused,
        notLogged: agg.notLogged,
        rate: denominator > 0 ? Math.round((agg.present / denominator) * 1000) / 10 : null,
      };
    });
}

function buildDailySeries(
  byDay: Map<string, { present: number; absent: number; late: number; excused: number }>,
  start: Date,
  endExclusive: Date,
  enrolled: number
) {
  const keys: string[] = [];
  const cur = new Date(start);
  while (cur < endExclusive) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) keys.push(dayKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  keys.sort((a, b) => a.localeCompare(b));
  return keys.map((dKey) => {
    const counts = byDay.get(dKey);
    const total = counts ? counts.present + counts.absent + counts.late + counts.excused : 0;
    const [year, monthNum, dayNum] = dKey.split('-').map(Number);
    const date = new Date(year, monthNum - 1, dayNum);
    const rate = enrolled > 0 ? Math.round((counts?.present ?? 0) / enrolled) * 1000 / 10 : null;
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
      rate,
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
  view: 'monthly' | 'daily',
  scopeLabel: string
): string[] {
  const period = view === 'monthly' ? 'month' : 'day';
  const out: string[] = [];
  if (tracked > 0) {
    out.push(
      `${scopeLabel} attendance averaged ${averageRate}% across ${tracked} tracked ${period}${tracked === 1 ? '' : 's'}.`
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
    if (gradeLevels.length === 1) {
      out.push(`${scopeLabel} averaged below the ${target}% target (${below[0].rate}%).`);
    } else {
      out.push(
        `Grade level${below.length === 1 ? '' : 's'} below target: ${below.map((g) => `${g.label} (${g.rate}%)`).join(', ')}.`
      );
    }
  } else if (gradeLevels.length > 0) {
    if (gradeLevels.length === 1) {
      out.push(`${scopeLabel} averaged at or above the ${target}% attendance target this year.`);
    } else {
      out.push('All grade levels averaged at or above the attendance target this year.');
    }
  }
  return out;
}

export async function getAttendanceSummary(
  view: 'monthly' | 'daily' = 'monthly',
  gradeLevel?: string,
  sectionId?: string,
  date?: string
) {
  const key = cacheKey('dashboard', `attendance-summary:${view}:${gradeLevel ?? 'all'}:${sectionId ?? 'all'}:${date ?? 'today'}`);
  return getCached<{ data: unknown }>(key, DASHBOARD_CACHE_TTL, async () => ({
    data: await loadAttendanceSummary(view, gradeLevel, sectionId, date),
  }));
}

export interface SectionRosterStudent {
  studentId: string;
  lrn: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  gradeLabel: string;
  sectionName: string | null;
  present: number;
  late: number;
  absent: number;
  excused: number;
  notLogged: number;
  total: number;
  rate: number | null;
}

export async function getSectionRoster(sectionId: string) {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { status: 'active' },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!activeYear) return [];

  const start = new Date(activeYear.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(activeYear.endDate);
  end.setHours(0, 0, 0, 0);
  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const seriesEnd = today < endExclusive ? today : endExclusive;

  let schoolDays = 0;
  const cursor = new Date(start);
  while (cursor < seriesEnd) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) schoolDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  const [students, rows, daysRows] = await Promise.all([
    prisma.studentProfile.findMany({
      where: { section: { status: 'active', schoolYearId: activeYear.id, id: sectionId } },
      select: {
        id: true,
        lrn: true,
        gradeLevel: true,
        section: { select: { sectionName: true } },
        user: { select: { firstName: true, lastName: true, profilePhotoUrl: true } },
      },
      orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
    }),
    prisma.attendanceRecord.groupBy({
      by: ['studentId', 'status'],
      where: {
        sectionId,
        term: { schoolYearId: activeYear.id },
        attendanceDate: { gte: start, lt: endExclusive },
      },
      _count: { _all: true },
    }),
    prisma.attendanceRecord.groupBy({
      by: ['studentId', 'attendanceDate'],
      where: {
        sectionId,
        term: { schoolYearId: activeYear.id },
        attendanceDate: { gte: start, lt: endExclusive },
      },
      _count: { _all: true },
    }),
  ]);

  const counts = new Map<string, { present: number; late: number; absent: number; excused: number }>();
  for (const r of rows) {
    const bucket = counts.get(r.studentId) ?? { present: 0, late: 0, absent: 0, excused: 0 };
    if (r.status === AttendanceStatus.present) bucket.present += r._count._all;
    else if (r.status === AttendanceStatus.late) bucket.late += r._count._all;
    else if (r.status === AttendanceStatus.absent) bucket.absent += r._count._all;
    else if (r.status === AttendanceStatus.excused) bucket.excused += r._count._all;
    counts.set(r.studentId, bucket);
  }

  const loggedDays = new Map<string, number>();
  for (const r of daysRows) {
    loggedDays.set(r.studentId, (loggedDays.get(r.studentId) ?? 0) + 1);
  }

  return students.map((s) => {
    const c = counts.get(s.id) ?? { present: 0, late: 0, absent: 0, excused: 0 };
    const total = c.present + c.late + c.absent + c.excused;
    const rate = schoolDays > 0 ? Math.round((c.present / schoolDays) * 1000) / 10 : null;
    const notLogged = Math.max(0, schoolDays - (loggedDays.get(s.id) ?? 0));
    return {
      studentId: s.id,
      lrn: s.lrn,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      photoUrl: s.user.profilePhotoUrl ?? null,
      gradeLabel: GRADE_LABELS[s.gradeLevel],
      sectionName: s.section?.sectionName ?? null,
      present: c.present,
      late: c.late,
      absent: c.absent,
      excused: c.excused,
      notLogged,
      total,
      rate,
    };
  });
}

export interface NeedsAttentionStudent {
  studentId: string;
  lrn: string;
  fullName: string;
  sectionId: string;
  sectionName: string;
  gradeLabel: string;
  adviserId: string | null;
  adviserName: string | null;
  present: number;
  late: number;
  absent: number;
  excused: number;
  notLogged: number;
  total: number;
  rate: number;
  tone: 'danger' | 'warn';
}

export interface NeedsAttentionReport {
  schoolYear: string | null;
  totalFlagged: number;
  dangerCount: number;
  warnCount: number;
  rows: NeedsAttentionStudent[];
}

export async function getLowAttendanceReport(gradeLevel?: string, sectionId?: string): Promise<NeedsAttentionReport> {
  const empty: NeedsAttentionReport = {
    schoolYear: null,
    totalFlagged: 0,
    dangerCount: 0,
    warnCount: 0,
    rows: [],
  };

  const activeYear = await prisma.schoolYear.findFirst({
    where: { status: 'active' },
    select: { id: true, yearLabel: true, startDate: true, endDate: true },
  });
  if (!activeYear) return empty;

  const start = new Date(activeYear.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(activeYear.endDate);
  end.setHours(0, 0, 0, 0);
  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const seriesEnd = today < endExclusive ? today : endExclusive;

  let schoolDays = 0;
  const cursor = new Date(start);
  while (cursor < seriesEnd) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) schoolDays += 1;
    cursor.setDate(cursor.getDate() + 1);
  }

  const enrollmentScope: Prisma.StudentProfileWhereInput = sectionId
    ? { section: { status: 'active', schoolYearId: activeYear.id, id: sectionId } }
    : gradeLevel
    ? { section: { status: 'active', schoolYearId: activeYear.id, gradeLevel: gradeLevel as GradeLevel } }
    : { section: { status: 'active', schoolYearId: activeYear.id } };

  const sectionFilter: Prisma.AttendanceRecordWhereInput = sectionId
    ? { section: { status: 'active', schoolYearId: activeYear.id, id: sectionId } }
    : gradeLevel
    ? { section: { status: 'active', schoolYearId: activeYear.id, gradeLevel: gradeLevel as GradeLevel } }
    : { section: { status: 'active', schoolYearId: activeYear.id } };

  const [students, rows, daysRows] = await Promise.all([
    prisma.studentProfile.findMany({
      where: enrollmentScope,
      select: {
        id: true,
        lrn: true,
        gradeLevel: true,
        section: {
          select: {
            id: true,
            sectionName: true,
            adviser: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
    }),
    prisma.attendanceRecord.groupBy({
      by: ['studentId', 'status'],
      where: {
        term: { schoolYearId: activeYear.id },
        attendanceDate: { gte: start, lt: endExclusive },
        ...sectionFilter,
      },
      _count: { _all: true },
    }),
    prisma.attendanceRecord.groupBy({
      by: ['studentId', 'attendanceDate'],
      where: {
        term: { schoolYearId: activeYear.id },
        attendanceDate: { gte: start, lt: endExclusive },
        ...sectionFilter,
      },
      _count: { _all: true },
    }),
  ]);

  const counts = new Map<string, { present: number; late: number; absent: number; excused: number }>();
  for (const r of rows) {
    const bucket = counts.get(r.studentId) ?? { present: 0, late: 0, absent: 0, excused: 0 };
    if (r.status === AttendanceStatus.present) bucket.present += r._count._all;
    else if (r.status === AttendanceStatus.late) bucket.late += r._count._all;
    else if (r.status === AttendanceStatus.absent) bucket.absent += r._count._all;
    else if (r.status === AttendanceStatus.excused) bucket.excused += r._count._all;
    counts.set(r.studentId, bucket);
  }

  const loggedDays = new Map<string, number>();
  for (const r of daysRows) {
    loggedDays.set(r.studentId, (loggedDays.get(r.studentId) ?? 0) + 1);
  }

  const flagged: NeedsAttentionStudent[] = [];
  for (const s of students) {
    const c = counts.get(s.id);
    if (!c) continue;
    const total = c.present + c.late + c.absent + c.excused;
    if (total === 0) continue;
    const rate = schoolDays > 0 ? Math.round((c.present / schoolDays) * 100) : 0;
    if (rate >= 80) continue;
    flagged.push({
      studentId: s.id,
      lrn: s.lrn,
      fullName: `${s.user.firstName} ${s.user.lastName}`,
      sectionId: s.section?.id ?? '',
      sectionName: s.section?.sectionName ?? '',
      gradeLabel: GRADE_LABELS[s.gradeLevel] ?? s.gradeLevel,
      adviserId: s.section?.adviser?.id ?? null,
      adviserName: s.section?.adviser ? `${s.section.adviser.firstName} ${s.section.adviser.lastName}` : null,
      present: c.present,
      late: c.late,
      absent: c.absent,
      excused: c.excused,
      notLogged: Math.max(0, schoolDays - (loggedDays.get(s.id) ?? 0)),
      total,
      rate,
      tone: rate < 70 ? 'danger' : 'warn',
    });
  }

  flagged.sort((a, b) => a.rate - b.rate);

  return {
    schoolYear: activeYear.yearLabel,
    totalFlagged: flagged.length,
    dangerCount: flagged.filter((r) => r.tone === 'danger').length,
    warnCount: flagged.filter((r) => r.tone === 'warn').length,
    rows: flagged,
  };
}

export interface StudentAttendanceTrendPoint {
  month: string;
  label: string;
  full: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  logged: number;
  notLogged: number;
  rate: number | null;
}

export async function getStudentAttendanceTrend(studentId: string) {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { status: 'active' },
    select: { id: true, startDate: true, endDate: true },
  });
  if (!activeYear) return [];

  const start = new Date(activeYear.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(activeYear.endDate);
  end.setHours(0, 0, 0, 0);
  const endExclusive = new Date(end);
  endExclusive.setDate(endExclusive.getDate() + 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const seriesEnd = today < endExclusive ? today : endExclusive;

  const records = await prisma.attendanceRecord.findMany({
    where: {
      studentId,
      term: { schoolYearId: activeYear.id },
      attendanceDate: { gte: start, lt: endExclusive },
    },
    select: { attendanceDate: true, status: true },
  });

  const byMonth = new Map<string, {
    present: number;
    late: number;
    absent: number;
    excused: number;
    loggedDays: Set<string>;
  }>();

  const fromMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  while (fromMonth < seriesEnd) {
    byMonth.set(monthKey(fromMonth), { present: 0, late: 0, absent: 0, excused: 0, loggedDays: new Set() });
    fromMonth.setMonth(fromMonth.getMonth() + 1);
  }

  for (const r of records) {
    if (r.attendanceDate >= seriesEnd) continue;
    const bucket = byMonth.get(monthKey(r.attendanceDate));
    if (!bucket) continue;
    if (r.status === AttendanceStatus.present) bucket.present += 1;
    else if (r.status === AttendanceStatus.late) bucket.late += 1;
    else if (r.status === AttendanceStatus.absent) bucket.absent += 1;
    else if (r.status === AttendanceStatus.excused) bucket.excused += 1;
    bucket.loggedDays.add(dayKey(r.attendanceDate));
  }

  const points: StudentAttendanceTrendPoint[] = [];
  for (const [mk, bucket] of byMonth) {
    const [yr, mo] = mk.split('-').map(Number);
    const a = new Date(yr, mo - 1, 1);
    const b = new Date(yr, mo, 1);
    const monthStart = a < start ? start : a;
    const monthEnd = b > seriesEnd ? seriesEnd : b;

    let scheduled = 0;
    const cur = new Date(monthStart);
    while (cur < monthEnd) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) scheduled += 1;
      cur.setDate(cur.getDate() + 1);
    }

    const short = MONTH_SHORT[mo - 1];
    const logged = bucket.present + bucket.late + bucket.absent + bucket.excused;
    const rate = scheduled > 0 ? round1((bucket.present / scheduled) * 100) : null;
    points.push({
      month: mk,
      label: short,
      full: `${short} ${yr}`,
      present: bucket.present,
      late: bucket.late,
      absent: bucket.absent,
      excused: bucket.excused,
      logged,
      notLogged: Math.max(0, scheduled - bucket.loggedDays.size),
      rate,
    });
  }
  return points;
}

async function loadAttendanceSummary(
  view: 'monthly' | 'daily' = 'monthly',
  gradeLevel?: string,
  sectionId?: string,
  date?: string
) {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { status: 'active' },
    select: { id: true, yearLabel: true, startDate: true, endDate: true },
  });

  const empty = {
    schoolYear: null,
    totalEnrolled: 0,
    today: { total: 0, present: 0, late: 0, absent: 0, excused: 0, notLogged: 0, presentRate: 0 },
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

  const overview = date
    ? (() => {
        const [y, m, d] = date.split('-').map(Number);
        const parsed = new Date(y, m - 1, d);
        parsed.setHours(0, 0, 0, 0);
        return parsed;
      })()
    : today;
  const overviewKey = dayKey(overview);

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const seriesEnd = tomorrow < endExclusive ? tomorrow : endExclusive;

  const runningSchoolDayKeys = new Set<string>();
  let runningSchoolDays = 0;
  {
    const cur = new Date(start);
    while (cur <= today && cur < endExclusive) {
      const dow = cur.getDay();
      if (dow !== 0 && dow !== 6) {
        runningSchoolDayKeys.add(dayKey(cur));
        runningSchoolDays += 1;
      }
      cur.setDate(cur.getDate() + 1);
    }
  }

  const sectionFilter: Prisma.AttendanceRecordWhereInput = sectionId
    ? { section: { status: 'active', schoolYearId: activeYear.id, id: sectionId } }
    : gradeLevel
    ? { section: { status: 'active', schoolYearId: activeYear.id, gradeLevel: gradeLevel as GradeLevel } }
    : { section: { status: 'active', schoolYearId: activeYear.id } };

  const enrollmentScope: Prisma.StudentProfileWhereInput = sectionId
    ? { section: { status: 'active', schoolYearId: activeYear.id, id: sectionId } }
    : gradeLevel
    ? { section: { status: 'active', schoolYearId: activeYear.id, gradeLevel: gradeLevel as GradeLevel } }
    : { section: { status: 'active', schoolYearId: activeYear.id } };

  const [{ records, scopedEnrolled }] = await Promise.all([
    (async () => {
      const [records, scopedEnrolled] = await Promise.all([
        prisma.attendanceRecord.findMany({
          where: {
            term: { schoolYearId: activeYear.id },
            attendanceDate: { gte: start, lt: endExclusive },
            ...sectionFilter,
          },
          select: {
            status: true,
            attendanceDate: true,
            studentId: true,
            sectionId: true,
            student: { select: { firstName: true, lastName: true, profilePhotoUrl: true } },
            section: {
              select: { sectionName: true, gradeLevel: true, adviser: { select: { firstName: true, lastName: true } } },
            },
          },
        }),
        prisma.studentProfile.count({ where: enrollmentScope }),
      ]);
      return { records, scopedEnrolled };
    })(),
  ]);

  const todayKey = overviewKey;
  const todayCounts = { present: 0, absent: 0, late: 0, excused: 0 };
  const byDay = new Map<string, { present: number; absent: number; late: number; excused: number }>();
  const byDayStudents = new Map<string, Set<string>>();
  const bySection = new Map<
    string,
    {
      sectionName: string;
      gradeLevel: string;
      adviserName: string | null;
      counts: { present: number; absent: number; late: number; excused: number };
      students: Set<string>;
      dayKeys: Set<string>;
    }
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
    const dKey = dayKey(r.attendanceDate);
    let db = byDay.get(dKey);
    if (!db) {
      db = { present: 0, absent: 0, late: 0, excused: 0 };
      byDay.set(dKey, db);
    }
    addStatus(db, r.status);

    let dStudents = byDayStudents.get(dKey);
    if (!dStudents) {
      dStudents = new Set();
      byDayStudents.set(dKey, dStudents);
    }
    dStudents.add(r.studentId);

    if (dKey === todayKey) addStatus(todayCounts, r.status);

    let sec = bySection.get(r.sectionId);
    if (!sec) {
      sec = {
        sectionName: r.section.sectionName,
        gradeLevel: r.section.gradeLevel,
        adviserName: r.section.adviser ? `${r.section.adviser.firstName} ${r.section.adviser.lastName}` : null,
        counts: { present: 0, absent: 0, late: 0, excused: 0 },
        students: new Set(),
        dayKeys: new Set(),
      };
      bySection.set(r.sectionId, sec);
    }
    addStatus(sec.counts, r.status);
    sec.dayKeys.add(dKey);
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

  const dailyTrend = buildDailySeries(byDay, start, seriesEnd, scopedEnrolled).map((s) => {
    const loggedStudents = byDayStudents.get(s.key)?.size ?? 0;
    return { ...s, notLogged: Math.max(0, scopedEnrolled - loggedStudents) };
  });

  const trend = view === 'daily' ? dailyTrend : buildMonthlySeriesFromDaily(dailyTrend, scopedEnrolled, start, endExclusive);
  const monthlyTrend = trend.map((s) => ({
    key: s.key,
    label: s.shortLabel,
    full: s.label,
    total: s.total,
    rate: s.rate,
    present: s.present,
    absent: s.absent,
    late: s.late,
    excused: s.excused,
    notLogged: s.notLogged,
  }));

  const heatmap = buildSchoolYearHeatmap(byDay, start, endExclusive, today, scopedEnrolled);

  const perfectAttendance = buildPerfectAttendance(records, byStudent, runningSchoolDays, runningSchoolDayKeys);
  const lowAttendance = buildLowAttendance(records, byStudent, runningSchoolDays);
  const topSections = buildTopSections(bySection);

  const totals = todayCounts;
  const todayTotal = totals.present + totals.absent + totals.late + totals.excused;
  const todayRate = scopedEnrolled > 0 ? round1((totals.present / scopedEnrolled) * 100) : 0;
  const todayLogged = byDayStudents.get(todayKey)?.size ?? 0;
  const todayNotLogged = Math.max(0, scopedEnrolled - todayLogged);

  return {
    schoolYear: activeYear.yearLabel,
    totalEnrolled: scopedEnrolled,
    today: {
      total: todayTotal,
      present: totals.present,
      late: totals.late,
      absent: totals.absent,
      excused: totals.excused,
      notLogged: todayNotLogged,
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
  today: Date,
  enrolled: number
) {
  const cells: Array<{ key: string; label: string; present: number; total: number; rate: number; level: number }> = [];
  const cur = new Date(start);
  while (cur < endExclusive && cur <= today) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) {
      const key = dayKey(cur);
      const c = byDay.get(key);
      const total = c ? c.present + c.absent + c.late + c.excused : 0;
      const present = c?.present ?? 0;
      const rate = enrolled > 0 ? Math.round((present / enrolled) * 1000) / 10 : 0;
      let level = 0;
      if (total > 0) {
        if (rate >= 95) level = 6;
        else if (rate >= 90) level = 5;
        else if (rate >= 85) level = 4;
        else if (rate >= 75) level = 3;
        else if (rate >= 60) level = 2;
        else level = 1;
      }
      cells.push({ key, label: shortDate(cur), present, total, rate, level });
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
  >,
  runningSchoolDays: number,
  runningSchoolDayKeys: Set<string>
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
    totalSchoolDays: number;
    rate: number;
  }> = [];
  for (const [studentId, days] of studentDays) {
    let presentDays = 0;
    for (const [dayKeyStr, c] of days) {
      if (
        runningSchoolDayKeys.has(dayKeyStr) &&
        c.present > 0 &&
        c.absent === 0 &&
        c.late === 0 &&
        c.excused === 0
      ) {
        presentDays += 1;
      }
    }
    if (runningSchoolDays === 0) continue;
    const ratePercent = Math.round((presentDays / runningSchoolDays) * 100);
    const info = byStudent.get(studentId);
    if (!info) continue;
    rows.push({
      studentId,
      fullName: `${info.firstName} ${info.lastName}`,
      sectionName: info.sectionName,
      gradeLabel: GRADE_LABELS[info.gradeLevel] ?? info.gradeLevel,
      daysPresent: presentDays,
      totalSchoolDays: runningSchoolDays,
      rate: ratePercent,
    });
  }
  return rows
    .filter((r) => r.rate === 100)
    .sort((a, b) => b.daysPresent - a.daysPresent || a.fullName.localeCompare(b.fullName))
    .slice(0, 18);
}

function buildLowAttendance(
  records: Array<{ studentId: string; status: AttendanceStatus; attendanceDate: Date }>,
  byStudent: Map<
    string,
    { firstName: string; lastName: string; photo: string | null; sectionName: string; gradeLevel: string }
  >,
  runningSchoolDays: number
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
    {
      sectionName: string;
      gradeLevel: string;
      adviserName: string | null;
      counts: { present: number; absent: number; late: number; excused: number };
      students: Set<string>;
      dayKeys: Set<string>;
    }
  >
) {
  const rows = Array.from(bySection.entries()).map(([sectionId, s]) => {
    const total = s.counts.present + s.counts.absent + s.counts.late + s.counts.excused;
    const rate = total > 0 ? Math.round((s.counts.present / total) * 1000) / 10 : 0;
    const schoolDayKeys = Array.from(s.dayKeys).filter((k) => !isWeekendDayKey(k));
    const avgPresent = schoolDayKeys.length > 0 ? round1(s.counts.present / schoolDayKeys.length) : 0;
    return {
      sectionId,
      sectionName: s.sectionName,
      gradeLabel: GRADE_LABELS[s.gradeLevel] ?? s.gradeLevel,
      adviserName: s.adviserName,
      rate,
      studentCount: s.students.size,
      avgPresent,
    };
  });
  return rows
    .filter((r) => r.studentCount > 0)
    .sort((a, b) => b.avgPresent - a.avgPresent)
    .slice(0, 10);
}