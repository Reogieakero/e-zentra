import { GradeBand, GradeLevel, Role } from '@prisma/client';
import { ApiError } from './ApiError';

export const JUNIOR_HIGH_LEVELS: GradeLevel[] = ['grade_7', 'grade_8', 'grade_9', 'grade_10'];
export const SENIOR_HIGH_LEVELS: GradeLevel[] = ['grade_11', 'grade_12'];

export function gradeBandForGradeLevel(gradeLevel: GradeLevel): GradeBand {
  return JUNIOR_HIGH_LEVELS.includes(gradeLevel) ? 'junior_high' : 'senior_high';
}

export function gradeBandOwner(gradeBand: GradeBand): Role {
  return gradeBand === 'junior_high' ? 'record_keeper' : 'registrar';
}

export function gradeBandOwnedBy(gradeBand: GradeBand, role: Role): boolean {
  return gradeBandOwner(gradeBand) === role;
}

export function canManageGradeLevel(role: Role, gradeLevel: GradeLevel): boolean {
  const band = gradeBandForGradeLevel(gradeLevel);
  return role === gradeBandOwner(band);
}

export function assertGradeBandOwnership(role: Role, gradeLevel: GradeLevel): void {
  const band = gradeBandForGradeLevel(gradeLevel);
  if (!gradeBandOwnedBy(band, role)) {
    throw ApiError.forbidden(
      `Record Keeper owns Junior High (grades 7-10) records; Registrar owns Senior High (grades 11-12) records. ` +
        `Role '${role}' does not own grade band '${band}'.`
    );
  }
}

export function assertGradeBandOwnershipForBand(role: Role, gradeBand: GradeBand): void {
  if (!gradeBandOwnedBy(gradeBand, role)) {
    throw ApiError.forbidden(
      `Record Keeper owns Junior High terms/records; Registrar owns Senior High terms/records. ` +
        `Role '${role}' does not own grade band '${gradeBand}'.`
    );
  }
}
