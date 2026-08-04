import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { prisma } from '../../src/lib/prisma';
import { app, auth, loginAs, truncateAll, createUser } from '../helpers';
import { seedSchoolYear, seedSection, seedSubject, seedTerm } from '../fixtures';
import { processQueuedOcrJobs } from '../../src/services/ocr.service';
import { config } from '../../src/config/env';

function seedUploadFile(name: string): string {
  const dir = path.resolve(config.security.uploadDir, 'report-cards');
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  return `/uploads/report-cards/${name}`;
}

describe('OCR pipeline (fake engine)', () => {
  let principal: Awaited<ReturnType<typeof loginAs>>;
  let rk: Awaited<ReturnType<typeof loginAs>>;
  let studentId: string;
  let section: Awaited<ReturnType<typeof seedSection>>;
  let term: Awaited<ReturnType<typeof seedTerm>>;
  let subjectCodes: string[];
  let fileCounter = 0;

  beforeEach(async () => {
    await truncateAll();
    principal = await loginAs('principal');
    rk = await loginAs('record_keeper');
    studentId = await createUser({ role: 'student', gradeLevel: 'grade_9', lrn: '123456789012' });
    const sy = await seedSchoolYear(principal.user.id);
    term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
    section = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, createdBy: rk.user.id });
    await prisma.studentProfile.update({ where: { id: studentId }, data: { sectionId: section.id } });

    const subjects = [
      await seedSubject({ gradeLevel: 'grade_9', createdBy: rk.user.id, subjectCode: 'FIL' }),
      await seedSubject({ gradeLevel: 'grade_9', createdBy: rk.user.id, subjectCode: 'MATH' }),
      await seedSubject({ gradeLevel: 'grade_9', createdBy: rk.user.id, subjectCode: 'SCI' }),
    ];
    subjectCodes = subjects.map((s) => s.subjectCode);
    fileCounter += 1;
  });

  function nextFileUrl(): string {
    return seedUploadFile(`00000000-0000-0000-0000-00000000${String(fileCounter).padStart(4, '0')}.png`);
  }

  it('scanned report card: enqueue -> process -> staged extraction -> approve writes final grades', async () => {
    const created = await request(app)
      .post('/api/v1/report-cards')
      .set(auth(rk.tokens.accessToken))
      .send({ studentId, termId: term.id, source: 'scanned_upload', fileUrl: nextFileUrl() });
    expect(created.status).toBe(201);
    const cardId = created.body.data.id;
    expect(created.body.data.ocrStatus).toBe('queued');

    await processQueuedOcrJobs();

    const card = await prisma.reportCard.findUnique({ where: { id: cardId }, include: { extraction: true } });
    expect(card?.ocrStatus).toBe('passed');
    const extraction = card?.extraction[0];
    expect(extraction).toBeTruthy();
    expect(extraction!.status).toBe('needs_review');
    expect((extraction!.validation as unknown as { autoApprove: boolean }).autoApprove).toBe(true);
    expect(extraction!.overallConfidence).toBeGreaterThanOrEqual(0.97);
    expect(extraction!.studentMatch).toMatchObject({ studentId, lrn: '123456789012' });
    const gradeRows = extraction!.gradeRows as unknown as Array<{ subjectCode: string; grade: number }>;
    expect(gradeRows.map((r) => r.subjectCode).sort()).toEqual([...subjectCodes].sort());
    expect(gradeRows.every((r) => r.grade! >= 60 && r.grade! <= 100)).toBe(true);

    const job = await prisma.ocrJob.findFirst({ where: { reportCardId: cardId } });
    expect(job?.status).toBe('succeeded');

    const approve = await request(app)
      .post(`/api/v1/report-cards/${cardId}/extraction/approve`)
      .set(auth(rk.tokens.accessToken))
      .send({});
    expect(approve.status).toBe(200);

    const updatedCard = await prisma.reportCard.findUnique({ where: { id: cardId } });
    expect(updatedCard?.status).toBe('ready');

    const finalGrades = await prisma.finalGrade.findMany({ where: { studentId, termId: term.id } });
    expect(finalGrades.length).toBe(subjectCodes.length);
  });

  it('approve applies corrections and writes corrected grades', async () => {
    const created = await request(app)
      .post('/api/v1/report-cards')
      .set(auth(rk.tokens.accessToken))
      .send({ studentId, termId: term.id, source: 'scanned_upload', fileUrl: nextFileUrl() });
    expect(created.status).toBe(201);
    const cardId = created.body.data.id;

    await processQueuedOcrJobs();

    const approve = await request(app)
      .post(`/api/v1/report-cards/${cardId}/extraction/approve`)
      .set(auth(rk.tokens.accessToken))
      .send({ corrections: [{ subjectCode: subjectCodes[0], from: null, to: 97, remarks: 'Outstanding' }] });
    expect(approve.status).toBe(200);

    const grade = await prisma.finalGrade.findFirst({
      where: { studentId, termId: term.id, subject: { subjectCode: subjectCodes[0] } },
      select: { initialGrade: true, remarks: true },
    });
    expect(Number(grade?.initialGrade)).toBe(97);
    expect(grade?.remarks).toBe('Outstanding');

    const extraction = await prisma.reportCardExtraction.findFirst({ where: { reportCardId: cardId } });
    const corrections = extraction!.corrections as unknown as { applied: Array<{ subjectCode: string; to: number }> };
    expect(corrections.applied[0].to).toBe(97);
  });

  it('blocks students and non-custodians from reviewing/approving extractions', async () => {
    const created = await request(app)
      .post('/api/v1/report-cards')
      .set(auth(rk.tokens.accessToken))
      .send({ studentId, termId: term.id, source: 'scanned_upload', fileUrl: nextFileUrl() });
    const cardId = created.body.data.id;

    await processQueuedOcrJobs();

    const student = await loginAs('student', { email: `student.ocr.${Date.now()}@test.edu` });
    const forbidden = await request(app)
      .get(`/api/v1/report-cards/${cardId}/extraction`)
      .set(auth(student.tokens.accessToken));
    expect(forbidden.status).toBe(403);

    const wrongBand = await loginAs('registrar', { email: `registrar.ocr.${Date.now()}@test.edu` });
    const bandForbidden = await request(app)
      .post(`/api/v1/report-cards/${cardId}/extraction/approve`)
      .set(auth(wrongBand.tokens.accessToken))
      .send({});
    expect(bandForbidden.status).toBe(403);
  });

  it('reject marks the extraction rejected and the card failed', async () => {
    const created = await request(app)
      .post('/api/v1/report-cards')
      .set(auth(rk.tokens.accessToken))
      .send({ studentId, termId: term.id, source: 'scanned_upload', fileUrl: nextFileUrl() });
    const cardId = created.body.data.id;

    await processQueuedOcrJobs();

    const reject = await request(app)
      .post(`/api/v1/report-cards/${cardId}/extraction/reject`)
      .set(auth(rk.tokens.accessToken))
      .send({ reason: 'Scan unreadable' });
    expect(reject.status).toBe(200);

    const extraction = await prisma.reportCardExtraction.findFirst({ where: { reportCardId: cardId } });
    expect(extraction?.status).toBe('rejected');
    const card = await prisma.reportCard.findUnique({ where: { id: cardId } });
    expect(card?.ocrStatus).toBe('failed');
  });

  it('job polling endpoint is readable by the job owner', async () => {
    const created = await request(app)
      .post('/api/v1/report-cards')
      .set(auth(rk.tokens.accessToken))
      .send({ studentId, termId: term.id, source: 'scanned_upload', fileUrl: nextFileUrl() });
    const cardId = created.body.data.id;

    const job = await prisma.ocrJob.findFirst({ where: { reportCardId: cardId } });
    const res = await request(app)
      .get(`/api/v1/ocr/jobs/${job!.id}`)
      .set(auth(rk.tokens.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.data.reportCardId).toBe(cardId);
  });
});
