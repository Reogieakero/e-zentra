import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole, STAFF_VIEW_ROLES } from '../middleware/authorize';
import { validateSchema } from '../middleware/validate';
import { offsetQuery, uuidParams, gradeLevelEnum } from '../schemas/common';
import { getStudentDetail, listStudents, ListStudentsQuery } from '../services/students.service';

const router = Router();
router.use(authenticate);

const listQuery = offsetQuery
  .extend({
    search: z.string().trim().max(120).optional(),
    grade: gradeLevelEnum.optional(),
    sectionId: z.string().uuid().optional(),
    schoolYearId: z.string().uuid().optional(),
    status: z.enum(['active', 'inactive', 'pending', 'suspended', 'rejected']).optional(),
  })
  .strict();

router.get('/', requireRole(...STAFF_VIEW_ROLES), validateSchema({ query: listQuery }), asyncHandler(async (req, res) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  const q = req.query as unknown as ListStudentsQuery;
  res.json(await listStudents({ ...q, page, pageSize }));
}));

router.get('/:id', requireRole(...STAFF_VIEW_ROLES), validateSchema({ params: uuidParams }), asyncHandler(async (req, res) => {
  res.json(await getStudentDetail(req.params.id));
}));

export default router;