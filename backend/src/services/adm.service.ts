import { AdmModuleStatus, AdmProfileStatus, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { writeAudit } from './audit.service';
import { notify, notifyStudentAndParents } from './notification.service';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';

export interface CreateAdmProfileInput {
  studentId: string;
  sectionId: string;
  termId: string;
  referralId: string;
  teacherAdviserId?: string | null;
  photoUrl?: string | null;
  reasonForAdm: string;
  admInterventionDescription: string;
  admInterventionResult?: string | null;
  alternateAdmCoordinatorId?: string | null;
}

export async function createAdmProfile(actorId: string, actorRole: import('@prisma/client').Role, input: CreateAdmProfileInput) {
  if (actorRole !== 'adm_coordinator') throw ApiError.forbidden('Only an ADM Coordinator may prepare an ADM learner profile');
  const referral = await prisma.referral.findUnique({ where: { id: input.referralId } });
  if (!referral) throw ApiError.notFound('Referral not found');

  const profile = await prisma.admLearnerProfile.create({
    data: {
      studentId: input.studentId,
      sectionId: input.sectionId,
      termId: input.termId,
      referralId: input.referralId,
      teacherAdviserId: input.teacherAdviserId,
      photoUrl: input.photoUrl,
      reasonForAdm: input.reasonForAdm,
      admInterventionDescription: input.admInterventionDescription,
      admInterventionResult: input.admInterventionResult,
      preparedBy: actorId,
      alternateAdmCoordinatorId: input.alternateAdmCoordinatorId,
    },
  });

  await writeAudit({ actorId, action: 'CREATE', tableName: 'adm_learner_profiles', recordId: profile.id, newValue: input as unknown as Prisma.InputJsonValue });

  const principals = await prisma.user.findMany({ where: { role: 'principal' }, select: { id: true } });
  for (const p of principals) {
    await notify({
      recipientId: p.id,
      sourceTable: 'adm_learner_profiles',
      sourceRecordId: profile.id,
      notificationType: 'new_adm_profile',
      title: 'New ADM learner profile awaiting approval',
      message: 'An ADM learner profile was prepared and is awaiting your approval.',
    });
  }
  return { data: serializeForOutput(profile) };
}

export async function submitAdmProfile(actorId: string, id: string) {
  const profile = await prisma.admLearnerProfile.findUnique({ where: { id } });
  if (!profile) throw ApiError.notFound('ADM learner profile not found');
  if (profile.status !== 'draft') throw ApiError.conflict('Only draft profiles may be submitted');

  const updated = await prisma.admLearnerProfile.update({ where: { id }, data: { status: 'submitted' } });
  await writeAudit({ actorId, action: 'SUBMIT', tableName: 'adm_learner_profiles', recordId: id, newValue: { status: 'submitted' } as unknown as Prisma.InputJsonValue });
  return { data: serializeForOutput(updated) };
}

export async function approveAdmProfile(actorId: string, actorRole: import('@prisma/client').Role, id: string) {
  if (actorRole !== 'principal') throw ApiError.forbidden('Only the Principal may approve ADM learner profiles');
  const profile = await prisma.admLearnerProfile.findUnique({ where: { id } });
  if (!profile) throw ApiError.notFound('ADM learner profile not found');
  if (profile.status !== 'submitted') throw ApiError.conflict('Only submitted profiles may be approved');

  const updated = await prisma.admLearnerProfile.update({
    where: { id },
    data: { status: 'approved', approvedBy: actorId },
  });
  await writeAudit({ actorId, action: 'APPROVE', tableName: 'adm_learner_profiles', recordId: id, newValue: { status: 'approved' } as unknown as Prisma.InputJsonValue });
  await notifyStudentAndParents(profile.studentId, {
    sourceTable: 'adm_learner_profiles',
    sourceRecordId: id,
    notificationType: 'new_adm_profile',
    title: 'ADM profile approved',
    message: 'Your ADM learner profile has been approved.',
  });
  return { data: serializeForOutput(updated) };
}

export async function listAdmProfiles(query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.AdmLearnerProfileWhereInput = {};
  if (query.status) where.status = query.status as AdmProfileStatus;
  if (query.studentId) where.studentId = query.studentId as string;

  const [total, rows] = await Promise.all([
    prisma.admLearnerProfile.count({ where }),
    prisma.admLearnerProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        prepared: { select: { id: true, firstName: true, lastName: true } },
        approved: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}

export async function getAdmProfile(id: string) {
  const profile = await prisma.admLearnerProfile.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      prepared: { select: { id: true, firstName: true, lastName: true } },
      approved: { select: { id: true, firstName: true, lastName: true } },
      teacherAdviser: { select: { id: true, firstName: true, lastName: true } },
      parentMeetings: { orderBy: { meetingDate: 'desc' } },
      admModules: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!profile) throw ApiError.notFound('ADM learner profile not found');
  return { data: serializeForOutput(profile) };
}



export interface CreateAdmMeetingInput {
  admLearnerProfileId: string;
  meetingDate: string;
  parentsAttended: boolean;
  confirmedVia?: 'parent_app' | 'staff_recorded';
  minutesOfMeeting?: string | null;
  attendanceLogbookReference?: string | null;
  adviserId?: string | null;
}

export async function createAdmMeeting(actorId: string, input: CreateAdmMeetingInput) {
  const profile = await prisma.admLearnerProfile.findUnique({ where: { id: input.admLearnerProfileId } });
  if (!profile) throw ApiError.notFound('ADM learner profile not found');

  const meeting = await prisma.admParentMeeting.create({
    data: {
      admLearnerProfileId: input.admLearnerProfileId,
      meetingDate: new Date(input.meetingDate),
      parentsAttended: input.parentsAttended,
      confirmedVia: input.confirmedVia ?? 'staff_recorded',
      confirmedBy: input.confirmedVia === 'parent_app' ? actorId : null,
      minutesOfMeeting: input.minutesOfMeeting,
      attendanceLogbookReference: input.attendanceLogbookReference,
      conductedBy: actorId,
      adviserId: input.adviserId,
    },
  });
  await writeAudit({ actorId, action: 'CREATE', tableName: 'adm_parent_meetings', recordId: meeting.id, newValue: input as unknown as Prisma.InputJsonValue });
  return { data: serializeForOutput(meeting) };
}



export async function releaseAdmModule(actorId: string, admLearnerProfileId: string, input: {
  releaseDate?: string | null;
  distributionSchedule?: string | null;
  submissionDeadline?: string | null;
  followupCounselingNotes?: string | null;
}) {
  const profile = await prisma.admLearnerProfile.findUnique({ where: { id: admLearnerProfileId } });
  if (!profile) throw ApiError.notFound('ADM learner profile not found');
  if (profile.status !== 'approved') throw ApiError.conflict('ADM modules may only be released once the profile is approved');

  const module = await prisma.admModule.create({
    data: {
      admLearnerProfileId,
      releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
      distributionSchedule: input.distributionSchedule,
      submissionDeadline: input.submissionDeadline ? new Date(input.submissionDeadline) : null,
      followupCounselingNotes: input.followupCounselingNotes,
      status: 'released',
      approvedBy: profile.approvedBy ?? actorId,
    },
  });
  await writeAudit({ actorId, action: 'RELEASE', tableName: 'adm_modules', recordId: module.id, newValue: { status: 'released' } as unknown as Prisma.InputJsonValue });
  await notifyStudentAndParents(profile.studentId, {
    sourceTable: 'adm_modules',
    sourceRecordId: module.id,
    notificationType: 'adm_module_released',
    title: 'ADM module released',
    message: 'A learning module for your ADM plan has been released.',
  });
  return { data: serializeForOutput(module) };
}

export async function submitAdmModule(actorId: string, actorRole: import('@prisma/client').Role, id: string) {
  const module = await prisma.admModule.findUnique({ where: { id }, include: { admLearnerProfile: { select: { studentId: true } } } });
  if (!module) throw ApiError.notFound('ADM module not found');
  if (module.status !== 'released' && module.status !== 'student_returned') {
    throw ApiError.conflict('Only released or returned modules may be submitted');
  }
  if (actorRole === 'student' && module.admLearnerProfile.studentId !== actorId) {
    throw ApiError.forbidden('Students may only submit their own modules');
  }

  const updated = await prisma.admModule.update({ where: { id }, data: { status: 'submitted', submittedBy: actorId } });
  await writeAudit({ actorId, action: 'SUBMIT', tableName: 'adm_modules', recordId: id, newValue: { status: 'submitted' } as unknown as Prisma.InputJsonValue });
  await notify({
    recipientId: module.admLearnerProfile.studentId,
    sourceTable: 'adm_modules',
    sourceRecordId: id,
    notificationType: 'adm_module_submitted',
    title: 'ADM module submitted',
    message: 'An ADM module has been submitted.',
  });
  return { data: serializeForOutput(updated) };
}
