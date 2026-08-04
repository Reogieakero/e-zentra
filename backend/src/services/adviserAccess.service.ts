import { AdviserAccessStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { assertGradeBandOwnership } from '../utils/gradeBand';
import { writeAudit } from './audit.service';
import { notify } from './notification.service';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';

export async function requestAdviserAccess(actorId: string, sectionId: string, reason?: string) {
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) throw ApiError.notFound('Section not found');

  const existing = await prisma.adviserAccessRequest.findFirst({
    where: { adviserId: actorId, sectionId, status: 'pending' },
  });
  if (existing) throw ApiError.conflict('A pending request for this section already exists');

  const created = await prisma.adviserAccessRequest.create({
    data: { adviserId: actorId, sectionId, reason },
  });

  const bandOwnerRole = section.gradeLevel === 'grade_11' || section.gradeLevel === 'grade_12' ? 'registrar' : 'record_keeper';
  const reviewers = await prisma.user.findMany({ where: { role: bandOwnerRole }, select: { id: true } });
  for (const reviewer of reviewers) {
    await notify({
      recipientId: reviewer.id,
      sourceTable: 'adviser_access_requests',
      sourceRecordId: created.id,
      notificationType: 'adviser_access_requested',
      title: 'New adviser access request',
      message: `An adviser requested fuller record access for section ${section.sectionName}.`,
    });
  }
  return { data: serializeForOutput(created) };
}

export async function reviewAdviserAccess(actorId: string, actorRole: import('@prisma/client').Role, id: string, decision: 'approved' | 'denied') {
  const request = await prisma.adviserAccessRequest.findUnique({ where: { id } });
  if (!request) throw ApiError.notFound('Access request not found');
  if (request.status !== 'pending') throw ApiError.conflict('This request has already been reviewed');

  const section = await prisma.section.findUnique({ where: { id: request.sectionId } });
  if (!section) throw ApiError.notFound('Section not found');
  assertGradeBandOwnership(actorRole, section.gradeLevel);

  const updated = await prisma.adviserAccessRequest.update({
    where: { id },
    data: { status: decision, reviewedBy: actorId, reviewedAt: new Date() },
  });

  await writeAudit({
    actorId,
    action: 'REVIEW',
    tableName: 'adviser_access_requests',
    recordId: id,
    oldValue: { status: request.status } as unknown as Prisma.InputJsonValue,
    newValue: { status: decision } as unknown as Prisma.InputJsonValue,
  });
  await notify({
    recipientId: request.adviserId,
    sourceTable: 'adviser_access_requests',
    sourceRecordId: id,
    notificationType: 'adviser_access_decided',
    title: `Adviser access ${decision}`,
    message: `Your access request for section ${section.sectionName} was ${decision}.`,
  });
  return { data: serializeForOutput(updated) };
}

export async function listAdviserAccessRequests(query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.AdviserAccessRequestWhereInput = {};
  if (query.status) where.status = query.status as AdviserAccessStatus;
  if (query.sectionId) where.sectionId = query.sectionId as string;
  if (query.adviserId) where.adviserId = query.adviserId as string;

  const [total, rows] = await Promise.all([
    prisma.adviserAccessRequest.count({ where }),
    prisma.adviserAccessRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: {
        adviser: { select: { id: true, firstName: true, lastName: true } },
        section: { select: { id: true, sectionName: true, gradeLevel: true } },
      },
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}
