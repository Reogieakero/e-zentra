import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { validateSchema } from '../middleware/validate';
import {
  addFollowup,
  createAnecdotal,
  createReferral,
  getAnecdotal,
  getReferral,
  listAnecdotalRecords,
  listReferrals,
  updateReferralStatus,
} from '../services/anecdotal.service';
import { createHealthRecord, getHealthRecord, listHealthRecords } from '../services/health.service';
import { certifyHomeVisit, createHomeVisit, getHomeVisit, listHomeVisits } from '../services/homeVisit.service';
import {
  approveAdmProfile,
  createAdmMeeting,
  createAdmProfile,
  getAdmProfile,
  listAdmProfiles,
  releaseAdmModule,
  submitAdmModule,
  submitAdmProfile,
} from '../services/adm.service';

const router = Router();
router.use(authenticate);

const idParams = z.object({ id: z.string().uuid() }).strict();
const offsetQuery = z
  .object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) })
  .strict();

const confidentialitySchema = z.enum(['confidential', 'internal_staff', 'parent_visible']).optional();

const anecdotalBody = z
  .object({
    studentId: z.string().uuid(),
    sectionId: z.string().uuid(),
    termId: z.string().uuid(),
    observationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    observationTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
    incidentDescription: z.string().trim().min(1).max(10000),
    locationSetting: z.string().trim().max(2000).optional().nullable(),
    notesRecommendationsActions: z.string().trim().max(5000).optional().nullable(),
    classPerformance: z.string().trim().max(2000).optional().nullable(),
    attendanceSummary: z.string().trim().max(2000).optional().nullable(),
    confidentialityLevel: confidentialitySchema,
  })
  .strict();
const followupBody = z
  .object({ followupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), followupNotes: z.string().trim().min(1).max(5000) })
  .strict();
const anecdotalListQuery = offsetQuery
  .extend({ studentId: z.string().uuid().optional(), sectionId: z.string().uuid().optional(), termId: z.string().uuid().optional() })
  .strict();

const referralBody = z
  .object({
    anecdotalRecordId: z.string().uuid(),
    referredToRole: z.enum(['nurse', 'guidance_counselor', 'adm_coordinator', 'principal']),
    reasonForReferral: z.string().trim().min(1).max(10000),
    confidentialityLevel: confidentialitySchema,
  })
  .strict();
const referralStatusBody = z.object({ status: z.enum(['pending', 'in_progress', 'completed']) }).strict();
const referralListQuery = offsetQuery
  .extend({
    status: z.enum(['pending', 'in_progress', 'completed']).optional(),
    referredToRole: z.enum(['nurse', 'guidance_counselor', 'adm_coordinator', 'principal']).optional(),
    studentId: z.string().uuid().optional(),
  })
  .strict();

const healthBody = z
  .object({
    studentId: z.string().uuid(),
    sectionId: z.string().uuid(),
    termId: z.string().uuid(),
    referralId: z.string().uuid().optional().nullable(),
    visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    visitTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
    reasonForVisit: z.string().trim().min(1).max(5000),
    vitalSigns: z.record(z.string(), z.unknown()).optional().nullable(),
    diagnosisAssessment: z.string().trim().max(5000).optional().nullable(),
    treatmentGiven: z.string().trim().max(5000).optional().nullable(),
    medicationAdministered: z.string().trim().max(5000).optional().nullable(),
    recommendation: z.enum(['rest_in_clinic', 'sent_home', 'referred_to_hospital', 'returned_to_class']).optional().nullable(),
    parentNotified: z.boolean().optional(),
    confidentialityLevel: confidentialitySchema,
  })
  .strict();
const healthListQuery = offsetQuery
  .extend({ studentId: z.string().uuid().optional(), sectionId: z.string().uuid().optional(), termId: z.string().uuid().optional() })
  .strict();

