import request from 'supertest';
import { prisma } from '../../src/lib/prisma';
import { app, auth, loginAs, truncateAll, createUser, registerAndApproveStudent } from '../helpers';
import { seedSchoolYear, seedSection, seedSubject, seedTerm, seedGradeComponents, seedAssessment } from '../fixtures';
import { runFlagEscalation } from '../../src/jobs/flagEscalation';

describe('Parent links (gap 4)', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('parent requests a link by studentId and confirms it; re-confirm is rejected', async () => {
    const { studentId } = await registerAndApproveStudent({ gradeLevel: 'grade_9', approverRole: 'record_keeper' });
    const parent = await loginAs('parent');

    const req = await request(app)
      .post('/api/v1/parent-links')
      .set(auth(parent.tokens.accessToken))
      .send({ studentId });
    expect(req.status).toBe(201);
    expect(req.body.data.status).toBe('pending_confirmation');
    const linkId = req.body.data.id;

    const confirm = await request(app)
      .post(`/api/v1/parent-links/${linkId}/confirm`)
      .set(auth(parent.tokens.accessToken));
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.status).toBe('confirmed');
    expect(confirm.body.data.confirmedVia).toBe('parent_app');

    const again = await request(app)
      .post(`/api/v1/parent-links/${linkId}/confirm`)
      .set(auth(parent.tokens.accessToken));
    expect(again.status).toBe(409);
  });

  it('parent requests a link by LRN; record custodian rejects it', async () => {
    const { studentId } = await registerAndApproveStudent({ gradeLevel: 'grade_9', approverRole: 'record_keeper' });
    const profile = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    const parent = await loginAs('parent', { email: `parent.lrn.${Date.now()}@test.edu` });

    const req = await request(app)
      .post('/api/v1/parent-links')
      .set(auth(parent.tokens.accessToken))
      .send({ lrn: profile!.lrn });
    expect(req.status).toBe(201);
    const linkId = req.body.data.id;

    const rk = await loginAs('record_keeper', { email: `rk.reject.${Date.now()}@test.edu` });
    const reject = await request(app)
      .post(`/api/v1/parent-links/${linkId}/reject`)
      .set(auth(rk.tokens.accessToken));
    expect(reject.status).toBe(200);
    expect(reject.body.data.status).toBe('rejected');
    expect(reject.body.data.confirmedVia).toBe('staff_recorded');
  });

  it('enforces authorization, validation, and duplicates', async () => {
    const { studentId } = await registerAndApproveStudent({ gradeLevel: 'grade_9', approverRole: 'record_keeper' });
    const parentA = await loginAs('parent', { email: `pa.${Date.now()}@test.edu` });
    const parentB = await loginAs('parent', { email: `pb.${Date.now()}@test.edu` });

    const none = await request(app)
      .post('/api/v1/parent-links')
      .set(auth(parentA.tokens.accessToken))
      .send({});
    expect(none.status).toBe(422);

    const both = await request(app)
      .post('/api/v1/parent-links')
      .set(auth(parentA.tokens.accessToken))
      .send({ studentId, lrn: 'SOMELRN' });
    expect(both.status).toBe(422);

    const created = await request(app)
      .post('/api/v1/parent-links')
      .set(auth(parentA.tokens.accessToken))
      .send({ studentId });
    expect(created.status).toBe(201);
    const linkId = created.body.data.id;

    const dup = await request(app)
      .post('/api/v1/parent-links')
      .set(auth(parentA.tokens.accessToken))
      .send({ studentId });
    expect(dup.status).toBe(409);

    const cross = await request(app)
      .post(`/api/v1/parent-links/${linkId}/confirm`)
      .set(auth(parentB.tokens.accessToken));
    expect(cross.status).toBe(403);

    const teacher = await loginAs('teacher');
    const teacherTry = await request(app)
      .post(`/api/v1/parent-links/${linkId}/confirm`)
      .set(auth(teacher.tokens.accessToken));
    expect(teacherTry.status).toBe(403);
  });

  it('parents only list their own links; staff list all', async () => {
    const { studentId: s1 } = await registerAndApproveStudent({ gradeLevel: 'grade_9', approverRole: 'record_keeper' });
    const { studentId: s2 } = await registerAndApproveStudent({ gradeLevel: 'grade_11', approverRole: 'registrar' });
    const parentA = await loginAs('parent', { email: `pa.${Date.now()}@test.edu` });
    const parentB = await loginAs('parent', { email: `pb.${Date.now()}@test.edu` });

    await request(app).post('/api/v1/parent-links').set(auth(parentA.tokens.accessToken)).send({ studentId: s1 });
    await request(app).post('/api/v1/parent-links').set(auth(parentB.tokens.accessToken)).send({ studentId: s2 });

    const myList = await request(app).get('/api/v1/parent-links').set(auth(parentA.tokens.accessToken));
    expect(myList.status).toBe(200);
    expect(myList.body.data).toHaveLength(1);
    expect(myList.body.data[0].student.id).toBe(s1);

    const rk = await loginAs('record_keeper', { email: `rk.list.${Date.now()}@test.edu` });
    const all = await request(app).get('/api/v1/parent-links').set(auth(rk.tokens.accessToken));
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(2);
  });
});

