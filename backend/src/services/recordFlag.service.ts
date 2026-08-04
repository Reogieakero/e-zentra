import { Prisma, RecordFlagStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { writeAudit } from './audit.service';
import { notify } from './notification.service';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';

const FLAG_SOURCE_TABLES = new Set([
  'anecdotal_records',
  'referrals',
  'health_records',
  'home_visitation_records',
  'adm_learner_profiles',
  'final_grades',
  'attendance_records',
  'student_risk_assessments',
]);

export interface CreateFlagInput {
  sourceTable: string;
  sourceRecordId: string;
  flagReason: string;
}

export async function createRecordFlag(actorId: string, input: CreateFlagInput) {
  if (!FLAG_SOURCE_TABLES.has(input.sourceTable)) {
    throw ApiError.validation(`sourceTable must be one of: ${Array.from(FLAG_SOURCE_TABLES).join(', ')}`);
  }
  const flag = await prisma.recordFlag.create({
    data: { sourceTable: input.sourceTable, sourceRecordId: input.sourceRecordId, flaggedBy: actorId, flagReason: input.flagReason },
  });
  await writeAudit({ actorId, action: 'FLAG', tableName: 'record_flags', recordId: flag.id, newValue: input as unknown as Prisma.InputJsonValue });

  const bandOwners = await prisma.user.findMany({ where: { role: { in: ['record_keeper', 'registrar'] } }, select: { id: true } });
  for (const owner of bandOwners) {
    await notify({
      recipientId: owner.id,
      sourceTable: 'record_flags',
      sourceRecordId: flag.id,
      notificationType: 'record_flagged',
      title: 'Record flagged',
      message: 'A record has been flagged for review.',
    });
  }
  return { data: serializeForOutput(flag) };
}

export async function resolveRecordFlag(actorId: string, id: string) {
  const flag = await prisma.recordFlag.findUnique({ where: { id } });
  if (!flag) throw ApiError.notFound('Record flag not found');
  if (flag.status !== 'open') throw ApiError.conflict('Only open flags may be resolved');

  const updated = await prisma.recordFlag.update({ where: { id }, data: { status: 'resolved', resolvedBy: actorId, resolvedAt: new Date() } });
  await writeAudit({ actorId, action: 'RESOLVE', tableName: 'record_flags', recordId: id, newValue: { status: 'resolved' } as unknown as Prisma.InputJsonValue });
  return { data: serializeForOutput(updated) };
}

export async function escalateRecordFlag(actorId: string, id: string) {
  const flag = await prisma.recordFlag.findUnique({ where: { id } });
  if (!flag) throw ApiError.notFound('Record flag not found');
  if (flag.escalatedToPrincipal) throw ApiError.conflict('Flag has already been escalated');

  const updated = await prisma.recordFlag.update({
    where: { id },
    data: { escalatedToPrincipal: true, escalatedAt: new Date() },
  });
  await writeAudit({ actorId, action: 'ESCALATE', tableName: 'record_flags', recordId: id, newValue: { escalatedToPrincipal: true } as unknown as Prisma.InputJsonValue });

  const principals = await prisma.user.findMany({ where: { role: 'principal' }, select: { id: true } });
  for (const principal of principals) {
    await notify({
      recipientId: principal.id,
      sourceTable: 'record_flags',
      sourceRecordId: id,
      notificationType: 'record_flag_escalated',
      title: 'Record flag escalated',
      message: 'A record flag was escalated to the Principal.',
    });
  }
  return { data: serializeForOutput(updated) };
}

export async function listRecordFlags(query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.RecordFlagWhereInput = {};
  if (query.status) where.status = query.status as RecordFlagStatus;
  if (query.sourceTable) where.sourceTable = query.sourceTable as string;
  if (query.escalatedToPrincipal) where.escalatedToPrincipal = query.escalatedToPrincipal === 'true';

  const [total, rows] = await Promise.all([
    prisma.recordFlag.count({ where }),
    prisma.recordFlag.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: {
        flagged: { select: { id: true, firstName: true, lastName: true } },
        resolver: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}
