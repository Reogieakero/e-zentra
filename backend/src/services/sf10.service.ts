import { GradeLevel, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { cacheKey, getCached } from './cache.service';
import { DASHBOARD_CACHE_TTL, GRADE_LABELS } from '../lib/school';
import {
  Sf10ListQuery,
  Sf10Record,
  Sf10Sort,
  Sf10StatusCode,
  Sf10SummaryData,
} from '../types/sf10';

const SF10_GRADE_LEVELS: GradeLevel[] = [
  GradeLevel.grade_7,
  GradeLevel.grade_8,
  GradeLevel.grade_9,
  GradeLevel.grade_10,
  GradeLevel.grade_11,
  GradeLevel.grade_12,
];

function sf10Status(rcStatus: string | undefined, hasFile: boolean): Sf10StatusCode {
  if (!rcStatus) return 'missing';
  if (hasFile && (rcStatus === 'ready' || rcStatus === 'released')) return 'complete';
  return 'pending';
}

function userName(p: { firstName: string; lastName: string }): string {
  return `${p.lastName}, ${p.firstName}`;
}

async function loadSf10SummaryData(query: Sf10ListQuery): Promise<Sf10SummaryData> {
  const activeYear = await prisma.schoolYear.findFirst({ where: { status: 'active' } });

  const yearFilter: Prisma.SchoolYearWhereInput = query.year
    ? { yearLabel: query.year }
    : activeYear
      ? { yearLabel: activeYear.yearLabel }
      : {};

  const profiles = await prisma.studentProfile.findMany({
    where: {
      ...(query.grade ? { gradeLevel: query.grade } : {}),
      OR: query.search
        ? [
            { lrn: { contains: query.search, mode: 'insensitive' } },
            { user: { firstName: { contains: query.search, mode: 'insensitive' } } },
            { user: { lastName: { contains: query.search, mode: 'insensitive' } } },
          ]
        : undefined,
      section: { schoolYear: yearFilter },
    },
    select: {
      id: true,
      lrn: true,
      gradeLevel: true,
      user: { select: { firstName: true, middleName: true, lastName: true } },
      section: { select: { sectionName: true, schoolYearId: true } },
    },
  });

  const ids = profiles.map((p) => p.id);
  const reportCards = ids.length
    ? await prisma.reportCard.findMany({
        where: { studentId: { in: ids } },
        select: {
          studentId: true,
          status: true,
          fileUrl: true,
          createdAt: true,
          managedBy: true,
          managed: { select: { firstName: true, lastName: true } },
        },
      })
    : [];

  const foldersMap = new Map<GradeLevel, number>();
  for (const g of SF10_GRADE_LEVELS) foldersMap.set(g, 0);

  let complete = 0;
  let pending = 0;
  let missing = 0;

  const records: Sf10Record[] = profiles.map((p) => {
    const cards = reportCards
      .filter((c) => c.studentId === p.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const first = cards[0];
    const status = sf10Status(first?.status, Boolean(first?.fileUrl));
    if (status === 'complete') complete += 1;
    else if (status === 'pending') pending += 1;
    else missing += 1;

    const current = foldersMap.get(p.gradeLevel) ?? 0;
    foldersMap.set(p.gradeLevel, current + 1);
    return {
      studentId: p.id,
      lrn: p.lrn,
      fullName: [p.user.lastName, p.user.firstName, p.user.middleName].filter(Boolean).join(', '),
      gradeLevel: p.gradeLevel,
      gradeLabel: GRADE_LABELS[p.gradeLevel],
      sectionName: p.section?.sectionName ?? null,
      schoolYear: activeYear?.yearLabel ?? '',
      status,
      fileName: first?.fileUrl ? first.fileUrl.split('/').pop() ?? `SF10_${p.user.lastName}.pdf` : `SF10_${p.user.lastName}.pdf`,
      fileUrl: first?.fileUrl ?? null,
      fileSizeBytes: null,
      handledBy: first?.managed ? userName(first.managed) : null,
      lastUpdated: (first?.createdAt ?? new Date(0)).toISOString(),
    };
  });

  const filtered = records.filter((r) => {
    if (query.status && r.status !== query.status) return false;
    return true;
  });

  const orderMap: Record<Sf10Sort, (a: Sf10Record, b: Sf10Record) => number> = {
    name_az: (a, b) => a.fullName.localeCompare(b.fullName),
    status: (a, b) => a.status.localeCompare(b.status) || a.fullName.localeCompare(b.fullName),
    last_updated: (a, b) => b.lastUpdated.localeCompare(a.lastUpdated),
  };
  filtered.sort(orderMap[query.sort ?? 'last_updated']);

  const total = filtered.length;
  const page = query.page;
  const pageSize = query.pageSize;
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return {
    schoolYear: activeYear?.yearLabel ?? null,
    folders: SF10_GRADE_LEVELS.map((g) => ({
      gradeLevel: g,
      label: GRADE_LABELS[g],
      count: foldersMap.get(g) ?? 0,
    })),
    counts: {
      total: profiles.length,
      complete,
      pending,
      missing,
      completePercent: profiles.length ? Math.round((complete / profiles.length) * 1000) / 10 : 0,
    },
    records: paged,
    total,
    page,
    pageSize,
  };
}

export async function getSf10Summary(query: Sf10ListQuery) {
  const key = cacheKey(
    'dashboard',
    `sf10-summary:${query.page}:${query.pageSize}:${query.search ?? ''}:${query.grade ?? ''}:${query.status ?? ''}:${query.year ?? ''}:${query.sort ?? 'last_updated'}`
  );
  return getCached<{ data: Sf10SummaryData }>(key, DASHBOARD_CACHE_TTL, async () => ({
    data: await loadSf10SummaryData(query),
  }));
}