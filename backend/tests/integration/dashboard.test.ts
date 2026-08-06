import request from 'supertest';
import { prisma } from '../../src/lib/prisma';
import { app, auth, loginAs, truncateAll, createUser } from '../helpers';
import { seedSchoolYear, seedSection, seedTerm } from '../fixtures';
import { invalidateDashboardCache } from '../../src/services/dashboard.service';

function mostRecentMonday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

describe('Dashboard overview', () => {
  let principal: Awaited<ReturnType<typeof loginAs>>;
  let rk: Awaited<ReturnType<typeof loginAs>>;
  let teacher: Awaited<ReturnType<typeof loginAs>>;
  let studentId: string;
  let section: Awaited<ReturnType<typeof seedSection>>;
  let term: Awaited<ReturnType<typeof seedTerm>>;
  let sy: Awaited<ReturnType<typeof seedSchoolYear>>;

  beforeEach(async () => {
    await truncateAll();
    await invalidateDashboardCache();
    principal = await loginAs('principal');
    rk = await loginAs('record_keeper');
    teacher = await loginAs('teacher');
    studentId = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    sy = await seedSchoolYear(principal.user.id);
    term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
    section = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, createdBy: rk.user.id });
    await prisma.studentProfile.update({ where: { id: studentId }, data: { sectionId: section.id } });
  });

  it('returns overview aggregates: attendance, heatmap, at-risk (data-gated), ADM for approval', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = mostRecentMonday();

    await prisma.attendanceRecord.create({
      data: {
        studentId,
        sectionId: section.id,
        termId: term.id,
        attendanceDate: today,
        session: 'morning',
        status: 'present',
        recordedBy: teacher.user.id,
      },
    });
    if (monday.getTime() !== today.getTime()) {
      await prisma.attendanceRecord.create({
        data: {
          studentId,
          sectionId: section.id,
          termId: term.id,
          attendanceDate: monday,
          session: 'morning',
          status: 'present',
          recordedBy: teacher.user.id,
        },
      });
    }

    const anecdotal = await prisma.anecdotalRecord.create({
      data: {
        studentId,
        observerId: teacher.user.id,
        sectionId: section.id,
        termId: term.id,
        observationDate: today,
        incidentDescription: 'Note for the dashboard counter.',
      },
    });
    const referral = await prisma.referral.create({
      data: {
        anecdotalRecordId: anecdotal.id,
        referredToRole: 'adm_coordinator',
        referredBy: teacher.user.id,
        reasonForReferral: 'Needs ADM support',
      },
    });
    await prisma.admLearnerProfile.create({
      data: {
        studentId,
        sectionId: section.id,
        termId: term.id,
        referralId: referral.id,
        reasonForAdm: 'ADM support',
        admInterventionDescription: 'ADM intervention',
        preparedBy: teacher.user.id,
        status: 'submitted',
      },
    });

    await prisma.studentRiskAssessment.create({
      data: {
        studentId,
        sectionId: section.id,
        termId: term.id,
        academicRisk: true,
        attendanceRisk: false,
        behavioralRisk: false,
        riskCount: 1,
        riskLevel: 'high',
      },
    });

    const studentB = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    await prisma.studentProfile.update({ where: { id: studentB }, data: { sectionId: section.id } });
    await prisma.studentRiskAssessment.create({
      data: {
        studentId: studentB,
        sectionId: section.id,
        termId: term.id,
        academicRisk: true,
        attendanceRisk: false,
        behavioralRisk: false,
        riskCount: 1,
        riskLevel: 'moderate',
      },
    });

    const res = await request(app)
      .get('/api/v1/dashboard/overview')
      .set(auth(principal.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.stats.totalStudents).toBe(2);
    expect(res.body.data.stats.presentToday).toBe(1);
    expect(res.body.data.stats.presentRate).toBe(100);
    expect(res.body.data.stats.pendingActions).toBe(1);
    expect(res.body.data.sectionAttendance).toHaveLength(1);
    expect(res.body.data.sectionAttendance[0].rate).toBe(100);
    expect(res.body.data.dailyTrend).toEqual(
      expect.arrayContaining([expect.objectContaining({ rate: 100 })])
    );

    const heatCol = res.body.data.heatmap.find((c: { sectionName: string }) => c.sectionName === section.sectionName);
    expect(heatCol).toBeTruthy();
    const mondayCell = heatCol.days.find((d: { day: string }) => d.day === 'Mon');
    expect(mondayCell.rate).toBe(100);
    expect(mondayCell.level).toBeGreaterThanOrEqual(1);

    expect(res.body.data.atRiskStudents).toHaveLength(1);
    expect(res.body.data.atRiskStudents[0].studentId).toBe(studentId);
    expect(res.body.data.stats.atRiskCount).toBe(1);

    expect(res.body.data.admForApproval).toHaveLength(1);
    expect(res.body.data.admForApproval[0].studentId ?? res.body.data.admForApproval[0].studentName).toBeTruthy();
  });

  it('excludes at-risk from past school years and inactive accounts', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const syPast = await seedSchoolYear(rk.user.id, 'TEST-PAST');
    const termPast = await seedTerm(syPast.id, 'junior_high', 'term_1', rk.user.id);

    const studentC = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    await prisma.studentProfile.update({ where: { id: studentC }, data: { sectionId: section.id } });
    await prisma.studentRiskAssessment.create({
      data: {
        studentId: studentC,
        sectionId: section.id,
        termId: termPast.id,
        academicRisk: true,
        attendanceRisk: false,
        behavioralRisk: false,
        riskCount: 1,
        riskLevel: 'high',
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        studentId: studentC,
        sectionId: section.id,
        termId: termPast.id,
        attendanceDate: today,
        session: 'morning',
        status: 'present',
        recordedBy: teacher.user.id,
      },
    });

    const studentD = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    await prisma.studentProfile.update({ where: { id: studentD }, data: { sectionId: section.id } });
    await prisma.studentRiskAssessment.create({
      data: {
        studentId: studentD,
        sectionId: section.id,
        termId: term.id,
        academicRisk: true,
        attendanceRisk: false,
        behavioralRisk: false,
        riskCount: 1,
        riskLevel: 'moderate',
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        studentId: studentD,
        sectionId: section.id,
        termId: term.id,
        attendanceDate: today,
        session: 'morning',
        status: 'present',
        recordedBy: teacher.user.id,
      },
    });
    await prisma.user.update({ where: { id: studentD }, data: { accountStatus: 'pending' } });

    const res = await request(app)
      .get('/api/v1/dashboard/overview')
      .set(auth(principal.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.stats.atRiskCount).toBe(0);
    expect(res.body.data.atRiskStudents).toEqual([]);
  });

  it('rejects students access', async () => {
    const student = await loginAs('student', { email: `student.dash.${Date.now()}@test.edu` });
    const res = await request(app)
      .get('/api/v1/dashboard/overview')
      .set(auth(student.tokens.accessToken));
    expect(res.status).toBe(403);
  });

  it('filters section attendance by month and reports late/excused rates', async () => {
    const jan1 = new Date(2026, 0, 5);
    jan1.setHours(0, 0, 0, 0);
    const jan2 = new Date(2026, 0, 6);
    jan2.setHours(0, 0, 0, 0);
    const jan3 = new Date(2026, 0, 7);
    jan3.setHours(0, 0, 0, 0);
    const feb1 = new Date(2026, 1, 3);
    feb1.setHours(0, 0, 0, 0);
    const feb2 = new Date(2026, 1, 4);
    feb2.setHours(0, 0, 0, 0);

    const statuses: Array<{ attendanceDate: Date; status: string }> = [
      { attendanceDate: jan1, status: 'present' },
      { attendanceDate: jan2, status: 'present' },
      { attendanceDate: jan3, status: 'absent' },
      { attendanceDate: feb1, status: 'late' },
      { attendanceDate: feb2, status: 'excused' },
    ];
    for (const r of statuses) {
      await prisma.attendanceRecord.create({
        data: {
          studentId,
          sectionId: section.id,
          termId: term.id,
          attendanceDate: r.attendanceDate,
          session: 'morning',
          status: r.status as never,
          recordedBy: teacher.user.id,
        },
      });
    }

    const janRes = await request(app)
      .get('/api/v1/dashboard/overview?month=2026-01')
      .set(auth(principal.tokens.accessToken));

    expect(janRes.status).toBe(200);
    const janRow = janRes.body.data.sectionAttendance[0];
    expect(janRow.totalCount).toBe(3);
    expect(janRow.presentCount).toBe(2);
    expect(janRow.absentCount).toBe(1);
    expect(janRow.lateCount).toBe(0);
    expect(janRow.excusedCount).toBe(0);
    expect(janRow.rate).toBe(66.7);
    expect(janRow.absentRate).toBe(33.3);

    const febRes = await request(app)
      .get('/api/v1/dashboard/overview?month=2026-02')
      .set(auth(principal.tokens.accessToken));

    expect(febRes.status).toBe(200);
    const febRow = febRes.body.data.sectionAttendance[0];
    expect(febRow.totalCount).toBe(2);
    expect(febRow.lateCount).toBe(1);
    expect(febRow.excusedCount).toBe(1);
    expect(febRow.rate).toBe(0);
    expect(febRow.lateRate).toBe(50);
    expect(febRow.excusedRate).toBe(50);

    const allRes = await request(app)
      .get('/api/v1/dashboard/overview')
      .set(auth(principal.tokens.accessToken));

    expect(allRes.status).toBe(200);
    expect(allRes.body.data.sectionAttendance[0].totalCount).toBe(5);
  });
});
