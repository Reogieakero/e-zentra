import { GradeBand, Prisma, TermStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { assertGradeBandOwnershipForBand } from '../utils/gradeBand';
import { cacheKey, getCached, invalidateByPattern } from './cache.service';
import { writeAudit } from './audit.service';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';

export interface CreateTermInput {
  schoolYearId: string;
  gradeBand: GradeBand;
  termNumber: 'term_1' | 'term_2' | 'term_3';
  termLabel: string;
  startDate: string;
  endDate: string;
  status?: TermStatus;
}

export async function listTerms(query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.TermWhereInput = {};
  if (query.schoolYearId) where.schoolYearId = query.schoolYearId as string;
  if (query.gradeBand) where.gradeBand = query.gradeBand as GradeBand;
  if (query.status) where.status = query.status as TermStatus;

  const [total, rows] = await Promise.all([
    prisma.term.count({ where }),
    prisma.term.findMany({
      where,
      orderBy: [{ gradeBand: 'asc' }, { termNumber: 'asc' }],
      skip: offset.skip,
      take: offset.take,
      include: { schoolYear: { select: { id: true, yearLabel: true } } },
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}

export async function getTerm(id: string) {
  const key = cacheKey('term', id);
  const term = await getCached(key, 600, async () => {
    const t = await prisma.term.findUnique({ where: { id }, include: { schoolYear: { select: { id: true, yearLabel: true } } } });
    return t;
  });
  if (!term) throw ApiError.notFound('Term not found');
  return { data: serializeForOutput(term) };
}

export async function createTerm(actorId: string, actorRole: import('@prisma/client').Role, input: CreateTermInput) {
  if (actorRole !== 'principal') throw ApiError.forbidden('Only the Principal may originate terms');
  if (new Date(input.startDate) >= new Date(input.endDate)) {
    throw ApiError.validation('startDate must be before endDate');
  }
  const schoolYear = await prisma.schoolYear.findUnique({ where: { id: input.schoolYearId } });
  if (!schoolYear) throw ApiError.notFound('School year not found');

  const existing = await prisma.term.findUnique({
    where: { schoolYearId_gradeBand_termNumber: { schoolYearId: input.schoolYearId, gradeBand: input.gradeBand, termNumber: input.termNumber } },
  });
  if (existing) throw ApiError.conflict('A term with this school year, grade band and number already exists');

  const created = await prisma.term.create({
    data: {
      schoolYearId: input.schoolYearId,
      gradeBand: input.gradeBand,
      termNumber: input.termNumber,
      termLabel: input.termLabel,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      status: input.status ?? 'upcoming',
      createdBy: actorId,
    },
  });
  await writeAudit({ actorId, action: 'CREATE', tableName: 'terms', recordId: created.id, newValue: input as unknown as Prisma.InputJsonValue });
  await invalidateByPattern('term*');
  return { data: serializeForOutput(created) };
}

export async function transitionTermStatus(actorId: string, actorRole: import('@prisma/client').Role, termId: string, to: TermStatus) {
  const term = await prisma.term.findUnique({ where: { id: termId } });
  if (!term) throw ApiError.notFound('Term not found');


  assertGradeBandOwnershipForBand(actorRole, term.gradeBand);

  const updated = await prisma.term.update({
    where: { id: termId },
    data: { status: to, statusUpdatedBy: actorId, statusUpdatedAt: new Date() },
  });

  await writeAudit({
    actorId,
    action: 'TRANSITION',
    tableName: 'terms',
    recordId: termId,
    oldValue: { status: term.status } as unknown as Prisma.InputJsonValue,
    newValue: { status: to } as unknown as Prisma.InputJsonValue,
  });
  await invalidateByPattern('term*');
  return { data: serializeForOutput(updated) };
}
