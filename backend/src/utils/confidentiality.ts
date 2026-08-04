import { ConfidentialityLevel, Role } from '@prisma/client';

const NON_STUDENT_STAFF_ROLES = new Set<Role>([
  'teacher',
  'registrar',
  'record_keeper',
  'adm_coordinator',
  'guidance_counselor',
  'principal',
  'nurse',
]);

export function isStudentOrParentRole(role: Role): boolean {
  return role === 'student' || role === 'parent';
}

export interface ConfidentialityViewer {
  role: Role;
  id: string;
}

export function viewerSeesSensitiveFields(
  level: ConfidentialityLevel,
  viewer: ConfidentialityViewer,
  authorId?: string | null
): boolean {
  if (!isStudentOrParentRole(viewer.role)) {
    return true;
  }
  if (authorId !== undefined && authorId !== null && viewer.id === authorId) {
    return true;
  }
  return level === 'parent_visible';
}

export function redactSensitiveFields<T extends Record<string, unknown>>(
  record: T,
  level: ConfidentialityLevel,
  viewer: ConfidentialityViewer,
  authorId: string | null | undefined,
  sensitiveFields: (keyof T & string)[]
): T {
  if (viewerSeesSensitiveFields(level, viewer, authorId)) {
    return record;
  }
  const copy: Record<string, unknown> = { ...record };
  for (const field of sensitiveFields) {
    copy[field] = null;
  }
  return copy as T;
}

export function isStaffRole(role: Role): boolean {
  return NON_STUDENT_STAFF_ROLES.has(role);
}
