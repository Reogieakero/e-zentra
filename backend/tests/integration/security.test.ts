import request from 'supertest';
import { prisma } from '../../src/lib/prisma';
import { app, auth, login, loginAs, truncateAll, createUser, registerAndApproveStudent } from '../helpers';
import { seedSchoolYear, seedSection, seedSubject, seedTerm, seedGradeComponents, seedAssessment } from '../fixtures';

describe('Security: authorization scoping (Phase 0)', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('report cards: student sees only own released cards; parent only confirmed children', async () => {
    const { studentId, email, password } = await registerAndApproveStudent({ gradeLevel: 'grade_9', approverRole: 'record_keeper' });
    const other = await createUser({ role: 'student', gradeLevel: 'grade_9' });

    const rk = await loginAs('record_keeper', { email: `rk.rc.${Date.now()}@test.edu` });
    const sy = await seedSchoolYear(rk.user.id);
    const term = await seedTerm(sy.id, 'junior_high', 'term_1', rk.user.id);

    const created = await request(app)
      .post('/api/v1/report-cards')
      .set(auth(rk.tokens.accessToken))
      .send({ studentId, termId: term.id, source: 'system_generated' });
    expect(created.status).toBe(201);

    const student = await login(email, password);
    const pendingList = await request(app).get('/api/v1/report-cards').set(auth(student.tokens.accessToken));
    expect(pendingList.status).toBe(200);
    expect(pendingList.body.data).toHaveLength(0);

    await request(app).post(`/api/v1/report-cards/${created.body.data.id}/ready`).set(auth(rk.tokens.accessToken));
    await request(app).post(`/api/v1/report-cards/${created.body.data.id}/release`).set(auth(rk.tokens.accessToken));

    const releasedList = await request(app).get('/api/v1/report-cards').set(auth(student.tokens.accessToken));
    expect(releasedList.body.data).toHaveLength(1);
    expect(releasedList.body.data[0].studentId).toBe(studentId);

    const otherStudent = await loginAs('student', { email: `stud.other.${Date.now()}@test.edu` });
    const otherList = await request(app)
      .get(`/api/v1/report-cards?studentId=${studentId}`)
      .set(auth(otherStudent.tokens.accessToken));
    expect(otherList.status).toBe(403);

    const parent = await loginAs('parent', { email: `parent.rc.${Date.now()}@test.edu` });
    await prisma.parentStudentLink.create({ data: { parentId: parent.user.id, studentId, status: 'confirmed' } });
    const parentList = await request(app).get('/api/v1/report-cards').set(auth(parent.tokens.accessToken));
    expect(parentList.body.data).toHaveLength(1);

    const unrelatedParent = await loginAs('parent', { email: `parent.unrel.${Date.now()}@test.edu` });
    const unrelatedList = await request(app).get('/api/v1/report-cards').set(auth(unrelatedParent.tokens.accessToken));
    expect(unrelatedList.body.data).toHaveLength(0);
  });

  it('roster + section attendance are gated: students/parents/stranger-teachers denied, emails stripped', async () => {
    const principal = await loginAs('principal');
    const rk = await loginAs('record_keeper');
    const adviser = await loginAs('teacher', { email: `teacher.adv.${Date.now()}@test.edu` });
    const sy = await seedSchoolYear(principal.user.id);
    const term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
    const section = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, adviserId: adviser.user.id, createdBy: rk.user.id });
    const student1 = await createUser({ role: 'student', gradeLevel: 'grade_9', sectionId: section.id });

    const student = await loginAs('student', { email: `stud.gate.${Date.now()}@test.edu` });
    const studentRoster = await request(app).get(`/api/v1/sections/${section.id}/students`).set(auth(student.tokens.accessToken));
    expect(studentRoster.status).toBe(403);
    const studentAttendance = await request(app)
      .get(`/api/v1/sections/${section.id}/attendance`)
      .set(auth(student.tokens.accessToken));
    expect(studentAttendance.status).toBe(403);

    const parent = await loginAs('parent', { email: `parent.gate.${Date.now()}@test.edu` });
    await prisma.parentStudentLink.create({ data: { parentId: parent.user.id, studentId: student1, status: 'confirmed' } });
    const parentRoster = await request(app).get(`/api/v1/sections/${section.id}/students`).set(auth(parent.tokens.accessToken));
    expect(parentRoster.status).toBe(403);
    const parentAttendance = await request(app)
      .get(`/api/v1/sections/${section.id}/attendance`)
      .set(auth(parent.tokens.accessToken));
    expect(parentAttendance.status).toBe(403);

    const stranger = await loginAs('teacher', { email: `teacher.stranger.${Date.now()}@test.edu` });
    const strangerRoster = await request(app).get(`/api/v1/sections/${section.id}/students`).set(auth(stranger.tokens.accessToken));
    expect(strangerRoster.status).toBe(403);

    const adviserRoster = await request(app).get(`/api/v1/sections/${section.id}/students`).set(auth(adviser.tokens.accessToken));
    expect(adviserRoster.status).toBe(200);
    expect(adviserRoster.body.data[0].user.email).toBeUndefined();
    expect(adviserRoster.body.data[0].user.firstName).toBeDefined();
  });

  it('parent health-record list is limited to confirmed children', async () => {
    const principal = await loginAs('principal');
    const rk = await loginAs('record_keeper');
    const nurse = await loginAs('nurse');
    const teacher = await loginAs('teacher', { email: `teacher.health.${Date.now()}@test.edu` });
    const sy = await seedSchoolYear(principal.user.id);
    const term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
    const section = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, adviserId: teacher.user.id, createdBy: rk.user.id });
    const child = await createUser({ role: 'student', gradeLevel: 'grade_9', sectionId: section.id });
    const notChild = await createUser({ role: 'student', gradeLevel: 'grade_9', sectionId: section.id });

    for (const studentId of [child, notChild]) {
      await request(app)
        .post('/api/v1/health-records')
        .set(auth(nurse.tokens.accessToken))
        .send({ studentId, sectionId: section.id, termId: term.id, visitDate: '2026-07-01', reasonForVisit: 'Fever' });
    }

    const parent = await loginAs('parent', { email: `parent.health.${Date.now()}@test.edu` });
    await prisma.parentStudentLink.create({ data: { parentId: parent.user.id, studentId: child, status: 'confirmed' } });

    const list = await request(app).get('/api/v1/health-records').set(auth(parent.tokens.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].studentId).toBe(child);

    const direct = await request(app)
      .get(`/api/v1/health-records?studentId=${notChild}`)
      .set(auth(parent.tokens.accessToken));
    expect(direct.body.data).toHaveLength(0);
  });

  it('teachers only see grades/assessments for their own sections', async () => {
    const principal = await loginAs('principal');
    const rk = await loginAs('record_keeper');
    const teacherA = await loginAs('teacher', { email: `teacher.a.${Date.now()}@test.edu` });
    const teacherB = await loginAs('teacher', { email: `teacher.b.${Date.now()}@test.edu` });
    const sy = await seedSchoolYear(principal.user.id);
    const term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
    const sectionA = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, adviserId: teacherA.user.id, createdBy: rk.user.id });
    const sectionB = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, adviserId: teacherB.user.id, createdBy: rk.user.id });
    const subjectA = await seedSubject({ gradeLevel: 'grade_9', createdBy: rk.user.id });
    const subjectB = await seedSubject({ gradeLevel: 'grade_9', createdBy: rk.user.id });
    await seedGradeComponents(subjectA.id, term.id);
    await seedGradeComponents(subjectB.id, term.id);
    const assessmentA = await seedAssessment({ subjectId: subjectA.id, sectionId: sectionA.id, termId: term.id, teacherId: teacherA.user.id, componentType: 'quiz', maxScore: 50 });
    const assessmentB = await seedAssessment({ subjectId: subjectB.id, sectionId: sectionB.id, termId: term.id, teacherId: teacherB.user.id, componentType: 'quiz', maxScore: 50 });

    const studentInA = await createUser({ role: 'student', gradeLevel: 'grade_9', sectionId: sectionA.id });
    const studentInB = await createUser({ role: 'student', gradeLevel: 'grade_9', sectionId: sectionB.id });
    await prisma.studentGrade.create({ data: { assessmentId: assessmentA.id, studentId: studentInA, score: 40, recordedBy: teacherA.user.id } });
    await prisma.studentGrade.create({ data: { assessmentId: assessmentB.id, studentId: studentInB, score: 41, recordedBy: teacherB.user.id } });

    const teacherAAssessments = await request(app)
      .get('/api/v1/assessments')
      .set(auth(teacherA.tokens.accessToken));
    expect(teacherAAssessments.body.data.map((a: { id: string }) => a.id)).toEqual([assessmentA.id]);

    const teacherAGrades = await request(app)
      .get('/api/v1/student-grades')
      .set(auth(teacherA.tokens.accessToken));
    expect(teacherAGrades.body.data).toHaveLength(1);
    expect(teacherAGrades.body.data[0].studentId).toBe(studentInA);
  });

  it('referral nested payloads are only exposed to the referred party / principal / band owner', async () => {
    const principal = await loginAs('principal');
    const rk = await loginAs('record_keeper');
    const teacher = await loginAs('teacher', { email: `teacher.ref.${Date.now()}@test.edu` });
    const nurse = await loginAs('nurse');
    const gc = await loginAs('guidance_counselor');
    const sy = await seedSchoolYear(principal.user.id);
    const term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
    const section = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, adviserId: teacher.user.id, createdBy: rk.user.id });
    const studentId = await createUser({ role: 'student', gradeLevel: 'grade_9', sectionId: section.id });

    const anecdotal = await prisma.anecdotalRecord.create({
      data: {
        observerId: teacher.user.id,
        studentId,
        sectionId: section.id,
        termId: term.id,
        observationDate: new Date('2026-07-01'),
        incidentDescription: 'Felt unwell',
      },
    });
    const referral = await prisma.referral.create({
      data: {
        anecdotalRecordId: anecdotal.id,
        referredToRole: 'nurse',
        referredBy: teacher.user.id,
        reasonForReferral: 'Fever symptoms',
      },
    });
    await request(app)
      .post('/api/v1/health-records')
      .set(auth(nurse.tokens.accessToken))
      .send({ studentId, sectionId: section.id, termId: term.id, referralId: referral.id, visitDate: '2026-07-02', reasonForVisit: 'Fever' });

    const teacherView = await request(app)
      .get(`/api/v1/referrals/${referral.id}`)
      .set(auth(teacher.tokens.accessToken));
    expect(teacherView.status).toBe(200);
    expect(teacherView.body.data.healthRecords).toEqual([]);

    const gcView = await request(app)
      .get(`/api/v1/referrals/${referral.id}`)
      .set(auth(gc.tokens.accessToken));
    expect(gcView.status).toBe(200);
    expect(gcView.body.data.healthRecords).toEqual([]);

    const nurseView = await request(app)
      .get(`/api/v1/referrals/${referral.id}`)
      .set(auth(nurse.tokens.accessToken));
    expect(nurseView.status).toBe(200);
    expect(nurseView.body.data.healthRecords).toHaveLength(1);

    const principalView = await request(app)
      .get(`/api/v1/referrals/${referral.id}`)
      .set(auth(principal.tokens.accessToken));
    expect(principalView.body.data.healthRecords).toHaveLength(1);
  });
});
