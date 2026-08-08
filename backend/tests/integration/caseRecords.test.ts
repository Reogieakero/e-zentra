import request from 'supertest';
import { prisma } from '../../src/lib/prisma';
import { app, auth, loginAs, truncateAll, createUser } from '../helpers';
import { seedSchoolYear, seedSection, seedTerm } from '../fixtures';

describe('Case records (anecdotal, referral, health, home visit, ADM)', () => {
  let principal: Awaited<ReturnType<typeof loginAs>>;
  let rk: Awaited<ReturnType<typeof loginAs>>;
  let teacher: Awaited<ReturnType<typeof loginAs>>;
  let gc: Awaited<ReturnType<typeof loginAs>>;
  let nurse: Awaited<ReturnType<typeof loginAs>>;
  let adm: Awaited<ReturnType<typeof loginAs>>;
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
    nurse = await loginAs('nurse');
    adm = await loginAs('adm_coordinator');
    studentId = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    sy = await seedSchoolYear(principal.user.id);
    term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
    section = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, createdBy: rk.user.id, adviserId: teacher.user.id });
    await prisma.studentProfile.update({ where: { id: studentId }, data: { sectionId: section.id } });
  });

  it('adviser files anecdotal record; unassigned teacher is denied', async () => {
    const created = await request(app)
      .post('/api/v1/anecdotal-records')
      .set(auth(teacher.tokens.accessToken))
      .send({
        studentId,
        sectionId: section.id,
        termId: term.id,
        observationDate: '2026-07-05',
        incidentDescription: 'Disruptive during class',
        confidentialityLevel: 'confidential',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.formReference).toBe('GCForm-01');

    const stranger = await loginAs('teacher', { email: `teacher.stranger.${Date.now()}@test.edu` });
    const denied = await request(app)
      .post('/api/v1/anecdotal-records')
      .set(auth(stranger.tokens.accessToken))
      .send({
        studentId,
        sectionId: section.id,
        termId: term.id,
        observationDate: '2026-07-05',
        incidentDescription: 'Should be denied',
      });
    expect(denied.status).toBe(403);

    const got = await request(app).get(`/api/v1/anecdotal-records/${created.body.data.id}`).set(auth(gc.tokens.accessToken));
    expect(got.status).toBe(200);
  });

  it('nurse records a health visit linked to a referral (referral auto-completes)', async () => {
    const anecdotal = await prisma.anecdotalRecord.create({
      data: {
        observerId: teacher.user.id,
        studentId,
        sectionId: section.id,
        termId: term.id,
        observationDate: new Date('2026-07-05'),
        incidentDescription: 'Felt unwell in class',
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

    const health = await request(app)
      .post('/api/v1/health-records')
      .set(auth(nurse.tokens.accessToken))
      .send({
        studentId,
        sectionId: section.id,
        termId: term.id,
        referralId: referral.id,
        visitDate: '2026-07-06',
        reasonForVisit: 'Fever',
        recommendation: 'rest_in_clinic',
        parentNotified: true,
      });
    expect(health.status).toBe(201);


    const after = await prisma.referral.findUnique({ where: { id: referral.id } });
    expect(after?.status).toBe('completed');


    const denied = await request(app)
      .post('/api/v1/health-records')
      .set(auth(gc.tokens.accessToken))
      .send({ studentId, sectionId: section.id, termId: term.id, visitDate: '2026-07-07', reasonForVisit: 'x' });
    expect(denied.status).toBe(403);
  });

  it('GC conducts a counseling home visit and certifies it', async () => {
    const visit = await request(app)
      .post('/api/v1/home-visits')
      .set(auth(gc.tokens.accessToken))
      .send({
        studentId,
        sectionId: section.id,
        termId: term.id,
        visitContext: 'guidance_counseling',
        personVisitedName: 'A Parent',
        relationToStudent: 'Mother',
        reasonForVisitation: 'Counseling follow-up',
        visitDate: '2026-07-10',
      });
    expect(visit.status).toBe(201);
    expect(visit.body.data.formReference).toBe('GCForm-12');

    const certified = await request(app)
      .post(`/api/v1/home-visits/${visit.body.data.id}/certify`)
      .set(auth(gc.tokens.accessToken))
      .send({ purpose: 'Official documentation' });
    expect(certified.status).toBe(200);
    expect(certified.body.data.certificationIssued).toBe(true);
  });

  it('teacher cannot conduct a guidance-counseling home visit (adviser only for ADM follow-up)', async () => {
    const denied = await request(app)
      .post('/api/v1/home-visits')
      .set(auth(teacher.tokens.accessToken))
      .send({
        studentId,
        sectionId: section.id,
        termId: term.id,
        visitContext: 'guidance_counseling',
        personVisitedName: 'A Parent',
        reasonForVisitation: 'x',
        visitDate: '2026-07-10',
      });
    expect(denied.status).toBe(403);
  });

  it('ADM flow: coordinator prepares, submits; principal approves; module released then student submits', async () => {
    const anecdotal = await prisma.anecdotalRecord.create({
      data: {
        observerId: teacher.user.id,
        studentId,
        sectionId: section.id,
        termId: term.id,
        observationDate: new Date('2026-07-05'),
        incidentDescription: 'Chronic absenteeism',
      },
    });
    const referral = await prisma.referral.create({
      data: {
        anecdotalRecordId: anecdotal.id,
        referredToRole: 'adm_coordinator',
        referredBy: teacher.user.id,
        reasonForReferral: 'Attendance concerns',
      },
    });

    const profile = await request(app)
      .post('/api/v1/adm-profiles')
      .set(auth(adm.tokens.accessToken))
      .send({
        studentId,
        sectionId: section.id,
        termId: term.id,
        referralId: referral.id,
        reasonForAdm: 'Needs ADM plan',
        admInterventionDescription: 'Modular learning plan',
      });
    expect(profile.status).toBe(201);
    expect(profile.body.data.status).toBe('draft');

    const submitted = await request(app)
      .post(`/api/v1/adm-profiles/${profile.body.data.id}/submit`)
      .set(auth(adm.tokens.accessToken));
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.status).toBe('submitted');


    const earlyModule = await request(app)
      .post(`/api/v1/adm-profiles/${profile.body.data.id}/modules`)
      .set(auth(adm.tokens.accessToken))
      .send({});
    expect(earlyModule.status).toBe(409);

    const approved = await request(app)
      .post(`/api/v1/adm-profiles/${profile.body.data.id}/approve`)
      .set(auth(principal.tokens.accessToken));
    expect(approved.status).toBe(200);
    expect(approved.body.data.status).toBe('approved');

    const module = await request(app)
      .post(`/api/v1/adm-profiles/${profile.body.data.id}/modules`)
      .set(auth(adm.tokens.accessToken))
      .send({ releaseDate: '2026-07-15', submissionDeadline: '2026-08-15' });
    expect(module.status).toBe(201);

    const studentSession = await loginAs('student', { email: `student.case.${Date.now()}@test.edu` });
    const wrong = await request(app)
      .post(`/api/v1/adm-modules/${module.body.data.id}/submit`)
      .set(auth(studentSession.tokens.accessToken));
    expect(wrong.status).toBe(403);
  });
});
