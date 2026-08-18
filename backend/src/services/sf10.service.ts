import { GradeLevel, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { cacheKey, getCached } from './cache.service';
import { DASHBOARD_CACHE_TTL, GRADE_LABELS } from '../lib/school';
import {
  Sf10AuditEntry,
  Sf10AuditQuery,
  Sf10AuditTrailData,
  Sf10ListQuery,
  Sf10Record,
  Sf10Section,
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
  if (rcStatus === 'released' && hasFile) return 'released';
  if (rcStatus === 'ready' && hasFile) return 'ready';
  return 'missing';
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

  const isSectionUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
    query.section ?? ''
  );

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
      section: query.section
        ? {
            schoolYear: yearFilter,
            ...(isSectionUuid ? { id: query.section } : { sectionName: query.section }),
          }
        : { schoolYear: yearFilter },
    },
    select: {
      id: true,
      lrn: true,
      gradeLevel: true,
      user: { select: { firstName: true, middleName: true, lastName: true } },
      section: { select: { id: true, sectionName: true, schoolYearId: true } },
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

  const sections = await prisma.section.findMany({
    where: { status: 'active', schoolYear: yearFilter },
    select: {
      id: true,
      sectionName: true,
      gradeLevel: true,
      adviser: { select: { firstName: true, lastName: true } },
      _count: { select: { students: true } },
    },
  });

  const foldersMap = new Map<GradeLevel, number>();
  for (const g of SF10_GRADE_LEVELS) foldersMap.set(g, 0);

  let released = 0;
  let missing = 0;

  const records: Sf10Record[] = profiles.map((p) => {
    const cards = reportCards
      .filter((c) => c.studentId === p.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const first = cards[0];
    const status = sf10Status(first?.status, Boolean(first?.fileUrl));
    if (status === 'released') released += 1;
    else if (status !== 'ready') missing += 1;

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

  const recentAttached = records
    .filter((r) => r.status === 'released')
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    .slice(0, 5);

  const readyList = records
    .filter((r) => r.status === 'ready')
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    .slice(0, 5);

  const missingList = records
    .filter((r) => r.status === 'missing')
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .slice(0, 5);

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
    sections: sections.map((s): Sf10Section => ({
      sectionId: s.id,
      sectionName: s.sectionName,
      gradeLevel: s.gradeLevel,
      count: s._count.students,
      adviserName: s.adviser ? `${s.adviser.firstName} ${s.adviser.lastName}` : null,
    })),
    counts: {
      total: profiles.length,
      released,
      missing,
      releasedPercent: profiles.length ? Math.round((released / profiles.length) * 1000) / 10 : 0,
    },
    records: paged,
    recentAttached,
    readyList,
    missingList,
    total,
    page,
    pageSize,
  };
}

export async function getSf10Summary(query: Sf10ListQuery) {
  const key = cacheKey(
    'dashboard',
    `sf10-summary:${query.page}:${query.pageSize}:${query.search ?? ''}:${query.grade ?? ''}:${query.section ?? ''}:${query.status ?? ''}:${query.year ?? ''}:${query.sort ?? 'last_updated'}`
  );
  return getCached<{ data: Sf10SummaryData }>(key, DASHBOARD_CACHE_TTL, async () => ({
    data: await loadSf10SummaryData(query),
  }));
}

const SF10_AUDIT_TABLES = ['report_cards', 'ocr_jobs', 'report_card_extractions', 'uploads'] as const;

export async function getSf10AuditTrail(query: Sf10AuditQuery): Promise<{ data: Sf10AuditTrailData }> {
  const { page, pageSize } = query;
  const search = query.search?.trim().toLowerCase();

  const tableOr: Prisma.AuditLogWhereInput[] = [
    { tableName: { in: ['report_cards', 'ocr_jobs', 'report_card_extractions'] } },
    { tableName: 'uploads', newValue: { path: ['kind'], equals: 'report-card' } },
  ];

  let searchAnd: Prisma.AuditLogWhereInput | undefined;
  if (search) {
    const nameOr = [
      { firstName: { contains: search, mode: 'insensitive' as const } },
      { lastName: { contains: search, mode: 'insensitive' as const } },
      { middleName: { contains: search, mode: 'insensitive' as const } },
    ];

    const [actors, students] = await Promise.all([
      prisma.user.findMany({ where: { OR: nameOr }, select: { id: true } }),
      prisma.studentProfile.findMany({
        where: {
          OR: [{ lrn: { contains: search, mode: 'insensitive' as const } }, { user: { OR: nameOr } }],
        },
        select: { id: true },
      }),
    ]);

    const studentIds = students.map((s) => s.id);
    const cardIds = studentIds.length
      ? (await prisma.reportCard.findMany({ where: { studentId: { in: studentIds } }, select: { id: true } })).map((c) => c.id)
      : [];
    const jobIds = cardIds.length
      ? (await prisma.ocrJob.findMany({ where: { reportCardId: { in: cardIds } }, select: { id: true } })).map((j) => j.id)
      : [];
    const extractionIds = cardIds.length
      ? (await prisma.reportCardExtraction.findMany({ where: { reportCardId: { in: cardIds } }, select: { id: true } })).map((e) => e.id)
      : [];

    searchAnd = {
      OR: [
        { actorId: { in: actors.map((a) => a.id) } },
        { tableName: 'report_cards', recordId: { in: cardIds } },
        { tableName: 'ocr_jobs', recordId: { in: jobIds } },
        { tableName: 'report_card_extractions', recordId: { in: extractionIds } },
      ],
    };
  }

  const where: Prisma.AuditLogWhereInput = {
    AND: [{ OR: tableOr }, ...(searchAnd ? [searchAnd] : [])],
  };

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        actor: { select: { id: true, firstName: true, middleName: true, lastName: true, role: true } },
      },
    }),
  ]);

  const entries = await resolveAuditEntries(rows);
  return {
    data: {
      entries,
      total,
      page,
      pageSize,
    },
  };
}

