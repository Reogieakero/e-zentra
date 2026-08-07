import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { ensureDriveFolder, createDriveFolder, uploadBytes } from './googleDrive.service';
import { Role } from '@prisma/client';

type Row = Record<string, unknown>;

interface Scope {
  all: boolean;
  userId: string;
  role: Role;
  studentIds: string[];
  parentIds: string[];
  subjectIds: string[];
  sectionIds: string[];
}

function cellValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

async function computeScope(user: { id: string; role: Role }): Promise<Scope> {
  const scope: Scope = {
    all: user.role === 'principal',
    role: user.role,
    userId: user.id,
    studentIds: [],
    parentIds: [],
    subjectIds: [],
    sectionIds: [],
  };
  if (scope.all) return scope;

  if (user.role === 'student') {
    scope.studentIds = [user.id];
    return scope;
  }

  if (user.role === 'parent') {
    const links = await prisma.parentStudentLink.findMany({
      where: { parentId: user.id, status: 'confirmed' },
      select: { studentId: true },
    });
    scope.parentIds = [user.id];
    scope.studentIds = links.map((l) => l.studentId);
    return scope;
  }

  const staff = await prisma.staffProfile.findUnique({ where: { id: user.id }, select: { id: true } });
  if (staff) scope.parentIds = [user.id];

  const assignments = await prisma.teacherSubjectAssignment.findMany({
    where: { teacherId: user.id },
    select: { subjectId: true, sectionId: true },
  });
  if (assignments.length) {
    scope.subjectIds = Array.from(new Set(assignments.map((a) => a.subjectId)));
    scope.sectionIds = Array.from(new Set(assignments.map((a) => a.sectionId)));
  }

  const advised = await prisma.section.findMany({ where: { adviserId: user.id }, select: { id: true } });
  if (advised.length) scope.sectionIds = Array.from(new Set([...scope.sectionIds, ...advised.map((s) => s.id)]));

  const teacherSections = scope.sectionIds.filter((id) => id);
  if (teacherSections.length) {
    const students = await prisma.studentProfile.findMany({
      where: { sectionId: { in: teacherSections } },
      select: { id: true },
    });
    scope.studentIds = students.map((s) => s.id);
  }

  return scope;
}

type ScopeFn = (s: Scope) => Record<string, unknown> | null;

const scopeAll = (): Record<string, unknown> | null => ({});

function studentScoped(s: Scope): Record<string, unknown> | null {
  if (s.all) return {};
  if (!s.studentIds.length) return null;
  return { studentId: { in: s.studentIds } };
}

const SCOPED: Record<string, ScopeFn> = {
  studentProfile: (s) => (s.all ? {} : ({ id: { in: s.studentIds } } as Record<string, unknown>)),
  parentProfile: (s) =>
    s.all ? {} : s.parentIds.length ? ({ id: { in: s.parentIds } } as Record<string, unknown>) : null,
  staffProfile: (s) => (s.all ? {} : ({ id: s.userId } as Record<string, unknown>)),
  parentStudentLink: (s) =>
    s.all
      ? {}
      : ({
          OR: [
            { parentId: s.userId },
            ...(s.studentIds.length ? [{ studentId: { in: s.studentIds } }] : []),
          ],
        } as Record<string, unknown>),
  schoolYear: scopeAll,
  term: scopeAll,
  section: (s) => (s.all ? {} : s.sectionIds.length ? ({ id: { in: s.sectionIds } } as Record<string, unknown>) : null),
  subject: (s) => (s.all ? {} : s.subjectIds.length ? ({ id: { in: s.subjectIds } } as Record<string, unknown>) : null),
  teacherSubjectAssignment: (s) => (s.all ? {} : ({ teacherId: s.userId } as Record<string, unknown>)),
  anecdotalRecord: studentScoped,
  anecdotalRecordFollowup: (s) =>
    s.all
      ? {}
      : s.studentIds.length
        ? ({ anecdotalRecord: { studentId: { in: s.studentIds } } } as Record<string, unknown>)
        : null,
  referral: (s) =>
    s.all
      ? {}
      : ({ OR: [{ referredBy: s.userId }, { anecdotalRecord: studentScoped(s) }] } as Record<string, unknown>),
  healthRecord: studentScoped,
  homeVisitationRecord: studentScoped,
  admLearnerProfile: s =>
    s.all ? {} : ({ OR: [{ studentId: { in: s.studentIds } }, { preparedBy: s.userId }] } as Record<string, unknown>),
  admParentMeeting: (s) =>
    s.all
      ? {}
      : ({ admLearnerProfile: { studentId: { in: s.studentIds } } } as Record<string, unknown>),
  admModule: (s) =>
    s.all ? {} : ({ admLearnerProfile: { studentId: { in: s.studentIds } } } as Record<string, unknown>),
  attendanceRecord: studentScoped,
  gradeComponent: (s) => (s.all ? {} : s.subjectIds.length ? ({ subjectId: { in: s.subjectIds } } as Record<string, unknown>) : null),
  assessment: (s) =>
    s.all
      ? {}
      : s.subjectIds.length
        ? ({ OR: [{ teacherId: s.userId }, { subjectId: { in: s.subjectIds } }] } as Record<string, unknown>)
        : null,
  studentGrade: (s) =>
    s.all
      ? {}
      : s.studentIds.length
        ? ({ studentId: { in: s.studentIds } } as Record<string, unknown>)
        : null,
  finalGrade: studentScoped,
  studentRiskAssessment: studentScoped,
  recordFlag: (s) => (s.all ? {} : ({ flaggedBy: s.userId } as Record<string, unknown>)),
  studentReflection: studentScoped,
  reportCard: studentScoped,
  ocrJob: (s) => (s.all ? {} : ({ actorId: s.userId } as Record<string, unknown>)),
  notification: (s) => ({ recipientId: s.userId } as Record<string, unknown>),
};