const homeVisitBody = z
  .object({
    studentId: z.string().uuid(),
    sectionId: z.string().uuid(),
    termId: z.string().uuid(),
    referralId: z.string().uuid().optional().nullable(),
    visitContext: z.enum(['adm_followup', 'guidance_counseling']),
    personVisitedName: z.string().trim().min(1).max(150),
    relationToStudent: z.string().trim().max(50).optional().nullable(),
    address: z.string().trim().max(2000).optional().nullable(),
    reasonForVisitation: z.string().trim().min(1).max(5000),
    visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    visitTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional().nullable(),
    homeConditionObservation: z.string().trim().max(5000).optional().nullable(),
    familyConditionObservation: z.string().trim().max(5000).optional().nullable(),
    detailsOfConcern: z.string().trim().max(5000).optional().nullable(),
    learnerAgreement: z.string().trim().max(5000).optional().nullable(),
    familyAgreement: z.string().trim().max(5000).optional().nullable(),
    confidentialityLevel: confidentialitySchema,
  })
  .strict();
const certifyBody = z.object({ purpose: z.string().trim().min(1).max(2000) }).strict();
const homeVisitListQuery = offsetQuery
  .extend({
    studentId: z.string().uuid().optional(),
    sectionId: z.string().uuid().optional(),
    visitContext: z.enum(['adm_followup', 'guidance_counseling']).optional(),
  })
  .strict();

const admProfileBody = z
  .object({
    studentId: z.string().uuid(),
    sectionId: z.string().uuid(),
    termId: z.string().uuid(),
    referralId: z.string().uuid(),
    teacherAdviserId: z.string().uuid().optional().nullable(),
    photoUrl: z.string().url().optional().nullable(),
    reasonForAdm: z.string().trim().min(1).max(5000),
    admInterventionDescription: z.string().trim().min(1).max(5000),
    admInterventionResult: z.string().trim().max(5000).optional().nullable(),
    alternateAdmCoordinatorId: z.string().uuid().optional().nullable(),
  })
  .strict();
const admProfileListQuery = offsetQuery.extend({ status: z.enum(['draft', 'submitted', 'approved']).optional(), studentId: z.string().uuid().optional() }).strict();
const admMeetingBody = z
  .object({
    admLearnerProfileId: z.string().uuid(),
    meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    parentsAttended: z.boolean(),
    confirmedVia: z.enum(['parent_app', 'staff_recorded']).optional(),
    minutesOfMeeting: z.string().trim().max(10000).optional().nullable(),
    attendanceLogbookReference: z.string().trim().max(500).optional().nullable(),
    adviserId: z.string().uuid().optional().nullable(),
  })
  .strict();
const admModuleBody = z
  .object({
    releaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    distributionSchedule: z.string().trim().max(5000).optional().nullable(),
    submissionDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    followupCounselingNotes: z.string().trim().max(5000).optional().nullable(),
  })
  .strict();


