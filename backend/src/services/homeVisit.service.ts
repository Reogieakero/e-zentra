import { ConfidentialityLevel, Prisma, VisitContext } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { writeAudit } from './audit.service';
import { notify, notifyParentsOfStudent } from './notification.service';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';
import { assertCanViewStudentRecords } from '../utils/caseRecords';
import { redactSensitiveFields } from '../utils/confidentiality';

export interface CreateHomeVisitInput {
  studentId: string;
  sectionId: string;
  termId: string;
  referralId?: string | null;
  visitContext: VisitContext;
  personVisitedName: string;
  relationToStudent?: string | null;
  address?: string | null;
  reasonForVisitation: string;
  visitDate: string;
  visitTime?: string | null;
  homeConditionObservation?: string | null;
  familyConditionObservation?: string | null;
  detailsOfConcern?: string | null;
  learnerAgreement?: string | null;
  familyAgreement?: string | null;
  confidentialityLevel?: ConfidentialityLevel;
}

export async function createHomeVisit(actorId: string, actorRole: import('@prisma/client').Role, input: CreateHomeVisitInput) {
  if (input.visitContext === 'adm_followup') {
    const section = await prisma.section.findUnique({ where: { id: input.sectionId } });
    if (!section) throw ApiError.notFound('Section not found');
    if (actorRole !== 'guidance_counselor' && section.adviserId !== actorId) {
      throw ApiError.forbidden('ADM follow-up home visits may only be conducted by the section adviser or a Guidance Counselor');
    }
  } else {
    if (actorRole !== 'guidance_counselor') {
      throw ApiError.forbidden('Guidance-counseling home visits may only be conducted by a Guidance Counselor');
    }
  }

  const record = await prisma.homeVisitationRecord.create({
    data: {
      studentId: input.studentId,
      sectionId: input.sectionId,
      termId: input.termId,
      referralId: input.referralId,
      visitContext: input.visitContext,
      personVisitedName: input.personVisitedName,
      relationToStudent: input.relationToStudent,
      address: input.address,
      reasonForVisitation: input.reasonForVisitation,
      visitDate: new Date(input.visitDate),
      visitTime: input.visitTime ? new Date(`1970-01-01T${input.visitTime}`) : null,
      homeConditionObservation: input.homeConditionObservation,
      familyConditionObservation: input.familyConditionObservation,
      detailsOfConcern: input.detailsOfConcern,
      learnerAgreement: input.learnerAgreement,
      familyAgreement: input.familyAgreement,
      conductedBy: actorId,
      confidentialityLevel: input.confidentialityLevel ?? 'confidential',
    },
  });

  await writeAudit({ actorId, action: 'CREATE', tableName: 'home_visitation_records', recordId: record.id, newValue: input as unknown as Prisma.InputJsonValue });
  await notifyParentsOfStudent(input.studentId, {
    sourceTable: 'home_visitation_records',
    sourceRecordId: record.id,
    notificationType: 'new_home_visitation',
    title: 'Home visitation recorded',
    message: 'A home visitation has been recorded for this learner.',
  });
  return { data: serializeForOutput(record) };
}

export async function listHomeVisits(viewerId: string, viewerRole: import('@prisma/client').Role, query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.HomeVisitationRecordWhereInput = {};
  if (query.studentId) where.studentId = query.studentId as string;
  if (query.sectionId) where.sectionId = query.sectionId as string;
  if (query.visitContext) where.visitContext = query.visitContext as VisitContext;

  const [total, rows] = await Promise.all([
    prisma.homeVisitationRecord.count({ where }),
    prisma.homeVisitationRecord.findMany({
      where,
      orderBy: { visitDate: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: {
        conducted: { select: { id: true, firstName: true, lastName: true } },
        certified: { select: { id: true, firstName: true, lastName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);
  const data = rows.map((row) =>
    redactSensitiveFields(row, row.confidentialityLevel, { role: viewerRole, id: viewerId }, row.conductedBy, [
      'reasonForVisitation',
      'homeConditionObservation',
      'familyConditionObservation',
      'detailsOfConcern',
      'learnerAgreement',
      'familyAgreement',
    ] as (keyof typeof row & string)[])
  );
  return { data: serializeForOutput(data), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}

export async function getHomeVisit(viewerId: string, viewerRole: import('@prisma/client').Role, id: string) {
  const record = await prisma.homeVisitationRecord.findUnique({
    where: { id },
    include: {
      conducted: { select: { id: true, firstName: true, lastName: true } },
      certified: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!record) throw ApiError.notFound('Home visitation record not found');
  await assertCanViewStudentRecords({ id: viewerId, role: viewerRole }, record.studentId);
  const data = redactSensitiveFields(record, record.confidentialityLevel, { role: viewerRole, id: viewerId }, record.conductedBy, [
    'reasonForVisitation',
    'homeConditionObservation',
    'familyConditionObservation',
    'detailsOfConcern',
    'learnerAgreement',
    'familyAgreement',
  ] as (keyof typeof record & string)[]);
  return { data: serializeForOutput(data) };
}

export async function certifyHomeVisit(actorId: string, id: string, purpose: string) {
  const record = await prisma.homeVisitationRecord.findUnique({ where: { id } });
  if (!record) throw ApiError.notFound('Home visitation record not found');

  const updated = await prisma.homeVisitationRecord.update({
    where: { id },
    data: { certificationIssued: true, certificationPurpose: purpose, certificationIssuedDate: new Date(), certifiedBy: actorId },
  });
  await writeAudit({ actorId, action: 'CERTIFY', tableName: 'home_visitation_records', recordId: id, newValue: { certificationIssued: true, certificationPurpose: purpose } as unknown as Prisma.InputJsonValue });
  await notify({
    recipientId: record.studentId,
    sourceTable: 'home_visitation_records',
    sourceRecordId: id,
    notificationType: 'adm_certification_issued',
    title: 'Home visit certification issued',
    message: 'A certification for your home visitation was issued.',
  });
  return { data: serializeForOutput(updated) };
}
