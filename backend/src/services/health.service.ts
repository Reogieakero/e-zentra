import { ConfidentialityLevel, Prisma, Recommendation } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { writeAudit } from './audit.service';
import { notifyParentsOfStudent, notifyStudentAndParents } from './notification.service';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';
import { assertCanViewStudentRecords } from '../utils/caseRecords';
import { redactSensitiveFields } from '../utils/confidentiality';

export interface CreateHealthRecordInput {
  studentId: string;
  sectionId: string;
  termId: string;
  referralId?: string | null;
  visitDate: string;
  visitTime?: string | null;
  reasonForVisit: string;
  vitalSigns?: Record<string, unknown> | null;
  diagnosisAssessment?: string | null;
  treatmentGiven?: string | null;
  medicationAdministered?: string | null;
  recommendation?: Recommendation | null;
  parentNotified?: boolean;
  confidentialityLevel?: ConfidentialityLevel;
}

export async function createHealthRecord(actorId: string, input: CreateHealthRecordInput) {
  const record = await prisma.healthRecord.create({
    data: {
      studentId: input.studentId,
      sectionId: input.sectionId,
      termId: input.termId,
      referralId: input.referralId,
      visitDate: new Date(input.visitDate),
      visitTime: input.visitTime ? new Date(`1970-01-01T${input.visitTime}`) : null,
      reasonForVisit: input.reasonForVisit,
      vitalSigns: input.vitalSigns as Prisma.InputJsonValue | undefined,
      diagnosisAssessment: input.diagnosisAssessment,
      treatmentGiven: input.treatmentGiven,
      medicationAdministered: input.medicationAdministered,
      recommendation: input.recommendation,
      parentNotified: input.parentNotified ?? false,
      attendedBy: actorId,
      confidentialityLevel: input.confidentialityLevel ?? 'confidential',
    },
  });

  await writeAudit({ actorId, action: 'CREATE', tableName: 'health_records', recordId: record.id, newValue: input as unknown as Prisma.InputJsonValue });
  await notifyParentsOfStudent(input.studentId, {
    sourceTable: 'health_records',
    sourceRecordId: record.id,
    notificationType: 'new_health_record',
    title: 'Health clinic visit recorded',
    message: 'A health record was filed for this learner.',
  });
  await notifyStudentAndParents(input.studentId, {
    sourceTable: 'health_records',
    sourceRecordId: record.id,
    notificationType: 'new_health_record',
    title: 'Health record on file',
    message: 'A new health record is now on file for this learner.',
    notifyParents: false,
  });
  return { data: serializeForOutput(record) };
}

export async function listHealthRecords(viewerId: string, viewerRole: import('@prisma/client').Role, query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.HealthRecordWhereInput = {};
  if (query.studentId) where.studentId = query.studentId as string;
  if (query.sectionId) where.sectionId = query.sectionId as string;
  if (query.termId) where.termId = query.termId as string;
  if (viewerRole === 'student') where.studentId = viewerId;

  const [total, rows] = await Promise.all([
    prisma.healthRecord.count({ where }),
    prisma.healthRecord.findMany({
      where,
      orderBy: { visitDate: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: {
        attended: { select: { id: true, firstName: true, lastName: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);
  const data = rows.map((row) =>
    redactSensitiveFields(row, row.confidentialityLevel, { role: viewerRole, id: viewerId }, row.attendedBy, [
      'diagnosisAssessment',
      'treatmentGiven',
      'medicationAdministered',
      'reasonForVisit',
    ] as (keyof typeof row & string)[])
  );
  return { data: serializeForOutput(data), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}

export async function getHealthRecord(viewerId: string, viewerRole: import('@prisma/client').Role, id: string) {
  const record = await prisma.healthRecord.findUnique({
    where: { id },
    include: { attended: { select: { id: true, firstName: true, lastName: true } } },
  });
  if (!record) throw ApiError.notFound('Health record not found');
  await assertCanViewStudentRecords({ id: viewerId, role: viewerRole }, record.studentId);
  const data = redactSensitiveFields(record, record.confidentialityLevel, { role: viewerRole, id: viewerId }, record.attendedBy, [
    'diagnosisAssessment',
    'treatmentGiven',
    'medicationAdministered',
    'reasonForVisit',
  ] as (keyof typeof record & string)[]);
  return { data: serializeForOutput(data) };
}
