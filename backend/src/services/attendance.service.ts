import { AttendanceStatus, Prisma, Session } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { ApiError } from '../utils/ApiError';
import { buildCursorResult, parseCursorPagination, parseOffsetPagination } from '../utils/pagination';
import { writeAudit } from './audit.service';
import { notifyParentsOfStudent } from './notification.service';
import { recomputeRiskAndNotify } from './risk.service';
import { serializeForOutput } from '../middleware/errorHandler';

export interface AttendanceRowInput {
  studentId: string;
  status: AttendanceStatus;
  remarks?: string;
}

export interface MarkAttendanceInput {
  sectionId: string;
  termId: string;
  attendanceDate: string;
  session: Session;
  records: AttendanceRowInput[];
}

async function assertAdviser(sectionId: string, actorId: string): Promise<void> {
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) throw ApiError.notFound('Section not found');
  if (section.adviserId !== actorId) {
    throw ApiError.forbidden('Only the section adviser may record attendance for this section');
  }
}

export async function markAttendance(actorId: string, input: MarkAttendanceInput) {
  await assertAdviser(input.sectionId, actorId);

  const term = await prisma.term.findUnique({ where: { id: input.termId } });
  if (!term) throw ApiError.notFound('Term not found');

  const studentIds = input.records.map((r) => r.studentId);
  const students = await prisma.studentProfile.findMany({
    where: { id: { in: studentIds }, sectionId: input.sectionId },
    select: { id: true },
  });
  const found = new Set(students.map((s) => s.id));
  const missing = studentIds.filter((id) => !found.has(id));
  if (missing.length > 0) {
    throw ApiError.badRequest('One or more students do not belong to this section', { studentIds: missing });
  }

  const date = new Date(input.attendanceDate);
  const data = input.records.map((r) => ({
    studentId: r.studentId,
    sectionId: input.sectionId,
    termId: input.termId,
    attendanceDate: date,
    session: input.session,
    status: r.status,
    remarks: r.remarks,
    recordedBy: actorId,
  }));

  const result = await prisma.attendanceRecord.createMany({ data, skipDuplicates: true });

  for (const row of input.records) {
    if (row.status === 'absent' || row.status === 'late') {
      await notifyParentsOfStudent(row.studentId, {
        sourceTable: 'attendance_records',
        sourceRecordId: row.studentId,
        notificationType: 'attendance_alert',
        title: `Marked ${row.status}`,
        message: `Your child was marked ${row.status} on ${input.attendanceDate} (${input.session}).`,
      });
    }
    await recomputeRiskAndNotify(row.studentId, input.termId).catch(() => undefined);
  }

  await writeAudit({
    actorId,
    action: 'CREATE',
    tableName: 'attendance_records',
    recordId: input.sectionId,
    newValue: { count: result.count, date: input.attendanceDate, session: input.session } as unknown as Prisma.InputJsonValue,
  });

  return { data: { created: result.count, skipped: input.records.length - result.count } };
}

export async function listSectionAttendance(viewer: { id: string; role: import('@prisma/client').Role }, sectionId: string, query: Record<string, unknown>) {
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) throw ApiError.notFound('Section not found');
  const { assertCanViewSectionAttendance } = await import('../utils/access');
  await assertCanViewSectionAttendance(viewer, section);

  const cursor = parseCursorPagination(query);
  const where: Prisma.AttendanceRecordWhereInput = { sectionId };
  if (query.studentId) where.studentId = query.studentId as string;
  if (query.status) where.status = query.status as AttendanceStatus;
  if (query.session) where.session = query.session as Session;
  if (query.from || query.to) {
    where.attendanceDate = {
      ...(query.from ? { gte: new Date(query.from as string) } : {}),
      ...(query.to ? { lte: new Date(query.to as string) } : {}),
    };
  }

  const records = await prisma.attendanceRecord.findMany({
    where,
    orderBy: [{ attendanceDate: 'desc' }, { id: 'desc' }],
    take: cursor.take + 1,
    ...(cursor.cursor ? { cursor: { id: cursor.cursor }, skip: 1 } : {}),
    include: { student: { select: { id: true, firstName: true, lastName: true } } },
  });

  const paginated = buildCursorResult(records, cursor);
  return { data: serializeForOutput(paginated.data), nextCursor: paginated.nextCursor, hasMore: paginated.hasMore };
}

export async function listStudentAttendance(studentId: string, query: Record<string, unknown>) {
  const offset = parseOffsetPagination(query);
  const where: Prisma.AttendanceRecordWhereInput = { studentId };
  if (query.termId) where.termId = query.termId as string;
  if (query.from || query.to) {
    where.attendanceDate = {
      ...(query.from ? { gte: new Date(query.from as string) } : {}),
      ...(query.to ? { lte: new Date(query.to as string) } : {}),
    };
  }

  const [total, records] = await Promise.all([
    prisma.attendanceRecord.count({ where }),
    prisma.attendanceRecord.findMany({
      where,
      orderBy: [{ attendanceDate: 'desc' }, { id: 'desc' }],
      skip: offset.skip,
      take: offset.take,
    }),
  ]);

  return {
    data: serializeForOutput(records),
    page: offset.page,
    pageSize: offset.pageSize,
    total,
    hasMore: offset.page * offset.pageSize < total,
  };
}

export async function updateAttendance(actorId: string, id: string, input: { status?: AttendanceStatus; remarks?: string | null }) {
  const existing = await prisma.attendanceRecord.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Attendance record not found');
  await assertAdviser(existing.sectionId, actorId);

  const updated = await prisma.attendanceRecord.update({
    where: { id },
    data: { status: input.status, remarks: input.remarks === undefined ? undefined : input.remarks },
  });

  if (input.status && ['absent', 'late'].includes(input.status)) {
    await notifyParentsOfStudent(existing.studentId, {
      sourceTable: 'attendance_records',
      sourceRecordId: id,
      notificationType: 'attendance_alert',
      title: `Marked ${input.status}`,
      message: `Your child was marked ${input.status}.`,
    });
  }
  await recomputeRiskAndNotify(existing.studentId, existing.termId).catch(() => undefined);

  await writeAudit({
    actorId,
    action: 'UPDATE',
    tableName: 'attendance_records',
    recordId: id,
    oldValue: { status: existing.status } as unknown as Prisma.InputJsonValue,
    newValue: { status: updated.status } as unknown as Prisma.InputJsonValue,
  });
  return { data: serializeForOutput(updated) };
}
