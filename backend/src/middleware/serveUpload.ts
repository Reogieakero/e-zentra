import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

const SERVED_DIRS = ['profile-photos', 'report-cards', 'adm-photos'] as const;

const STAFF_VIEWERS: ReadonlySet<string> = new Set([
  'teacher',
  'registrar',
  'record_keeper',
  'adm_coordinator',
  'guidance_counselor',
  'principal',
  'nurse',
]);

export async function serveUpload(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = (req as Request & { user?: { id: string; role: string } }).user;
  if (!user) return next(ApiError.unauthorized());

  const rel = (req.path as string).replace(/^\/+/, '');
  const segments = rel.split('/').filter(Boolean);
  if (segments.length !== 2 || !(SERVED_DIRS as readonly string[]).includes(segments[0])) {
    return next(ApiError.notFound('File not found'));
  }
  const [dir, fileName] = segments;
  if (!/^[0-9a-f-]+\.(jpg|jpeg|png|webp|pdf)$/i.test(fileName)) {
    return next(ApiError.notFound('File not found'));
  }

  const fullPath = path.resolve(config.security.uploadDir, dir, fileName);
  const baseDir = path.resolve(config.security.uploadDir);
  if (!fullPath.startsWith(baseDir + path.sep)) {
    return next(ApiError.forbidden('File access denied'));
  }

  if (!(await viewerMayReadFile(user, dir, fileName))) {
    return next(ApiError.forbidden('You may not view this file'));
  }

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    return next(ApiError.notFound('File not found'));
  }
  res.sendFile(fullPath);
}

async function viewerMayReadFile(
  viewer: { id: string; role: string },
  dir: string,
  fileName: string
): Promise<boolean> {
  if (dir === 'profile-photos') return true;

  const fileUrl = `/uploads/${dir}/${fileName}`;
  if (dir === 'report-cards') {
    const card = await prisma.reportCard.findFirst({
      where: { fileUrl },
      select: { studentId: true, status: true },
    });
    if (!card) return STAFF_VIEWERS.has(viewer.role);
    if (STAFF_VIEWERS.has(viewer.role)) return true;
    if (card.status !== 'released') return false;
    return mayViewStudentFile(viewer, card.studentId, card.status);
  }

  const profile = await prisma.admLearnerProfile.findFirst({
    where: { photoUrl: fileUrl },
    select: { studentId: true },
  });
  if (!profile) return STAFF_VIEWERS.has(viewer.role);
  return mayViewStudentFile(viewer, profile.studentId, 'released');
}

async function mayViewStudentFile(
  viewer: { id: string; role: string },
  studentId: string,
  requiredStatus: string
): Promise<boolean> {
  if (STAFF_VIEWERS.has(viewer.role)) return true;
  if (viewer.role === 'student') return viewer.id === studentId;
  if (viewer.role === 'parent') {
    const link = await prisma.parentStudentLink.findFirst({
      where: { parentId: viewer.id, studentId, status: 'confirmed' },
    });
    return Boolean(link);
  }
  return false;
}
