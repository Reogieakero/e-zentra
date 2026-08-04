import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { authenticate } from '../middleware/authenticate';
import { requireRole, GRADE_VIEW_ROLES } from '../middleware/authorize';
import { validateSchema } from '../middleware/validate';
import { uuidParams, dateStringSchema } from '../schemas/common';
import { prisma } from '../lib/prisma';
import {
  listSectionAttendance,
  listStudentAttendance,
  markAttendance,
  updateAttendance,
} from '../services/attendance.service';

const router = Router();
router.use(authenticate);

const markBody = z
  .object({
    termId: z.string().uuid(),
    attendanceDate: dateStringSchema,
    session: z.enum(['morning', 'afternoon']),
    records: z
      .array(
        z
          .object({
            studentId: z.string().uuid(),
            status: z.enum(['present', 'absent', 'late', 'excused']),
            remarks: z.string().max(1000).optional(),
          })
          .strict()
      )
      .min(1)
      .max(100),
  })
  .strict();

const attendanceListQuery = z
  .object({
    studentId: z.string().uuid().optional(),
    status: z.enum(['present', 'absent', 'late', 'excused']).optional(),
    session: z.enum(['morning', 'afternoon']).optional(),
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const studentAttendanceQuery = z
  .object({
    termId: z.string().uuid().optional(),
    from: dateStringSchema.optional(),
    to: dateStringSchema.optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const updateBody = z
  .object({
    status: z.enum(['present', 'absent', 'late', 'excused']).optional(),
    remarks: z.string().max(1000).nullable().optional(),
  })
  .strict();

async function assertCanViewStudent(req: { user?: { id: string; role: import('@prisma/client').Role } }, studentId: string) {
  const user = req.user!;
  if (user.role === 'student') {
    if (user.id !== studentId) throw ApiError.forbidden('You may only view your own attendance');
    return;
  }
  if (user.role === 'parent') {
    const link = await prisma.parentStudentLink.findFirst({
      where: { parentId: user.id, studentId, status: 'confirmed' },
    });
    if (!link) throw ApiError.forbidden('You may only view attendance of your confirmed children');
  }
}

router.post(
  '/sections/:id/attendance',
  requireRole('teacher'),
  validateSchema({ params: uuidParams, body: markBody }),
  asyncHandler(async (req, res) => {
    const result = await markAttendance(req.user!.id, { sectionId: req.params.id, ...req.body });
    res.status(201).json(result);
  })
);

router.get(
  '/sections/:id/attendance',
  requireRole(...GRADE_VIEW_ROLES),
  validateSchema({ params: uuidParams, query: attendanceListQuery }),
  asyncHandler(async (req, res) => {
    const result = await listSectionAttendance(req.user!, req.params.id, req.query as Record<string, unknown>);
    res.json(result);
  })
);

router.get(
  '/students/:id/attendance',
  requireRole('teacher', 'student', 'parent', 'guidance_counselor', 'principal', 'record_keeper', 'registrar'),
  validateSchema({ params: uuidParams, query: studentAttendanceQuery }),
  asyncHandler(async (req, res) => {
    await assertCanViewStudent(req, req.params.id);
    const result = await listStudentAttendance(req.params.id, req.query as Record<string, unknown>);
    res.json(result);
  })
);

router.patch(
  '/attendance/:id',
  requireRole('teacher'),
  validateSchema({ params: uuidParams, body: updateBody }),
  asyncHandler(async (req, res) => {
    const { data } = await updateAttendance(req.user!.id, req.params.id, req.body);
    res.json({ data });
  })
);

export default router;
