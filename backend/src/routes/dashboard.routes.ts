import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole, STAFF_VIEW_ROLES } from '../middleware/authorize';
import { GradeLevel } from '@prisma/client';
import {
  getDashboardOverview,
  getAttendanceReport,
  listSectionsByGrade,
  getAttendanceSummary,
  getSf10Summary,
} from '../services/dashboard.service';
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
    const result = await getAttendanceSummary();
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