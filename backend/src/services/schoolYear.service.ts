import { Prisma, SchoolYearStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { cacheKey, getCached, invalidateKeys, invalidateByPattern } from './cache.service';
import { writeAudit } from './audit.service';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';

export async function listSchoolYears(query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.SchoolYearWhereInput = {};
  if (query.status) where.status = query.status as SchoolYearStatus;

  const [total, rows] = await Promise.all([
    prisma.schoolYear.count({ where }),
    prisma.schoolYear.findMany({
      where,
      orderBy: { yearLabel: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: { _count: { select: { terms: true, sections: true } } },
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}

export async function getSchoolYear(id: string) {
  const key = cacheKey('schoolYear', id);
  const data = await getCached<Prisma.SchoolYearGetPayload<{ include: { _count: { select: { sections: true } } } }> | null>(key, 600, async () => {
    const sy = await prisma.schoolYear.findUnique({
      where: { id },
      include: {
        terms: { select: { id: true, gradeBand: true, termNumber: true, termLabel: true, status: true } },
        _count: { select: { sections: true } },
      },
    });
    return sy;
  });
  if (!data) throw ApiError.notFound('School year not found');
  return { data: serializeForOutput(data) };
}

export async function createSchoolYear(actorId: string, actorRole: import('@prisma/client').Role, input: { yearLabel: string; startDate: string; endDate: string; status?: SchoolYearStatus }) {
  if (actorRole !== 'principal') throw ApiError.forbidden('Only the Principal may create school years');
  if (new Date(input.startDate) >= new Date(input.endDate)) {
    throw ApiError.validation('startDate must be before endDate');
  }
  const existing = await prisma.schoolYear.findUnique({ where: { yearLabel: input.yearLabel } });
  if (existing) throw ApiError.conflict('A school year with this label already exists');

  const created = await prisma.schoolYear.create({
    data: {
      yearLabel: input.yearLabel,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      status: input.status ?? 'upcoming',
      createdBy: actorId,
    },
  });
  await writeAudit({ actorId, action: 'CREATE', tableName: 'school_years', recordId: created.id, newValue: input as unknown as Prisma.InputJsonValue });
  await invalidateByPattern('schoolYear*');
  return { data: serializeForOutput(created) };
}

export async function updateSchoolYear(actorId: string, actorRole: import('@prisma/client').Role, id: string, input: { status?: SchoolYearStatus; startDate?: string; endDate?: string }) {
  if (actorRole !== 'principal') throw ApiError.forbidden('Only the Principal may update school years');
  const existing = await prisma.schoolYear.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('School year not found');

  const updated = await prisma.schoolYear.update({
    where: { id },
    data: {
      status: input.status,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
    },
  });
  await writeAudit({
    actorId,
    action: 'UPDATE',
    tableName: 'school_years',
    recordId: id,
    oldValue: { status: existing.status } as unknown as Prisma.InputJsonValue,
    newValue: input as unknown as Prisma.InputJsonValue,
  });
  await invalidateKeys(cacheKey('schoolYear', id));
  return { data: serializeForOutput(updated) };
}
