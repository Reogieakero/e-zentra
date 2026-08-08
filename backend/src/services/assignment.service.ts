import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { assertGradeBandOwnership } from '../utils/gradeBand';
import { writeAudit } from './audit.service';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';

export interface AssignTeacherInput {
  teacherId: string;
  subjectId: string;
  sectionId: string;
  schoolYearId: string;
  isActive?: boolean;
}

export async function assignTeacher(actorId: string, actorRole: import('@prisma/client').Role, input: AssignTeacherInput) {
  const section = await prisma.section.findUnique({ where: { id: input.sectionId } });
  if (!section) throw ApiError.notFound('Section not found');

  assertGradeBandOwnership(actorRole, section.gradeLevel);

  const teacher = await prisma.user.findUnique({ where: { id: input.teacherId } });
  if (!teacher || teacher.role !== 'teacher') throw ApiError.badRequest('teacherId must reference a teacher');
  const subject = await prisma.subject.findUnique({ where: { id: input.subjectId } });
  if (!subject) throw ApiError.notFound('Subject not found');

  const created = await prisma.teacherSubjectAssignment.upsert({
    where: {
      teacherId_subjectId_sectionId_schoolYearId: {
        teacherId: input.teacherId,
        subjectId: input.subjectId,
        sectionId: input.sectionId,
        schoolYearId: input.schoolYearId,
      },
    },
    update: { isActive: input.isActive ?? true },
    create: {
      teacherId: input.teacherId,
      subjectId: input.subjectId,
      sectionId: input.sectionId,
      schoolYearId: input.schoolYearId,
      assignedBy: actorId,
      isActive: input.isActive ?? true,
    },
  });

  await writeAudit({ actorId, action: 'CREATE', tableName: 'teacher_subject_assignments', recordId: created.id, newValue: input as unknown as Prisma.InputJsonValue });
  return { data: serializeForOutput(created) };
}

export async function listAssignments(query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.TeacherSubjectAssignmentWhereInput = {};
  if (query.teacherId) where.teacherId = query.teacherId as string;
  if (query.sectionId) where.sectionId = query.sectionId as string;
  if (query.subjectId) where.subjectId = query.subjectId as string;
  if (query.schoolYearId) where.schoolYearId = query.schoolYearId as string;

  const [total, rows] = await Promise.all([
    prisma.teacherSubjectAssignment.count({ where }),
    prisma.teacherSubjectAssignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
        subject: { select: { id: true, subjectName: true, subjectCode: true } },
        section: { select: { id: true, sectionName: true, gradeLevel: true } },
      },
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}

export async function myAssignments(actorId: string, query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.TeacherSubjectAssignmentWhereInput = { teacherId: actorId };
  if (query.schoolYearId) where.schoolYearId = query.schoolYearId as string;

  const [total, rows] = await Promise.all([
    prisma.teacherSubjectAssignment.count({ where }),
    prisma.teacherSubjectAssignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: {
        subject: { select: { id: true, subjectName: true, subjectCode: true, gradeLevel: true } },
        section: { select: { id: true, sectionName: true, gradeLevel: true } },
      },
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}

export async function deactivateAssignment(actorId: string, actorRole: import('@prisma/client').Role, id: string) {
  const assignment = await prisma.teacherSubjectAssignment.findUnique({ where: { id } });
  if (!assignment) throw ApiError.notFound('Assignment not found');
  const section = await prisma.section.findUnique({ where: { id: assignment.sectionId } });
  if (!section) throw ApiError.notFound('Section not found');
  assertGradeBandOwnership(actorRole, section.gradeLevel);

  const updated = await prisma.teacherSubjectAssignment.update({ where: { id }, data: { isActive: false } });
  await writeAudit({ actorId, action: 'DEACTIVATE', tableName: 'teacher_subject_assignments', recordId: id, newValue: { isActive: false } as unknown as Prisma.InputJsonValue });
  return { data: serializeForOutput(updated) };
}
