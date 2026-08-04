import request from 'supertest';
import argon2 from 'argon2';
import { Role } from '@prisma/client';
import { prisma } from '../src/lib/prisma';
import { createApp } from '../src/app';

export const app = createApp();

const TABLES = [
  'notifications',
  'report_cards',
  'student_reflections',
  'audit_log',
  'record_flags',
  'student_risk_assessments',
  'final_grades',
  'student_grades',
  'assessments',
  'grade_components',
  'attendance_records',
  'adm_modules',
  'adm_parent_meetings',
  'adm_learner_profiles',
  'home_visitation_records',
  'health_records',
  'referrals',
  'anecdotal_record_followups',
  'anecdotal_records',
  'adviser_access_requests',
  'teacher_subject_assignments',
  'subjects',
  'sections',
  'terms',
  'school_years',
  'parent_student_links',
  'staff_profiles',
  'parent_profiles',
  'student_profiles',
  'refresh_tokens',
  'users',
];

export async function truncateAll(): Promise<void> {
  await prisma.$transaction(
    TABLES.map((t) => prisma.$executeRawUnsafe(`TRUNCATE TABLE "${t}" CASCADE`))
  );
}

export interface SeedUserOptions {
  role: Role;
  email?: string;
  password?: string;
  accountStatus?: 'pending' | 'active' | 'inactive' | 'suspended' | 'rejected';
  gradeLevel?: 'grade_7' | 'grade_8' | 'grade_9' | 'grade_10' | 'grade_11' | 'grade_12';
  lrn?: string;
  sectionId?: string | null;
  employeeId?: string;
}

export async function createUser(opts: SeedUserOptions): Promise<string> {
  const email = opts.email ?? `${opts.role}.${Date.now()}@test.edu`;
  const password = opts.password ?? 'Test@1234';
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Test',
      lastName: opts.role.toUpperCase(),
      role: opts.role,
      accountStatus: opts.accountStatus ?? 'active',
      provisioningType: opts.accountStatus ? 'self_registered' : 'hardcoded',
    },
  });

  if (opts.role === 'student') {
    await prisma.studentProfile.create({
      data: {
        id: user.id,
        lrn: opts.lrn ?? `LRN${Date.now()}`,
        birthdate: new Date('2010-01-01'),
        sex: 'male',
        gradeLevel: opts.gradeLevel ?? 'grade_7',
        sectionId: opts.sectionId ?? null,
      },
    });
  }
  if (opts.role === 'parent') {
    await prisma.parentProfile.create({ data: { id: user.id, relationship: 'guardian' } });
  }
  if (['teacher', 'registrar', 'record_keeper', 'adm_coordinator', 'guidance_counselor', 'principal', 'nurse'].includes(opts.role)) {
    await prisma.staffProfile.create({
      data: { id: user.id, employeeId: opts.employeeId ?? `EMP${Date.now()}` },
    });
  }
  return user.id;
}

export async function login(email: string, password: string) {
  const res = await request(app).post('/api/v1/auth/login').send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.data;
}

export async function loginAs(role: Role, opts: Omit<SeedUserOptions, 'role'> = {}) {
  const email = opts.email ?? `${role}.login@test.edu`;
  await createUser({ role, email, password: 'Test@1234', ...opts });
  return login(email, 'Test@1234');
}

export async function registerAndApproveStudent(opts: {
  gradeLevel: SeedUserOptions['gradeLevel'];
  approverRole: 'record_keeper' | 'registrar';
}) {
  const email = `student.${Date.now()}@test.edu`;
  const res = await request(app)
    .post('/api/v1/auth/register/student')
    .send({
      email,
      password: 'Test@1234',
      firstName: 'Sally',
      lastName: 'Student',
      lrn: `LRN${Date.now()}`,
      birthdate: '2010-01-01',
      sex: 'female',
      gradeLevel: opts.gradeLevel,
    });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  const studentId = res.body.data.id;

  const approver = await loginAs(opts.approverRole);
  const approve = await request(app)
    .post(`/api/v1/users/${studentId}/approve`)
    .set('Authorization', `Bearer ${approver.tokens.accessToken}`)
    .send();
  if (approve.status !== 200) throw new Error(`approve failed: ${approve.status} ${JSON.stringify(approve.body)}`);
  return { studentId, email, password: 'Test@1234' };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export { request };
