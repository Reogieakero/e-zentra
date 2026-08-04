import { ConfidentialityLevel, Prisma, ReferredToRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { writeAudit } from './audit.service';
import { notify, notifyStudentAndParents } from './notification.service';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';
import { assertCanFileCaseRecord, assertCanViewStudentRecords } from '../utils/caseRecords';
import { redactSensitiveFields } from '../utils/confidentiality';
import { isBandOwner } from '../utils/access';

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
  if (query.sectionId) where.sectionId = query.sectionId as string;
  if (query.termId) where.termId = query.termId as string;
  if (viewerRole === 'student') where.studentId = viewerId;
  else if (viewerRole === 'parent') {
    const { getConfirmedChildIds } = await import('../utils/access');
    const childIds = await getConfirmedChildIds(viewerId);
    const requested = query.studentId as string | undefined;
    if (requested && !childIds.includes(requested)) return emptyPage(offset);
    where.studentId = requested ? requested : { in: childIds };
  } else if (query.studentId) where.studentId = query.studentId as string;

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

function emptyPage(offset: ReturnType<typeof parseOffsetPagination>) {
  return { data: [], page: offset.page, pageSize: offset.pageSize, total: 0, hasMore: false };
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

export async function listReferrals(viewer: { id: string; role: import('@prisma/client').Role }, query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.ReferralWhereInput = {};
  if (query.status) where.status = query.status as Prisma.ReferralWhereInput['status'];
  if (query.referredToRole) where.referredToRole = query.referredToRole as ReferredToRole;
  if (query.studentId) where.anecdotalRecord = { studentId: query.studentId as string };
  if (viewer.role === 'teacher') {
    const { getTeacherScopedSectionIds } = await import('../utils/access');
    const sectionIds = await getTeacherScopedSectionIds(viewer.id);
    where.anecdotalRecord = {
      ...((where.anecdotalRecord ?? {}) as Prisma.AnecdotalRecordWhereInput),
      sectionId: { in: sectionIds },
    } as Prisma.AnecdotalRecordWhereInput;
  }

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
  const data = rows.map((row) =>
    redactSensitiveFields(row, row.confidentialityLevel, { role: viewer.role, id: viewer.id }, row.referredBy, [
      'reasonForReferral',
    ] as (keyof typeof row & string)[])
  );
  return { data: serializeForOutput(data), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}

export async function getReferral(viewer: { id: string; role: import('@prisma/client').Role }, id: string) {
  const referral = await prisma.referral.findUnique({
    where: { id },
    include: {
      referred: { select: { id: true, firstName: true, lastName: true } },
      anecdotalRecord: {
        select: {
          id: true,
          studentId: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentProfile: { select: { gradeLevel: true } },
            },
          },
        },
      },
    },
  });
  if (!referral) throw ApiError.notFound('Referral not found');

  const studentId = referral.anecdotalRecord.studentId;
  const gradeLevel = referral.anecdotalRecord.student.studentProfile?.gradeLevel ?? null;
  const { assertCanViewStudentRecords } = await import('../utils/caseRecords');
  await assertCanViewStudentRecords(viewer, studentId);

  const isReferredParty = referral.referredToRole === viewer.role;
  const isPrincipal = viewer.role === 'principal';
  const isBandOwnerViewer = gradeLevel ? isBandOwner(viewer.role, gradeLevel) : false;
  const mayViewNested = isReferredParty || isPrincipal || isBandOwnerViewer;

  const payload: Record<string, unknown> = {
    ...referral,
    anecdotalRecord: {
      id: referral.anecdotalRecord.id,
      studentId,
      student: referral.anecdotalRecord.student,
    },
  };
  if (mayViewNested) {
    const [healthRecords, homeVisitations, admLearnerProfiles] = await Promise.all([
      prisma.healthRecord.findMany({
        where: { referralId: id },
        include: { attended: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.homeVisitationRecord.findMany({
        where: { referralId: id },
        include: { conducted: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.admLearnerProfile.findMany({ where: { referralId: id } }),
    ]);
    payload.healthRecords = healthRecords;
    payload.homeVisitations = homeVisitations;
    payload.admLearnerProfiles = admLearnerProfiles;
  } else {
    payload.healthRecords = [];
    payload.homeVisitations = [];
    payload.admLearnerProfiles = [];
  }

  return { data: serializeForOutput(payload) };
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
