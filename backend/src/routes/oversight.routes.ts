import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { validateSchema } from '../middleware/validate';
import { assessStudentRisk, listRiskAssessments } from '../services/riskAssessment.service';
import { createRecordFlag, escalateRecordFlag, listRecordFlags, resolveRecordFlag } from '../services/recordFlag.service';
import { createReflection, listReflections } from '../services/reflection.service';
import { createReportCard, generateReportCardsForTerm, listReportCards, markReportCardReady, releaseReportCard } from '../services/reportCard.service';

const router = Router();
router.use(authenticate);

const idParams = z.object({ id: z.string().uuid() }).strict();
const offsetQuery = z
  .object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) })
  .strict();


const riskAssessBody = z.object({ studentId: z.string().uuid(), termId: z.string().uuid(), sectionId: z.string().uuid().optional() }).strict();
const riskListQuery = offsetQuery
  .extend({ studentId: z.string().uuid().optional(), termId: z.string().uuid().optional(), riskLevel: z.enum(['high', 'moderate', 'low']).optional() })
  .strict();


const flagBody = z
  .object({
    sourceTable: z.enum(['anecdotal_records', 'referrals', 'health_records', 'home_visitation_records', 'adm_learner_profiles', 'final_grades', 'attendance_records', 'student_risk_assessments']),
    sourceRecordId: z.string().uuid(),
    flagReason: z.string().trim().min(1).max(5000),
  })
  .strict();
const flagListQuery = offsetQuery
  .extend({
    status: z.enum(['open', 'resolved']).optional(),
    sourceTable: z.string().optional(),
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
    fileUrl: z.string().url().optional().nullable(),
  })
  .strict();
const generateBody = z.object({ termId: z.string().uuid() }).strict();
const reportCardListQuery = offsetQuery
  .extend({ studentId: z.string().uuid().optional(), termId: z.string().uuid().optional(), status: z.enum(['pending', 'ready', 'released']).optional() })
  .strict();


router.get('/risk-assessments', requireRole('guidance_counselor', 'record_keeper', 'registrar', 'principal', 'adm_coordinator'), validateSchema({ query: riskListQuery }), asyncHandler(async (req, res) => {
  res.json(await listRiskAssessments(req.query as Record<string, unknown>));
}));
router.post('/risk-assessments/assess', requireRole('guidance_counselor', 'record_keeper', 'registrar', 'principal', 'adm_coordinator'), validateSchema({ body: riskAssessBody }), asyncHandler(async (req, res) => {
  const { data } = await assessStudentRisk(req.user!.id, req.user!.role, req.body);
  res.json({ data });
}));


router.get('/record-flags', requireRole('record_keeper', 'registrar', 'principal', 'guidance_counselor', 'adm_coordinator', 'nurse'), validateSchema({ query: flagListQuery }), asyncHandler(async (req, res) => {
  res.json(await listRecordFlags(req.query as Record<string, unknown>));
}));
router.post('/record-flags', requireRole('teacher', 'record_keeper', 'registrar', 'guidance_counselor', 'adm_coordinator', 'nurse', 'principal'), validateSchema({ body: flagBody }), asyncHandler(async (req, res) => {
  const { data } = await createRecordFlag(req.user!.id, req.body);
  res.status(201).json({ data });
}));
router.post('/record-flags/:id/resolve', requireRole('record_keeper', 'registrar', 'principal', 'guidance_counselor', 'adm_coordinator', 'nurse'), validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await resolveRecordFlag(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));
router.post('/record-flags/:id/escalate', requireRole('record_keeper', 'registrar', 'guidance_counselor', 'adm_coordinator', 'nurse'), validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await escalateRecordFlag(req.user!.id, req.params.id);
  res.json({ data });
}));


router.get('/reflections', requireRole('student', 'teacher', 'guidance_counselor', 'record_keeper', 'registrar', 'principal', 'adm_coordinator'), validateSchema({ query: reflectionListQuery }), asyncHandler(async (req, res) => {
  res.json(await listReflections(req.user!.id, req.user!.role, req.query as Record<string, unknown>));
}));
router.post('/reflections', requireRole('student', 'teacher', 'guidance_counselor'), validateSchema({ body: reflectionBody }), asyncHandler(async (req, res) => {
  const { data } = await createReflection(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));


router.get('/report-cards', requireRole('record_keeper', 'registrar', 'principal', 'teacher', 'guidance_counselor', 'student', 'parent'), validateSchema({ query: reportCardListQuery }), asyncHandler(async (req, res) => {
  res.json(await listReportCards(req.user!, req.query as Record<string, unknown>));
}));
router.post('/report-cards/generate', requireRole('record_keeper', 'registrar', 'principal'), validateSchema({ body: generateBody }), asyncHandler(async (req, res) => {
  const result = await generateReportCardsForTerm(req.user!.id, req.user!.role, req.body.termId);
  res.status(201).json(result);
}));
router.post('/report-cards', requireRole('record_keeper', 'registrar', 'principal'), validateSchema({ body: reportCardBody }), asyncHandler(async (req, res) => {
  const { data } = await createReportCard(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));
router.post('/report-cards/:id/ready', requireRole('record_keeper', 'registrar', 'principal'), validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await markReportCardReady(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));
router.post('/report-cards/:id/release', requireRole('record_keeper', 'registrar', 'principal'), validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await releaseReportCard(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));

export default router;
