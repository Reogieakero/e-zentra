import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';
import { upsertRiskAssessment } from './risk.service';
import { writeAudit } from './audit.service';

export interface RiskAssessmentInput {
  studentId: string;
  termId: string;
  sectionId?: string;
}

export async function assessStudentRisk(actorId: string, actorRole: import('@prisma/client').Role, input: RiskAssessmentInput) {
  if (actorRole === 'guidance_counselor' || actorRole === 'record_keeper' || actorRole === 'registrar' || actorRole === 'principal' || actorRole === 'adm_coordinator') {
    const student = await prisma.studentProfile.findUnique({ where: { id: input.studentId } });
    if (!student) throw ApiError.notFound('Student not found');
    const { signals } = await upsertRiskAssessment(input.studentId, input.termId, input.sectionId ?? student.sectionId);
    const record = await prisma.studentRiskAssessment.findUnique({
      where: { studentId_termId: { studentId: input.studentId, termId: input.termId } },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        term: { select: { id: true, termLabel: true } },
      },
    });
    await writeAudit({ actorId, action: 'ASSESS', tableName: 'student_risk_assessments', recordId: record?.id ?? input.studentId, newValue: signals as unknown as Prisma.InputJsonValue });
    return { data: serializeForOutput(record ?? signals) };
  }
  throw ApiError.forbidden('Role is not allowed to perform risk assessments');
}

export async function listRiskAssessments(query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.StudentRiskAssessmentWhereInput = {};
  if (query.studentId) where.studentId = query.studentId as string;
  if (query.termId) where.termId = query.termId as string;
  if (query.riskLevel) where.riskLevel = query.riskLevel as Prisma.StudentRiskAssessmentWhereInput['riskLevel'];

  const [total, rows] = await Promise.all([
    prisma.studentRiskAssessment.count({ where }),
    prisma.studentRiskAssessment.findMany({
      where,
      orderBy: { computedAt: 'desc' },
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
