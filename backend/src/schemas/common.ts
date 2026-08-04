import { z } from 'zod';

export const uuidSchema = z.string().uuid();

export const uuidParams = z.object({ id: uuidSchema }).strict();

export const offsetQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const gradeLevelEnum = z.enum(['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12']);

export const gradeBandEnum = z.enum(['junior_high', 'senior_high']);

export const schoolYearStatusEnum = z.enum(['upcoming', 'active', 'completed']);

export const activeArchivedEnum = z.enum(['active', 'archived']);

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const emailSchema = z.string().trim().email().max(150).toLowerCase();

export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters').max(128);

export const nameSchema = z.string().trim().min(1).max(100);

export const optionalName = z.string().trim().max(100).optional().or(z.literal(''));
