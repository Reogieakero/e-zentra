import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, AuthenticatedUser } from '../middleware/authenticate';
import { runUserExport, listUserExports } from '../services/export.service';

const router = Router();

function currentUser(req: import('express').Request): AuthenticatedUser {
  return (req as import('express').Request & { user: AuthenticatedUser }).user;
}

router.use(authenticate);

router.post(
  '/export/readable',
  asyncHandler(async (req, res) => {
    const result = await runUserExport(currentUser(req).id);
    res.json(result);
  })
);

router.get(
  '/export/history',
  asyncHandler(async (req, res) => {
    res.json(await listUserExports(currentUser(req).id));
  })
);

export default router;