router.get('/anecdotal-records', validateSchema({ query: anecdotalListQuery }), asyncHandler(async (req, res) => {
  res.json(await listAnecdotalRecords(req.user!.id, req.user!.role, req.query as Record<string, unknown>));
}));
router.get('/anecdotal-records/:id', validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await getAnecdotal(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));
router.post('/anecdotal-records', requireRole('teacher', 'guidance_counselor'), validateSchema({ body: anecdotalBody }), asyncHandler(async (req, res) => {
  const { data } = await createAnecdotal(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));
router.post('/anecdotal-records/:id/followups', requireRole('teacher', 'guidance_counselor'), validateSchema({ params: idParams, body: followupBody }), asyncHandler(async (req, res) => {
  const { data } = await addFollowup(req.user!.id, req.params.id, req.body.followupDate, req.body.followupNotes);
  res.status(201).json({ data });
}));


router.get('/referrals', requireRole('teacher', 'guidance_counselor', 'nurse', 'adm_coordinator', 'principal', 'record_keeper', 'registrar'), validateSchema({ query: referralListQuery }), asyncHandler(async (req, res) => {
  res.json(await listReferrals(req.query as Record<string, unknown>));
}));
router.get('/referrals/:id', requireRole('teacher', 'guidance_counselor', 'nurse', 'adm_coordinator', 'principal', 'record_keeper', 'registrar'), validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await getReferral(req.params.id);
  res.json({ data });
}));
router.post('/referrals', requireRole('teacher', 'guidance_counselor'), validateSchema({ body: referralBody }), asyncHandler(async (req, res) => {
  const { data } = await createReferral(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));
router.patch('/referrals/:id/status', requireRole('guidance_counselor', 'nurse', 'adm_coordinator', 'principal'), validateSchema({ params: idParams, body: referralStatusBody }), asyncHandler(async (req, res) => {
  const { data } = await updateReferralStatus(req.user!.id, req.params.id, req.body.status);
  res.json({ data });
}));


router.get('/health-records', validateSchema({ query: healthListQuery }), asyncHandler(async (req, res) => {
  res.json(await listHealthRecords(req.user!.id, req.user!.role, req.query as Record<string, unknown>));
}));
router.get('/health-records/:id', validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await getHealthRecord(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));
router.post('/health-records', requireRole('nurse'), validateSchema({ body: healthBody }), asyncHandler(async (req, res) => {
  const { data } = await createHealthRecord(req.user!.id, req.body);
  res.status(201).json({ data });
}));


router.get('/home-visits', requireRole('teacher', 'guidance_counselor', 'nurse', 'adm_coordinator', 'principal', 'record_keeper', 'registrar'), validateSchema({ query: homeVisitListQuery }), asyncHandler(async (req, res) => {
  res.json(await listHomeVisits(req.query as Record<string, unknown>));
}));
router.get('/home-visits/:id', validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await getHomeVisit(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));
router.post('/home-visits', requireRole('teacher', 'guidance_counselor'), validateSchema({ body: homeVisitBody }), asyncHandler(async (req, res) => {
  const { data } = await createHomeVisit(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));
router.post('/home-visits/:id/certify', requireRole('guidance_counselor'), validateSchema({ params: idParams, body: certifyBody }), asyncHandler(async (req, res) => {
  const { data } = await certifyHomeVisit(req.user!.id, req.params.id, req.body.purpose);
  res.json({ data });
}));


router.get('/adm-profiles', requireRole('adm_coordinator', 'principal', 'guidance_counselor', 'record_keeper', 'registrar', 'teacher'), validateSchema({ query: admProfileListQuery }), asyncHandler(async (req, res) => {
  res.json(await listAdmProfiles(req.query as Record<string, unknown>));
}));
router.get('/adm-profiles/:id', requireRole('adm_coordinator', 'principal', 'guidance_counselor', 'record_keeper', 'registrar', 'teacher'), validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await getAdmProfile(req.params.id);
  res.json({ data });
}));
router.post('/adm-profiles', requireRole('adm_coordinator'), validateSchema({ body: admProfileBody }), asyncHandler(async (req, res) => {
  const { data } = await createAdmProfile(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));
router.post('/adm-profiles/:id/submit', requireRole('adm_coordinator'), validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await submitAdmProfile(req.user!.id, req.params.id);
  res.json({ data });
}));
router.post('/adm-profiles/:id/approve', requireRole('principal'), validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await approveAdmProfile(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));
router.post('/adm-meetings', requireRole('adm_coordinator'), validateSchema({ body: admMeetingBody }), asyncHandler(async (req, res) => {
  const { data } = await createAdmMeeting(req.user!.id, req.body);
  res.status(201).json({ data });
}));
router.post('/adm-profiles/:id/modules', requireRole('adm_coordinator'), validateSchema({ params: idParams, body: admModuleBody }), asyncHandler(async (req, res) => {
  const { data } = await releaseAdmModule(req.user!.id, req.params.id, req.body);
  res.status(201).json({ data });
}));
router.post('/adm-modules/:id/submit', validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await submitAdmModule(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));

export default router;
