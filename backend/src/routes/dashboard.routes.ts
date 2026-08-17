import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole, STAFF_VIEW_ROLES } from '../middleware/authorize';
import { validateSchema } from '../middleware/validate';
import { uuidParams } from '../schemas/common';
import { GradeLevel } from '@prisma/client';
import {
  getDashboardOverview,
} from '../services/dashboard.service';
import {
  getAttendanceReport,
  getAttendanceSummary,
  getLowAttendanceReport,
  getSectionRoster,
  getStudentAttendanceTrend,
  getAllSectionsAttendance,
  listSectionsByGrade,
} from '../services/attendance.report.service';
import {
  listAdviserAlerts,
  sendAdviserAlerts,
  setAlertStatus,
} from '../services/adviser-alert.service';
import { z } from 'zod';
import { getSf10Summary } from '../services/sf10.service';
import { getAiRecommendations } from '../services/ai.service';
import { Sf10ListQuery, Sf10Sort } from '../types/sf10';

const GRADE_LEVELS = [
  'grade_7',
  'grade_8',
  'grade_9',
  'grade_10',
  'grade_11',
  'grade_12',
];

const router = Router();
router.use(authenticate);

router.get(
  '/dashboard/overview',
  requireRole(...STAFF_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const result = await getDashboardOverview(month);
    res.json(result);
  })
);

router.get(
  '/dashboard/attendance/summary',
  requireRole(...STAFF_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const view = req.query.view === 'daily' ? 'daily' : 'monthly';
    const grade = GRADE_LEVELS.includes(String(req.query.grade)) ? String(req.query.grade) : undefined;
    const section = typeof req.query.section === 'string' ? req.query.section : undefined;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date)) ? String(req.query.date) : undefined;
    const result = await getAttendanceSummary(view, grade, section, date);
    res.json(result);
  })
);

router.get(
  '/dashboard/attendance/report',
  requireRole(...STAFF_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const view = req.query.view === 'daily' ? 'daily' : 'monthly';
    const grade = GRADE_LEVELS.includes(String(req.query.grade)) ? String(req.query.grade) : undefined;
    const section = typeof req.query.section === 'string' ? req.query.section : undefined;
    const result = await getAttendanceReport(view, grade, section);
    res.json(result);
  })
);

router.get(
  '/dashboard/attendance/report/ai-recommendations',
  requireRole(...STAFF_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const view = req.query.view === 'daily' ? 'daily' : 'monthly';
    const grade = GRADE_LEVELS.includes(String(req.query.grade)) ? String(req.query.grade) : undefined;
    const section = typeof req.query.section === 'string' ? req.query.section : undefined;
    const result = await getAiRecommendations(view, grade, section);
    res.json(result);
  })
);

router.get(
  '/dashboard/attendance/needs-attention',
  requireRole(...STAFF_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const grade = GRADE_LEVELS.includes(String(req.query.grade)) ? String(req.query.grade) : undefined;
    const section = typeof req.query.section === 'string' ? req.query.section : undefined;
    const result = await getLowAttendanceReport(grade, section);
    res.json({ data: result });
  })
);

router.get(
  '/dashboard/attendance/needs-attention/alerts',
  requireRole(...STAFF_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const grade = GRADE_LEVELS.includes(String(req.query.grade)) ? String(req.query.grade) : undefined;
    const section = typeof req.query.section === 'string' ? req.query.section : undefined;
    const result = await listAdviserAlerts({ gradeLevel: grade, sectionId: section });
    res.json(result);
  })
);

router.post(
  '/dashboard/attendance/needs-attention/alerts',
  requireRole('principal'),
  validateSchema({
    body: z.object({
      grade: z.enum(GRADE_LEVELS as [string, ...string[]]).optional(),
      section: z.string().uuid().optional(),
      tone: z.enum(['danger', 'warn', 'all']).default('all'),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { grade, section, tone } = req.body as { grade?: string; section?: string; tone: 'danger' | 'warn' | 'all' };
    const result = await sendAdviserAlerts(req.user!.id, { gradeLevel: grade, sectionId: section, tone });
    res.status(201).json(result);
  })
);

router.patch(
  '/dashboard/attendance/needs-attention/alerts/:id',
  requireRole('teacher'),
  validateSchema({ params: uuidParams }),
  asyncHandler(async (req, res) => {
    const result = await setAlertStatus(req.params.id, req.user!.id, { status: 'acknowledged' });
    res.json(result);
  })
);

router.get(
  '/dashboard/attendance/section/:id/students',
  requireRole(...STAFF_VIEW_ROLES),
  validateSchema({ params: uuidParams }),
  asyncHandler(async (req, res) => {
    const roster = await getSectionRoster(req.params.id);
    res.json({ data: roster });
  })
);

router.get(
  '/dashboard/attendance/student/:id/trend',
  requireRole(...STAFF_VIEW_ROLES),
  validateSchema({ params: uuidParams }),
  asyncHandler(async (req, res) => {
    const trend = await getStudentAttendanceTrend(req.params.id);
    res.json({ data: trend });
  })
);

router.get(
  '/dashboard/attendance/sections',
  requireRole(...STAFF_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const grade = GRADE_LEVELS.includes(String(req.query.grade)) ? String(req.query.grade) : undefined;
    if (!grade) {
      res.status(400).json({ error: 'A valid grade is required.' });
      return;
    }
    const sections = await listSectionsByGrade(grade);
    res.json(sections);
  })
);

router.get(
  '/dashboard/attendance/all-sections',
  requireRole(...STAFF_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const result = await getAllSectionsAttendance();
    res.json({ data: result });
  })
);

router.get(
  '/dashboard/sf10/summary',
  requireRole(...STAFF_VIEW_ROLES),
  asyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 12));
    const grade: GradeLevel | undefined = GRADE_LEVELS.includes(String(req.query.grade))
      ? (String(req.query.grade) as GradeLevel)
      : undefined;
    const status = ['complete', 'pending', 'missing'].includes(String(req.query.status))
      ? (String(req.query.status) as Sf10ListQuery['status'])
      : undefined;
    const year = typeof req.query.year === 'string' && req.query.year ? (req.query.year as string) : undefined;
    const search = typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined;
    const sort: Sf10Sort = ['last_updated', 'name_az', 'status'].includes(String(req.query.sort))
      ? (String(req.query.sort) as Sf10Sort)
      : 'last_updated';
    const query: Sf10ListQuery = { page, pageSize, search, grade, status, year, sort };
    const result = await getSf10Summary(query);
    res.json(result);
  })
);

export default router;