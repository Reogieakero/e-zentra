import { GradeLevel, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from './ApiError';
import { isStaffRole } from './confidentiality';
import { canManageGradeLevel } from './gradeBand';

export interface Viewer {
  id: string;
  role: Role;
}

export interface OwnedReportCard {
  studentId: string;
  status: string;
}

export interface ScopedSection {
  id: string;
  adviserId: string | null;
}

export function isBandOwner(role: Role, gradeLevel: GradeLevel): boolean {
  return canManageGradeLevel(role, gradeLevel);
}

export function isPrincipal(viewer: Viewer): boolean {
  return viewer.role === 'principal';
}

export function isAdviserOrAssignedTeacher(viewer: Viewer, section: ScopedSection): boolean {
  if (viewer.role !== 'teacher') return false;
  if (section.adviserId === viewer.id) return true;
  return false;
}

export async function getConfirmedChildIds(parentId: string): Promise<string[]> {
  const links = await prisma.parentStudentLink.findMany({
    where: { parentId, status: 'confirmed' },
    select: { studentId: true },
  });
  return links.map((l) => l.studentId);
}

export async function getTeacherScopedSectionIds(teacherId: string): Promise<string[]> {
  const [advised, assigned] = await Promise.all([
    prisma.section.findMany({ where: { adviserId: teacherId }, select: { id: true } }),
    prisma.teacherSubjectAssignment.findMany({ where: { teacherId, isActive: true }, select: { sectionId: true } }),
  ]);
  const ids = new Set<string>([...advised.map((s) => s.id), ...assigned.map((a) => a.sectionId)]);
  return [...ids];
}

export async function canViewStudentRecords(viewer: Viewer, studentId: string): Promise<boolean> {
  if (viewer.role === 'student') return viewer.id === studentId;
  if (viewer.role === 'parent') {
    const link = await prisma.parentStudentLink.findFirst({
      where: { parentId: viewer.id, studentId, status: 'confirmed' },
    });
    return Boolean(link);
  }
  return isStaffRole(viewer.role);
}

export async function assertCanViewStudentRecords(viewer: Viewer, studentId: string): Promise<void> {
  if (await canViewStudentRecords(viewer, studentId)) return;
  if (viewer.role === 'student') throw ApiError.forbidden('You may only view your own records');
  if (viewer.role === 'parent') throw ApiError.forbidden('You may only view records of your confirmed children');
  throw ApiError.forbidden(`Role '${viewer.role}' may not view these records`);
}

export async function canViewReportCard(viewer: Viewer, card: OwnedReportCard): Promise<boolean> {
  const mayViewStudent = await canViewStudentRecords(viewer, card.studentId);
  if (!mayViewStudent) return false;
  if (viewer.role === 'student' || viewer.role === 'parent') return card.status === 'released';
  return true;
}

export async function assertCanViewReportCard(viewer: Viewer, card: OwnedReportCard): Promise<void> {
  if (await canViewReportCard(viewer, card)) return;
  if (viewer.role === 'student' || viewer.role === 'parent') {
    throw ApiError.forbidden('Report cards may only be viewed once released, and only by the student or their confirmed parents');
  }
  throw ApiError.forbidden(`Role '${viewer.role}' may not view this report card`);
}

export async function canViewSectionStudents(viewer: Viewer, section: ScopedSection): Promise<boolean> {
  if (isStaffRole(viewer.role)) {
    if (viewer.role === 'teacher') return isAdviserOrAssignedTeacher(viewer, section);
    return true;
  }
  return false;
}

export async function assertCanViewSectionStudents(viewer: Viewer, section: ScopedSection): Promise<void> {
  if (await canViewSectionStudents(viewer, section)) return;
  if (viewer.role === 'teacher') {
    throw ApiError.forbidden('Only the section adviser or an assigned subject teacher may view this roster');
  }
  throw ApiError.forbidden(`Role '${viewer.role}' may not view student rosters`);
}

export async function canViewSectionAttendance(viewer: Viewer, section: ScopedSection): Promise<boolean> {
  if (viewer.role === 'student') return false;
  if (viewer.role === 'parent') return false;
  if (viewer.role === 'teacher') return isAdviserOrAssignedTeacher(viewer, section);
  return isStaffRole(viewer.role);
}

export async function assertCanViewSectionAttendance(viewer: Viewer, section: ScopedSection): Promise<void> {
  if (await canViewSectionAttendance(viewer, section)) return;
  if (viewer.role === 'student' || viewer.role === 'parent') {
    throw ApiError.forbidden('Section attendance may not be viewed by students or parents');
  }
  throw ApiError.forbidden('Only the section adviser or an assigned subject teacher may view section attendance');
}
