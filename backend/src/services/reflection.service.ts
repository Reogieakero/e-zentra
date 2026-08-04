import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';

export interface ReflectionInput {
  studentId: string;
  termId?: string | null;
  subjectId?: string | null;
  prompt?: string | null;
  content: string;
}

export async function createReflection(actorId: string, actorRole: import('@prisma/client').Role, input: ReflectionInput) {
  if (actorRole === 'student') {
    if (input.studentId !== actorId) throw ApiError.forbidden('Students may only write their own reflections');
  }
  const student = await prisma.user.findUnique({ where: { id: input.studentId } });
  if (!student || student.role !== 'student') throw ApiError.badRequest('studentId must reference a student');

  const reflection = await prisma.studentReflection.create({
    data: { studentId: input.studentId, termId: input.termId, subjectId: input.subjectId, prompt: input.prompt, content: input.content },
  });
  return { data: serializeForOutput(reflection) };
}

export async function listReflections(viewerId: string, viewerRole: import('@prisma/client').Role, query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.StudentReflectionWhereInput = {};
  if (query.termId) where.termId = query.termId as string;
  if (query.studentId) {
    if (viewerRole === 'student' && query.studentId !== viewerId) throw ApiError.forbidden('Students may only view their own reflections');
    where.studentId = query.studentId as string;
  } else if (viewerRole === 'student') {
    where.studentId = viewerId;
  }

  const [total, rows] = await Promise.all([
    prisma.studentReflection.count({ where }),
    prisma.studentReflection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: { student: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}
