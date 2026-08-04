import request from 'supertest';
import { prisma } from '../../src/lib/prisma';
import { app, auth, loginAs, truncateAll, createUser } from '../helpers';
import { seedSchoolYear, seedSection, seedTerm } from '../fixtures';

describe('Oversight (risk, flags, reflections, report cards) + notifications', () => {
  let principal: Awaited<ReturnType<typeof loginAs>>;
  let rk: Awaited<ReturnType<typeof loginAs>>;
  let teacher: Awaited<ReturnType<typeof loginAs>>;
  let gc: Awaited<ReturnType<typeof loginAs>>;
  let studentId: string;
  let section: Awaited<ReturnType<typeof seedSection>>;
  let term: Awaited<ReturnType<typeof seedTerm>>;
  let sy: Awaited<ReturnType<typeof seedSchoolYear>>;

  beforeEach(async () => {
    await truncateAll();
    principal = await loginAs('principal');
    rk = await loginAs('record_keeper');
    teacher = await loginAs('teacher');
    gc = await loginAs('guidance_counselor');
    studentId = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    sy = await seedSchoolYear(principal.user.id);
    term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
    section = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, createdBy: rk.user.id });
    await prisma.studentProfile.update({ where: { id: studentId }, data: { sectionId: section.id } });
  });

  it('GC assesses student risk (computed, not client-set)', async () => {
    const assessed = await request(app)
      .post('/api/v1/risk-assessments/assess')
      .set(auth(gc.tokens.accessToken))
      .send({ studentId, termId: term.id, sectionId: section.id });
    expect(assessed.status).toBe(200);

    const record = await prisma.studentRiskAssessment.findUnique({
      where: { studentId_termId: { studentId, termId: term.id } },
    });
    expect(record).toBeTruthy();
    expect(record!.riskCount).toBe(record!.academicRisk ? 1 : 0);
    expect(record!.riskLevel).toBe(record!.riskCount === 0 ? 'low' : 'moderate');
  });

  it('record flags: create, list, resolve, escalate', async () => {
    const created = await request(app)
      .post('/api/v1/record-flags')
      .set(auth(teacher.tokens.accessToken))
      .send({ sourceTable: 'anecdotal_records', sourceRecordId: section.id, flagReason: 'Review needed' });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('open');

    const listed = await request(app)
      .get('/api/v1/record-flags?status=open')
      .set(auth(rk.tokens.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.data.length).toBeGreaterThanOrEqual(1);

    const escalated = await request(app)
      .post(`/api/v1/record-flags/${created.body.data.id}/escalate`)
      .set(auth(rk.tokens.accessToken));
    expect(escalated.status).toBe(200);
    expect(escalated.body.data.escalatedToPrincipal).toBe(true);

    const resolved = await request(app)
      .post(`/api/v1/record-flags/${created.body.data.id}/resolve`)
      .set(auth(gc.tokens.accessToken));
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.status).toBe('resolved');
  });

  it('student writes own reflection; cannot write for another student', async () => {
    const student = await loginAs('student', { email: `student.refl.${Date.now()}@test.edu` });
    const created = await request(app)
      .post('/api/v1/reflections')
      .set(auth(student.tokens.accessToken))
      .send({ studentId: student.user.id, termId: term.id, content: 'I learned a lot this term.' });
    expect(created.status).toBe(201);

    const forbidden = await request(app)
      .post('/api/v1/reflections')
      .set(auth(student.tokens.accessToken))
      .send({ studentId: studentId, content: 'Impersonating another learner' });
    expect(forbidden.status).toBe(403);
  });

  it('report card lifecycle: create, ready, release (RK); notification is created', async () => {
    const student = await loginAs('student', { email: `student.rc.${Date.now()}@test.edu` });
    const created = await request(app)
      .post('/api/v1/report-cards')
      .set(auth(rk.tokens.accessToken))
      .send({ studentId: student.user.id, termId: term.id, source: 'system_generated' });
    expect(created.status).toBe(201);

    const ready = await request(app)
      .post(`/api/v1/report-cards/${created.body.data.id}/ready`)
      .set(auth(rk.tokens.accessToken));
    expect(ready.status).toBe(200);
    expect(ready.body.data.status).toBe('ready');

    const released = await request(app)
      .post(`/api/v1/report-cards/${created.body.data.id}/release`)
      .set(auth(rk.tokens.accessToken));
    expect(released.status).toBe(200);
    expect(released.body.data.status).toBe('released');

    const notifs = await request(app)
      .get('/api/v1/notifications')
      .set(auth(student.tokens.accessToken));
    expect(notifs.status).toBe(200);
    const hasReportCard = notifs.body.data.some((n: { notificationType: string }) => n.notificationType === 'report_card_ready');
    expect(hasReportCard).toBe(true);

    const markRead = await request(app)
      .post(`/api/v1/notifications/${notifs.body.data[0].id}/read`)
      .set(auth(student.tokens.accessToken));
    expect(markRead.status).toBe(200);
  });

  it('notifications are per-recipient (cannot read another user notification)', async () => {
    const student = await loginAs('student', { email: `student.n.${Date.now()}@test.edu` });
    const created = await request(app)
      .post('/api/v1/report-cards')
      .set(auth(rk.tokens.accessToken))
      .send({ studentId: student.user.id, termId: term.id, source: 'scanned_upload' });
    await request(app)
      .post(`/api/v1/report-cards/${created.body.data.id}/ready`)
      .set(auth(rk.tokens.accessToken));
    await request(app)
      .post(`/api/v1/report-cards/${created.body.data.id}/release`)
      .set(auth(rk.tokens.accessToken));

    const theirList = await request(app)
      .get('/api/v1/notifications')
      .set(auth(student.tokens.accessToken));
    expect(theirList.body.data.length).toBeGreaterThanOrEqual(1);

    const stranger = await loginAs('student', { email: `student.n2.${Date.now()}@test.edu` });
    const forbidden = await request(app)
      .post(`/api/v1/notifications/${theirList.body.data[0].id}/read`)
      .set(auth(stranger.tokens.accessToken));
    expect(forbidden.status).toBe(403);
  });
});
