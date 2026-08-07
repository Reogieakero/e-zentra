import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, AuthenticatedUser } from '../middleware/authenticate';
import { requireRole } from '../middleware/authorize';
import { buildOAuthUrl, exchangeCode } from '../services/googleDrive.service';
import {
  getBackupStatus,
  listBackupHistory,
  runBackup,
  disconnectGoogleDrive,
} from '../services/backup.service';
import { prisma } from '../lib/prisma';
import { encryptToken } from '../services/cryptoToken.service';
import { config } from '../config/env';

const router = Router();

function currentUser(req: import('express').Request): AuthenticatedUser {
  return (req as import('express').Request & { user: AuthenticatedUser }).user;
}

export const oauthCallback = asyncHandler(async (req, res) => {
  try {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const error = typeof req.query.error === 'string' ? req.query.error : '';
    if (error) {
      res.redirect(`${config.frontendUrl}/principal/backup?google=denied`);
      return;
    }
    if (!code || !state) {
      res.redirect(`${config.frontendUrl}/principal/backup?google=error`);
      return;
    }
    const user = await prisma.user.findUnique({ where: { id: state }, select: { id: true } });
    if (!user) {
      res.redirect(`${config.frontendUrl}/principal/backup?google=error`);
      return;
    }
    const { accessToken, refreshToken, expiresAt, email } = await exchangeCode(code);
    await prisma.googleDriveLink.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        email,
        accessTokenEnc: encryptToken(accessToken),
        refreshTokenEnc: encryptToken(refreshToken ?? ''),
        tokenExpiresAt: expiresAt,
      },
      update: {
        email,
        accessTokenEnc: encryptToken(accessToken),
        refreshTokenEnc: encryptToken(refreshToken ?? ''),
        tokenExpiresAt: expiresAt,
      },
    });
    res.redirect(`${config.frontendUrl}/principal/backup?google=connected`);
  } catch {
    res.redirect(`${config.frontendUrl}/principal/backup?google=error`);
  }
});

router.use(authenticate);

router.get(
  '/backup/status',
  requireRole('principal'),
  asyncHandler(async (req, res) => {
    res.json(await getBackupStatus(currentUser(req).id));
  })
);

router.get(
  '/backup/oauth-url',
  requireRole('principal'),
  asyncHandler(async (req, res) => {
    if (!config.backup.enabled) {
      res.status(403).json({ error: 'Backup feature is disabled.' });
      return;
    }
    const url = buildOAuthUrl(currentUser(req).id);
    res.json({ url });
  })
);

router.post(
  '/backup/run',
  requireRole('principal'),
  asyncHandler(async (req, res) => {
    const result = await runBackup(currentUser(req).id, 'manual');
    res.json(result);
  })
);

router.get(
  '/backup/history',
  requireRole('principal'),
  asyncHandler(async (req, res) => {
    res.json(await listBackupHistory(30));
  })
);

router.delete(
  '/backup/google',
  requireRole('principal'),
  asyncHandler(async (req, res) => {
    await disconnectGoogleDrive(currentUser(req).id);
    res.json({ ok: true });
  })
);

export default router;