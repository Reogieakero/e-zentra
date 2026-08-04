import request from 'supertest';
import { prisma } from '../../src/lib/prisma';
import { app, auth, loginAs, truncateAll } from '../helpers';
import { seedSchoolYear } from '../fixtures';

describe('Sections', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('Record Keeper creates a grade 9 (JHS) section; Registrar is denied', async () => {
    const rk = await loginAs('record_keeper');
    const registrar = await loginAs('registrar');
    const principal = await loginAs('principal');
    const sy = await seedSchoolYear(principal.user.id);

    const denied = await request(app)
      .post('/api/v1/sections')
      .set(auth(registrar.tokens.accessToken))
      .send({ sectionName: 'Rizal', gradeLevel: 'grade_9', schoolYearId: sy.id });
    expect(denied.status).toBe(403);

    const created = await request(app)
      .post('/api/v1/sections')
      .set(auth(rk.tokens.accessToken))
      .send({ sectionName: 'Rizal', gradeLevel: 'grade_9', schoolYearId: sy.id });
    expect(created.status).toBe(201);
    expect(created.body.data.gradeLevel).toBe('grade_9');

    const persisted = await prisma.section.findUnique({ where: { id: created.body.data.id } });
    expect(persisted?.createdBy).toBe(rk.user.id);
  });

  it('Registrar creates a grade 11 (SHS) section; Record Keeper is denied', async () => {
    const rk = await loginAs('record_keeper');
    const registrar = await loginAs('registrar');
    const principal = await loginAs('principal');
    const sy = await seedSchoolYear(principal.user.id);

    const denied = await request(app)
      .post('/api/v1/sections')
      .set(auth(rk.tokens.accessToken))
      .send({ sectionName: 'Einstein', gradeLevel: 'grade_11', schoolYearId: sy.id });
    expect(denied.status).toBe(403);

    const created = await request(app)
      .post('/api/v1/sections')
      .set(auth(registrar.tokens.accessToken))
      .send({ sectionName: 'Einstein', gradeLevel: 'grade_11', schoolYearId: sy.id });
    expect(created.status).toBe(201);
  });

  it('teachers cannot create sections', async () => {
    const teacher = await loginAs('teacher');
    const principal = await loginAs('principal');
    const sy = await seedSchoolYear(principal.user.id);
    const res = await request(app)
      .post('/api/v1/sections')
      .set(auth(teacher.tokens.accessToken))
      .send({ sectionName: 'X', gradeLevel: 'grade_7', schoolYearId: sy.id });
    expect(res.status).toBe(403);
  });

  it('validates body and returns 404 for unknown school year', async () => {
    const rk = await loginAs('record_keeper');
    const invalid = await request(app)
      .post('/api/v1/sections')
      .set(auth(rk.tokens.accessToken))
      .send({ sectionName: 'Bad', gradeLevel: 'grade_10', schoolYearId: 'not-a-uuid', extra: 1 });
    expect(invalid.status).toBe(422);

    const missing = await request(app)
      .post('/api/v1/sections')
      .set(auth(rk.tokens.accessToken))
      .send({ sectionName: 'Bad', gradeLevel: 'grade_10', schoolYearId: '11111111-1111-1111-1111-111111111111' });
    expect(missing.status).toBe(404);
  });

  it('paginates sections with offset pagination', async () => {
    const rk = await loginAs('record_keeper');
    const principal = await loginAs('principal');
    const sy = await seedSchoolYear(principal.user.id);

    for (let i = 0; i < 5; i++) {
      await prisma.section.create({
        data: { sectionName: `Section ${i}`, gradeLevel: 'grade_7', schoolYearId: sy.id, createdBy: rk.user.id },
      });
    }

    const page1 = await request(app)
      .get('/api/v1/sections?page=1&pageSize=2')
      .set(auth(rk.tokens.accessToken));
    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.hasMore).toBe(true);
    expect(page1.body.total).toBe(5);

    const page3 = await request(app)
      .get('/api/v1/sections?page=3&pageSize=2')
      .set(auth(rk.tokens.accessToken));
    expect(page3.body.data).toHaveLength(1);
    expect(page3.body.hasMore).toBe(false);
  });

  it('gets a single section and its students', async () => {
    const rk = await loginAs('record_keeper');
    const principal = await loginAs('principal');
    const sy = await seedSchoolYear(principal.user.id);
    const section = await prisma.section.create({
      data: { sectionName: 'Newton', gradeLevel: 'grade_7', schoolYearId: sy.id, createdBy: rk.user.id },
    });

    const got = await request(app).get(`/api/v1/sections/${section.id}`).set(auth(rk.tokens.accessToken));
    expect(got.status).toBe(200);
    expect(got.body.data.id).toBe(section.id);

    const missing = await request(app)
      .get('/api/v1/sections/11111111-1111-1111-1111-111111111111')
      .set(auth(rk.tokens.accessToken));
    expect(missing.status).toBe(404);
  });
});
