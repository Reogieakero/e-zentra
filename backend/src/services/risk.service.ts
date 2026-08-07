import { AttendanceStatus, Prisma, RiskLevel } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { notifyStudentAndParents } from './notification.service';

export function computeRiskLevel(riskCount: number): RiskLevel {
  if (riskCount >= 2) return 'high';
  if (riskCount === 1) return 'moderate';
  return 'low';
}

export function classifyLiveRisk(academicAvg: number | null, attendanceRate: number | null, anecdoteCount: number): RiskLevel {
  const academicRisk = academicAvg != null && academicAvg < 75;
  const attendanceRisk = attendanceRate != null && attendanceRate < 80;
  const behavioralRisk = anecdoteCount >= 1;
  const riskCount = Number(academicRisk) + Number(attendanceRisk) + Number(behavioralRisk);
  return computeRiskLevel(riskCount);
}

export interface RiskSignals {
  academicRisk: boolean;
  attendanceRisk: boolean;
  behavioralRisk: boolean;
  riskCount: number;
  riskLevel: RiskLevel;
}

export async function computeRiskSignals(studentId: string, termId: string): Promise<RiskSignals> {
  const [finalGrades, attendance, anecdotalCount] = await Promise.all([
    prisma.finalGrade.findMany({
      where: { studentId, termId },
      select: { transmutedGrade: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { studentId, termId },
      select: { status: true },
    }),
    prisma.anecdotalRecord.count({ where: { studentId, termId } }),
  ]);

  let academicRisk = false;
  if (finalGrades.length > 0) {
    const sum = finalGrades.reduce((acc, fg) => acc + fg.transmutedGrade.toNumber(), 0);
    const average = sum / finalGrades.length;
    academicRisk = average < 75;
  }

  let attendanceRisk = false;
  if (attendance.length > 0) {
    const presentCount = attendance.filter((a) => a.status === AttendanceStatus.present).length;
    const rate = (presentCount / attendance.length) * 100;
    attendanceRisk = rate < 80;
  }

  const behavioralRisk = anecdotalCount >= 1;
  const riskCount = Number(academicRisk) + Number(attendanceRisk) + Number(behavioralRisk);
  const riskLevel = computeRiskLevel(riskCount);

  return { academicRisk, attendanceRisk, behavioralRisk, riskCount, riskLevel };
}

export async function upsertRiskAssessment(
  studentId: string,
  termId: string,
  sectionId: string | null | undefined,
  tx?: Prisma.TransactionClient
): Promise<{ signals: RiskSignals; changed: boolean }> {
  const client = tx ?? prisma;
  const signals = await computeRiskSignals(studentId, termId);
  const effectiveSectionId = sectionId ?? (await client.studentProfile.findUnique({ where: { id: studentId } }))?.sectionId;
  if (!effectiveSectionId) {
    throw new Error('Cannot assess risk: student has no assigned section');
  }

  const existing = await client.studentRiskAssessment.findUnique({
    where: { studentId_termId: { studentId, termId } },
  });

  const data = {
    sectionId: effectiveSectionId,
    academicRisk: signals.academicRisk,
    attendanceRisk: signals.attendanceRisk,
    behavioralRisk: signals.behavioralRisk,
    riskCount: signals.riskCount,
    riskLevel: signals.riskLevel,
    computedAt: new Date(),
  };

  if (existing) {
    await client.studentRiskAssessment.update({ where: { id: existing.id }, data });
  } else {
    await client.studentRiskAssessment.create({ data: { studentId, termId, ...data } });
  }

  const changed = existing ? existing.riskLevel !== signals.riskLevel || existing.riskCount !== signals.riskCount : true;
  return { signals, changed };
}

export async function recomputeRiskAndNotify(studentId: string, termId: string, sectionId?: string | null): Promise<RiskSignals> {
  const { signals, changed } = await upsertRiskAssessment(studentId, termId, sectionId);
  if (changed && signals.riskCount >= 1) {
    await notifyStudentAndParents(studentId, {
      sourceTable: 'student_risk_assessments',
      sourceRecordId: (await prisma.studentRiskAssessment.findUnique({ where: { studentId_termId: { studentId, termId } } }))?.id ?? studentId,
      notificationType: 'at_risk_flagged',
      title: 'Risk assessment updated',
      message: `Current risk level: ${signals.riskLevel.toUpperCase()} (${signals.riskCount} of 3 risk flags).`,
      notifyParents: false,
    });
  }
  return signals;
}