async function resolveAuditEntries(rows: Array<{ id: string; action: string; tableName: string; recordId: string; newValue: Prisma.JsonValue; createdAt: Date; actor: { id: string; firstName: string; middleName: string | null; lastName: string; role: string } }>): Promise<Sf10AuditEntry[]> {
  const reportCardIds = new Set<string>();
  const ocrJobIds = new Set<string>();
  const extractionIds = new Set<string>();
  const uploadUrls = new Set<string>();

  for (const row of rows) {
    if (row.tableName === 'report_cards') {
      reportCardIds.add(row.recordId);
    } else if (row.tableName === 'ocr_jobs') {
      ocrJobIds.add(row.recordId);
    } else if (row.tableName === 'report_card_extractions') {
      extractionIds.add(row.recordId);
    } else if (row.tableName === 'uploads') {
      const url = (row.newValue as { url?: string } | null)?.url;
      if (url) uploadUrls.add(url);
    }
  }

  const [jobs, extractions, cardsByUrl] = await Promise.all([
    ocrJobIds.size ? prisma.ocrJob.findMany({ where: { id: { in: [...ocrJobIds] } }, select: { id: true, reportCardId: true } }) : [],
    extractionIds.size ? prisma.reportCardExtraction.findMany({ where: { id: { in: [...extractionIds] } }, select: { id: true, reportCardId: true } }) : [],
    uploadUrls.size ? prisma.reportCard.findMany({ where: { fileUrl: { in: [...uploadUrls] } }, select: { id: true, fileUrl: true } }) : [],
  ]);

  const jobToCard = new Map(jobs.map((j) => [j.id, j.reportCardId]));
  const extractionToCard = new Map(extractions.map((e) => [e.id, e.reportCardId]));
  const urlToCard = new Map(cardsByUrl.map((c) => [c.fileUrl, c.id]));

  for (const job of jobs) reportCardIds.add(job.reportCardId);
  for (const ex of extractions) reportCardIds.add(ex.reportCardId);
  for (const card of cardsByUrl) reportCardIds.add(card.id);

  const cards = reportCardIds.size
    ? await prisma.reportCard.findMany({
        where: { id: { in: [...reportCardIds] } },
        select: {
          id: true,
          student: { select: { id: true, firstName: true, middleName: true, lastName: true, studentProfile: { select: { lrn: true, gradeLevel: true, section: { select: { sectionName: true } } } } } },
          term: { select: { termLabel: true } },
        },
      })
    : [];
  const cardsById = new Map(cards.map((c) => [c.id, c]));

  return rows.map((row): Sf10AuditEntry => {
    let cardId: string | null = null;
    if (row.tableName === 'report_cards') {
      cardId = row.recordId;
    } else if (row.tableName === 'ocr_jobs') {
      cardId = jobToCard.get(row.recordId) ?? null;
    } else if (row.tableName === 'report_card_extractions') {
      cardId = extractionToCard.get(row.recordId) ?? null;
    } else if (row.tableName === 'uploads') {
      const url = (row.newValue as { url?: string } | null)?.url;
      cardId = url ? (urlToCard.get(url) ?? null) : null;
    }

    const card = cardId ? cardsById.get(cardId) : undefined;
    const profile = card?.student.studentProfile;

    return {
      id: row.id,
      action: row.action,
      actor: { id: row.actor.id, fullName: userName(row.actor), role: row.actor.role },
      student: card
        ? {
            id: card.student.id,
            fullName: [card.student.lastName, card.student.firstName, card.student.middleName].filter(Boolean).join(', '),
            lrn: profile?.lrn ?? '',
            gradeLabel: profile ? GRADE_LABELS[profile.gradeLevel] : '',
            sectionName: profile?.section?.sectionName ?? null,
          }
        : null,
      termLabel: card?.term.termLabel ?? null,
      fileName: null,
      fileUrl: null,
      detail: row.newValue ? (row.newValue as Record<string, unknown>) : null,
      createdAt: row.createdAt.toISOString(),
    };
  });
}