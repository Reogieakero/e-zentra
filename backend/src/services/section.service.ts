import { GradeLevel, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { assertGradeBandOwnership } from '../utils/gradeBand';
import { cacheKey, invalidateByPattern } from './cache.service';
import { writeAudit } from './audit.service';
import { serializeForOutput } from '../middleware/errorHandler';

export interface CreateSectionInput {
  sectionName: string;
  gradeLevel: GradeLevel;
  adviserId?: string;
  schoolYearId: string;
  maxStudents?: number;
}

export interface UpdateSectionInput {
  sectionName?: string;
  adviserId?: string | null;
  maxStudents?: number | null;
  status?: 'active' | 'archived';
}

export async function listSections(query: {
  schoolYearId?: string;
  gradeLevel?: GradeLevel;
  status?: 'active' | 'archived';
  page: number;
  pageSize: number;
}) {
  const where: Prisma.SectionWhereInput = {
    schoolYearId: query.schoolYearId,
    gradeLevel: query.gradeLevel,
    status: query.status,
  };
  Object.keys(where).forEach((k) => (where as Record<string, unknown>)[k] === undefined && delete (where as Record<string, unknown>)[k]);

  const cacheKeyStr = cacheKey('sections', JSON.stringify({ ...where, page: query.page, pageSize: query.pageSize }));
  const [total, sections] = await Promise.all([
    prisma.section.count({ where }),
    prisma.section.findMany({
      where,
      orderBy: [{ gradeLevel: 'asc' }, { sectionName: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        adviser: { select: { id: true, firstName: true, lastName: true, email: true } },
        schoolYear: { select: { id: true, yearLabel: true } },
      },
    }),
  ]);
  return {
    data: serializeForOutput(sections),
    page: query.page,
    pageSize: query.pageSize,
    total,
    hasMore: query.page * query.pageSize < total,
  };
}

export async function getSection(id: string) {
  const section = await prisma.section.findUnique({
    where: { id },
    include: {
      adviser: { select: { id: true, firstName: true, lastName: true, email: true } },
      schoolYear: { select: { id: true, yearLabel: true } },
      _count: { select: { students: true } },
    },
  });
  if (!section) throw ApiError.notFound('Section not found');
  return { data: serializeForOutput(section) };
}

export async function createSection(actorId: string, actorRole: import('@prisma/client').Role, input: CreateSectionInput) {
  assertGradeBandOwnership(actorRole, input.gradeLevel);

  const schoolYear = await prisma.schoolYear.findUnique({ where: { id: input.schoolYearId } });
  if (!schoolYear) throw ApiError.notFound('School year not found');
  if (input.adviserId) {
    const adviser = await prisma.user.findUnique({ where: { id: input.adviserId } });
    if (!adviser || adviser.role !== 'teacher') throw ApiError.badRequest('adviserId must reference a teacher');
  }

  const section = await prisma.section.create({
    data: {
      sectionName: input.sectionName,
      gradeLevel: input.gradeLevel,
      adviserId: input.adviserId,
      schoolYearId: input.schoolYearId,
      maxStudents: input.maxStudents,
      createdBy: actorId,
    },
  });

  await writeAudit({ actorId, action: 'CREATE', tableName: 'sections', recordId: section.id, newValue: input as unknown as Prisma.InputJsonValue });
  await invalidateByPattern('sections*');
  return { data: serializeForOutput(section) };
}

export async function updateSection(actorId: string, actorRole: import('@prisma/client').Role, id: string, input: UpdateSectionInput) {
  const existing = await prisma.section.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Section not found');
  assertGradeBandOwnership(actorRole, existing.gradeLevel);

  if (input.adviserId) {
    const adviser = await prisma.user.findUnique({ where: { id: input.adviserId } });
    if (!adviser || adviser.role !== 'teacher') throw ApiError.badRequest('adviserId must reference a teacher');
  }

  const section = await prisma.section.update({
    where: { id },
    data: {
      sectionName: input.sectionName,
      adviserId: input.adviserId === undefined ? undefined : input.adviserId,
      maxStudents: input.maxStudents === undefined ? undefined : input.maxStudents,
      status: input.status,
    },
  });

  await writeAudit({
    actorId,
    action: 'UPDATE',
    tableName: 'sections',
    recordId: id,
    oldValue: {
      sectionName: existing.sectionName,
      adviserId: existing.adviserId,
      maxStudents: existing.maxStudents,
      status: existing.status,
    } as unknown as Prisma.InputJsonValue,
    newValue: input as unknown as Prisma.InputJsonValue,
  });
  await invalidateByPattern('sections*');
  return { data: serializeForOutput(section) };
}

export async function listSectionStudents(sectionId: string, page: number, pageSize: number) {
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) throw ApiError.notFound('Section not found');

  const where = { sectionId };
  const [total, students] = await Promise.all([
    prisma.studentProfile.count({ where }),
    prisma.studentProfile.findMany({
      where,
      orderBy: { id: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    }),
  ]);
  return { data: serializeForOutput(students), page, pageSize, total, hasMore: page * pageSize < total };
}
