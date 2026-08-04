import request from 'supertest';
import { prisma } from '../../src/lib/prisma';
import { app, auth, createUser, loginAs, truncateAll } from '../helpers';
import { seedSchoolYear, seedSection, seedTerm } from '../fixtures';

async function setupSection() {
  const principal = await loginAs('principal');
  const rk = await loginAs('record_keeper');
  const teacher = await loginAs('teacher');
  const adviserId = teacher.user.id;
  const sy = await seedSchoolYear(principal.user.id);
  const term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
  const section = await seedSection({
    gradeLevel: 'grade_7',
    schoolYearId: sy.id,
    adviserId,
    createdBy: rk.user.id,
  });

  const student1 = await createUser({ role: 'student', gradeLevel: 'grade_7', sectionId: section.id });
  const student2 = await createUser({ role: 'student', gradeLevel: 'grade_7', sectionId: section.id });
  return { adviserId, teacher, rk, section, term, student1, student2 };
}

describe('Attendance', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('only the section adviser can mark attendance', async () => {
    const { teacher, rk, section, term, student1 } = await setupSection();

    const denied = await request(app)
      .post(`/api/v1/sections/${section.id}/attendance`)
      .set(auth(rk.tokens.accessToken))
      .send({ termId: term.id, attendanceDate: '2026-07-01', session: 'morning', records: [{ studentId: student1, status: 'present' }] });
    expect(denied.status).toBe(403);

    const ok = await request(app)
      .post(`/api/v1/sections/${section.id}/attendance`)
      .set(auth(teacher.tokens.accessToken))
      .send({ termId: term.id, attendanceDate: '2026-07-01', session: 'morning', records: [{ studentId: student1, status: 'present' }] });
    expect(ok.status).toBe(201);
    expect(ok.body.data.created).toBe(1);
  });

  it('rejects attendance for students outside the section', async () => {
    const { teacher, section, term } = await setupSection();
    const outsider = await createUser({ role: 'student', gradeLevel: 'grade_7' });

    const res = await request(app)
      .post(`/api/v1/sections/${section.id}/attendance`)
      .set(auth(teacher.tokens.accessToken))
      .send({
        termId: term.id,
        attendanceDate: '2026-07-01',
        session: 'morning',
        records: [{ studentId: outsider, status: 'present' }],
      });
    expect(res.status).toBe(400);
  });

  it('enforces the UNIQUE (student, date, session) constraint via skipDuplicates', async () => {
    const { teacher, section, term, student1 } = await setupSection();
    const payload = { termId: term.id, attendanceDate: '2026-07-02', session: 'morning', records: [{ studentId: student1, status: 'present' }] };
    const first = await request(app).post(`/api/v1/sections/${section.id}/attendance`).set(auth(teacher.tokens.accessToken)).send(payload);
    expect(first.body.data.created).toBe(1);
    const dup = await request(app).post(`/api/v1/sections/${section.id}/attendance`).set(auth(teacher.tokens.accessToken)).send(payload);
    expect(dup.status).toBe(201);
    expect(dup.body.data.created).toBe(0);
    expect(dup.body.data.skipped).toBe(1);
  });

  it('paginates attendance with cursor pagination', async () => {
    const { teacher, section, term, student1, student2 } = await setupSection();
    for (let day = 1; day <= 3; day++) {
      const date = `2026-07-0${day}`;
      await request(app)
        .post(`/api/v1/sections/${section.id}/attendance`)
        .set(auth(teacher.tokens.accessToken))
        .send({
          termId: term.id,
          attendanceDate: date,
          session: 'morning',
          records: [
            { studentId: student1, status: 'present' },
            { studentId: student2, status: 'present' },
          ],
        });
    }

    const page1 = await request(app)
      .get(`/api/v1/sections/${section.id}/attendance?limit=4`)
      .set(auth(teacher.tokens.accessToken));
    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(4);
    expect(page1.body.hasMore).toBe(true);
    expect(page1.body.nextCursor).toBeTruthy();

    const page2 = await request(app)
      .get(`/api/v1/sections/${section.id}/attendance?limit=4&cursor=${page1.body.nextCursor}`)
      .set(auth(teacher.tokens.accessToken));
    expect(page2.body.data.length).toBeGreaterThan(0);
    expect(page2.body.data.length).toBeLessThanOrEqual(4);
    expect(page2.body.hasMore).toBe(false);
    expect(page2.body.nextCursor).toBeNull();
  });

  it('lets a student view only their own attendance', async () => {
    const { teacher, section, term, student1, student2 } = await setupSection();
    const studentLogin = await loginAs('student', { email: `stud.${Date.now()}@test.edu`, gradeLevel: 'grade_7', sectionId: section.id });

    await request(app)
      .post(`/api/v1/sections/${section.id}/attendance`)
      .set(auth(teacher.tokens.accessToken))
      .send({ termId: term.id, attendanceDate: '2026-07-05', session: 'morning', records: [{ studentId: student1, status: 'late' }] });

    const own = await request(app)
      .get(`/api/v1/students/${studentLogin.user.id}/attendance`)
      .set(auth(studentLogin.tokens.accessToken));
    expect(own.status).toBe(200);

    const other = await request(app)
      .get(`/api/v1/students/${student2}/attendance`)
      .set(auth(studentLogin.tokens.accessToken));
    expect(other.status).toBe(403);
  });

  it('lets a parent view only their confirmed children', async () => {
    const { teacher, section, term, student1, student2 } = await setupSection();
    const parent = await loginAs('parent');
    await prisma.parentStudentLink.create({
      data: { parentId: parent.user.id, studentId: student1, status: 'confirmed' },
    });

    await request(app)
      .post(`/api/v1/sections/${section.id}/attendance`)
      .set(auth(teacher.tokens.accessToken))
      .send({ termId: term.id, attendanceDate: '2026-07-06', session: 'morning', records: [{ studentId: student1, status: 'present' }] });

    const ownChild = await request(app)
      .get(`/api/v1/students/${student1}/attendance`)
      .set(auth(parent.tokens.accessToken));
    expect(ownChild.status).toBe(200);

    const notChild = await request(app)
      .get(`/api/v1/students/${student2}/attendance`)
      .set(auth(parent.tokens.accessToken));
    expect(notChild.status).toBe(403);
  });

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/v1/sections/11111111-1111-1111-1111-111111111111/attendance');
    expect(res.status).toBe(401);
  });
});
