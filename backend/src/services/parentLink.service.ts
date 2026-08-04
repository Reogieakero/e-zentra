import { ConfirmedVia, Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { serializeForOutput } from '../middleware/errorHandler';
import { writeAudit } from './audit.service';
import { notify } from './notification.service';

const STAFF_CONFIRMERS: Role[] = ['record_keeper', 'registrar', 'principal'];

const LINK_INCLUDE = {
  parent: { select: { id: true, firstName: true, lastName: true, email: true } },
  student: { select: { id: true, firstName: true, lastName: true, email: true } },
} as const;

export interface RequestParentLinkInput {
  studentId?: string;
  lrn?: string;
}

function resolveStudentByLrn(lrn: string) {
  return prisma.studentProfile.findUnique({
    where: { lrn },
    select: { id: true },
  });
}

export async function requestParentLink(parentId: string, input: RequestParentLinkInput) {
  if (!!input.studentId === !!input.lrn) {
    throw ApiError.validation('Provide exactly one of studentId or lrn');
  }
  const profile = input.lrn ? await resolveStudentByLrn(input.lrn) : null;
  const studentId = input.studentId ?? profile?.id;
  if (!studentId) {
    throw ApiError.notFound('No student found for the given LRN');
  }
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== 'student') {
    throw ApiError.notFound('Student not found');
  }

  const existing = await prisma.parentStudentLink.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
  });
  if (existing) {
    throw ApiError.conflict(`A link to this student already exists (status: ${existing.status})`);
  }

  const link = await prisma.parentStudentLink.create({
    data: { parentId, studentId },
    include: LINK_INCLUDE,
  });
  await notify({
    recipientId: studentId,
    sourceTable: 'parent_student_links',
    sourceRecordId: link.id,
    notificationType: 'parent_link_requested',
    title: 'Parent link requested',
    message: 'A parent has requested to be linked to your account.',
  });
  await writeAudit({ actorId: parentId, action: 'CREATE', tableName: 'parent_student_links', recordId: link.id, newValue: { parentId, studentId } as unknown as Prisma.InputJsonValue });
  return { data: serializeForOutput(link) };
}

export async function listParentLinks(actorId: string, actorRole: Role, query: Record<string, unknown>) {
  const rawPage = Number(query.page ?? 1);
  const rawPageSize = Number(query.pageSize ?? 20);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const pageSize = Number.isFinite(rawPageSize) ? Math.min(Math.max(1, Math.floor(rawPageSize)), 100) : 20;

  const where: Prisma.ParentStudentLinkWhereInput = {};
  if (actorRole === 'parent') {
    where.parentId = actorId;
  } else {
    if (query.parentId) where.parentId = query.parentId as string;
    if (query.studentId) where.studentId = query.studentId as string;
  }
  if (query.status) where.status = query.status as Prisma.ParentStudentLinkWhereInput['status'];

  const [total, rows] = await Promise.all([
    prisma.parentStudentLink.count({ where }),
    prisma.parentStudentLink.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: LINK_INCLUDE,
    }),
  ]);
  return { data: serializeForOutput(rows), page, pageSize, total, hasMore: page * pageSize < total };
}

async function findLinkOrThrow(id: string) {
  const link = await prisma.parentStudentLink.findUnique({ where: { id }, include: LINK_INCLUDE });
  if (!link) throw ApiError.notFound('Parent link not found');
  return link;
}

function assertActorCanResolve(actorId: string, actorRole: Role, linkParentId: string): ConfirmedVia {
  if (actorRole === 'parent') {
    if (actorId !== linkParentId) {
      throw ApiError.forbidden('You may only resolve your own parent links');
    }
    return 'parent_app';
  }
  if (STAFF_CONFIRMERS.includes(actorRole)) {
    return 'staff_recorded';
  }
  throw ApiError.forbidden('Only the linked parent or record custodian may resolve parent links');
}

export async function confirmParentLink(actorId: string, actorRole: Role, id: string) {
  const link = await findLinkOrThrow(id);
  const confirmedVia = assertActorCanResolve(actorId, actorRole, link.parentId);
  if (link.status !== 'pending_confirmation') {
    throw ApiError.conflict(`Only pending links may be confirmed (current status: ${link.status})`);
  }

  const updated = await prisma.parentStudentLink.update({
    where: { id },
    data: { status: 'confirmed', confirmedBy: actorId, confirmedAt: new Date(), confirmedVia },
    include: LINK_INCLUDE,
  });
  await writeAudit({ actorId, action: 'CONFIRM', tableName: 'parent_student_links', recordId: id, newValue: { status: 'confirmed' } as unknown as Prisma.InputJsonValue });
  const recipients = [...new Set([updated.parentId, updated.studentId])].filter((r) => r !== actorId);
  for (const recipientId of recipients) {
    await notify({
      recipientId,
      sourceTable: 'parent_student_links',
      sourceRecordId: id,
      notificationType: 'parent_link_confirmed',
      title: 'Parent link confirmed',
      message: 'Your parent-student link has been confirmed.',
    });
  }
  return { data: serializeForOutput(updated) };
}

export async function rejectParentLink(actorId: string, actorRole: Role, id: string) {
  const link = await findLinkOrThrow(id);
  const confirmedVia = assertActorCanResolve(actorId, actorRole, link.parentId);
  if (link.status !== 'pending_confirmation') {
    throw ApiError.conflict(`Only pending links may be rejected (current status: ${link.status})`);
  }

  const updated = await prisma.parentStudentLink.update({
    where: { id },
    data: { status: 'rejected', confirmedBy: actorId, confirmedAt: new Date(), confirmedVia },
    include: LINK_INCLUDE,
  });
  await writeAudit({ actorId, action: 'REJECT', tableName: 'parent_student_links', recordId: id, newValue: { status: 'rejected' } as unknown as Prisma.InputJsonValue });
  const recipients = [...new Set([updated.parentId, updated.studentId])].filter((r) => r !== actorId);
  for (const recipientId of recipients) {
    await notify({
      recipientId,
      sourceTable: 'parent_student_links',
      sourceRecordId: id,
      notificationType: 'parent_link_confirmed',
      title: 'Parent link rejected',
      message: 'Your parent-student link was rejected.',
    });
  }
  return { data: serializeForOutput(updated) };
}
