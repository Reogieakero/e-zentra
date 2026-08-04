import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { validateSchema } from '../middleware/validate';
import { uuidParams } from '../schemas/common';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseCursorPagination, buildCursorResult } from '../utils/pagination';

const router = Router();
router.use(authenticate);

const listQuery = z
  .object({ limit: z.coerce.number().int().min(1).max(100).default(20), cursor: z.string().optional() })
  .strict();

router.get('/notifications', validateSchema({ query: listQuery }), asyncHandler(async (req, res) => {
  const { take, cursor } = parseCursorPagination(req.query as Record<string, unknown>);
  const where = { recipientId: req.user!.id };
  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  res.json(buildCursorResult(serializeForOutput(rows) as unknown as { id: string }[], { take, cursor }));
}));

router.get('/notifications/unread-count', asyncHandler(async (_req, res) => {
  const count = await prisma.notification.count({ where: { recipientId: _req.user!.id, isRead: false } });
  res.json({ data: { count } });
}));

router.post('/notifications/:id/read', validateSchema({ params: uuidParams }), asyncHandler(async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification) throw ApiError.notFound('Notification not found');
  if (notification.recipientId !== req.user!.id) throw ApiError.forbidden('You may only mark your own notifications as read');

  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ data: serializeForOutput(updated) });
}));

router.post('/notifications/read-all', asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { recipientId: req.user!.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ data: { updated: true } });
}));

export default router;
