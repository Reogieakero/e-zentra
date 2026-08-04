import { Prisma, ReportCardSource } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { writeAudit } from './audit.service';
import { notifyStudentAndParents } from './notification.service';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';

export interface CreateReportCardInput {
  studentId: string;
  termId: string;
  source: ReportCardSource;
  fileUrl?: string | null;
}

export async function createReportCard(actorId: string, actorRole: import('@prisma/client').Role, input: CreateReportCardInput) {
  if (actorRole !== 'record_keeper' && actorRole !== 'registrar' && actorRole !== 'principal') {
    throw ApiError.forbidden('Only record custodians or the Principal may create report cards');
  }
  const existing = await prisma.reportCard.findFirst({
    where: { studentId: input.studentId, termId: input.termId },
  });
  if (existing) throw ApiError.conflict('A report card for this student and term already exists');

  const card = await prisma.reportCard.create({
    data: {
      studentId: input.studentId,
      termId: input.termId,
      source: input.source,
      fileUrl: input.fileUrl,
      status: input.source === 'scanned_upload' ? 'pending' : 'pending',
      scannedBy: input.source === 'scanned_upload' ? actorId : null,
      managedBy: actorId,
    },
  });
  await writeAudit({ actorId, action: 'CREATE', tableName: 'report_cards', recordId: card.id, newValue: input as unknown as Prisma.InputJsonValue });
  return { data: serializeForOutput(card) };
}

export async function markReportCardReady(actorId: string, id: string) {
  const card = await prisma.reportCard.findUnique({ where: { id } });
  if (!card) throw ApiError.notFound('Report card not found');
  if (card.status !== 'pending') throw ApiError.conflict('Only pending report cards may be marked ready');

  const updated = await prisma.reportCard.update({
    where: { id },
    data: { status: 'ready', managedBy: actorId },
  });
  await writeAudit({ actorId, action: 'READY', tableName: 'report_cards', recordId: id, newValue: { status: 'ready' } as unknown as Prisma.InputJsonValue });
  return { data: serializeForOutput(updated) };
}

export async function releaseReportCard(actorId: string, id: string) {
  const card = await prisma.reportCard.findUnique({ where: { id } });
  if (!card) throw ApiError.notFound('Report card not found');
  if (card.status !== 'ready') throw ApiError.conflict('Only ready report cards may be released');

  const updated = await prisma.reportCard.update({
    where: { id },
    data: { status: 'released', managedBy: actorId, releasedAt: new Date() },
  });
  await notifyStudentAndParents(card.studentId, {
    sourceTable: 'report_cards',
    sourceRecordId: id,
    notificationType: 'report_card_ready',
    title: 'Report card released',
    message: 'Your report card is now available.',
  });
  return { data: serializeForOutput(updated) };
}

export async function generateReportCardsForTerm(actorId: string, actorRole: import('@prisma/client').Role, termId: string) {
  if (actorRole !== 'record_keeper' && actorRole !== 'registrar' && actorRole !== 'principal') {
    throw ApiError.forbidden('Only record custodians or the Principal may generate report cards');
  }
  const term = await prisma.term.findUnique({ where: { id: termId } });
  if (!term) throw ApiError.notFound('Term not found');

  const rows = await prisma.finalGrade.findMany({
    where: { termId },
    select: { studentId: true },
    distinct: ['studentId'],
  });
  const studentIds = rows.map((r) => r.studentId);
  if (studentIds.length === 0) {
    return { data: [], created: 0, message: 'No final grades exist for this term; nothing to generate' };
  }

  const existing = await prisma.reportCard.findMany({
    where: { termId, studentId: { in: studentIds } },
    select: { studentId: true },
  });
  const existingSet = new Set(existing.map((e) => e.studentId));
  const missing = studentIds.filter((id) => !existingSet.has(id));

  const created = await prisma.$transaction(async (tx) => {
    const cards: Prisma.ReportCardGetPayload<{}>[] = [];
    for (const studentId of missing) {
      const card = await tx.reportCard.create({
        data: {
          studentId,
          termId,
          source: 'system_generated',
          status: 'ready',
          managedBy: actorId,
          generatedAt: new Date(),
        },
      });
      cards.push(card);
    }
    return cards;
  });

  if (created.length > 0) {
    for (const card of created) {
      await writeAudit({ actorId, action: 'GENERATE', tableName: 'report_cards', recordId: card.id, newValue: { termId, source: 'system_generated' } as unknown as Prisma.InputJsonValue });
      await notifyStudentAndParents(card.studentId, {
        sourceTable: 'report_cards',
        sourceRecordId: card.id,
        notificationType: 'report_card_ready',
        title: 'Report card generated',
        message: 'Your report card for this term has been generated and is ready.',
      });
    }
  }
  return { data: serializeForOutput(created), created: created.length };
}

export async function listReportCards(viewer: { id: string; role: import('@prisma/client').Role }, query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.ReportCardWhereInput = {};
  if (query.termId) where.termId = query.termId as string;
  if (query.status) where.status = query.status as Prisma.ReportCardWhereInput['status'];

  if (viewer.role === 'student') {
    if (query.studentId && query.studentId !== viewer.id) {
      throw ApiError.forbidden('You may only view your own report cards');
    }
    where.studentId = viewer.id;
    where.status = 'released';
  } else if (viewer.role === 'parent') {
    const children = await prisma.parentStudentLink.findMany({
      where: { parentId: viewer.id, status: 'confirmed' },
      select: { studentId: true },
    });
    const childIds = children.map((c) => c.studentId);
    if (childIds.length === 0) {
      return { data: [], page: offset.page, pageSize: offset.pageSize, total: 0, hasMore: false };
    }
    if (query.studentId && !childIds.includes(query.studentId as string)) {
      throw ApiError.forbidden('You may only view report cards of your confirmed children');
    }
    where.studentId = { in: childIds };
    where.status = 'released';
  } else if (query.studentId) {
    where.studentId = query.studentId as string;
  }

  const [total, rows] = await Promise.all([
    prisma.reportCard.count({ where }),
    prisma.reportCard.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        term: { select: { id: true, termLabel: true } },
      },
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}
