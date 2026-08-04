import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { ExtractionStatus, OcrJobStatus, OcrStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { config } from '../config/env';
import { logger } from '../lib/logger';
import { ApiError } from '../utils/ApiError';
import { writeAudit } from './audit.service';
import { getOcrEngine } from './ocr/registry';
import { OcrResult, OcrStudentMatch } from './ocr/types';
import { cleanLrn, computeOverallConfidence, GRADE_MAX, GRADE_MIN, isHighConfidence, parseGrade } from './ocr/ocrFields';

export interface EnqueueOcrInput {
  actorId: string;
  kind: string;
  fileUrl: string;
  reportCardId: string;
}

export function filePathFromUrl(fileUrl: string): string {
  const rel = fileUrl.replace(/^\/uploads\//, '');
  return path.resolve(config.security.uploadDir, rel);
}

function sha256File(filePath: string): string {
  const data = fs.readFileSync(filePath);
  return createHash('sha256').update(data).digest('hex');
}

export async function enqueueReportCardOcr(input: EnqueueOcrInput): Promise<void> {
  const existing = await prisma.ocrJob.findFirst({ where: { reportCardId: input.reportCardId } });
  if (existing) return;

  const filePath = filePathFromUrl(input.fileUrl);
  if (!fs.existsSync(filePath)) {
    throw ApiError.badRequest('Referenced upload file does not exist');
  }
  const fileHash = sha256File(filePath);

  const [job] = await prisma.$transaction([
    prisma.ocrJob.create({
      data: {
        actorId: input.actorId,
        reportCardId: input.reportCardId,
        kind: input.kind,
        fileUrl: input.fileUrl,
        fileHash,
        status: 'queued',
        engine: config.ocr.engine,
      },
    }),
    prisma.reportCard.update({ where: { id: input.reportCardId }, data: { ocrStatus: 'queued' } }),
  ]);

  await writeAudit({
    actorId: input.actorId,
    action: 'OCR_ENQUEUE',
    tableName: 'ocr_jobs',
    recordId: job.id,
    newValue: { reportCardId: input.reportCardId, fileUrl: input.fileUrl, engine: config.ocr.engine } as Prisma.InputJsonValue,
  });
  logger.info({ jobId: job.id, reportCardId: input.reportCardId }, 'OCR job enqueued');
}

async function loadHintsForCard(reportCardId: string) {
  const card = await prisma.reportCard.findUnique({
    where: { id: reportCardId },
    include: {
      student: { include: { studentProfile: true } },
      term: true,
    },
  });
  if (!card) throw ApiError.notFound('Report card not found');

  const studentProfile = card.student.studentProfile;
  let subjectCodes: string[] = [];
  if (studentProfile) {
    const subjects = await prisma.subject.findMany({
      where: { gradeLevel: studentProfile.gradeLevel, status: 'active' },
      select: { subjectCode: true },
    });
    subjectCodes = subjects.map((s) => s.subjectCode);
  }

  return {
    card,
    lrn: studentProfile?.lrn ?? null,
    studentName: `${card.student.firstName} ${card.student.lastName}`.trim(),
    subjectCodes,
  };
}

function summarizeResult(result: OcrResult) {
  const validRows = result.gradeRows.filter((r) => r.valid && r.grade !== null);
  const invalidRows = result.gradeRows.filter((r) => !r.valid || r.grade === null);
  return { validRows, invalidRows };
}

export async function processOcrJob(jobId: string): Promise<void> {
  const job = await prisma.ocrJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== 'queued') return;

  await prisma.ocrJob.update({ where: { id: jobId }, data: { status: 'processing', startedAt: new Date() } });
  await prisma.reportCard.update({ where: { id: job.reportCardId }, data: { ocrStatus: 'processing' } });

  const { card, lrn, studentName, subjectCodes } = await loadHintsForCard(job.reportCardId);

  try {
    const engine = await getOcrEngine();
    const result = await engine.extract({
      filePath: filePathFromUrl(job.fileUrl),
      kind: job.kind,
      hints: { lrn, studentName, subjectCodes },
    });

    const studentMatch = await resolveLrn(result.studentMatch);
    const { validRows, invalidRows } = summarizeResult(result);
    const overallConfidence = computeOverallConfidence(validRows, studentMatch.confidence);

    const gradeRows = result.gradeRows.map((r) => ({
      subjectCode: r.subjectCode,
      grade: r.grade,
      remarks: r.remarks,
      confidence: r.confidence,
      rawGrade: r.rawGrade,
      valid: r.valid,
      issue: r.issue,
    }));

    const autoApproved =
      isHighConfidence(overallConfidence, config.ocr.autoApproveThreshold) &&
      invalidRows.length === 0 &&
      Boolean(studentMatch.studentId);

    const extractionStatus: ExtractionStatus = 'needs_review';
    const ocrStatus: OcrStatus = invalidRows.length === 0 ? 'passed' : 'partial';
    const jobStatus: OcrJobStatus = invalidRows.length === 0 ? 'succeeded' : 'partial';

    await prisma.$transaction([
      prisma.reportCardExtraction.upsert({
        where: { ocrJobId: job.id },
        create: {
          ocrJobId: job.id,
          reportCardId: job.reportCardId,
          engine: result.engine,
          overallConfidence,
          studentMatch: studentMatch as unknown as Prisma.InputJsonValue,
          gradeRows: gradeRows as unknown as Prisma.InputJsonValue,
          validation: {
            invalidRows: invalidRows.map((r) => ({ subjectCode: r.subjectCode, issue: r.issue, rawGrade: r.rawGrade })),
            studentMatch: studentMatch.studentId ? 'matched' : 'unmatched',
            autoApprove: autoApproved,          } as unknown as Prisma.InputJsonValue,
          status: extractionStatus,
        },
        update: {
          overallConfidence,
          studentMatch: studentMatch as unknown as Prisma.InputJsonValue,
          gradeRows: gradeRows as unknown as Prisma.InputJsonValue,
          validation: {
            invalidRows: invalidRows.map((r) => ({ subjectCode: r.subjectCode, issue: r.issue, rawGrade: r.rawGrade })),
            studentMatch: studentMatch.studentId ? 'matched' : 'unmatched',
            autoApprove: autoApproved,          } as unknown as Prisma.InputJsonValue,
          status: extractionStatus,
        },
      }),
      prisma.ocrJob.update({
        where: { id: job.id },
        data: { status: jobStatus, completedAt: new Date(), errorCode: null, errorMessage: null },
      }),
      prisma.reportCard.update({ where: { id: job.reportCardId }, data: { ocrStatus } }),
    ]);

    await writeAudit({
      actorId: job.actorId,
      action: 'OCR_COMPLETE',
      tableName: 'ocr_jobs',
      recordId: job.id,
      newValue: {
        status: jobStatus,
        engine: result.engine,
        overallConfidence,
        validRows: validRows.length,
        invalidRows: invalidRows.length,
        studentMatch: studentMatch.studentId ? 'matched' : 'unmatched',
      } as Prisma.InputJsonValue,
    });
  } catch (err) {
    const errorCode = (err as { code?: string }).code ?? 'OCR_FAILED';
    const errorMessage = (err as Error).message;
    await prisma.$transaction([
      prisma.ocrJob.update({
        where: { id: job.id },
        data: { status: 'failed', completedAt: new Date(), errorCode, errorMessage },
      }),
      prisma.reportCard.update({ where: { id: job.reportCardId }, data: { ocrStatus: 'failed' } }),
    ]);
    await writeAudit({
      actorId: job.actorId,
      action: 'OCR_FAILED',
      tableName: 'ocr_jobs',
      recordId: job.id,
      newValue: { errorCode, errorMessage } as Prisma.InputJsonValue,
    });
    logger.warn({ jobId: job.id, err }, 'OCR job failed');
  }
}

export async function processQueuedOcrJobs(batchSize: number = config.ocr.jobBatchSize): Promise<number> {
  const jobs = await prisma.ocrJob.findMany({
    where: { status: 'queued' },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
    select: { id: true },
  });
  for (const job of jobs) {
    await processOcrJob(job.id);
  }
  return jobs.length;
}

async function resolveLrn(match: OcrStudentMatch): Promise<OcrStudentMatch> {
  if (!match.lrn) return match;
  const studentProfile = await prisma.studentProfile.findUnique({ where: { lrn: match.lrn }, select: { id: true } });
  if (!studentProfile) return match;
  return { ...match, studentId: studentProfile.id };
}

export async function getOcrJob(jobId: string) {
  return prisma.ocrJob.findUnique({
    where: { id: jobId },
    include: { extraction: true },
  });
}

export async function getReportCardExtraction(reportCardId: string) {
  return prisma.reportCardExtraction.findFirst({
    where: { reportCardId },
    include: { ocrJob: true },
  });
}

export async function assertCanReviewExtraction(role: Role, reportCardId: string): Promise<void> {
  const card = await prisma.reportCard.findUnique({
    where: { id: reportCardId },
    select: { student: { select: { studentProfile: { select: { gradeLevel: true } } } } },
  });
  if (!card) throw ApiError.notFound('Report card not found');
  const gradeLevel = card.student.studentProfile?.gradeLevel;
  if (!gradeLevel) throw ApiError.badRequest('Student has no grade level');
  const { assertRecordCustodianBand } = await import('../utils/access');
  assertRecordCustodianBand(role, gradeLevel);
}

export interface ApproveExtractionInput {
  actorId: string;
  role: Role;
  reportCardId: string;
  corrections?: Array<{ subjectCode: string; from: number | null; to: number | null; remarks?: string }>;
}

export async function approveReportCardExtraction(input: ApproveExtractionInput): Promise<void> {
  await assertCanReviewExtraction(input.role, input.reportCardId);

  const extraction = await getReportCardExtraction(input.reportCardId);
  if (!extraction) throw ApiError.notFound('No OCR extraction exists for this report card');
  if (extraction.status === 'approved') throw ApiError.conflict('Extraction already approved');
  if (extraction.status === 'rejected') throw ApiError.conflict('Extraction was rejected');

  const card = await prisma.reportCard.findUnique({
    where: { id: input.reportCardId },
    select: { studentId: true, termId: true },
  });
  if (!card) throw ApiError.notFound('Report card not found');

  const correctionMap = new Map<string, number | null>((input.corrections ?? []).map((c) => [c.subjectCode, c.to]));
  const correctionRemarks = new Map<string, string | null>(
    (input.corrections ?? []).filter((c) => c.remarks !== undefined).map((c) => [c.subjectCode, c.remarks ?? null]),
  );
  const rows = extraction.gradeRows as unknown as Array<{ subjectCode: string; grade: number | null; remarks?: string | null; confidence: number }>;

  const section = await prisma.studentProfile.findUnique({ where: { id: card.studentId }, select: { sectionId: true } });
  if (!section?.sectionId) {
    throw ApiError.validation('Student has no assigned section; cannot finalize grades');
  }

  const verifiedGrades: Array<{ subjectCode: string; grade: number }> = [];
  const writes: Array<Prisma.FinalGradeCreateInput> = [];

  for (const row of rows) {
    const corrected = correctionMap.has(row.subjectCode) ? correctionMap.get(row.subjectCode)! : row.grade;
    if (corrected === null || corrected < GRADE_MIN || corrected > GRADE_MAX) {
      throw ApiError.validation(`Grade for ${row.subjectCode} is missing or out of range (${GRADE_MIN}-${GRADE_MAX})`);
    }
    verifiedGrades.push({ subjectCode: row.subjectCode, grade: corrected });
  }

  if (verifiedGrades.length === 0) {
    throw ApiError.validation('No grades to approve');
  }

  const subjectCodes = verifiedGrades.map((g) => g.subjectCode);
  const subjects = await prisma.subject.findMany({ where: { subjectCode: { in: subjectCodes } } });
  const subjectByCode = new Map(subjects.map((s) => [s.subjectCode, s.id]));

  for (const grade of verifiedGrades) {
    const subjectId = subjectByCode.get(grade.subjectCode);
    if (!subjectId) {
      throw ApiError.validation(`Unknown subject code '${grade.subjectCode}'`);
    }
    const existing = await prisma.finalGrade.findUnique({
      where: { studentId_subjectId_termId: { studentId: card.studentId, subjectId, termId: card.termId } },
    });
    if (existing) continue;
    writes.push({
      student: { connect: { id: card.studentId } },
      subject: { connect: { id: subjectId } },
      section: { connect: { id: section.sectionId } },
      term: { connect: { id: card.termId } },
      initialGrade: grade.grade,
      transmutedGrade: grade.grade,
      remarks: correctionRemarks.has(grade.subjectCode)
        ? correctionRemarks.get(grade.subjectCode)!
        : rowRemarks(rows, grade.subjectCode),
      computedAt: new Date(),
    });
  }

  if (writes.length === 0) {
    throw ApiError.conflict('All grades already exist as final grades; nothing to write');
  }

  await prisma.$transaction(async (tx) => {
    for (const write of writes) {
      await tx.finalGrade.create({ data: write });
    }
    await tx.reportCardExtraction.update({
      where: { id: extraction.id },
      data: {
        status: 'approved',
        reviewedBy: input.actorId,
        reviewedAt: new Date(),
        corrections: {
          ...(extraction.corrections as unknown as Record<string, unknown>),
          applied: input.corrections ?? [],
        } as unknown as Prisma.InputJsonValue,
      },
    });
    await tx.reportCard.update({ where: { id: input.reportCardId }, data: { status: 'ready', managedBy: input.actorId } });
  });

  await writeAudit({
    actorId: input.actorId,
    action: 'OCR_APPROVE',
    tableName: 'report_card_extractions',
    recordId: extraction.id,
    newValue: {
      reportCardId: input.reportCardId,
      gradesCount: verifiedGrades.length,
      corrections: input.corrections ?? [],
    } as Prisma.InputJsonValue,
  });
}

function rowRemarks(rows: Array<{ subjectCode: string; remarks?: string | null }>, subjectCode: string): string | null {
  return rows.find((r) => r.subjectCode === subjectCode)?.remarks ?? null;
}

export async function rejectReportCardExtraction(actorId: string, role: Role, reportCardId: string, reason?: string): Promise<void> {
  await assertCanReviewExtraction(role, reportCardId);
  const extraction = await getReportCardExtraction(reportCardId);
  if (!extraction) throw ApiError.notFound('No OCR extraction exists for this report card');
  if (extraction.status !== 'needs_review') throw ApiError.conflict('Only needs_review extractions may be rejected');

  await prisma.$transaction([
    prisma.reportCardExtraction.update({
      where: { id: extraction.id },
      data: { status: 'rejected', reviewedBy: actorId, reviewedAt: new Date() },
    }),
    prisma.reportCard.update({ where: { id: reportCardId }, data: { ocrStatus: 'failed' } }),
  ]);
  await writeAudit({
    actorId,
    action: 'OCR_REJECT',
    tableName: 'report_card_extractions',
    recordId: extraction.id,
    newValue: { reportCardId, reason } as Prisma.InputJsonValue,
  });
}

export function startOcrWorker(): void {
  if (config.nodeEnv === 'test') return;
  const timer = setInterval(() => {
    void processQueuedOcrJobs().catch((err) => logger.warn({ err }, 'OCR worker pass failed'));
  }, config.ocr.jobPollMs);
  timer.unref();
}

export { cleanLrn, parseGrade };
