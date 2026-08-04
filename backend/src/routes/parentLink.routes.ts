import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { validateSchema } from '../middleware/validate';
import { confirmParentLink, listParentLinks, rejectParentLink, requestParentLink } from '../services/parentLink.service';

const router = Router();
router.use(authenticate);

const requestBody = z
  .object({
    studentId: z.string().uuid().optional(),
    lrn: z.string().min(5).max(20).optional(),
  })
  .strict()
  .refine((v) => (v.studentId ? true : v.lrn ? true : false), {
    message: 'Provide exactly one of studentId or lrn',
  });

const listQuery = z
  .object({
    status: z.enum(['pending_confirmation', 'confirmed', 'rejected']).optional(),
    parentId: z.string().uuid().optional(),
    studentId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

const idParams = z.object({ id: z.string().uuid() }).strict();

router.get(
  '/',
  requireRole('parent', 'record_keeper', 'registrar', 'principal'),
  validateSchema({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const result = await listParentLinks(req.user!.id, req.user!.role, req.query);
    res.json(result);
  })
);

router.post(
  '/',
  requireRole('parent'),
  validateSchema({ body: requestBody }),
  asyncHandler(async (req, res) => {
    const result = await requestParentLink(req.user!.id, req.body as { studentId?: string; lrn?: string });
    res.status(201).json(result);
  })
);

router.post(
  '/:id/confirm',
  requireRole('parent', 'record_keeper', 'registrar', 'principal'),
  validateSchema({ params: idParams }),
  asyncHandler(async (req, res) => {
    const result = await confirmParentLink(req.user!.id, req.user!.role, req.params.id);
    res.json(result);
  })
);

router.post(
  '/:id/reject',
  requireRole('parent', 'record_keeper', 'registrar', 'principal'),
  validateSchema({ params: idParams }),
  asyncHandler(async (req, res) => {
    const result = await rejectParentLink(req.user!.id, req.user!.role, req.params.id);
    res.json(result);
  })
);

export default router;
