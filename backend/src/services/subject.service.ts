import { GradeLevel, Prisma, SubjectStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { assertGradeBandOwnership } from '../utils/gradeBand';
import { cacheKey, getCached, invalidateByPattern } from './cache.service';
import { writeAudit } from './audit.service';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';

export interface CreateSubjectInput {
  subjectName: string;
  subjectCode: string;
  gradeLevel: GradeLevel;
  status?: SubjectStatus;
}

export async function listSubjects(query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.SubjectWhereInput = {};
  if (query.gradeLevel) where.gradeLevel = query.gradeLevel as GradeLevel;
  if (query.status) where.status = query.status as SubjectStatus;

  const [total, rows] = await Promise.all([
    prisma.subject.count({ where }),
    prisma.subject.findMany({
      where,
      orderBy: [{ gradeLevel: 'asc' }, { subjectName: 'asc' }],
      skip: offset.skip,
      take: offset.take,
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}

export async function getSubject(id: string) {
  const key = cacheKey('subject', id);
  const subject = await getCached(key, 600, async () => prisma.subject.findUnique({ where: { id } }));
  if (!subject) throw ApiError.notFound('Subject not found');
  return { data: serializeForOutput(subject) };
}

export async function createSubject(actorId: string, actorRole: import('@prisma/client').Role, input: CreateSubjectInput) {

  assertGradeBandOwnership(actorRole, input.gradeLevel);

  const existing = await prisma.subject.findUnique({ where: { subjectCode: input.subjectCode } });
  if (existing) throw ApiError.conflict('A subject with this code already exists');

  const created = await prisma.subject.create({
    data: {
      subjectName: input.subjectName,
      subjectCode: input.subjectCode,
      gradeLevel: input.gradeLevel,
      status: input.status ?? 'active',
      createdBy: actorId,
    },
  });
  await writeAudit({ actorId, action: 'CREATE', tableName: 'subjects', recordId: created.id, newValue: input as unknown as Prisma.InputJsonValue });
  await invalidateByPattern('subject*');
  return { data: serializeForOutput(created) };
}
