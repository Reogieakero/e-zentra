import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { validateSchema } from '../middleware/validate';
import { createSchoolYear, getSchoolYear, listSchoolYears, updateSchoolYear } from '../services/schoolYear.service';
import { createTerm, getTerm, listTerms, transitionTermStatus } from '../services/term.service';
import { createSubject, getSubject, listSubjects } from '../services/subject.service';
import { assignTeacher, deactivateAssignment, listAssignments, myAssignments } from '../services/assignment.service';
import { listAdviserAccessRequests, requestAdviserAccess, reviewAdviserAccess } from '../services/adviserAccess.service';

const router = Router();
router.use(authenticate);

const idParams = z.object({ id: z.string().uuid() }).strict();
const offsetQuery = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();


const schoolYearListQuery = offsetQuery.extend({ status: z.enum(['upcoming', 'active', 'completed']).optional() }).strict();
const schoolYearBody = z
  .object({
    yearLabel: z.string().regex(/^\d{4}-\d{4}$/, 'yearLabel must look like 2026-2027').max(9),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['upcoming', 'active', 'completed']).optional(),
  })
  .strict();
const schoolYearUpdateBody = z
  .object({
    status: z.enum(['upcoming', 'active', 'completed']).optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();


const termListQuery = offsetQuery
  .extend({
    schoolYearId: z.string().uuid().optional(),
    gradeBand: z.enum(['junior_high', 'senior_high']).optional(),
    status: z.enum(['upcoming', 'active', 'completed']).optional(),
  })
  .strict();
const termBody = z
  .object({
    schoolYearId: z.string().uuid(),
    gradeBand: z.enum(['junior_high', 'senior_high']),
    termNumber: z.enum(['term_1', 'term_2', 'term_3']),
    termLabel: z.string().trim().min(1).max(50),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['upcoming', 'active', 'completed']).optional(),
  })
  .strict();
const transitionBody = z.object({ to: z.enum(['upcoming', 'active', 'completed']) }).strict();


const subjectListQuery = offsetQuery.extend({ gradeLevel: z.enum(['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12']).optional(), status: z.enum(['active', 'archived']).optional() }).strict();
const subjectBody = z
  .object({
    subjectName: z.string().trim().min(1).max(100),
    subjectCode: z.string().trim().min(1).max(20),
    gradeLevel: z.enum(['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12']),
    status: z.enum(['active', 'archived']).optional(),
  })
  .strict();


const assignmentListQuery = offsetQuery
  .extend({
    teacherId: z.string().uuid().optional(),
    sectionId: z.string().uuid().optional(),
    subjectId: z.string().uuid().optional(),
    schoolYearId: z.string().uuid().optional(),
  })
  .strict();
const assignmentBody = z
  .object({
    teacherId: z.string().uuid(),
    subjectId: z.string().uuid(),
    sectionId: z.string().uuid(),
    schoolYearId: z.string().uuid(),
    isActive: z.boolean().optional(),
  })
  .strict();


const requestBody = z.object({ sectionId: z.string().uuid(), reason: z.string().max(2000).optional() }).strict();
const reviewBody = z.object({ decision: z.enum(['approved', 'denied']) }).strict();
const requestListQuery = offsetQuery.extend({ status: z.enum(['pending', 'approved', 'denied']).optional(), sectionId: z.string().uuid().optional(), adviserId: z.string().uuid().optional() }).strict();

router.get('/school-years', validateSchema({ query: schoolYearListQuery }), asyncHandler(async (req, res) => {
  res.json(await listSchoolYears(req.query as Record<string, unknown>));
}));
router.get('/school-years/:id', validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await getSchoolYear(req.params.id);
  res.json({ data });
}));
router.post('/school-years', requireRole('principal'), validateSchema({ body: schoolYearBody }), asyncHandler(async (req, res) => {
  const { data } = await createSchoolYear(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));
router.patch('/school-years/:id', requireRole('principal'), validateSchema({ params: idParams, body: schoolYearUpdateBody }), asyncHandler(async (req, res) => {
  const { data } = await updateSchoolYear(req.user!.id, req.user!.role, req.params.id, req.body);
  res.json({ data });
}));

router.get('/terms', validateSchema({ query: termListQuery }), asyncHandler(async (req, res) => {
  res.json(await listTerms(req.query as Record<string, unknown>));
}));
router.get('/terms/:id', validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await getTerm(req.params.id);
  res.json({ data });
}));
router.post('/terms', requireRole('principal'), validateSchema({ body: termBody }), asyncHandler(async (req, res) => {
  const { data } = await createTerm(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));
router.post('/terms/:id/transition', requireRole('record_keeper', 'registrar'), validateSchema({ params: idParams, body: transitionBody }), asyncHandler(async (req, res) => {
  const { data } = await transitionTermStatus(req.user!.id, req.user!.role, req.params.id, req.body.to);
  res.json({ data });
}));

router.get('/subjects', validateSchema({ query: subjectListQuery }), asyncHandler(async (req, res) => {
  res.json(await listSubjects(req.query as Record<string, unknown>));
}));
router.get('/subjects/:id', validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await getSubject(req.params.id);
  res.json({ data });
}));
router.post('/subjects', requireRole('record_keeper', 'registrar'), validateSchema({ body: subjectBody }), asyncHandler(async (req, res) => {
  const { data } = await createSubject(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));

router.get('/assignments', requireRole('record_keeper', 'registrar', 'principal'), validateSchema({ query: assignmentListQuery }), asyncHandler(async (req, res) => {
  res.json(await listAssignments(req.query as Record<string, unknown>));
}));
router.get('/assignments/me', requireRole('teacher'), validateSchema({ query: offsetQuery }), asyncHandler(async (req, res) => {
  res.json(await myAssignments(req.user!.id, req.query as Record<string, unknown>));
}));
router.post('/assignments', requireRole('record_keeper', 'registrar'), validateSchema({ body: assignmentBody }), asyncHandler(async (req, res) => {
  const { data } = await assignTeacher(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));
router.patch('/assignments/:id/deactivate', requireRole('record_keeper', 'registrar'), validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await deactivateAssignment(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));

router.get('/adviser-access-requests', requireRole('record_keeper', 'registrar', 'principal', 'teacher'), validateSchema({ query: requestListQuery }), asyncHandler(async (req, res) => {
  res.json(await listAdviserAccessRequests(req.query as Record<string, unknown>));
}));
router.post('/adviser-access-requests', requireRole('teacher'), validateSchema({ body: requestBody }), asyncHandler(async (req, res) => {
  const { data } = await requestAdviserAccess(req.user!.id, req.body.sectionId, req.body.reason);
  res.status(201).json({ data });
}));
router.post('/adviser-access-requests/:id/review', requireRole('record_keeper', 'registrar'), validateSchema({ params: idParams, body: reviewBody }), asyncHandler(async (req, res) => {
  const { data } = await reviewAdviserAccess(req.user!.id, req.user!.role, req.params.id, req.body.decision);
  res.json({ data });
}));

export default router;
