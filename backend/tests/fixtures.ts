import { GradeLevel } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

export async function seedSchoolYear(createdBy: string, yearLabel = 'TEST-2026') {
  const existing = await prisma.schoolYear.findUnique({ where: { yearLabel } });
  if (existing) return existing;
  return prisma.schoolYear.create({
    data: {
      yearLabel,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2027-03-31'),
      status: 'active',
      createdBy,
    },
  });
}

export async function seedTerm(schoolYearId: string, band: 'junior_high' | 'senior_high', termNumber: 'term_1' | 'term_2' | 'term_3', createdBy: string) {
  const existing = await prisma.term.findUnique({
    where: { schoolYearId_gradeBand_termNumber: { schoolYearId, gradeBand: band, termNumber } },
  });
  if (existing) return existing;
  return prisma.term.create({
    data: {
      schoolYearId,
      gradeBand: band,
      termNumber,
      termLabel: `${termNumber.replace('term_', '')}st Term`,
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-09-30'),
      status: 'active',
      createdBy,
    },
  });
}

export async function seedSection(opts: {
  gradeLevel: GradeLevel;
  schoolYearId: string;
  adviserId?: string;
  createdBy: string;
  sectionName?: string;
}) {
  return prisma.section.create({
    data: {
      sectionName: opts.sectionName ?? `Sec-${opts.gradeLevel.replace('grade_', '')}`,
      gradeLevel: opts.gradeLevel,
      schoolYearId: opts.schoolYearId,
      adviserId: opts.adviserId,
      createdBy: opts.createdBy,
    },
  });
}

export async function seedSubject(opts: {
  gradeLevel: GradeLevel;
  createdBy: string;
  subjectCode?: string;
}) {
  const code = opts.subjectCode ?? `SUB-${opts.gradeLevel.replace('grade_', '')}-${Date.now()}`;
  return prisma.subject.create({
    data: {
      subjectName: `Subject ${code}`,
      subjectCode: code,
      gradeLevel: opts.gradeLevel,
      createdBy: opts.createdBy,
    },
  });
}

export async function seedGradeComponents(subjectId: string, termId: string) {
  await prisma.gradeComponent.createMany({
    data: [
      { subjectId, termId, componentType: 'quiz', weightPercentage: 30 },
      { subjectId, termId, componentType: 'performance_task', weightPercentage: 50 },
      { subjectId, termId, componentType: 'exam', weightPercentage: 20 },
    ],
  });
}

export async function seedAssessment(opts: {
  subjectId: string;
  sectionId: string;
  termId: string;
  teacherId: string;
  componentType: 'quiz' | 'performance_task' | 'exam';
  maxScore: number;
  title?: string;
}) {
  return prisma.assessment.create({
    data: {
      subjectId: opts.subjectId,
      sectionId: opts.sectionId,
      termId: opts.termId,
      teacherId: opts.teacherId,
      componentType: opts.componentType,
      title: opts.title ?? 'Assessment',
      maxScore: opts.maxScore,
      dateGiven: new Date('2026-07-01'),
    },
  });
}
