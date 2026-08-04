import request from 'supertest';
import { prisma } from '../../src/lib/prisma';
import { app, auth, loginAs, truncateAll, createUser } from '../helpers';
import { seedSchoolYear, seedSection, seedSubject, seedTerm, seedGradeComponents, seedAssessment } from '../fixtures';

describe('Grading', () => {
  let principal: Awaited<ReturnType<typeof loginAs>>;
  let rk: Awaited<ReturnType<typeof loginAs>>;
  let teacher: Awaited<ReturnType<typeof loginAs>>;
  let studentId: string;
  let section: Awaited<ReturnType<typeof seedSection>>;
  let subject: Awaited<ReturnType<typeof seedSubject>>;
  let term: Awaited<ReturnType<typeof seedTerm>>;
  let sy: Awaited<ReturnType<typeof seedSchoolYear>>;

  beforeEach(async () => {
    await truncateAll();
    principal = await loginAs('principal');
    rk = await loginAs('record_keeper');
    teacher = await loginAs('teacher');
    studentId = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    sy = await seedSchoolYear(principal.user.id);
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

  it('RK sets grade components for JHS term; partial sum is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/grade-components')
      .set(auth(rk.tokens.accessToken))
      .send({
        subjectId: subject.id,
        termId: term.id,
        components: [
          { componentType: 'quiz', weightPercentage: 30 },
          { componentType: 'performance_task', weightPercentage: 50 },
          { componentType: 'exam', weightPercentage: 20 },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveLength(3);
    const sum = res.body.data.reduce((acc: number, c: { weightPercentage: number }) => acc + c.weightPercentage, 0);
    expect(sum).toBe(100);

    const partial = await request(app)
      .post('/api/v1/grade-components')
      .set(auth(rk.tokens.accessToken))
      .send({ subjectId: subject.id, termId: term.id, components: [{ componentType: 'quiz', weightPercentage: 30 }] });
    expect(partial.status).toBe(422);
  });

  it('teacher creates assessment, records grade, computes final grade', async () => {
    const assessment = await seedAssessment({
      subjectId: subject.id,
      sectionId: section.id,
      termId: term.id,
      teacherId: teacher.user.id,
      componentType: 'quiz',
      maxScore: 50,
    });

    const grade = await request(app)
      .post('/api/v1/student-grades')
      .set(auth(teacher.tokens.accessToken))
      .send({ assessmentId: assessment.id, studentId, score: 40 });
    expect(grade.status).toBe(201);
    expect(grade.body.data.score).toBe(40);

    
    const otherTeacher = await loginAs('teacher', { email: `teacher.other.${Date.now()}@test.edu` });
    const forbidden = await request(app)
      .post('/api/v1/student-grades')
      .set(auth(otherTeacher.tokens.accessToken))
      .send({ assessmentId: assessment.id, studentId, score: 41 });
    expect(forbidden.status).toBe(403);

    const computed = await request(app)
      .post('/api/v1/final-grades/compute')
      .set(auth(teacher.tokens.accessToken))
      .send({ subjectId: subject.id, termId: term.id, studentId, sectionId: section.id });
    expect(computed.status).toBe(200);
    expect(computed.body.data.initialGrade).toBe(80);
  });

  it('locks final grade then rejects edits', async () => {
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
    const finalId = computed.body.data.id;

    const locked = await request(app)
      .post(`/api/v1/final-grades/${finalId}/lock`)
      .set(auth(teacher.tokens.accessToken));
    expect(locked.status).toBe(200);
    expect(locked.body.data.isLocked).toBe(true);

    const afterLock = await request(app)
      .post('/api/v1/student-grades')
      .set(auth(teacher.tokens.accessToken))
      .send({ assessmentId: assessment.id, studentId, score: 45 });
    expect(afterLock.status).toBe(409);
  });

  it('rejects non-teachers from creating assessments', async () => {
    const res = await request(app)
      .post('/api/v1/assessments')
      .set(auth(rk.tokens.accessToken))
      .send({ subjectId: subject.id, sectionId: section.id, termId: term.id, componentType: 'quiz', title: 'Q1', maxScore: 50, dateGiven: '2026-07-01' });
    expect(res.status).toBe(403);
  });
});
