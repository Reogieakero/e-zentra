import { config } from '../config/env';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { runBackup } from '../services/backup.service';

let timer: NodeJS.Timeout | null = null;

async function findBackupPrincipal(): Promise<string | null> {
  const link = await prisma.googleDriveLink.findFirst({
    orderBy: { connectedAt: 'asc' },
    select: { userId: true },
  });
  return link?.userId ?? null;
}

export async function runAutomaticBackup(): Promise<boolean> {
  if (!config.backup.enabled) return false;
  const userId = await findBackupPrincipal();
  if (!userId) return false;

  const intervalMs = config.backup.intervalHours * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - intervalMs);
  const recent = await prisma.backupJob.findFirst({
    where: { kind: 'automatic', status: 'succeeded', createdAt: { gte: cutoff } },
    select: { id: true },
  });
  if (recent) return false;

  try {
    await runBackup(userId, 'automatic');
    logger.info('Automatic backup completed');
    return true;
  } catch (err) {
    logger.warn({ err }, 'Automatic backup failed');
    return false;
  }
}

export function startBackupJob(): void {
  if (!config.backup.enabled) return;
  if (timer) return;
  void runAutomaticBackup();
  timer = setInterval(() => void runAutomaticBackup().catch((err) => logger.warn({ err }, 'Backup job failed')), 60_000);
  timer.unref();
}