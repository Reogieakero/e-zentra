import { prisma } from '../lib/prisma';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { uploadSnapshot, revokeDriveAccess } from './googleDrive.service';

const SNAPSHOT_VERSION = 1;

const EXPORT_TABLES = [
  'user',
  'studentProfile',
  'parentProfile',
  'staffProfile',
  'parentStudentLink',
  'schoolYear',
  'term',
  'section',
  'subject',
  'teacherSubjectAssignment',
  'adviserAccessRequest',
  'anecdotalRecord',
  'anecdotalRecordFollowup',
  'referral',
  'healthRecord',
  'homeVisitationRecord',
  'admLearnerProfile',
  'admParentMeeting',
  'admModule',
  'attendanceRecord',
  'gradeComponent',
  'assessment',
  'studentGrade',
  'finalGrade',
  'studentRiskAssessment',
  'recordFlag',
  'studentReflection',
  'reportCard',
  'ocrJob',
  'reportCardExtraction',
  'notification',
] as const;

function serialize(value: unknown): string {
  return JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v));
}

export async function getBackupStatus(userId: string) {
  const link = await prisma.googleDriveLink.findUnique({ where: { userId } });
  const lastJob = await prisma.backupJob.findFirst({ orderBy: { createdAt: 'desc' } });
  return {
    enabled: config.backup.enabled,
    connected: Boolean(link),
    email: link?.email ?? null,
    folderId: link?.folderId ?? null,
    connectedAt: link?.connectedAt ?? null,
    lastBackup: lastJob
      ? {
          id: lastJob.id,
          status: lastJob.status,
          kind: lastJob.kind,
          fileName: lastJob.fileName,
          sizeBytes: lastJob.sizeBytes ? Number(lastJob.sizeBytes) : null,
          errorMessage: lastJob.errorMessage,
          createdAt: lastJob.createdAt,
          completedAt: lastJob.completedAt,
        }
      : null,
  };
}

export async function listBackupHistory(limit = 30) {
  const jobs = await prisma.backupJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      kind: true,
      status: true,
      fileName: true,
      sizeBytes: true,
      errorMessage: true,
      createdAt: true,
      completedAt: true,
      creator: { select: { firstName: true, lastName: true } },
    },
  });
  return jobs.map((j) => ({ ...j, sizeBytes: j.sizeBytes ? Number(j.sizeBytes) : null }));
}

export async function disconnectGoogleDrive(userId: string): Promise<void> {
  await revokeDriveAccess(userId);
}

async function snapshotData(): Promise<string> {
  const tables: Record<string, unknown[]> = {};
  for (const model of EXPORT_TABLES) {
    const delegate = (prisma as unknown as Record<string, { findMany: () => Promise<unknown[]> }>)[model];
    if (!delegate) continue;
    tables[model] = await delegate.findMany();
  }
  const snapshot = {
    version: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    schoolYear: await prisma.schoolYear.findFirst({ where: { status: 'active' } }).then((y) => y?.yearLabel ?? null),
    tables,
  };
  return serialize(snapshot);
}

export async function runBackup(userId: string, kind: 'manual' | 'automatic' = 'manual'): Promise<{ id: string; status: string }> {
  if (!config.backup.enabled) {
    throw ApiError.forbidden('Backup is disabled.');
  }
  const link = await prisma.googleDriveLink.findUnique({ where: { userId } });
  if (!link) {
    throw ApiError.forbidden('Connect Google Drive before running a backup.');
  }

  const job = await prisma.backupJob.create({
    data: { kind, status: 'running', createdBy: userId },
  });

  try {
    const content = await snapshotData();
    const fileName = `zentra-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const { fileId, sizeBytes } = await uploadSnapshot(userId, fileName, content);
    const completed = await prisma.backupJob.update({
      where: { id: job.id },
      data: { status: 'succeeded', fileId, fileName, sizeBytes, completedAt: new Date() },
      select: { id: true, status: true },
    });
    return completed;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Backup failed';
    await prisma.backupJob.update({
      where: { id: job.id },
      data: { status: 'failed', errorMessage: message, completedAt: new Date() },
    });
    throw err;
  }
}