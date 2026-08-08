import { AccountStatus, AttendanceStatus, GradeLevel, Prisma, Session, RiskLevel } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { classifyLiveRisk } from './risk.service';

export interface ListStudentsQuery {
  page: number;
  pageSize: number;
  search?: string;
  grade?: GradeLevel;
  sectionId?: string;
  schoolYearId?: string;
  status?: AccountStatus;
}

const GRADE_LABELS: Record<GradeLevel, string> = {
  grade_7: 'Grade 7',
  grade_8: 'Grade 8',
  grade_9: 'Grade 9',
  grade_10: 'Grade 10',
  grade_11: 'Grade 11',
  grade_12: 'Grade 12',
};

function attendanceRate(present: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((present / total) * 1000) / 10;
}

function buildWhere(query: ListStudentsQuery): Prisma.StudentProfileWhereInput {
  const where: Prisma.StudentProfileWhereInput = {
    ...(query.grade ? { gradeLevel: query.grade } : {}),
    ...(query.sectionId ? { sectionId: query.sectionId } : {}),
    ...(query.schoolYearId ? { section: { schoolYearId: query.schoolYearId } } : {}),
    ...(query.status ? { user: { accountStatus: query.status } } : {}),
  };
  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    where.OR = [
      { lrn: { contains: term, mode: 'insensitive' } },
      {
        user: {
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
            { email: { contains: term, mode: 'insensitive' } },
          ],
        },
      },
    ];
  }
  return where;
}

async function loadAtRiskStats(where: Prisma.StudentProfileWhereInput) {
  // Mirror the dashboard's live risk scope: only students in active sections
  // with active accounts (dashboard.service getAtRiskStudents).
  const activeWhere: Prisma.StudentProfileWhereInput = {
    AND: [
      where,
      { section: { status: 'active' } },
      { user: { accountStatus: 'active' } },
    ],
  };
  const profiles = await prisma.studentProfile.findMany({
    where: activeWhere,
    select: { id: true },
  });
  if (profiles.length === 0) return { total: 0, high: 0, moderate: 0 };
  const ids = profiles.map((p) => p.id);

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
  for (const p of profiles) {
    const grades = finalGradeRows
      .filter((g) => g.studentId === p.id)
      .map((g) => g.transmutedGrade.toNumber());
    academicAvgMap.set(p.id, grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null);
  }

  const anecdoteCountMap = new Map<string, number>();
  for (const a of anecdoteRows) {
    anecdoteCountMap.set(a.studentId, (anecdoteCountMap.get(a.studentId) ?? 0) + 1);
  }

  let high = 0;
  let moderate = 0;
  for (const p of profiles) {
    const counts = attendanceMap.get(p.id);
    const present = counts?.get(AttendanceStatus.present) ?? 0;
    const total = counts ? Array.from(counts.values()).reduce((sum, n) => sum + n, 0) : 0;
    const attendance = total > 0 ? Math.round((present / total) * 1000) / 10 : null;
    const level = classifyLiveRisk(
      academicAvgMap.get(p.id) ?? null,
      attendance,
      anecdoteCountMap.get(p.id) ?? 0
    );
    if (level === RiskLevel.high) high += 1;
    else if (level === RiskLevel.moderate) moderate += 1;
  }
  return { total: high + moderate, high, moderate };
}

