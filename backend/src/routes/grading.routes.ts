import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { validateSchema } from '../middleware/validate';
import {
  computeFinalGradeForStudent,
  createAssessment,
  finalizeFinalGrade,
  listAssessments,
  listFinalGrades,
  listGradeComponents,
  listStudentGrades,
  lockFinalGrade,
  recordStudentGrade,
  setGradeComponents,
  upsertFinalGrade,
} from '../services/grading.service';

const router = Router();
router.use(authenticate);

const idParams = z.object({ id: z.string().uuid() }).strict();
const offsetQuery = z
  .object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) })
  .strict();

const componentBody = z
  .object({
    subjectId: z.string().uuid(),
    termId: z.string().uuid(),
    components: z
      .array(z.object({ componentType: z.enum(['quiz', 'performance_task', 'exam']), weightPercentage: z.coerce.number().positive().max(100) }))
      .min(1),
  })
  .strict();
const componentListQuery = offsetQuery
  .extend({
    subjectId: z.string().uuid().optional(),
    termId: z.string().uuid().optional(),
    componentType: z.enum(['quiz', 'performance_task', 'exam']).optional(),
  })
  .strict();

const assessmentBody = z
  .object({
    subjectId: z.string().uuid(),
    sectionId: z.string().uuid(),
    termId: z.string().uuid(),
    componentType: z.enum(['quiz', 'performance_task', 'exam']),
    title: z.string().trim().min(1).max(150),
    maxScore: z.coerce.number().positive(),
    dateGiven: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .strict();
const assessmentListQuery = offsetQuery
  .extend({ sectionId: z.string().uuid().optional(), subjectId: z.string().uuid().optional(), termId: z.string().uuid().optional() })
  .strict();

const studentGradeBody = z
  .object({
    assessmentId: z.string().uuid(),
    studentId: z.string().uuid(),
    score: z.coerce.number().nonnegative(),
    remarks: z.string().trim().max(1000).optional().nullable(),
  })
  .strict();
const gradeListQuery = offsetQuery.extend({ assessmentId: z.string().uuid().optional(), studentId: z.string().uuid().optional() }).strict();

const computeBody = z.object({ subjectId: z.string().uuid(), termId: z.string().uuid(), studentId: z.string().uuid(), sectionId: z.string().uuid() }).strict();
const finalGradeListQuery = offsetQuery
  .extend({ studentId: z.string().uuid().optional(), subjectId: z.string().uuid().optional(), termId: z.string().uuid().optional(), sectionId: z.string().uuid().optional() })
  .strict();

router.get('/grade-components', validateSchema({ query: componentListQuery }), asyncHandler(async (req, res) => {
  res.json(await listGradeComponents(req.query as Record<string, unknown>));
}));
router.post('/grade-components', requireRole('record_keeper', 'registrar'), validateSchema({ body: componentBody }), asyncHandler(async (req, res) => {
  const { data } = await setGradeComponents(req.user!.id, req.user!.role, req.body.subjectId, req.body.termId, req.body.components);
  res.status(201).json({ data });
}));

router.get('/assessments', requireRole('teacher', 'record_keeper', 'registrar', 'principal', 'guidance_counselor'), validateSchema({ query: assessmentListQuery }), asyncHandler(async (req, res) => {
  res.json(await listAssessments(req.query as Record<string, unknown>));
}));
router.post('/assessments', requireRole('teacher'), validateSchema({ body: assessmentBody }), asyncHandler(async (req, res) => {
  const { data } = await createAssessment(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));

router.get('/student-grades', requireRole('teacher', 'record_keeper', 'registrar', 'principal'), validateSchema({ query: gradeListQuery }), asyncHandler(async (req, res) => {
  res.json(await listStudentGrades(req.query as Record<string, unknown>));
}));
router.post('/student-grades', requireRole('teacher'), validateSchema({ body: studentGradeBody }), asyncHandler(async (req, res) => {
  const { data } = await recordStudentGrade(req.user!.id, req.user!.role, req.body);
  res.status(201).json({ data });
}));

router.get('/final-grades', requireRole('teacher', 'record_keeper', 'registrar', 'principal', 'guidance_counselor'), validateSchema({ query: finalGradeListQuery }), asyncHandler(async (req, res) => {
  res.json(await listFinalGrades(req.query as Record<string, unknown>));
}));
router.post('/final-grades/compute', requireRole('teacher'), validateSchema({ body: computeBody }), asyncHandler(async (req, res) => {
  const { data } = await upsertFinalGrade(req.user!.id, req.user!.role, req.body.subjectId, req.body.termId, req.body.studentId, req.body.sectionId);
  res.json({ data });
}));
router.post('/final-grades/:id/finalize', requireRole('teacher'), validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await finalizeFinalGrade(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));
router.post('/final-grades/:id/lock', requireRole('teacher'), validateSchema({ params: idParams }), asyncHandler(async (req, res) => {
  const { data } = await lockFinalGrade(req.user!.id, req.user!.role, req.params.id);
  res.json({ data });
}));

export default router;