const EXPORT_ORDER = [
  'studentProfile',
  'parentProfile',
  'staffProfile',
  'parentStudentLink',
  'schoolYear',
  'term',
  'section',
  'subject',
  'teacherSubjectAssignment',
  'anecdotalRecord',
  'anecdotalRecordFollowup',
  'referral',
  'healthRecord',
  'homeVisitationRecord',
  'admLearnerProfile',
  'admParentMeeting',
  'admModule',
  'attendanceRecord',
  'gradeComponent',
  'assessment',
  'studentGrade',
  'finalGrade',
  'studentRiskAssessment',
  'recordFlag',
  'studentReflection',
  'reportCard',
  'ocrJob',
  'notification',
];

async function gather(userId: string): Promise<Scope & { tables: Record<string, Row[]> }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) throw ApiError.notFound('User not found');
  const scope = await computeScope(user);
  const tables: Record<string, Row[]> = {};
  for (const model of EXPORT_ORDER) {
    const delegate = (prisma as unknown as Record<string, { findMany: (args?: { where?: Record<string, unknown> }) => Promise<Row[]> }>)[model];
    if (!delegate) continue;
    const fn = SCOPED[model] ?? scope;
    const where = (fn as ScopeFn)(scope);
    if (where === null) continue;
    const rows = await delegate.findMany(where ? { where } : {});
    if (rows.length) tables[model] = rows;
  }
  return { ...scope, tables, userId };
}

export async function buildWorkbook(tables: Record<string, Row[]>): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  for (const [name, rows] of Object.entries(tables)) {
    const ws = wb.addWorksheet(name.slice(0, 31));
    const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    ws.addRow(keys);
    for (const row of rows) {
      ws.addRow(keys.map((k) => cellValue(row[k])));
    }
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  }
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildPdf(name: string, rows: Row[]): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 36, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.fontSize(16).text(name, { underline: true });
    doc.moveDown();
    const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const colW = (pageWidth - 80) / Math.max(keys.length, 1);
    const drawHeaders = () => {
      doc.fontSize(8);
      doc.font('Helvetica-Bold');
      keys.forEach((k, i) => doc.text(k, 36 + i * colW, doc.y, { width: colW - 4 }));
      doc.moveDown();
    };
    doc.font('Helvetica');
    drawHeaders();
    for (const row of rows) {
      if (doc.y > doc.page.height - 60) {
        doc.addPage();
        drawHeaders();
      }
      const texts = keys.map((k) => cellValue(row[k]));
      const maxLines = Math.max(...texts.map((t) => Math.ceil(t.length / 20)));
      const rowH = Math.min(maxLines, 4) * 10;
      if (doc.y + rowH > doc.page.height - 60) {
        doc.addPage();
        drawHeaders();
      }
      doc.fontSize(7);
      texts.forEach((t, i) => doc.text(t, 36 + i * (colW - 4), doc.y, { width: colW - 4 }));
      doc.moveDown(rowH / 10);
    }
    doc.end();
  });
}

export async function runUserExport(userId: string) {
  if (!config.backup.enabled) {
    throw ApiError.forbidden('Export is disabled.');
  }
  const link = await prisma.googleDriveLink.findUnique({ where: { userId } });
  if (!link) {
    throw ApiError.forbidden('Connect Google Drive before exporting your data.');
  }

  const { tables } = await gather(userId);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const folderName = `Personal-Export-${stamp}`;
  const job = await prisma.exportJob.create({
    data: { status: 'running', userId, folderName },
  });

  let fileCount = 0;
  let folderUrl: string | null = null;
  try {
    const rootFolder = await ensureDriveFolder(userId);
    const folderId = await createDriveFolder(userId, folderName, rootFolder);
    folderUrl = `https://drive.google.com/drive/folders/${folderId}`;

    const workbook = await buildWorkbookObject(tables);
    const workbookName = `PersonalExport-${stamp}.xlsx`;
    await uploadBytes(userId, folderId, workbookName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', workbook);
    fileCount += 1;

    for (const [name, rows] of Object.entries(tables)) {
      const pdf = await buildPdf(name, rows);
      await uploadBytes(userId, folderId, `${name}-${stamp}.pdf`, 'application/pdf', pdf);
      fileCount += 1;
    }

    await prisma.exportJob.update({
      where: { id: job.id },
      data: { status: 'succeeded', fileCount, folderUrl, completedAt: new Date() },
    });
    return { id: job.id, status: 'succeeded', folderUrl, fileCount, folderName };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    await prisma.exportJob.update({
      where: { id: job.id },
      data: { status: 'failed', errorMessage: message, completedAt: new Date() },
    });
    throw err;
  }
}

async function buildWorkbookObject(tables: Record<string, Row[]>): Promise<Buffer> {
  return buildWorkbook(tables);
}

export async function listUserExports(userId: string, limit = 30) {
  return prisma.exportJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      status: true,
      folderName: true,
      folderUrl: true,
      fileCount: true,
      errorMessage: true,
      createdAt: true,
      completedAt: true,
    },
  });
}