export async function listStudents(query: ListStudentsQuery) {
  const where = buildWhere(query);

  const [total, profiles] = await Promise.all([
    prisma.studentProfile.count({ where }),
    prisma.studentProfile.findMany({
      where,
      orderBy: [{ gradeLevel: 'asc' }, { lrn: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        lrn: true,
        sex: true,
        gradeLevel: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            contactNumber: true,
            profilePhotoUrl: true,
            accountStatus: true,
            createdAt: true,
          },
        },
        section: {
          select: {
            id: true,
            sectionName: true,
            gradeLevel: true,
            adviser: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
  ]);

  const ids = profiles.map((p) => p.id);
  const hasIds = ids.length > 0;

  const [attendanceRows, finalGradeRows, anecdoteRows, reportRows, lastUpdatedRows] = await Promise.all([
    hasIds
      ? prisma.attendanceRecord.groupBy({
          by: ['studentId', 'status'],
          where: { studentId: { in: ids } },
          _count: { _all: true },
        })
      : [],
    hasIds
      ? prisma.finalGrade.findMany({
          where: { studentId: { in: ids } },
          select: { studentId: true, transmutedGrade: true },
        })
      : [],
    hasIds
      ? prisma.anecdotalRecord.findMany({
          where: { studentId: { in: ids } },
          select: { studentId: true },
        })
      : [],
    hasIds
      ? prisma.reportCard.findMany({
          where: { studentId: { in: ids } },
          select: { studentId: true, status: true },
          orderBy: { createdAt: 'asc' },
        })
      : [],
    hasIds
      ? prisma.attendanceRecord.groupBy({
          by: ['studentId'],
          where: { studentId: { in: ids } },
          _max: { updatedAt: true },
        })
      : [],
  ]);

  const attendanceMap = new Map<string, { present: number; total: number }>();
  for (const a of attendanceRows) {
    const bucket = attendanceMap.get(a.studentId) ?? { present: 0, total: 0 };
    bucket.total += a._count._all;
    if (a.status === AttendanceStatus.present) bucket.present += a._count._all;
    attendanceMap.set(a.studentId, bucket);
  }

  const academicAvgMap = new Map<string, number | null>();
  for (const s of profiles) {
    const grades = finalGradeRows
      .filter((g) => g.studentId === s.id)
      .map((g) => g.transmutedGrade.toNumber());
    academicAvgMap.set(s.id, grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : null);
  }

  const anecdoteCountMap = new Map<string, number>();
  for (const a of anecdoteRows) {
    anecdoteCountMap.set(a.studentId, (anecdoteCountMap.get(a.studentId) ?? 0) + 1);
  }

  const reportMap = new Map<string, string>();
  for (const r of reportRows) {
    reportMap.set(r.studentId, r.status);
  }

  const lastUpdatedMap = new Map<string, Date>();
  for (const r of lastUpdatedRows) {
    if (r._max.updatedAt) lastUpdatedMap.set(r.studentId, r._max.updatedAt);
  }

  const data = profiles.map((p) => {
    const counts = attendanceMap.get(p.id);
    const attendance = counts ? attendanceRate(counts.present, counts.total) : null;
    const lastUpdated = lastUpdatedMap.get(p.id) ?? p.user.createdAt;
    return {
      studentId: p.id,
      lrn: p.lrn,
      firstName: p.user.firstName,
      lastName: p.user.lastName,
      email: p.user.email,
      phone: p.user.contactNumber ?? null,
      photoUrl: p.user.profilePhotoUrl ?? null,
      sex: p.sex,
      gradeLevel: p.gradeLevel,
      gradeLabel: GRADE_LABELS[p.gradeLevel],
      sectionName: p.section?.sectionName ?? null,
      adviser: p.section?.adviser ? `${p.section.adviser.firstName} ${p.section.adviser.lastName}`.trim() : null,
      accountStatus: p.user.accountStatus,
      attendance,
      academicAvg: academicAvgMap.get(p.id) ?? null,
      anecdotalCount: anecdoteCountMap.get(p.id) ?? 0,
      riskLevel: classifyLiveRisk(academicAvgMap.get(p.id) ?? null, attendance, anecdoteCountMap.get(p.id) ?? 0),
      sf10: reportMap.get(p.id) ?? 'pending',
      lastUpdated: lastUpdated.toISOString(),
    };
  });

  const statsWhere = buildWhere(query);

  const [activeYear, stats, years, sections] = await Promise.all([
    prisma.schoolYear.findFirst({ where: { status: 'active' }, select: { id: true } }),
    Promise.all([
      prisma.studentProfile.count({ where: statsWhere }),
      prisma.admLearnerProfile.findMany({ where: { status: 'approved' }, select: { studentId: true } }),
      prisma.studentProfile.count({ where: { AND: [statsWhere, { section: { schoolYear: { status: 'completed' } } }] } }),
    ]),
    prisma.schoolYear.findMany({ select: { id: true, yearLabel: true }, orderBy: { yearLabel: 'desc' } }),
    prisma.section.findMany({
      select: { id: true, sectionName: true, gradeLevel: true, schoolYearId: true },
      orderBy: [{ gradeLevel: 'asc' }, { sectionName: 'asc' }],
    }),
  ]);

  const atRisk = await loadAtRiskStats(statsWhere);

  return {
    data,
    page: query.page,
    pageSize: query.pageSize,
    total,
    hasMore: query.page * query.pageSize < total,
    stats: {
      total: stats[0],
      adm: new Set(stats[1].map((p) => p.studentId)).size,
      graduated: stats[2],
      atRiskTotal: atRisk.total,
      atRiskHigh: atRisk.high,
      atRiskModerate: atRisk.moderate,
    },
    filters: {
      activeYearId: activeYear?.id ?? null,
      years: years.map((y) => ({ id: y.id, yearLabel: y.yearLabel })),
      sections: sections.map((s) => ({
        id: s.id,
        sectionName: s.sectionName,
        gradeLevel: s.gradeLevel,
        schoolYearId: s.schoolYearId,
      })),
    },
  };
}

interface AcademicTerm {
  termLabel: string;
  grades: Array<{ subjectName: string; grade: number }>;
  average: number | null;
}

export async function getStudentDetail(id: string) {
  const profile = await prisma.studentProfile.findUnique({
    where: { id },
    select: {
      id: true,
      lrn: true,
      sex: true,
      gradeLevel: true,
      address: true,
      birthdate: true,
      user: {
        select: {
          firstName: true,
          middleName: true,
          lastName: true,
          email: true,
          contactNumber: true,
          profilePhotoUrl: true,
          accountStatus: true,
        },
      },
      section: {
        select: {
          sectionName: true,
          schoolYear: { select: { yearLabel: true, status: true } },
          adviser: { select: { firstName: true, lastName: true, contactNumber: true } },
        },
      },
    },
  });

  if (!profile) throw ApiError.notFound('Student not found');
  const studentId = id;

  const [attendanceRows, parentLinks, latestRisk, anecdotalCount, reportCard, recentRecords, academicTerms] =
    await Promise.all([
      prisma.attendanceRecord.groupBy({ by: ['status'], where: { studentId }, _count: { _all: true } }),
      prisma.parentStudentLink.findMany({
        where: { studentId, status: 'confirmed' },
        select: { parent: { select: { firstName: true, lastName: true, contactNumber: true } } },
      }),
      prisma.studentRiskAssessment.findFirst({
        where: { studentId },
        orderBy: { computedAt: 'desc' },
        select: {
          riskLevel: true,
          academicRisk: true,
          attendanceRisk: true,
          behavioralRisk: true,
          computedAt: true,
          term: { select: { termLabel: true } },
        },
      }),
      prisma.anecdotalRecord.count({ where: { studentId } }),
      prisma.reportCard.findFirst({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        select: { status: true, createdAt: true, term: { select: { termLabel: true } } },
      }),
      prisma.attendanceRecord.findMany({
        where: { studentId },
        orderBy: { attendanceDate: 'desc' },
        take: 14,
        select: { attendanceDate: true, session: true, status: true },
      }),
      prisma.term.findMany({
        where: { schoolYear: { status: 'active' } },
        orderBy: { termNumber: 'asc' },
        select: { id: true, termLabel: true },
      }),
    ]);

  const present = attendanceRows.find((r) => r.status === AttendanceStatus.present)?._count._all ?? 0;
  const total = attendanceRows.reduce((sum, r) => sum + r._count._all, 0);
  const attendance = attendanceRate(present, total);

  const daySlots = new Map<string, { morning: string | null; afternoon: string | null }>();
  for (const r of recentRecords) {
    const key = r.attendanceDate.toISOString().slice(0, 10);
    const bucket = daySlots.get(key) ?? { morning: null, afternoon: null };
    if (r.session === Session.morning) bucket.morning = r.status;
    else bucket.afternoon = r.status;
    daySlots.set(key, bucket);
  }
  const recentAttendance = Array.from(daySlots.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 7)
    .map(([date, slots]) => ({ date, morning: slots.morning, afternoon: slots.afternoon }));

  const academicRecord: AcademicTerm[] = [];
  for (const term of academicTerms) {
    const grades = await prisma.finalGrade.findMany({
      where: { studentId, termId: term.id },
      select: { subject: { select: { subjectName: true } }, transmutedGrade: true },
    });
    const subjects = grades.map((g) => ({ subjectName: g.subject.subjectName, grade: Number(g.transmutedGrade) }));
    const average = subjects.length ? Math.round((subjects.reduce((sum, s) => sum + s.grade, 0) / subjects.length) * 10) / 10 : null;
    academicRecord.push({ termLabel: term.termLabel, grades: subjects, average });
  }

  return {
    data: {
      studentId: profile.id,
      lrn: profile.lrn,
      email: profile.user.email,
      firstName: profile.user.firstName,
      middleName: profile.user.middleName,
      lastName: profile.user.lastName,
      fullName: [profile.user.firstName, profile.user.middleName, profile.user.lastName].filter(Boolean).join(' '),
      phone: profile.user.contactNumber ?? null,
      photoUrl: profile.user.profilePhotoUrl ?? null,
      sex: profile.sex,
      birthdate: profile.birthdate ? profile.birthdate.toISOString() : null,
      address: profile.address ?? null,
      accountStatus: profile.user.accountStatus,
      sectionName: profile.section?.sectionName ?? null,
      gradeLevel: profile.gradeLevel,
      gradeLabel: GRADE_LABELS[profile.gradeLevel],
      schoolYear: profile.section?.schoolYear?.yearLabel ?? null,
      adviserName: profile.section?.adviser
        ? `${profile.section.adviser.firstName} ${profile.section.adviser.lastName}`.trim()
        : null,
      adviserPhone: profile.section?.adviser?.contactNumber ?? null,
      parents: parentLinks.map((l) => ({
        name: `${l.parent.firstName} ${l.parent.lastName}`.trim(),
        phone: l.parent.contactNumber ?? null,
      })),
      attendance,
      anecdotalCount,
      generalAverage: academicRecord[0]?.average ?? null,
      academicRecord,
      risk: latestRisk
        ? {
            riskLevel: latestRisk.riskLevel,
            academicRisk: latestRisk.academicRisk,
            attendanceRisk: latestRisk.attendanceRisk,
            behavioralRisk: latestRisk.behavioralRisk,
            termLabel: latestRisk.term?.termLabel ?? null,
            computedAt: latestRisk.computedAt ? latestRisk.computedAt.toISOString() : null,
          }
        : null,
      reportCard: reportCard
        ? { status: reportCard.status, termLabel: reportCard.term?.termLabel ?? null }
        : null,
      recentAttendance,
      recentActivity: [],
    },
  };
}