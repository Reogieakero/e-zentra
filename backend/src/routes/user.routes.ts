import { Router } from 'express';
import { z } from 'zod';
import { AccountStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { validateSchema } from '../middleware/validate';
import { approveAccount, rejectAccount } from '../services/auth.service';

const router = Router();
router.use(authenticate);

const approveParams = z.object({ id: z.string().uuid() }).strict();
const listQuery = z
  .object({
    status: z.nativeEnum(AccountStatus).optional(),
    role: z.enum(['student', 'parent', 'teacher', 'registrar', 'record_keeper', 'adm_coordinator', 'guidance_counselor', 'principal', 'nurse']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

router.get(
  '/',
  requireRole('registrar', 'record_keeper', 'principal'),
  validateSchema({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const { status, role, page, pageSize } = req.query as unknown as {
      status?: AccountStatus;
      role?: 'student' | 'parent' | 'teacher';
      page: number;
      pageSize: number;
    };
    const where: Record<string, unknown> = {};
    if (status) where.accountStatus = status;
    if (role) where.role = role;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          accountStatus: true,
          createdAt: true,
          studentProfile: { select: { lrn: true, gradeLevel: true, sectionId: true } },
          parentProfile: { select: { relationship: true } },
          staffProfile: { select: { employeeId: true } },
        },
      }),
    ]);
    res.json({
      data: users,
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    });
  })
);

router.post(
  '/:id/approve',
  requireRole('registrar', 'record_keeper'),
  validateSchema({ params: approveParams }),
  asyncHandler(async (req, res) => {
    const { user } = await approveAccount(req.params.id, req.user!.id);
    res.json({ data: user });
  })
);

router.post(
  '/:id/reject',
  requireRole('registrar', 'record_keeper'),
  validateSchema({ params: approveParams }),
  asyncHandler(async (req, res) => {
    const { user } = await rejectAccount(req.params.id, req.user!.id);
    res.json({ data: user });
  })
);

export default router;
