import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole, GUIDANCE_AND_ADM_ROLES, FLAG_HANDLER_ROLES, CASE_FILE_ROLES, CASE_MANAGER_ROLES, RECORDS_ADMIN_ROLES, REPORT_CARD_VIEW_ROLES } from '../middleware/authorize';
import { redisRateLimit } from '../middleware/rateLimiter';
import { validateSchema } from '../middleware/validate';
import { uuidParams, offsetQuery } from '../schemas/common';
import { assessStudentRisk, listRiskAssessments } from '../services/riskAssessment.service';
import { createRecordFlag, escalateRecordFlag, listRecordFlags, resolveRecordFlag } from '../services/recordFlag.service';
import { createReflection, listReflections } from '../services/reflection.service';
import { createReportCard, generateReportCardsForTerm, listReportCards, markReportCardReady, releaseReportCard } from '../services/reportCard.service';

const router = Router();
router.use(authenticate);

const writeLimiter = redisRateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyPrefix: 'rl:oversight-write',
  userScoped: true,
});

const riskAssessBody = z.object({ studentId: z.string().uuid(), termId: z.string().uuid(), sectionId: z.string().uuid().optional() }).strict();
const riskListQuery = offsetQuery
  .extend({ studentId: z.string().uuid().optional(), termId: z.string().uuid().optional(), riskLevel: z.enum(['high', 'moderate', 'low']).optional() })
  .strict();


const FLAG_SOURCE_TABLES = ['anecdotal_records', 'referrals', 'health_records', 'home_visitation_records', 'adm_learner_profiles', 'final_grades', 'attendance_records', 'student_risk_assessments'] as const;
const flagSourceTableEnum = z.enum(FLAG_SOURCE_TABLES);
const flagBody = z
  .object({
    sourceTable: flagSourceTableEnum,
    sourceRecordId: z.string().uuid(),
    flagReason: z.string().trim().min(1).max(5000),
  })
  .strict();
const flagListQuery = offsetQuery
  .extend({
    status: z.enum(['open', 'resolved']).optional(),
    sourceTable: flagSourceTableEnum.optional(),
    escalatedToPrincipal: z.enum(['true', 'false']).optional(),
  })
  .strict();


const reflectionBody = z
  .object({
    studentId: z.string().uuid(),
    termId: z.string().uuid().optional().nullable(),
    subjectId: z.string().uuid().optional().nullable(),
    prompt: z.string().trim().max(2000).optional().nullable(),
    content: z.string().trim().min(1).max(10000),
  })
  .strict();
const reflectionListQuery = offsetQuery.extend({ studentId: z.string().uuid().optional(), termId: z.string().uuid().optional() }).strict();


const reportCardBody = z
  .object({
    studentId: z.string().uuid(),
    termId: z.string().uuid(),
    source: z.enum(['system_generated', 'scanned_upload']),
    fileUrl: z.union([z.string().url(), z.string().regex(/^\/uploads\/report-cards\/[0-9a-f-]+\.(jpg|jpeg|png|webp|pdf)$/i)]).optional().nullable(),
  })
  .strict();
const generateBody = z.object({ termId: z.string().uuid() }).strict();
const reportCardListQuery = offsetQuery
  .extend({ studentId: z.string().uuid().optional(), termId: z.string().uuid().optional(), status: z.enum(['pending', 'ready', 'released']).optional() })
  .strict();


router.get('/risk-assessments', requireRole(...GUIDANCE_AND_ADM_ROLES), validateSchema({ query: riskListQuery }), asyncHandler(async (req, res) => {
  res.json(await listRiskAssessments(req.query as Record<string, unknown>));
}));
router.post('/risk-assessments/assess', writeLimiter, requireRole(...GUIDANCE_AND_ADM_ROLES), validateSchema({ body: riskAssessBody }), asyncHandler(async (req, res) => {
  const { data } = await assessStudentRisk(req.user!.id, req.user!.role, req.body);
  res.json({ data });
}));


router.get('/record-flags', requireRole(...FLAG_HANDLER_ROLES), validateSchema({ query: flagListQuery }), asyncHandler(async (req, res) => {
  res.json(await listRecordFlags(req.query as Record<string, unknown>));
}));
router.post('/record-flags', requireRole(...CASE_FILE_ROLES), validateSchema({ body: flagBody }), asyncHandler(async (req, res) => {
  const { data } = await createRecordFlag(req.user!.id, req.body);
  res.status(201).json({ data });
}));
router.post('/record-flags/:id/resolve', requireRole(...FLAG_HANDLER_ROLES), validateSchema({ params: uuidParams }), asyncHandler(async (req, res) => {
  const { data } = await resolveRecordFlag(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));
router.post('/record-flags/:id/escalate', requireRole(...FLAG_HANDLER_ROLES.filter(r => r !== 'principal')), validateSchema({ params: uuidParams }), asyncHandler(async (req, res) => {
  const { data } = await escalateRecordFlag(req.user!.id, req.params.id);
  res.json({ data });
}));


router.get('/reflections', requireRole('student', ...GUIDANCE_AND_ADM_ROLES), validateSchema({ query: reflectionListQuery }), asyncHandler(async (req, res) => {
  res.json(await listReflections(req.user!.id, req.user!.role, req.query as Record<string, unknown>));
}));
router.post('/reflections', requireRole(...CASE_MANAGER_ROLES.concat(['student'] as const)), validateSchema({ body: reflectionBody }), asyncHandler(async (req, res) => {
  const { data } = await createReflection(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));


router.get('/report-cards', requireRole(...REPORT_CARD_VIEW_ROLES), validateSchema({ query: reportCardListQuery }), asyncHandler(async (req, res) => {
  res.json(await listReportCards(req.user!, req.query as Record<string, unknown>));
}));
router.post('/report-cards/generate', writeLimiter, requireRole(...RECORDS_ADMIN_ROLES), validateSchema({ body: generateBody }), asyncHandler(async (req, res) => {
  const result = await generateReportCardsForTerm(req.user!.id, req.user!.role, req.body.termId);
  res.status(201).json(result);
}));
router.post('/report-cards', requireRole(...RECORDS_ADMIN_ROLES), validateSchema({ body: reportCardBody }), asyncHandler(async (req, res) => {
  const { data } = await createReportCard(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));
router.post('/report-cards/:id/ready', requireRole(...RECORDS_ADMIN_ROLES), validateSchema({ params: uuidParams }), asyncHandler(async (req, res) => {
  const { data } = await markReportCardReady(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));
router.post('/report-cards/:id/release', requireRole(...RECORDS_ADMIN_ROLES), validateSchema({ params: uuidParams }), asyncHandler(async (req, res) => {
  const { data } = await releaseReportCard(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));

export default router;
