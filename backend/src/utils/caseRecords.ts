import { Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

export async function assertCanFileCaseRecord(actorId: string, actorRole: Role, sectionId: string): Promise<void> {
  if (actorRole === 'guidance_counselor') return;
  if (actorRole !== 'teacher') {
    throw ApiError.forbidden(`Role '${actorRole}' may not file case records`);
  }
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) throw ApiError.notFound('Section not found');
  if (section.adviserId === actorId) return;

  const assigned = await prisma.teacherSubjectAssignment.findFirst({
    where: { teacherId: actorId, sectionId, isActive: true },
  });
  if (!assigned) {
    throw ApiError.forbidden('Only the section adviser or an assigned subject teacher may file case records for this section');
  }
}

export async function isAdviserOfStudent(actorId: string, studentId: string): Promise<boolean> {
  const profile = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    select: { section: { select: { adviserId: true } } },
  });
  return profile?.section?.adviserId === actorId;
}

export async function assertCanViewStudentRecords(viewer: { id: string; role: Role }, studentId: string): Promise<void> {
  if (viewer.role === 'student') {
    if (viewer.id !== studentId) throw ApiError.forbidden('You may only view your own records');
    return;
  }
  if (viewer.role === 'parent') {
    const link = await prisma.parentStudentLink.findFirst({ where: { parentId: viewer.id, studentId, status: 'confirmed' } });
    if (!link) throw ApiError.forbidden('You may only view records of your confirmed children');
  }
}
