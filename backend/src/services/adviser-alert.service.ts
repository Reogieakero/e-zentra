import { AdviserAlertStatus, GradeLevel, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { GRADE_LABELS } from '../lib/school';
import { notify } from './notification.service';
import { getLowAttendanceReport } from './attendance.report.service';

export interface AdviserAlertScope {
  gradeLevel?: string;
  sectionId?: string;
  tone?: 'danger' | 'warn' | 'all';
}

export interface AdviserAlertAdviser {
  id: string;
  name: string;
  sectionName: string;
  sectionId: string;
}

export interface AdviserAlertListItem {
  id: string;
  studentId: string;
  studentName: string;
  lrn: string;
  sectionName: string;
  gradeLabel: string;
  adviserName: string;
  status: AdviserAlertStatus;
  note: string | null;
  rate: number;
  tone: 'danger' | 'warn';
  issuedById: string;
  issuedByName: string;
  acknowledgedAt: Date | null;
  createdAt: Date;
}

const alertRowSelect = {
  id: true,
  studentId: true,
  rate: true,
  tone: true,
  status: true,
  note: true,
  issuedById: true,
  acknowledgedAt: true,
  createdAt: true,
  section: { select: { sectionName: true, gradeLevel: true, adviser: { select: { firstName: true, lastName: true } } } },
  student: { select: { firstName: true, lastName: true, studentProfile: { select: { lrn: true } } } },
  issuedBy: { select: { firstName: true, lastName: true } },
} satisfies Prisma.AdviserAlertSelect;

function serializeAlert(row: Prisma.AdviserAlertGetPayload<{ select: typeof alertRowSelect }>): AdviserAlertListItem {
  return {
    id: row.id,
    studentId: row.studentId,
    studentName: `${row.student.firstName} ${row.student.lastName}`,
    lrn: row.student.studentProfile?.lrn ?? '',
    sectionName: row.section?.sectionName ?? '',
    gradeLabel: row.section ? GRADE_LABELS[row.section.gradeLevel] ?? row.section.gradeLevel : '',
    adviserName: row.section?.adviser ? `${row.section.adviser.firstName} ${row.section.adviser.lastName}` : '',
    status: row.status,
    note: row.note,
    rate: row.rate,
    tone: row.tone as 'danger' | 'warn',
    issuedById: row.issuedById,
    issuedByName: `${row.issuedBy.firstName} ${row.issuedBy.lastName}`,
    acknowledgedAt: row.acknowledgedAt,
    createdAt: row.createdAt,
  };
}

export async function listAdviserAlerts(scope: AdviserAlertScope = {}): Promise<{ data: AdviserAlertListItem[] }> {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { status: 'active' },
    select: { id: true },
  });
  if (!activeYear) return { data: [] };

  const rows = await prisma.adviserAlert.findMany({
    where: {
      schoolYearId: activeYear.id,
      ...(scope.sectionId ? { sectionId: scope.sectionId } : {}),
      ...(scope.gradeLevel ? { section: { gradeLevel: scope.gradeLevel as GradeLevel } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: alertRowSelect,
  });

  return { data: rows.map((r) => serializeAlert(r)) };
}

export async function sendAdviserAlerts(
  actorId: string,
  scope: AdviserAlertScope
): Promise<{
  data: {
    created: number;
    notified: number;
    skippedNoAdviser: number;
    total: number;
    advisers: AdviserAlertAdviser[];
    alerts: AdviserAlertListItem[];
  };
}> {
  const activeYear = await prisma.schoolYear.findFirst({
    where: { status: 'active' },
    select: { id: true },
  });
  if (!activeYear) {
    throw new Error('No active school year to alert against.');
  }

  const report = await getLowAttendanceReport(scope.gradeLevel, scope.sectionId);
  const flagged = report.rows.filter((r) => scope.tone === 'all' || r.tone === scope.tone);

  const sectionIds = Array.from(new Set(flagged.map((r) => r.sectionId).filter(Boolean)));
  const sections = await prisma.section.findMany({
    where: { id: { in: sectionIds } },
    select: { id: true, sectionName: true, adviserId: true, adviser: { select: { id: true, firstName: true, lastName: true } } },
  });
  const bySection = new Map(sections.map((s) => [s.id, s]));

  const existing = await prisma.adviserAlert.findMany({
    where: {
      schoolYearId: activeYear.id,
      studentId: { in: flagged.map((r) => r.studentId) },
    },
    select: { id: true, studentId: true, status: true },
  });
  const existingByStudent = new Map(existing.map((e) => [e.studentId, e]));

  let created = 0;
  let notified = 0;
  let skippedNoAdviser = 0;

  for (const studentRow of flagged) {
    const section = bySection.get(studentRow.sectionId);
    const adviser = section?.adviser ?? null;
    if (!adviser) {
      skippedNoAdviser += 1;
      continue;
    }

    const prev = existingByStudent.get(studentRow.studentId);
    if (prev?.status === 'pending') continue;

    if (prev) {
      await prisma.adviserAlert.update({
        where: { id: prev.id },
        data: { status: 'pending', note: null, acknowledgedAt: null, rate: studentRow.rate, tone: studentRow.tone },
      });
    } else {
      await prisma.adviserAlert.create({
        data: {
          studentId: studentRow.studentId,
          sectionId: studentRow.sectionId,
          adviserId: adviser.id,
          schoolYearId: activeYear.id,
          rate: studentRow.rate,
          tone: studentRow.tone,
          issuedById: actorId,
        },
      });
    }
    created += 1;

    await notify({
      recipientId: adviser.id,
      sourceTable: 'adviser_alerts',
      sourceRecordId: studentRow.studentId,
      notificationType: 'attendance_alert',
      title: 'Attendance alert for your advisee',
      message: `${studentRow.fullName} is flagged at ${studentRow.rate}% attendance. Please review and follow up.`,
    });
    notified += 1;
  }

  const items = await listAdviserAlerts({
    ...scope,
    sectionId: scope.sectionId,
  });
  const relevantStudentIds = new Set(flagged.map((r) => r.studentId));
  const alerts = items.data.filter((a) => relevantStudentIds.has(a.studentId));

  const adviserMap = new Map<string, AdviserAlertAdviser>();
  for (const s of sections.values()) {
    if (!s.adviser || !s.sectionName) continue;
    const existing = adviserMap.get(s.adviser.id);
    if (existing) {
      existing.sectionName += `, ${s.sectionName}`;
    } else {
      adviserMap.set(s.adviser.id, {
        id: s.adviser.id,
        name: `${s.adviser.firstName} ${s.adviser.lastName}`,
        sectionName: s.sectionName,
        sectionId: s.id,
      });
    }
  }
  const advisers = Array.from(adviserMap.values());

  return {
    data: {
      created,
      notified,
      skippedNoAdviser,
      total: flagged.length,
      advisers,
      alerts,
    },
  };
}

export async function setAlertStatus(
  alertId: string,
  actorId: string,
  input: { status: AdviserAlertStatus; note?: string | null }
): Promise<{ data: AdviserAlertListItem }> {
  const existing = await prisma.adviserAlert.findUnique({
    where: { id: alertId },
    select: { id: true, adviserId: true },
  });
  if (!existing) {
    const err = new Error('Adviser alert not found') as Error & { status?: number };
    err.status = 404;
    throw err;
  }
  if (existing.adviserId !== actorId) {
    const err = new Error('Only the section adviser may update this alert') as Error & { status?: number };
    err.status = 403;
    throw err;
  }

  const updated = await prisma.adviserAlert.update({
    where: { id: alertId },
    data: {
      status: input.status,
      note: input.note ?? null,
      acknowledgedAt: input.status === 'pending' ? null : new Date(),
    },
  });

  const row = await prisma.adviserAlert.findUnique({
    where: { id: updated.id },
    select: alertRowSelect,
  });

  return { data: serializeAlert(row!) };
}