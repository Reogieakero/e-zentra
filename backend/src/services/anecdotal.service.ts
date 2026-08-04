import { ConfidentialityLevel, Prisma, ReferredToRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { writeAudit } from './audit.service';
import { notify, notifyStudentAndParents } from './notification.service';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';
import { assertCanFileCaseRecord, assertCanViewStudentRecords } from '../utils/caseRecords';
import { redactSensitiveFields } from '../utils/confidentiality';

export interface CreateAnecdotalInput {
  studentId: string;
  sectionId: string;
  termId: string;
  observationDate: string;
  observationTime?: string | null;
  incidentDescription: string;
  locationSetting?: string | null;
  notesRecommendationsActions?: string | null;
  classPerformance?: string | null;
  attendanceSummary?: string | null;
  confidentialityLevel?: ConfidentialityLevel;
}

export async function createAnecdotal(actorId: string, actorRole: import('@prisma/client').Role, input: CreateAnecdotalInput) {
  await assertCanFileCaseRecord(actorId, actorRole, input.sectionId);
  const student = await prisma.user.findUnique({ where: { id: input.studentId } });
  if (!student || student.role !== 'student') throw ApiError.badRequest('studentId must reference a student');

  const record = await prisma.anecdotalRecord.create({
    data: {
      observerId: actorId,
      studentId: input.studentId,
      sectionId: input.sectionId,
      termId: input.termId,
      observationDate: new Date(input.observationDate),
      observationTime: input.observationTime ? new Date(`1970-01-01T${input.observationTime}`) : null,
      incidentDescription: input.incidentDescription,
      locationSetting: input.locationSetting,
      notesRecommendationsActions: input.notesRecommendationsActions,
      classPerformance: input.classPerformance,
      attendanceSummary: input.attendanceSummary,
      confidentialityLevel: input.confidentialityLevel ?? 'confidential',
    },
  });

  await writeAudit({ actorId, action: 'CREATE', tableName: 'anecdotal_records', recordId: record.id, newValue: input as unknown as Prisma.InputJsonValue });
  await notifyStudentAndParents(input.studentId, {
    sourceTable: 'anecdotal_records',
    sourceRecordId: record.id,
    notificationType: 'new_anecdotal_record',
    title: 'New anecdotal record',
    message: 'A new anecdotal record was filed that may relate to you.',
    notifyParents: true,
  });
  return { data: serializeForOutput(record) };
}

export async function listAnecdotalRecords(viewerId: string, viewerRole: import('@prisma/client').Role, query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.AnecdotalRecordWhereInput = {};
  if (query.studentId) where.studentId = query.studentId as string;
  if (query.sectionId) where.sectionId = query.sectionId as string;
  if (query.termId) where.termId = query.termId as string;
  if (viewerRole === 'student') where.studentId = viewerId;

  const [total, rows] = await Promise.all([
    prisma.anecdotalRecord.count({ where }),
    prisma.anecdotalRecord.findMany({
      where,
      orderBy: { observationDate: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: {
        observer: { select: { id: true, firstName: true, lastName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
        section: { select: { id: true, sectionName: true, gradeLevel: true } },
        term: { select: { id: true, termLabel: true } },
        followups: { orderBy: { followupDate: 'desc' } },
      },
    }),
  ]);

  const data = rows.map((row) => redactAnecdotalFor(row, viewerId, viewerRole));
  return { data: serializeForOutput(data), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}

export async function getAnecdotal(viewerId: string, viewerRole: import('@prisma/client').Role, id: string) {
  const record = await prisma.anecdotalRecord.findUnique({
    where: { id },
    include: {
      observer: { select: { id: true, firstName: true, lastName: true } },
      student: { select: { id: true, firstName: true, lastName: true } },
      section: { select: { id: true, sectionName: true, gradeLevel: true } },
      term: { select: { id: true, termLabel: true } },
      followups: { orderBy: { followupDate: 'desc' } },
    },
  });
  if (!record) throw ApiError.notFound('Anecdotal record not found');
  await assertCanViewStudentRecords({ id: viewerId, role: viewerRole }, record.studentId);
  return { data: serializeForOutput(redactAnecdotalFor(record, viewerId, viewerRole)) };
}

export async function addFollowup(actorId: string, anecdotalId: string, followupDate: string, followupNotes: string) {
  const record = await prisma.anecdotalRecord.findUnique({ where: { id: anecdotalId } });
  if (!record) throw ApiError.notFound('Anecdotal record not found');

  const followup = await prisma.anecdotalRecordFollowup.create({
    data: { anecdotalRecordId: anecdotalId, followedUpBy: actorId, followupDate: new Date(followupDate), followupNotes },
  });
  await writeAudit({ actorId, action: 'CREATE', tableName: 'anecdotal_record_followups', recordId: followup.id, newValue: { anecdotalRecordId: anecdotalId } as unknown as Prisma.InputJsonValue });
  await notify({
    recipientId: record.observerId === actorId ? record.studentId : record.observerId,
    sourceTable: 'anecdotal_records',
    sourceRecordId: anecdotalId,
    notificationType: 'new_followup',
    title: 'Anecdotal follow-up added',
    message: 'A follow-up was added to an anecdotal record.',
  });
  return { data: serializeForOutput(followup) };
}



export interface CreateReferralInput {
  anecdotalRecordId: string;
  referredToRole: ReferredToRole;
  reasonForReferral: string;
  confidentialityLevel?: ConfidentialityLevel;
}

export async function createReferral(actorId: string, actorRole: import('@prisma/client').Role, input: CreateReferralInput) {
  const anecdotal = await prisma.anecdotalRecord.findUnique({ where: { id: input.anecdotalRecordId } });
  if (!anecdotal) throw ApiError.notFound('Anecdotal record not found');
  if (actorRole !== 'guidance_counselor') {
    if (anecdotal.observerId !== actorId) throw ApiError.forbidden('Only the original observer or a Guidance Counselor may create referrals from this record');
  }

  const referral = await prisma.referral.create({
    data: {
      anecdotalRecordId: input.anecdotalRecordId,
      referredToRole: input.referredToRole,
      referredBy: actorId,
      reasonForReferral: input.reasonForReferral,
      confidentialityLevel: input.confidentialityLevel ?? 'confidential',
    },
  });

  await writeAudit({ actorId, action: 'CREATE', tableName: 'referrals', recordId: referral.id, newValue: input as unknown as Prisma.InputJsonValue });
  await notifyStudentAndParents(anecdotal.studentId, {
    sourceTable: 'referrals',
    sourceRecordId: referral.id,
    notificationType: 'new_referral',
    title: 'New referral',
    message: 'A referral was raised regarding this learner.',
    notifyParents: true,
  });
  return { data: serializeForOutput(referral) };
}

export async function listReferrals(query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.ReferralWhereInput = {};
  if (query.status) where.status = query.status as Prisma.ReferralWhereInput['status'];
  if (query.referredToRole) where.referredToRole = query.referredToRole as ReferredToRole;
  if (query.studentId) where.anecdotalRecord = { studentId: query.studentId as string };

  const [total, rows] = await Promise.all([
    prisma.referral.count({ where }),
    prisma.referral.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: {
        referred: { select: { id: true, firstName: true, lastName: true } },
        anecdotalRecord: { select: { id: true, studentId: true, student: { select: { id: true, firstName: true, lastName: true } } } },
      },
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}

export async function getReferral(id: string) {
  const referral = await prisma.referral.findUnique({
    where: { id },
    include: {
      referred: { select: { id: true, firstName: true, lastName: true } },
      anecdotalRecord: { select: { id: true, studentId: true, student: { select: { id: true, firstName: true, lastName: true } } } },
      healthRecords: true,
      homeVisitations: true,
      admLearnerProfiles: true,
    },
  });
  if (!referral) throw ApiError.notFound('Referral not found');
  return { data: serializeForOutput(referral) };
}

export async function updateReferralStatus(actorId: string, id: string, status: 'pending' | 'in_progress' | 'completed') {
  const referral = await prisma.referral.findUnique({ where: { id }, include: { anecdotalRecord: true } });
  if (!referral) throw ApiError.notFound('Referral not found');

  const updated = await prisma.referral.update({ where: { id }, data: { status } });
  await writeAudit({
    actorId,
    action: 'UPDATE',
    tableName: 'referrals',
    recordId: id,
    oldValue: { status: referral.status } as unknown as Prisma.InputJsonValue,
    newValue: { status } as unknown as Prisma.InputJsonValue,
  });
  if (status === 'completed') {
    await notifyStudentAndParents(referral.anecdotalRecord.studentId, {
      sourceTable: 'referrals',
      sourceRecordId: id,
      notificationType: 'referral_completed',
      title: 'Referral completed',
      message: 'A referral concerning this learner has been completed.',
      notifyParents: true,
    });
  }
  return { data: serializeForOutput(updated) };
}



function redactAnecdotalFor<T extends Record<string, unknown>>(record: T, viewerId: string, viewerRole: import('@prisma/client').Role): T {
  return redactSensitiveFields(record, record.confidentialityLevel as ConfidentialityLevel, { role: viewerRole, id: viewerId }, record.observerId as string, [
    'incidentDescription',
    'notesRecommendationsActions',
    'classPerformance',
    'attendanceSummary',
    'locationSetting',
  ] as (keyof T & string)[]);
}