describe('Report card generation (gap 5)', () => {
  let rk: Awaited<ReturnType<typeof loginAs>>;
  let teacher: Awaited<ReturnType<typeof loginAs>>;
  let studentId: string;
  let section: Awaited<ReturnType<typeof seedSection>>;
  let subject: Awaited<ReturnType<typeof seedSubject>>;
  let term: Awaited<ReturnType<typeof seedTerm>>;

  beforeEach(async () => {
    await truncateAll();
    const principal = await loginAs('principal');
    rk = await loginAs('record_keeper');
    teacher = await loginAs('teacher');
    studentId = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    const sy = await seedSchoolYear(principal.user.id);
    term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
    section = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, createdBy: rk.user.id, adviserId: teacher.user.id });
    subject = await seedSubject({ gradeLevel: 'grade_9', createdBy: rk.user.id });
    await prisma.studentProfile.update({ where: { id: studentId }, data: { sectionId: section.id } });
    await prisma.teacherSubjectAssignment.create({
      data: {
        teacherId: teacher.user.id,
        subjectId: subject.id,
        sectionId: section.id,
        schoolYearId: sy.id,
        assignedBy: rk.user.id,
      },
    });
    await seedGradeComponents(subject.id, term.id);
  });

  async function createFinalGrade() {
    const assessment = await seedAssessment({
      subjectId: subject.id,
      sectionId: section.id,
      termId: term.id,
      teacherId: teacher.user.id,
      componentType: 'quiz',
      maxScore: 50,
    });
    await request(app)
      .post('/api/v1/student-grades')
      .set(auth(teacher.tokens.accessToken))
      .send({ assessmentId: assessment.id, studentId, score: 40 });
    const computed = await request(app)
      .post('/api/v1/final-grades/compute')
      .set(auth(teacher.tokens.accessToken))
      .send({ subjectId: subject.id, termId: term.id, studentId, sectionId: section.id });
    expect(computed.status).toBe(200);
  }

  it('generates ready cards from final grades, then is idempotent', async () => {
    await createFinalGrade();

    const gen = await request(app)
      .post('/api/v1/report-cards/generate')
      .set(auth(rk.tokens.accessToken))
      .send({ termId: term.id });
    expect(gen.status).toBe(201);
    expect(gen.body.created).toBe(1);
    expect(gen.body.data[0].status).toBe('ready');
    expect(gen.body.data[0].source).toBe('system_generated');

    const gen2 = await request(app)
      .post('/api/v1/report-cards/generate')
      .set(auth(rk.tokens.accessToken))
      .send({ termId: term.id });
    expect(gen2.status).toBe(201);
    expect(gen2.body.created).toBe(0);

    const card = await prisma.reportCard.findFirst({ where: { studentId, termId: term.id } });
    expect(card?.status).toBe('ready');
    expect(card?.managedBy).toBe(rk.user.id);
  });

  it('rejects non-custodians and unknown terms; no-op when no grades exist', async () => {
    const forbidden = await request(app)
      .post('/api/v1/report-cards/generate')
      .set(auth(teacher.tokens.accessToken))
      .send({ termId: term.id });
    expect(forbidden.status).toBe(403);

    const missingTerm = await request(app)
      .post('/api/v1/report-cards/generate')
      .set(auth(rk.tokens.accessToken))
      .send({ termId: '00000000-0000-0000-0000-000000000000' });
    expect(missingTerm.status).toBe(404);

    const noGrades = await request(app)
      .post('/api/v1/report-cards/generate')
      .set(auth(rk.tokens.accessToken))
      .send({ termId: term.id });
    expect(noGrades.status).toBe(201);
    expect(noGrades.body.created).toBe(0);
    expect(noGrades.body.message).toMatch(/No final grades/);
  });
});

