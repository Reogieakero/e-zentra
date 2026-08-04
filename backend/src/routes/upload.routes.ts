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
import { validateSchema } from '../middleware/validate';
import { ApiError } from '../utils/ApiError';
import { writeAudit } from '../services/audit.service';

const PHOTO_MIMES = config.security.allowedImageMimes;
const DOC_MIMES = [...PHOTO_MIMES, 'application/pdf'];

const KINDS = {
  'profile-photo': { dir: 'profile-photos', roles: ['student', 'parent', 'teacher', 'registrar', 'record_keeper', 'adm_coordinator', 'guidance_counselor', 'principal', 'nurse'], mimes: PHOTO_MIMES },
  'report-card': { dir: 'report-cards', roles: ['record_keeper', 'registrar', 'principal'], mimes: DOC_MIMES },
  'adm-photo': { dir: 'adm-photos', roles: ['adm_coordinator'], mimes: PHOTO_MIMES },
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

router.post(
  '/uploads/:kind',
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
    const url = `/uploads/${KINDS[kind].dir}/${file.filename}`;
    if (kind === 'profile-photo') {
      await prisma.user.update({ where: { id: req.user!.id }, data: { profilePhotoUrl: url } });
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
