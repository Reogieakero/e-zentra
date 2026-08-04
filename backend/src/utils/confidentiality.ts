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
  return deepRedact({ ...record }, new Set(sensitiveFields)) as T;
}

function deepRedact(value: unknown, sensitiveFields: Set<string>): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => deepRedact(item, sensitiveFields));
  }
  if (value !== null && typeof value === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (sensitiveFields.has(key)) {
        copy[key] = null;
      } else {
        copy[key] = deepRedact(child, sensitiveFields);
      }
    }
    return copy;
  }
  return value;
}

export function isStaffRole(role: Role): boolean {
  return NON_STUDENT_STAFF_ROLES.has(role);
}
