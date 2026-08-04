import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';

export interface AuditEntry {
  actorId: string;
  action: string;
  tableName: string;
  recordId: string;
  oldValue?: Prisma.InputJsonValue;
  newValue?: Prisma.InputJsonValue;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  if (!entry.recordId) {
    throw ApiError.badRequest('recordId is required for audit logging');
  }
  await prisma.auditLog.create({
    data: {
      actorId: entry.actorId,
      action: entry.action,
      tableName: entry.tableName,
      recordId: entry.recordId,
      oldValue: entry.oldValue,
      newValue: entry.newValue,
    },
  });
}
