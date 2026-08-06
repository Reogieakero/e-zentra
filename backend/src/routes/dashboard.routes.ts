import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate } from '../middleware/authenticate';
import { requireRole, STAFF_VIEW_ROLES } from '../middleware/authorize';
import { getDashboardOverview } from '../services/dashboard.service';

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

export default router;