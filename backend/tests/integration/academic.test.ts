import request from 'supertest';
import { prisma } from '../../src/lib/prisma';
import { app, auth, loginAs, truncateAll } from '../helpers';
import { seedSchoolYear, seedSection, seedSubject, seedTerm } from '../fixtures';

describe('Academic structure', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('Principal creates a school year; teacher is denied', async () => {
    const principal = await loginAs('principal');
    const teacher = await loginAs('teacher');

    const denied = await request(app)
      .post('/api/v1/school-years')
      .set(auth(teacher.tokens.accessToken))
      .send({ yearLabel: '2027-2028', startDate: '2027-06-01', endDate: '2028-03-31' });
    expect(denied.status).toBe(403);

    const created = await request(app)
      .post('/api/v1/school-years')
      .set(auth(principal.tokens.accessToken))
      .send({ yearLabel: '2027-2028', startDate: '2027-06-01', endDate: '2028-03-31', status: 'upcoming' });
    expect(created.status).toBe(201);
    expect(created.body.data.yearLabel).toBe('2027-2028');
  });

  it('Principal creates terms; term transition is grade-banded (RK owns JHS)', async () => {
    const principal = await loginAs('principal');
    const rk = await loginAs('record_keeper');
    const registrar = await loginAs('registrar');
    const sy = await seedSchoolYear(principal.user.id);

    const termRes = await request(app)
      .post('/api/v1/terms')
      .set(auth(principal.tokens.accessToken))
      .send({
        schoolYearId: sy.id,
        gradeBand: 'junior_high',
        termNumber: 'term_1',
        termLabel: 'First Term',
        startDate: '2026-06-01',
        endDate: '2026-09-30',
      });
    expect(termRes.status).toBe(201);

    
    const deniedTransition = await request(app)
      .post(`/api/v1/terms/${termRes.body.data.id}/transition`)
      .set(auth(registrar.tokens.accessToken))
      .send({ to: 'active' });
    expect(deniedTransition.status).toBe(403);

    
    const transition = await request(app)
      .post(`/api/v1/terms/${termRes.body.data.id}/transition`)
      .set(auth(rk.tokens.accessToken))
      .send({ to: 'active' });
    expect(transition.status).toBe(200);
    expect(transition.body.data.status).toBe('active');
  });

  it('Subject creation is grade-banded; teacher cannot create subjects', async () => {
    const rk = await loginAs('record_keeper');
    const registrar = await loginAs('registrar');
    const teacher = await loginAs('teacher');

    const deniedTeacher = await request(app)
      .post('/api/v1/subjects')
      .set(auth(teacher.tokens.accessToken))
      .send({ subjectName: 'Math', subjectCode: 'MATH9', gradeLevel: 'grade_9' });
    expect(deniedTeacher.status).toBe(403);

    const deniedRegistrar = await request(app)
      .post('/api/v1/subjects')
      .set(auth(registrar.tokens.accessToken))
      .send({ subjectName: 'Math', subjectCode: 'MATH9', gradeLevel: 'grade_9' });
    expect(deniedRegistrar.status).toBe(403);

    const created = await request(app)
      .post('/api/v1/subjects')
      .set(auth(rk.tokens.accessToken))
      .send({ subjectName: 'Math', subjectCode: 'MATH9', gradeLevel: 'grade_9' });
    expect(created.status).toBe(201);
    expect(created.body.data.subjectCode).toBe('MATH9');
  });

  it('Teacher assignments: RK assigns teacher to JHS section; wrong-band Registrar denied', async () => {
    const principal = await loginAs('principal');
    const rk = await loginAs('record_keeper');
    const registrar = await loginAs('registrar');
    const teacher = await loginAs('teacher');
    const sy = await seedSchoolYear(principal.user.id);
    const section = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, createdBy: rk.user.id });
    const subject = await seedSubject({ gradeLevel: 'grade_9', createdBy: rk.user.id });

    const denied = await request(app)
      .post('/api/v1/assignments')
      .set(auth(registrar.tokens.accessToken))
      .send({ teacherId: teacher.user.id, subjectId: subject.id, sectionId: section.id, schoolYearId: sy.id });
    expect(denied.status).toBe(403);

    const created = await request(app)
      .post('/api/v1/assignments')
      .set(auth(rk.tokens.accessToken))
      .send({ teacherId: teacher.user.id, subjectId: subject.id, sectionId: section.id, schoolYearId: sy.id });
    expect(created.status).toBe(201);

    const mine = await request(app)
      .get('/api/v1/assignments/me')
      .set(auth(teacher.tokens.accessToken));
    expect(mine.status).toBe(200);
    expect(mine.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('Adviser access request flow: teacher requests, RK approves', async () => {
    const principal = await loginAs('principal');
    const rk = await loginAs('record_keeper');
    const teacher = await loginAs('teacher');
    const sy = await seedSchoolYear(principal.user.id);
    const section = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, createdBy: rk.user.id });

    const requested = await request(app)
      .post('/api/v1/adviser-access-requests')
      .set(auth(teacher.tokens.accessToken))
      .send({ sectionId: section.id, reason: 'Need fuller access' });
    expect(requested.status).toBe(201);

    const reviewed = await request(app)
      .post(`/api/v1/adviser-access-requests/${requested.body.data.id}/review`)
      .set(auth(rk.tokens.accessToken))
      .send({ decision: 'approved' });
    expect(reviewed.status).toBe(200);
    expect(reviewed.body.data.status).toBe('approved');

    const denied = await request(app)
      .post(`/api/v1/adviser-access-requests/${requested.body.data.id}/review`)
      .set(auth(rk.tokens.accessToken))
      .send({ decision: 'approved' });
    expect(denied.status).toBe(409);
  });
});
