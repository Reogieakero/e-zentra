import { ComponentType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { writeAudit } from './audit.service';
import { notify, notifyStudentAndParents } from './notification.service';
import { serializeForOutput } from '../middleware/errorHandler';
import { parseOffsetPagination } from '../utils/pagination';
import { computeFinalGrade } from '../utils/gradeComputation';
import { recomputeRiskAndNotify } from './risk.service';



async function assertTeacherTeaches(teacherId: string, subjectId: string, sectionId: string): Promise<void> {
  const assignment = await prisma.teacherSubjectAssignment.findFirst({
    where: { teacherId, subjectId, sectionId, isActive: true },
  });
  if (!assignment) {
    throw ApiError.forbidden('This teacher is not assigned to teach this subject in this section');
  }
}

async function assertTermOwnedByBand(termId: string, actorRole: import('@prisma/client').Role): Promise<void> {
  const term = await prisma.term.findUnique({ where: { id: termId } });
  if (!term) throw ApiError.notFound('Term not found');
  const { assertGradeBandOwnershipForBand } = await import('../utils/gradeBand');
  assertGradeBandOwnershipForBand(actorRole, term.gradeBand);
}



export interface GradeComponentInput {
  subjectId: string;
  termId: string;
  componentType: ComponentType;
  weightPercentage: number;
}

export async function setGradeComponents(
  actorId: string,
  actorRole: import('@prisma/client').Role,
  subjectId: string,
  termId: string,
  components: Array<{ componentType: ComponentType; weightPercentage: number }>
) {
  await assertTermOwnedByBand(termId, actorRole);
  const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
  if (!subject) throw ApiError.notFound('Subject not found');
  if (components.length === 0) throw ApiError.validation('At least one grade component is required');

  const types = new Set<string>();
  let sum = 0;
  for (const c of components) {
    if (types.has(c.componentType)) throw ApiError.validation(`Duplicate component type: ${c.componentType}`);
    types.add(c.componentType);
    if (c.weightPercentage <= 0 || c.weightPercentage > 100) {
      throw ApiError.validation('weightPercentage must be between 0 (exclusive) and 100 (inclusive)');
    }
    sum += c.weightPercentage;
  }
  if (Math.abs(sum - 100) > 0.0001) {
    throw ApiError.validation(`Grade component weights must sum to 100 (got ${sum})`);
  }

  
  const rows = await prisma.$transaction(async (tx) => {
    await tx.gradeComponent.deleteMany({ where: { subjectId, termId } });
    await tx.gradeComponent.createMany({
      data: components.map((c) => ({
        subjectId,
        termId,
        componentType: c.componentType,
        weightPercentage: new Prisma.Decimal(c.weightPercentage),
      })),
    });
    return tx.gradeComponent.findMany({ where: { subjectId, termId }, orderBy: { componentType: 'asc' } });
  });

  await writeAudit({ actorId, action: 'SET', tableName: 'grade_components', recordId: subjectId, newValue: { subjectId, termId, components } as unknown as Prisma.InputJsonValue });
  return { data: serializeForOutput(rows) };
}

export async function listGradeComponents(query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.GradeComponentWhereInput = {};
  if (query.subjectId) where.subjectId = query.subjectId as string;
  if (query.termId) where.termId = query.termId as string;
  if (query.componentType) where.componentType = query.componentType as ComponentType;

  const [total, rows] = await Promise.all([
    prisma.gradeComponent.count({ where }),
    prisma.gradeComponent.findMany({ where, orderBy: [{ componentType: 'asc' }], skip: offset.skip, take: offset.take }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}

export async function validateComponentWeights(termId: string, subjectId: string): Promise<number> {
  const components = await prisma.gradeComponent.findMany({ where: { termId, subjectId } });
  const sum = components.reduce((acc, c) => acc + c.weightPercentage.toNumber(), 0);
  if (components.length > 0 && Math.abs(sum - 100) > 0.0001) {
    throw ApiError.validation(`Grade component weights for this subject/term must sum to 100 (currently ${sum})`);
  }
  return sum;
}



export interface AssessmentInput {
  subjectId: string;
  sectionId: string;
  termId: string;
  componentType: ComponentType;
  title: string;
  maxScore: number;
  dateGiven: string;
}

export async function createAssessment(actorId: string, actorRole: import('@prisma/client').Role, input: AssessmentInput) {
  if (actorRole !== 'teacher') throw ApiError.forbidden('Only teachers may create assessments');
  await assertTeacherTeaches(actorId, input.subjectId, input.sectionId);
  if (input.maxScore <= 0) throw ApiError.validation('maxScore must be greater than zero');

  const assessment = await prisma.assessment.create({
    data: {
      subjectId: input.subjectId,
      sectionId: input.sectionId,
      termId: input.termId,
      teacherId: actorId,
      componentType: input.componentType,
      title: input.title,
      maxScore: new Prisma.Decimal(input.maxScore),
      dateGiven: new Date(input.dateGiven),
    },
  });
  await writeAudit({ actorId, action: 'CREATE', tableName: 'assessments', recordId: assessment.id, newValue: input as unknown as Prisma.InputJsonValue });
  return { data: serializeForOutput(assessment) };
}

export async function listAssessments(query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.AssessmentWhereInput = {};
  if (query.sectionId) where.sectionId = query.sectionId as string;
  if (query.subjectId) where.subjectId = query.subjectId as string;
  if (query.termId) where.termId = query.termId as string;

  const [total, rows] = await Promise.all([
    prisma.assessment.count({ where }),
    prisma.assessment.findMany({
      where,
      orderBy: { dateGiven: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: { subject: { select: { id: true, subjectName: true } }, section: { select: { id: true, sectionName: true } } },
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}



async function ensureFinalGradeNotLocked(assessmentId: string, studentId: string): Promise<void> {
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) throw ApiError.notFound('Assessment not found');
  const locked = await prisma.finalGrade.findUnique({
    where: { studentId_subjectId_termId: { studentId, subjectId: assessment.subjectId, termId: assessment.termId } },
  });
  if (locked?.isLocked) {
    throw ApiError.conflict('Final grade is locked; grades may no longer be edited');
  }
}

export interface StudentGradeInput {
  assessmentId: string;
  studentId: string;
  score: number;
  remarks?: string | null;
}

export async function recordStudentGrade(actorId: string, actorRole: import('@prisma/client').Role, input: StudentGradeInput) {
  if (actorRole !== 'teacher') throw ApiError.forbidden('Only teachers may record grades');
  await ensureFinalGradeNotLocked(input.assessmentId, input.studentId);

  const assessment = await prisma.assessment.findUnique({ where: { id: input.assessmentId } });
  if (!assessment) throw ApiError.notFound('Assessment not found');
  await assertTeacherTeaches(actorId, assessment.subjectId, assessment.sectionId);
  if (input.score < 0 || input.score > assessment.maxScore.toNumber()) {
    throw ApiError.validation(`score must be between 0 and maxScore (${assessment.maxScore.toNumber()})`);
  }

  const grade = await prisma.studentGrade.upsert({
    where: { assessmentId_studentId: { assessmentId: input.assessmentId, studentId: input.studentId } },
    update: { score: new Prisma.Decimal(input.score), remarks: input.remarks },
    create: {
      assessmentId: input.assessmentId,
      studentId: input.studentId,
      score: new Prisma.Decimal(input.score),
      remarks: input.remarks,
      recordedBy: actorId,
    },
  });
  await writeAudit({ actorId, action: 'UPSERT', tableName: 'student_grades', recordId: grade.id, newValue: input as unknown as Prisma.InputJsonValue });
  return { data: serializeForOutput(grade) };
}

export async function listStudentGrades(query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.StudentGradeWhereInput = {};
  if (query.assessmentId) where.assessmentId = query.assessmentId as string;
  if (query.studentId) where.studentId = query.studentId as string;

  const [total, rows] = await Promise.all([
    prisma.studentGrade.count({ where }),
    prisma.studentGrade.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset.skip,
      take: offset.take,
      include: {
        assessment: { select: { id: true, title: true, componentType: true, maxScore: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}



export async function computeFinalGradeForStudent(subjectId: string, termId: string, studentId: string) {
  const [assessments, weights] = await Promise.all([
    prisma.assessment.findMany({ where: { subjectId, termId }, select: { id: true, componentType: true, maxScore: true } }),
    prisma.gradeComponent.findMany({ where: { subjectId, termId }, select: { componentType: true, weightPercentage: true } }),
  ]);
  const scores = await prisma.studentGrade.findMany({
    where: { studentId, assessment: { subjectId, termId } },
    select: { assessmentId: true, score: true },
  });
  await validateComponentWeights(termId, subjectId);

  const assessmentInfo = assessments.map((a) => ({ id: a.id, componentType: a.componentType, maxScore: a.maxScore.toNumber() }));
  const scoreInfo = scores.map((s) => ({ assessmentId: s.assessmentId, score: s.score.toNumber() }));
  const weightInfo = weights.map((w) => ({ componentType: w.componentType, weightPercentage: w.weightPercentage.toNumber() }));
  return computeFinalGrade(assessmentInfo, scoreInfo, weightInfo);
}

export async function upsertFinalGrade(actorId: string, actorRole: import('@prisma/client').Role, subjectId: string, termId: string, studentId: string, sectionId: string) {
  if (actorRole !== 'teacher') throw ApiError.forbidden('Only teachers may compute final grades');
  await assertTeacherTeaches(actorId, subjectId, sectionId);

  const locked = await prisma.finalGrade.findUnique({
    where: { studentId_subjectId_termId: { studentId, subjectId, termId } },
  });
  if (locked?.isLocked) throw ApiError.conflict('Final grade is locked and may not be recomputed');

  const computed = await computeFinalGradeForStudent(subjectId, termId, studentId);
  const final = await prisma.finalGrade.upsert({
    where: { studentId_subjectId_termId: { studentId, subjectId, termId } },
    update: {
      quizAverage: computed.quizAverage !== null ? new Prisma.Decimal(computed.quizAverage) : null,
      performanceTaskAverage: computed.performanceTaskAverage !== null ? new Prisma.Decimal(computed.performanceTaskAverage) : null,
      examAverage: computed.examAverage !== null ? new Prisma.Decimal(computed.examAverage) : null,
      initialGrade: new Prisma.Decimal(computed.initialGrade),
      transmutedGrade: new Prisma.Decimal(computed.transmutedGrade),
      remarks: computed.remarks,
      sectionId,
      computedAt: new Date(),
    },
    create: {
      studentId,
      subjectId,
      sectionId,
      termId,
      quizAverage: computed.quizAverage !== null ? new Prisma.Decimal(computed.quizAverage) : null,
      performanceTaskAverage: computed.performanceTaskAverage !== null ? new Prisma.Decimal(computed.performanceTaskAverage) : null,
      examAverage: computed.examAverage !== null ? new Prisma.Decimal(computed.examAverage) : null,
      initialGrade: new Prisma.Decimal(computed.initialGrade),
      transmutedGrade: new Prisma.Decimal(computed.transmutedGrade),
      remarks: computed.remarks,
      finalizedBy: actorId,
      finalizedAt: new Date(),
    },
  });

  await recomputeRiskAndNotify(studentId, termId, sectionId);
  return { data: serializeForOutput(final) };
}



export async function finalizeFinalGrade(actorId: string, actorRole: import('@prisma/client').Role, finalGradeId: string) {
  if (actorRole !== 'teacher') throw ApiError.forbidden('Only teachers may finalize grades');
  const grade = await prisma.finalGrade.findUnique({ where: { id: finalGradeId }, include: { section: true, subject: true } });
  if (!grade) throw ApiError.notFound('Final grade not found');
  await assertTeacherTeaches(actorId, grade.subjectId, grade.sectionId);
  if (grade.isLocked) throw ApiError.conflict('Final grade is already locked');

  const updated = await prisma.finalGrade.update({
    where: { id: finalGradeId },
    data: { finalizedBy: actorId, finalizedAt: new Date() },
  });
  await notifyStudentAndParents(grade.studentId, {
    sourceTable: 'final_grades',
    sourceRecordId: finalGradeId,
    notificationType: 'grade_finalized',
    title: 'Final grade finalized',
    message: 'A final grade has been finalized.',
  });
  return { data: serializeForOutput(updated) };
}

export async function lockFinalGrade(actorId: string, actorRole: import('@prisma/client').Role, finalGradeId: string) {
  if (actorRole !== 'teacher') throw ApiError.forbidden('Only teachers may lock grades');
  const grade = await prisma.finalGrade.findUnique({ where: { id: finalGradeId }, include: { section: true, subject: true } });
  if (!grade) throw ApiError.notFound('Final grade not found');
  await assertTeacherTeaches(actorId, grade.subjectId, grade.sectionId);

  const updated = await prisma.finalGrade.update({
    where: { id: finalGradeId },
    data: { isLocked: true, lockedBy: actorId, lockedAt: new Date() },
  });
  await notifyStudentAndParents(grade.studentId, {
    sourceTable: 'final_grades',
    sourceRecordId: finalGradeId,
    notificationType: 'grade_locked',
    title: 'Final grade locked',
    message: 'A final grade has been locked; further edits are prevented.',
  });
  return { data: serializeForOutput(updated) };
}

export async function listFinalGrades(query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.FinalGradeWhereInput = {};
  if (query.studentId) where.studentId = query.studentId as string;
  if (query.subjectId) where.subjectId = query.subjectId as string;
  if (query.termId) where.termId = query.termId as string;
  if (query.sectionId) where.sectionId = query.sectionId as string;

  const [total, rows] = await Promise.all([
    prisma.finalGrade.count({ where }),
    prisma.finalGrade.findMany({
      where,
      orderBy: [{ subjectId: 'asc' }, { studentId: 'asc' }],
      skip: offset.skip,
      take: offset.take,
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        subject: { select: { id: true, subjectName: true, subjectCode: true } },
      },
    }),
  ]);
  return { data: serializeForOutput(rows), page: offset.page, pageSize: offset.pageSize, total, hasMore: offset.page * offset.pageSize < total };
}
