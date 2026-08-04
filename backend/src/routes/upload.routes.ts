import { Router } from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { config } from '../config/env';
import { prisma } from '../lib/prisma';
import { asyncHandler } from '../utils/asyncHandler';
import { authenticate, AuthenticatedUser } from '../middleware/authenticate';
import { redisRateLimit } from '../middleware/rateLimiter';
import { RECORDS_ADMIN_ROLES } from '../middleware/authorize';
import { validateSchema } from '../middleware/validate';
import { ApiError } from '../utils/ApiError';
import { writeAudit } from '../services/audit.service';
import { sniffMimeType, declaredMimeMatchesContent } from '../utils/fileSniff';

const PHOTO_MIMES = config.security.allowedImageMimes;
const DOC_MIMES = [...PHOTO_MIMES, 'application/pdf'];

const ALL_AUTHENTICATED_ROLES = ['student', 'parent', 'teacher', 'registrar', 'record_keeper', 'adm_coordinator', 'guidance_counselor', 'principal', 'nurse'] as const;

const KINDS = {
  'profile-photo': { dir: 'profile-photos', roles: ALL_AUTHENTICATED_ROLES, mimes: PHOTO_MIMES },
  'report-card': { dir: 'report-cards', roles: RECORDS_ADMIN_ROLES, mimes: DOC_MIMES },
  'adm-photo': { dir: 'adm-photos', roles: ['adm_coordinator'] as const, mimes: PHOTO_MIMES },
} as const;

type UploadKind = keyof typeof KINDS;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

function kindOf(req: { params?: Record<string, unknown> }): UploadKind {
  return (req.params?.kind ?? '') as UploadKind;
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, _file, cb) => {
      const cfg = KINDS[kindOf(req)];
      if (!cfg) {
        return cb(ApiError.badRequest('Unknown upload kind'), '');
      }
      const dir = path.resolve(config.security.uploadDir, cfg.dir);
      ensureDir(dir);
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = MIME_EXT[file.mimetype] ?? path.extname(file.originalname).replace(/^\./, '');
      cb(null, `${randomUUID()}${ext ? `.${ext}` : ''}`);
    },
  }),
  limits: { fileSize: config.security.maxUploadBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    const cfg = KINDS[kindOf(req)];
    if (!cfg) {
      return cb(ApiError.badRequest('Unknown upload kind'));
    }
    if (!cfg.mimes.includes(file.mimetype)) {
      return cb(ApiError.validation(`File type '${file.mimetype}' is not allowed for ${kindOf(req)}`));
    }
    cb(null, true);
  },
});

const router = Router();
router.use(authenticate);

const kindParams = z.object({ kind: z.enum(['profile-photo', 'report-card', 'adm-photo']) }).strict();

const uploadLimiter = redisRateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyPrefix: 'rl:upload',
  userScoped: true,
});

router.post(
  '/uploads/:kind',
  uploadLimiter,
  validateSchema({ params: kindParams }),
  (req, res, next) => {
    const cfg = KINDS[kindOf(req)];
    const user = (req as { user?: AuthenticatedUser }).user;
    if (!user) {
      return next(ApiError.unauthorized());
    }
    if (!(cfg.roles as readonly string[]).includes(user.role)) {
      return next(ApiError.forbidden(`Role '${user.role}' may not upload ${kindOf(req)}`));
    }
    return next();
  },
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const kind = kindOf(req);
    const file = req.file;
    if (!file) {
      throw ApiError.badRequest('No file uploaded (expected multipart field "file")');
    }

    const header = fs.readFileSync(file.path);
    const sniffed = sniffMimeType(new Uint8Array(header.subarray(0, 64)));
    if (!declaredMimeMatchesContent(file.mimetype, sniffed)) {
      fs.unlinkSync(file.path);
      throw ApiError.validation(`File content does not match declared type '${file.mimetype}'`);
    }

    const url = `/uploads/${KINDS[kind].dir}/${file.filename}`;

    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, profilePhotoUrl: true, storageUsedBytes: true } });
    if (!user) {
      fs.unlinkSync(file.path);
      throw ApiError.unauthorized();
    }

    let releasedBytes = 0;
    if (kind === 'profile-photo' && user.profilePhotoUrl) {
      const previousPath = path.resolve(config.security.uploadDir, user.profilePhotoUrl.replace(/^\/uploads\//, ''));
      if (fs.existsSync(previousPath)) {
        try {
          releasedBytes = fs.statSync(previousPath).size;
          fs.unlinkSync(previousPath);
        } catch {
          releasedBytes = 0;
        }
      }
    }

    const currentUsed = Number(user.storageUsedBytes) - releasedBytes;
    if (currentUsed + file.size > config.security.maxUserUploadBytes) {
      fs.unlinkSync(file.path);
      throw ApiError.rateLimited('Upload quota exceeded');
    }

    if (kind === 'profile-photo') {
      await prisma.user.update({ where: { id: req.user!.id }, data: { profilePhotoUrl: url, storageUsedBytes: BigInt(Math.max(0, currentUsed + file.size)) } });
    } else {
      await prisma.user.update({ where: { id: req.user!.id }, data: { storageUsedBytes: BigInt(Math.max(0, currentUsed + file.size)) } });
    }
    await writeAudit({
      actorId: req.user!.id,
      action: 'UPLOAD',
      tableName: 'uploads',
      recordId: req.user!.id,
      newValue: { kind, url, size: file.size, mimeType: file.mimetype },
    });
    res.status(201).json({
      data: { kind, url, fileName: file.filename, size: file.size, mimeType: file.mimetype },
    });
  })
);

export default router;
