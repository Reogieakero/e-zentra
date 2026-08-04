import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { validateSchema } from '../middleware/validate';
import {
  createSection,
  getSection,
  listSectionStudents,
  listSections,
  updateSection,
} from '../services/section.service';

const router = Router();
router.use(authenticate);

const listQuery = z
  .object({
    schoolYearId: z.string().uuid().optional(),
    gradeLevel: z.enum(['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12']).optional(),
    status: z.enum(['active', 'archived']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const idParams = z.object({ id: z.string().uuid() }).strict();

const createBody = z
  .object({
    sectionName: z.string().trim().min(1).max(50),
    gradeLevel: z.enum(['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12']),
    adviserId: z.string().uuid().optional(),
    schoolYearId: z.string().uuid(),
    maxStudents: z.coerce.number().int().min(1).max(1000).optional(),
  })
  .strict();

const updateBody = z
  .object({
    sectionName: z.string().trim().min(1).max(50).optional(),
    adviserId: z.string().uuid().nullable().optional(),
    maxStudents: z.coerce.number().int().min(1).max(1000).nullable().optional(),
    status: z.enum(['active', 'archived']).optional(),
  })
  .strict();

router.get('/', validateSchema({ query: listQuery }), asyncHandler(async (req, res) => {
  const q = req.query as unknown as {
    schoolYearId?: string;
    gradeLevel?: import('@prisma/client').GradeLevel;
    status?: 'active' | 'archived';
    page: number;
    pageSize: number;
  };
  const result = await listSections(q);
  res.json(result);
}));

router.get('/:id', validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await getSection(req.params.id);
  res.json({ data });
}));

router.get('/:id/students', validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const q = req.query as unknown as { page: number; pageSize: number };
  res.json(await listSectionStudents(req.params.id, q.page, q.pageSize));
}));

router.post(
  '/',
  requireRole('record_keeper', 'registrar'),
  validateSchema({ body: createBody }),
  asyncHandler(async (req, res) => {
    const { data } = await createSection(req.user!.id, req.user!.role, req.body);
    res.status(201).json({ data });
  })
);

router.patch(
  '/:id',
  requireRole('record_keeper', 'registrar'),
  validateSchema({ params: idParams, body: updateBody }),
  asyncHandler(async (req, res) => {
    const { data } = await updateSection(req.user!.id, req.user!.role, req.params.id, req.body);
    res.json({ data });
  })
);

export default router;
