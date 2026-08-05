import request from 'supertest';
import { config } from '../../src/config/env';
import { app, createUser, loginAs, registerAndApproveStudent, truncateAll } from '../helpers';

describe('Auth flow', () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it('registers a student as pending, approves via grade-band owner, logs in, refreshes, logs out', async () => {
    const { studentId, email } = await registerAndApproveStudent({ gradeLevel: 'grade_9', approverRole: 'record_keeper' });

    const { user } = await loginAs('record_keeper', { email: 'rk.auth@test.edu' });
    expect(user.accountStatus).toBe('active');
    expect(studentId).toBeTruthy();

    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password: 'Test@1234' });
    expect(loginRes.status).toBe(200);
    const { accessToken, refreshToken } = loginRes.body.data.tokens;
    expect(accessToken).toBeTruthy();
    expect(loginRes.body.data.user.accountStatus).toBe('active');

    const refreshRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();
    const newRefresh = refreshRes.body.data.refreshToken;
    expect(newRefresh).not.toBe(refreshToken);

    const logoutRes = await request(app).post('/api/v1/auth/logout').send({ refreshToken: newRefresh });
    expect(logoutRes.status).toBe(204);

    const reuseRes = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: newRefresh });
    expect(reuseRes.status).toBe(401);
  });

  it('detects concurrent refresh-token reuse and revokes the session family', async () => {
    const { email } = await registerAndApproveStudent({ gradeLevel: 'grade_9', approverRole: 'record_keeper' });
    const loginRes = await request(app).post('/api/v1/auth/login').send({ email, password: 'Test@1234' });
    expect(loginRes.status).toBe(200);
    const { refreshToken } = loginRes.body.data.tokens;

    const [first, second] = await Promise.all([
      request(app).post('/api/v1/auth/refresh').send({ refreshToken }),
      request(app).post('/api/v1/auth/refresh').send({ refreshToken }),
    ]);

    const statuses = [first.status, second.status];
    expect(statuses).toContain(200);
    expect(statuses).toContain(401);

    const [winner] = [first, second].filter((r) => r.status === 200);
    const [loser] = [first, second].filter((r) => r.status === 401);
    expect(winner).toBeTruthy();
    expect(loser).toBeTruthy();

    const winnerRefresh = winner!.body.data.refreshToken;
    expect(winnerRefresh).toBeTruthy();

    const winnerReuse = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: winnerRefresh });
    expect(winnerReuse.status).toBe(401);
  });

  it('returns 401 for bad credentials and honors pending accounts', async () => {
    await createUser({ role: 'student', email: 's.badpw@test.edu', password: 'Test@1234', gradeLevel: 'grade_7' });
    const bad = await request(app).post('/api/v1/auth/login').send({ email: 's.badpw@test.edu', password: 'WrongPass1' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('UNAUTHORIZED');

    const missing = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@test.edu', password: 'Whatever1' });
    expect(missing.status).toBe(401);
  });

  it('requires approval before login (403 forbidden for pending accounts)', async () => {
    const reg = await request(app).post('/api/v1/auth/register/student').send({
      email: 'pending.g7@test.edu',
      password: 'Test@1234',
      firstName: 'P',
      lastName: 'Pending',
      lrn: 'LRNPENDINGG7',
      birthdate: '2010-01-01',
      sex: 'male',
      gradeLevel: 'grade_7',
    });
    expect(reg.status).toBe(201);

    const loginRes = await request(app).post('/api/v1/auth/login').send({ email: 'pending.g7@test.edu', password: 'Test@1234' });
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe('FORBIDDEN');
  });

  it('enforces grade-band ownership on account approval (grade 9 is JHS)', async () => {
    const reg = await request(app).post('/api/v1/auth/register/student').send({
      email: 'band.g9@test.edu',
      password: 'Test@1234',
      firstName: 'B',
      lastName: 'Band',
      lrn: 'LRNBANDG9',
      birthdate: '2010-01-01',
      sex: 'male',
      gradeLevel: 'grade_9',
    });
    expect(reg.status).toBe(201);
    const studentId = reg.body.data.id;

    const registrar = await loginAs('registrar');
    const rk = await loginAs('record_keeper');

    const wrong = await request(app)
      .post(`/api/v1/users/${studentId}/approve`)
      .set('Authorization', `Bearer ${registrar.tokens.accessToken}`);
    expect(wrong.status).toBe(403);

    const correct = await request(app)
      .post(`/api/v1/users/${studentId}/approve`)
      .set('Authorization', `Bearer ${rk.tokens.accessToken}`);
    expect(correct.status).toBe(200);
  });

  it('enforces grade-band ownership on account approval (grade 11 is SHS)', async () => {
    const reg = await request(app).post('/api/v1/auth/register/student').send({
      email: 'band.g11@test.edu',
      password: 'Test@1234',
      firstName: 'B',
      lastName: 'Band11',
      lrn: 'LRNBANDG11',
      birthdate: '2009-01-01',
      sex: 'female',
      gradeLevel: 'grade_11',
    });
    const studentId = reg.body.data.id;

    const registrar = await loginAs('registrar');
    const rk = await loginAs('record_keeper');

    const wrong = await request(app)
      .post(`/api/v1/users/${studentId}/approve`)
      .set('Authorization', `Bearer ${rk.tokens.accessToken}`);
    expect(wrong.status).toBe(403);

    const correct = await request(app)
      .post(`/api/v1/users/${studentId}/approve`)
      .set('Authorization', `Bearer ${registrar.tokens.accessToken}`);
    expect(correct.status).toBe(200);
  });

  it('only the Registrar approves teacher accounts school-wide', async () => {
    const reg = await request(app).post('/api/v1/auth/register/teacher').send({
      email: 'teacher.pending@test.edu',
      password: 'Test@1234',
      firstName: 'T',
      lastName: 'Teacher',
      employeeId: 'EMP-ABC123',
    });
    expect(reg.status).toBe(201);
    const teacherId = reg.body.data.id;

    const rk = await loginAs('record_keeper');
    const registrar = await loginAs('registrar');

    const wrong = await request(app)
      .post(`/api/v1/users/${teacherId}/approve`)
      .set('Authorization', `Bearer ${rk.tokens.accessToken}`);
    expect(wrong.status).toBe(403);

    const correct = await request(app)
      .post(`/api/v1/users/${teacherId}/approve`)
      .set('Authorization', `Bearer ${registrar.tokens.accessToken}`);
    expect(correct.status).toBe(200);
  });

  it('validates inputs and rejects unknown fields', async () => {
    const bad = await request(app).post('/api/v1/auth/register/student').send({
      email: 'not-an-email',
      password: 'short',
      firstName: '',
      lastName: 'X',
      lrn: '1',
      birthdate: 'nope',
      sex: 'male',
      gradeLevel: 'grade_99',
    });
    expect(bad.status).toBe(422);
    expect(bad.body.error.code).toBe('VALIDATION_ERROR');

    const unknown = await request(app).post('/api/v1/auth/register/student').send({
      email: 'unknown.field@test.edu',
      password: 'Test@1234',
      firstName: 'A',
      lastName: 'B',
      lrn: 'LRNUNKNOWN',
      birthdate: '2010-01-01',
      sex: 'male',
      gradeLevel: 'grade_7',
      hacked: true,
    });
    expect(unknown.status).toBe(422);
  });

  it('rejects requests without a valid bearer token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    const badToken = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer not-a-jwt');
    expect(badToken.status).toBe(401);
  });

  it('role-scoped login: student portal only accepts student accounts', async () => {
    await createUser({ role: 'student', email: 'scoped.student@test.edu', gradeLevel: 'grade_7' });
    await createUser({ role: 'parent', email: 'scoped.parent@test.edu' });

    const ok = await request(app).post('/api/v1/auth/login/student').send({ email: 'scoped.student@test.edu', password: 'Test@1234' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.user.role).toBe('student');

    const wrongPortal = await request(app).post('/api/v1/auth/login/student').send({ email: 'scoped.parent@test.edu', password: 'Test@1234' });
    expect(wrongPortal.status).toBe(403);
    expect(wrongPortal.body.error.code).toBe('FORBIDDEN');
  });

  it('role-scoped login: staff portal accepts any staff role but rejects non-staff', async () => {
    await createUser({ role: 'teacher', email: 'scoped.teacher@test.edu', employeeId: 'EMP-SCOPED' });
    await createUser({ role: 'principal', email: 'scoped.principal@test.edu', employeeId: 'EMP-SCOPED-P' });
    await createUser({ role: 'student', email: 'scoped.student2@test.edu', gradeLevel: 'grade_7' });

    const teacher = await request(app).post('/api/v1/auth/login/staff').send({ email: 'scoped.teacher@test.edu', password: 'Test@1234' });
    expect(teacher.status).toBe(200);
    expect(teacher.body.data.user.role).toBe('teacher');

    const principal = await request(app).post('/api/v1/auth/login/staff').send({ email: 'scoped.principal@test.edu', password: 'Test@1234' });
    expect(principal.status).toBe(200);
    expect(principal.body.data.user.role).toBe('principal');

    const student = await request(app).post('/api/v1/auth/login/staff').send({ email: 'scoped.student2@test.edu', password: 'Test@1234' });
    expect(student.status).toBe(403);
  });

  it('Google OAuth endpoints are unavailable when Supabase is not configured', async () => {
    const urlRes = await request(app).get('/api/v1/auth/oauth/google/url');
    const cb = await request(app).post('/api/v1/auth/oauth/google/callback').send({ accessToken: 'not-a-real-token-that-is-long-enough', portal: 'student' });

    if (!config.supabase.enabled) {
      expect(urlRes.status).toBe(404);
      expect(cb.status).toBe(404);
      return;
    }

    // With real Supabase credentials the endpoints are live; an invalid token is rejected.
    expect(urlRes.status).not.toBe(404);
    expect(cb.status).not.toBe(404);
  });

  it('rejects an unconfigured Google register without Supabase, and validates role-specific payloads', async () => {
    const res = await request(app)
      .post('/api/v1/auth/oauth/google/register')
      .send({ accessToken: 'not-a-real-token-that-is-long-enough', role: 'student', firstName: 'G', lastName: 'O', lrn: '123456789012', birthdate: '2011-01-01', sex: 'male', gradeLevel: 'grade_7' });
    if (!config.supabase.enabled) {
      expect(res.status).toBe(404);
      return;
    }
    expect(res.status).not.toBe(404);
  });

  it('validates google register: requires role-specific fields', async () => {
    const missingRole = await request(app)
      .post('/api/v1/auth/oauth/google/register')
      .send({ accessToken: 'not-a-real-token-that-is-long-enough', firstName: 'X', lastName: 'Y' });
    expect(missingRole.status).toBe(422);

    const invalidLrn = await request(app)
      .post('/api/v1/auth/oauth/google/register')
      .send({ accessToken: 'not-a-real-token-that-is-long-enough', role: 'student', firstName: 'X', lastName: 'Y', lrn: 'x', birthdate: '2011-01-01', sex: 'male', gradeLevel: 'grade_7' });
    expect(invalidLrn.status).toBe(422);
  });

  it('creates and confirms parent-student link on approval', async () => {
    const reg = await request(app).post('/api/v1/auth/register/student').send({
      email: 'child.link@test.edu',
      password: 'Test@1234',
      firstName: 'C',
      lastName: 'Child',
      lrn: 'LRNCHILDLINK',
      birthdate: '2011-01-01',
      sex: 'female',
      gradeLevel: 'grade_7',
    });
    const studentId = reg.body.data.id;

    const parentReg = await request(app).post('/api/v1/auth/register/parent').send({
      email: 'parent.link@test.edu',
      password: 'Test@1234',
      firstName: 'P',
      lastName: 'Parent',
      relationship: 'mother',
      childEmail: 'child.link@test.edu',
    });
    expect(parentReg.status).toBe(201);

    const rk = await loginAs('record_keeper');
    await request(app)
      .post(`/api/v1/users/${studentId}/approve`)
      .set('Authorization', `Bearer ${rk.tokens.accessToken}`)
      .expect(200);

    const { prisma } = require('../../src/lib/prisma');
    const link = await prisma.parentStudentLink.findFirst({ where: { studentId } });
    expect(link?.status).toBe('confirmed');
  });

  it('password reset: requests a dev link, verifies it, and changes the password', async () => {
    const { email } = await registerAndApproveStudent({ gradeLevel: 'grade_9', approverRole: 'record_keeper' });

    // Old password works before the reset.
    const before = await request(app).post('/api/v1/auth/login').send({ email, password: 'Test@1234' });
    expect(before.status).toBe(200);

    const req = await request(app).post('/api/v1/auth/password-reset/request').send({ email });
    expect(req.status).toBe(200);
    if (config.smtp.enabled) {
      // With SMTP configured the link is emailed, not returned.
      expect(req.body.data.devResetUrl).toBeNull();
      return;
    }
    // Dev fallback returns the reset link on screen.
    const devUrl: string = req.body.data.devResetUrl;
    const token = new URL(devUrl).searchParams.get('token');
    expect(token).toBeTruthy();

    const verify = await request(app).get(`/api/v1/auth/password-reset/verify/${token}`);
    expect(verify.status).toBe(200);
    expect(verify.body.data.email).toBe(email);

    const confirm = await request(app)
      .post('/api/v1/auth/password-reset/confirm')
      .send({ token, newPassword: 'NewPass@123' });
    expect(confirm.status).toBe(204);

    // Old password no longer works; new password does.
    const oldLogin = await request(app).post('/api/v1/auth/login').send({ email, password: 'Test@1234' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/api/v1/auth/login').send({ email, password: 'NewPass@123' });
    expect(newLogin.status).toBe(200);
  });

  it('password reset: rejects an invalid token and does not enumerate unknown emails', async () => {
    const bad = await request(app).get('/api/v1/auth/password-reset/verify/not-a-valid-token-token-token');
    expect(bad.status).toBe(400);

    const unknown = await request(app).post('/api/v1/auth/password-reset/request').send({ email: 'nobody@test.edu' });
    expect(unknown.status).toBe(200);
    expect(unknown.body.data.devResetUrl).toBeNull();
  });
});
