import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole, STAFF_VIEW_ROLES } from '../middleware/authorize';
import {
  getDashboardOverview,
  getAttendanceReport,
  listSectionsByGrade,
  getAttendanceSummary,
} from '../services/dashboard.service';
import { getAiRecommendations } from '../services/ai.service';

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

export default router;