describe('Auto-escalation job (gap 7)', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('escalates stale open flags to principals and notifies them', async () => {
    const teacher = await loginAs('teacher');
    const principal = await loginAs('principal');

    await prisma.recordFlag.create({
      data: {
        sourceTable: 'anecdotal_records',
        sourceRecordId: '00000000-0000-0000-0000-000000000001',
        flaggedBy: teacher.user.id,
        flagReason: 'Needs principal attention',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    });
    await prisma.recordFlag.create({
      data: {
        sourceTable: 'anecdotal_records',
        sourceRecordId: '00000000-0000-0000-0000-000000000002',
        flaggedBy: teacher.user.id,
        flagReason: 'Recent, should not escalate',
      },
    });

    const escalated = await runFlagEscalation();
    expect(escalated).toBe(1);

    const stale = await prisma.recordFlag.findFirst({
      where: { sourceRecordId: '00000000-0000-0000-0000-000000000001' },
    });
    expect(stale?.escalatedToPrincipal).toBe(true);
    expect(stale?.escalatedAt).toBeTruthy();

    const fresh = await prisma.recordFlag.findFirst({
      where: { sourceRecordId: '00000000-0000-0000-0000-000000000002' },
    });
    expect(fresh?.escalatedToPrincipal).toBe(false);

    const note = await prisma.notification.findFirst({
      where: { recipientId: principal.user.id, sourceTable: 'record_flags', notificationType: 'record_flag_escalated' },
    });
    expect(note).toBeTruthy();
  });
});

describe('Uploads (gap 1)', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('record custodian uploads a profile photo and it is persisted on the user', async () => {
    const rk = await loginAs('record_keeper');
    const res = await request(app)
      .post('/api/v1/uploads/profile-photo')
      .set(auth(rk.tokens.accessToken))
      .attach('file', Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('png-bytes')]), { filename: 'photo.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data.url).toMatch(/^\/uploads\/profile-photos\/[^/]+\.png$/);
    expect(res.body.data.mimeType).toBe('image/png');

    const user = await prisma.user.findUnique({ where: { id: rk.user.id }, select: { profilePhotoUrl: true } });
    expect(user?.profilePhotoUrl).toBe(res.body.data.url);
  });

  it('enforces role, mime type, kind, content signature, and presence of file', async () => {
    const student = await loginAs('student');
    const forbidden = await request(app)
      .post('/api/v1/uploads/report-card')
      .set(auth(student.tokens.accessToken))
      .attach('file', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), { filename: 'x.png', contentType: 'image/png' });
    expect(forbidden.status).toBe(403);

    const rk = await loginAs('record_keeper');
    const badMime = await request(app)
      .post('/api/v1/uploads/report-card')
      .set(auth(rk.tokens.accessToken))
      .attach('file', Buffer.from([0x25, 0x50, 0x44, 0x46]), { filename: 'x.txt', contentType: 'text/plain' });
    expect(badMime.status).toBe(422);

    const spoofed = await request(app)
      .post('/api/v1/uploads/profile-photo')
      .set(auth(rk.tokens.accessToken))
      .attach('file', Buffer.from('<html>polyglot</html>'), { filename: 'x.png', contentType: 'image/png' });
    expect(spoofed.status).toBe(422);
    expect(spoofed.body.error.message).toMatch(/content does not match/i);

    const unknownKind = await request(app)
      .post('/api/v1/uploads/bogus')
      .set(auth(rk.tokens.accessToken))
      .attach('file', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), { filename: 'x.png', contentType: 'image/png' });
    expect(unknownKind.status).toBe(422);

    const noFile = await request(app)
      .post('/api/v1/uploads/profile-photo')
      .set(auth(rk.tokens.accessToken));
    expect(noFile.status).toBe(400);
  });

  it('tracks per-user storage usage and replaces prior profile photo', async () => {
    const rk = await loginAs('record_keeper');
    const png = () => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('aaaaaaaaaaaa')]);

    const first = await request(app)
      .post('/api/v1/uploads/profile-photo')
      .set(auth(rk.tokens.accessToken))
      .attach('file', png(), { filename: 'a.png', contentType: 'image/png' });
    expect(first.status).toBe(201);
    const firstUrl = first.body.data.url;

    let user = await prisma.user.findUnique({ where: { id: rk.user.id }, select: { storageUsedBytes: true, profilePhotoUrl: true } });
    expect(user?.storageUsedBytes).toBe(BigInt(first.body.data.size));
    expect(user?.profilePhotoUrl).toBe(firstUrl);

    const second = await request(app)
      .post('/api/v1/uploads/profile-photo')
      .set(auth(rk.tokens.accessToken))
      .attach('file', png(), { filename: 'b.png', contentType: 'image/png' });
    expect(second.status).toBe(201);

    user = await prisma.user.findUnique({ where: { id: rk.user.id }, select: { storageUsedBytes: true, profilePhotoUrl: true } });
    expect(user?.profilePhotoUrl).toBe(second.body.data.url);
    expect(user?.storageUsedBytes).toBe(BigInt(second.body.data.size));
  });
});
