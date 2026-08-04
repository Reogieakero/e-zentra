import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole, RECORDS_ADMIN_ROLES } from '../middleware/authorize';
import { validateSchema } from '../middleware/validate';
import { uuidParams } from '../schemas/common';
import { serializeForOutput } from '../middleware/errorHandler';
import { ApiError } from '../utils/ApiError';
import { approveReportCardExtraction, assertCanReviewExtraction, getOcrJob, getReportCardExtraction, rejectReportCardExtraction } from '../services/ocr.service';

const router = Router();
router.use(authenticate);

const approveBody = z
  .object({
    corrections: z
      .array(
        z
          .object({
            subjectCode: z.string().trim().min(1).max(20),
            from: z.number().nullable(),
            to: z.number().nullable(),
            remarks: z.string().trim().max(20).optional(),
          })
          .strict()
      )
      .optional(),
  })
  .strict();
const rejectBody = z.object({ reason: z.string().trim().min(1).max(500).optional() }).strict();

router.get('/ocr/jobs/:id', validateSchema({ params: uuidParams }), asyncHandler(async (req, res) => {
  const job = await getOcrJob(req.params.id);
  if (!job) throw ApiError.notFound('OCR job not found');
  const isRecordsAdmin = ['record_keeper', 'registrar', 'principal'].includes(req.user!.role);
  if (job.actorId !== req.user!.id && !isRecordsAdmin) {
    throw ApiError.forbidden('You may not view this OCR job');
  }
  res.json({ data: serializeForOutput(job) });
}));

router.get('/report-cards/:id/extraction', requireRole(...RECORDS_ADMIN_ROLES), validateSchema({ params: uuidParams }), asyncHandler(async (req, res) => {
  await assertCanReviewExtraction(req.user!.role, req.params.id);
  const extraction = await getReportCardExtraction(req.params.id);
  if (!extraction) throw ApiError.notFound('No OCR extraction exists for this report card');
  res.json({ data: serializeForOutput(extraction) });
}));

router.post('/report-cards/:id/extraction/approve', requireRole(...RECORDS_ADMIN_ROLES), validateSchema({ params: uuidParams, body: approveBody }), asyncHandler(async (req, res) => {
  await approveReportCardExtraction({
    actorId: req.user!.id,
    role: req.user!.role,
    reportCardId: req.params.id,
    corrections: req.body.corrections,
  });
  res.json({ data: { status: 'approved' } });
}));

router.post('/report-cards/:id/extraction/reject', requireRole(...RECORDS_ADMIN_ROLES), validateSchema({ params: uuidParams, body: rejectBody }), asyncHandler(async (req, res) => {
  await rejectReportCardExtraction(req.user!.id, req.user!.role, req.params.id, req.body.reason);
  res.json({ data: { status: 'rejected' } });
}));

export default router;
