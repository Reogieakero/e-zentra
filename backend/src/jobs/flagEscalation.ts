import { config } from '../config/env';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { notify } from '../services/notification.service';

let timer: NodeJS.Timeout | null = null;

export async function runFlagEscalation(): Promise<number> {
  const cutoff = new Date(Date.now() - config.flags.recordFlagEscalationDays * 24 * 60 * 60 * 1000);
  const staleFlags = await prisma.recordFlag.findMany({
    where: { status: 'open', escalatedToPrincipal: false, createdAt: { lt: cutoff } },
    select: { id: true, sourceTable: true, sourceRecordId: true },
  });

  for (const flag of staleFlags) {
    await prisma.recordFlag.update({
      where: { id: flag.id },
      data: { escalatedToPrincipal: true, escalatedAt: new Date() },
    });
    const principals = await prisma.user.findMany({ where: { role: 'principal' }, select: { id: true } });
    for (const principal of principals) {
      await notify({
        recipientId: principal.id,
        sourceTable: 'record_flags',
        sourceRecordId: flag.id,
        notificationType: 'record_flag_escalated',
        title: 'Record flag escalated',
        message: `A flag on ${flag.sourceTable} remained open beyond the escalation threshold and was escalated to you.`,
      });
    }
  }

  if (staleFlags.length > 0) {
    logger.info({ escalated: staleFlags.length }, 'Escalated stale record flags');
  }
  return staleFlags.length;
}

export function startEscalationJob(): void {
  if (!config.flags.recordFlagEscalationEnabled) return;
  if (timer) return;
  void runFlagEscalation();
  timer = setInterval(() => void runFlagEscalation().catch((err) => logger.warn({ err }, 'Flag escalation job failed')), 60_000);
  timer.unref();
}
