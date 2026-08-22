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

function schoolDaysBetween(start: Date, endInclusive: Date): number {
  let days = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(endInclusive);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
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
    expect(res.body.data.stats.presentRate).toBe(50);
    expect(res.body.data.stats.pendingActions).toBe(1);
    expect(res.body.data.sectionAttendance).toHaveLength(1);

    const sectionRate = res.body.data.sectionAttendance[0].rate;
    expect(sectionRate).toBeGreaterThanOrEqual(0);
    expect(sectionRate).toBeLessThanOrEqual(100);
    expect(res.body.data.dailyTrend).toEqual(
      expect.arrayContaining([expect.objectContaining({ rate: 50 })])
    );

    const heatCol = res.body.data.heatmap.find((c: { sectionName: string }) => c.sectionName === section.sectionName);
    expect(heatCol).toBeTruthy();
    const mondayCell = heatCol.days.find((d: { day: string }) => d.day === 'Mon');
    expect(mondayCell.rate).toBe(50);
    expect(mondayCell.level).toBeGreaterThanOrEqual(1);

    expect(res.body.data.atRiskStudents).toHaveLength(1);
    expect(res.body.data.atRiskStudents[0].studentId).toBe(studentId);
    expect(res.body.data.stats.atRiskCount).toBe(1);

    expect(res.body.data.admForApproval).toHaveLength(1);
    expect(res.body.data.admForApproval[0].studentId ?? res.body.data.admForApproval[0].studentName).toBeTruthy();
  });

  it('excludes at-risk from past school years but counts pending-account students', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const syPast = await seedSchoolYear(rk.user.id, 'TEST-PAST');
    const termPast = await seedTerm(syPast.id, 'junior_high', 'term_1', rk.user.id);
    const pastSection = await seedSection({ gradeLevel: 'grade_9', schoolYearId: syPast.id, createdBy: rk.user.id });

    const studentC = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    await prisma.studentProfile.update({ where: { id: studentC }, data: { sectionId: pastSection.id } });
    await prisma.anecdotalRecord.create({
      data: {
        studentId: studentC,
        observerId: teacher.user.id,
        sectionId: pastSection.id,
        termId: termPast.id,
        observationDate: today,
        incidentDescription: 'At-risk signal for a past school year.',
      },
    });

    const studentD = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    await prisma.studentProfile.update({ where: { id: studentD }, data: { sectionId: section.id } });
    await prisma.anecdotalRecord.create({
      data: {
        studentId: studentD,
        observerId: teacher.user.id,
        sectionId: section.id,
        termId: term.id,
        observationDate: today,
        incidentDescription: 'At-risk signal for a pending-account student.',
      },
    });
    await prisma.user.update({ where: { id: studentD }, data: { accountStatus: 'pending' } });

    const res = await request(app)
      .get('/api/v1/dashboard/overview')
      .set(auth(principal.tokens.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.stats.atRiskCount).toBe(1);
    expect(res.body.data.atRiskStudents.map((s: { studentId: string }) => s.studentId)).toEqual([studentD]);
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
    const janSchoolDays = schoolDaysBetween(new Date('2026-01-01'), new Date('2026-01-31'));
    const febSchoolDays = schoolDaysBetween(new Date('2026-02-01'), new Date('2026-02-28'));
    const enrolled = await prisma.studentProfile.count({ where: { sectionId: section.id } });

    const janRow = janRes.body.data.sectionAttendance[0];
    expect(janRow.totalCount).toBe(3);
    expect(janRow.presentCount).toBe(2);
    expect(janRow.absentCount).toBe(1);
    expect(janRow.lateCount).toBe(0);
    expect(janRow.excusedCount).toBe(0);
    expect(janRow.rate).toBe(Math.round((2 / (enrolled * janSchoolDays)) * 1000) / 10);
    expect(janRow.absentRate).toBe(Math.round((1 / (enrolled * janSchoolDays)) * 1000) / 10);

    const febRes = await request(app)
      .get('/api/v1/dashboard/overview?month=2026-02')
      .set(auth(principal.tokens.accessToken));

    expect(febRes.status).toBe(200);
    const febRow = febRes.body.data.sectionAttendance[0];
    expect(febRow.totalCount).toBe(2);
    expect(febRow.lateCount).toBe(1);
    expect(febRow.excusedCount).toBe(1);
    expect(febRow.rate).toBe(0);
    expect(febRow.lateRate).toBe(Math.round((1 / (enrolled * febSchoolDays)) * 1000) / 10);
    expect(febRow.excusedRate).toBe(Math.round((1 / (enrolled * febSchoolDays)) * 1000) / 10);

    const allRes = await request(app)
      .get('/api/v1/dashboard/overview')
      .set(auth(principal.tokens.accessToken));

    expect(allRes.status).toBe(200);
    expect(allRes.body.data.sectionAttendance[0].totalCount).toBe(5);
  });
});

describe('Dashboard section roster', () => {
  let principal: Awaited<ReturnType<typeof loginAs>>;
  let rk: Awaited<ReturnType<typeof loginAs>>;
  let teacher: Awaited<ReturnType<typeof loginAs>>;
  let studentId: string;
  let studentB: string;
  let outsideId: string;
  let section: Awaited<ReturnType<typeof seedSection>>;
  let otherSection: Awaited<ReturnType<typeof seedSection>>;
  let term: Awaited<ReturnType<typeof seedTerm>>;
  let sy: Awaited<ReturnType<typeof seedSchoolYear>>;

  beforeEach(async () => {
    await truncateAll();
    await invalidateDashboardCache();
    principal = await loginAs('principal');
    rk = await loginAs('record_keeper');
    teacher = await loginAs('teacher');
    sy = await seedSchoolYear(principal.user.id);
    term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
    section = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, createdBy: rk.user.id });
    otherSection = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, createdBy: rk.user.id });

    studentId = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    studentB = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    outsideId = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    await prisma.studentProfile.update({ where: { id: studentId }, data: { sectionId: section.id } });
    await prisma.studentProfile.update({ where: { id: studentB }, data: { sectionId: section.id } });
    await prisma.studentProfile.update({ where: { id: outsideId }, data: { sectionId: otherSection.id } });
  });

  it('returns only active-year students of the section with per-student attendance rate', async () => {
    await prisma.attendanceRecord.create({
      data: {
        studentId,
        sectionId: section.id,
        termId: term.id,
        attendanceDate: new Date('2026-07-01'),
        session: 'morning',
        status: 'present',
        recordedBy: teacher.user.id,
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        studentId,
        sectionId: section.id,
        termId: term.id,
        attendanceDate: new Date('2026-07-02'),
        session: 'morning',
        status: 'absent',
        recordedBy: teacher.user.id,
      },
    });

    const res = await request(app)
      .get(`/api/v1/dashboard/attendance/section/${section.id}/students`)
      .set(auth(principal.tokens.accessToken));

    expect(res.status).toBe(200);
    const roster = res.body.data;
    expect(roster).toHaveLength(2);

    const withRate = roster.find((s: { studentId: string }) => s.studentId === studentId);
    expect(withRate).toBeTruthy();
    expect(withRate.present).toBe(1);
    expect(withRate.late).toBe(0);
    expect(withRate.absent).toBe(1);
    expect(withRate.excused).toBe(0);
    expect(withRate.total).toBe(2);
    const rosterSchoolDays = schoolDaysBetween(sy.startDate, new Date());
    expect(withRate.rate).toBe(rosterSchoolDays > 0 ? Math.round((1 / rosterSchoolDays) * 1000) / 10 : null);
    expect(withRate.notLogged).toBeGreaterThanOrEqual(0);

    const withoutRate = roster.find((s: { studentId: string }) => s.studentId === studentB);
    expect(withoutRate.rate).toBe(0);
    expect(withoutRate.total).toBe(0);

    expect(roster.map((s: { studentId: string }) => s.studentId)).not.toContain(outsideId);
  });

  it('returns the monthly attendance trend for a student in the active year', async () => {
    await prisma.attendanceRecord.create({
      data: {
        studentId,
        sectionId: section.id,
        termId: term.id,
        attendanceDate: new Date('2026-07-01'),
        session: 'morning',
        status: 'present',
        recordedBy: teacher.user.id,
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        studentId,
        sectionId: section.id,
        termId: term.id,
        attendanceDate: new Date('2026-07-01'),
        session: 'afternoon',
        status: 'absent',
        recordedBy: teacher.user.id,
      },
    });

    const res = await request(app)
      .get(`/api/v1/dashboard/attendance/student/${studentId}/trend`)
      .set(auth(principal.tokens.accessToken));

    expect(res.status).toBe(200);
    const trend = res.body.data;
    expect(Array.isArray(trend)).toBe(true);

    const july = trend.find((p: { month: string }) => p.month === '2026-07');
    if (july) {
      expect(july.present).toBe(1);
      expect(july.absent).toBe(1);
      expect(july.logged).toBe(2);
      const julySchoolDays = schoolDaysBetween(new Date('2026-07-01'), new Date('2026-07-31'));
      expect(july.rate).toBe(julySchoolDays > 0 ? Math.round((1 / julySchoolDays) * 1000) / 10 : null);
      expect(july.notLogged).toBeGreaterThanOrEqual(0);
    }
  });

  it('rejects students access', async () => {
    const student = await loginAs('student', { email: `student.roster.${Date.now()}@test.edu` });
    const res = await request(app)
      .get(`/api/v1/dashboard/attendance/section/${section.id}/students`)
      .set(auth(student.tokens.accessToken));
    expect(res.status).toBe(403);
  });
});

describe('Dashboard needs-attention report', () => {
  let principal: Awaited<ReturnType<typeof loginAs>>;
  let rk: Awaited<ReturnType<typeof loginAs>>;
  let teacher: Awaited<ReturnType<typeof loginAs>>;
  let studentLow: string;
  let studentBorder: string;
  let studentOk: string;
  let section: Awaited<ReturnType<typeof seedSection>>;
  let term: Awaited<ReturnType<typeof seedTerm>>;
  let sy: Awaited<ReturnType<typeof seedSchoolYear>>;

  beforeEach(async () => {
    await truncateAll();
    await invalidateDashboardCache();
    principal = await loginAs('principal');
    rk = await loginAs('record_keeper');
    teacher = await loginAs('teacher');
    studentLow = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    studentBorder = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    studentOk = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    sy = await seedSchoolYear(principal.user.id);
    term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
    section = await seedSection({ gradeLevel: 'grade_9', schoolYearId: sy.id, createdBy: rk.user.id });
    await prisma.studentProfile.update({ where: { id: studentLow }, data: { sectionId: section.id } });
    await prisma.studentProfile.update({ where: { id: studentBorder }, data: { sectionId: section.id } });
    await prisma.studentProfile.update({ where: { id: studentOk }, data: { sectionId: section.id } });
  });

  async function seedAttendance(student: string, statuses: string[]) {
    for (let i = 0; i < statuses.length; i++) {
      const d = new Date('2026-07-01');
      d.setDate(d.getDate() + i);
      await prisma.attendanceRecord.create({
        data: {
          studentId: student,
          sectionId: section.id,
          termId: term.id,
          attendanceDate: d,
          session: 'morning',
          status: statuses[i] as never,
          recordedBy: teacher.user.id,
        },
      });
    }
  }

  it('flags students below 80% with danger/warn tone split and day counts', async () => {
    await seedAttendance(studentLow, ['present', 'absent', 'absent', 'absent', 'absent']);
    await seedAttendance(studentBorder, ['present', 'present', 'present', 'present', 'present', 'absent', 'absent']);
    await seedAttendance(studentOk, ['present', 'present', 'present', 'present', 'present', 'present', 'present']);

    const res = await request(app)
      .get('/api/v1/dashboard/attendance/needs-attention')
      .set(auth(principal.tokens.accessToken));

    expect(res.status).toBe(200);
    const report = res.body.data;
    expect(report.schoolYear).toBe('TEST-2026');

    const schoolDays = schoolDaysBetween(sy.startDate, new Date());
    const rateOf = (present: number) => (schoolDays > 0 ? Math.round((present / schoolDays) * 100) : 0);
    const toneOf = (rate: number) => (rate < 70 ? 'danger' : 'warn');

    const lowRow = report.rows.find((r: { studentId: string }) => r.studentId === studentLow);
    expect(lowRow).toBeDefined();
    expect(lowRow.rate).toBe(rateOf(1));
    expect(lowRow.tone).toBe(toneOf(lowRow.rate));
    expect(lowRow.gradeLabel).toBe('Grade 9');
    expect(lowRow.sectionName).toBe(section.sectionName);
    expect(lowRow.total).toBe(5);
    expect(lowRow.absent).toBe(4);
    expect(lowRow.lrn).toBeTruthy();
    expect(typeof lowRow.notLogged).toBe('number');
    expect(lowRow.notLogged).toBeGreaterThanOrEqual(0);
    expect(lowRow.adviserName).toBeNull();

    const borderRow = report.rows.find((r: { studentId: string }) => r.studentId === studentBorder);
    expect(borderRow).toBeDefined();
    expect(borderRow.rate).toBe(rateOf(5));
    expect(borderRow.tone).toBe(toneOf(borderRow.rate));

    const okRow = report.rows.find((r: { studentId: string }) => r.studentId === studentOk);
    expect(okRow).toBeDefined();
    expect(okRow.rate).toBe(rateOf(7));
    expect(okRow.tone).toBe(toneOf(okRow.rate));

    const danger = report.rows.filter((r: { tone: string }) => r.tone === 'danger').length;
    const warn = report.rows.filter((r: { tone: string }) => r.tone === 'warn').length;
    expect(report.dangerCount).toBe(danger);
    expect(report.warnCount).toBe(warn);
    expect(report.totalFlagged).toBe(report.rows.length);
    expect(report.rows.sort((a: { rate: number }, b: { rate: number }) => a.rate - b.rate)[0].studentId).toBe(studentLow);
  });

  it('filters by section and returns empty for a clean section', async () => {
    await seedAttendance(studentLow, ['present', 'absent', 'absent']);
    const emptySection = await seedSection({
      gradeLevel: 'grade_9',
      schoolYearId: sy.id,
      createdBy: rk.user.id,
      sectionName: 'Sec-Clean',
    });

    const flagged = await request(app)
      .get(`/api/v1/dashboard/attendance/needs-attention?section=${section.id}`)
      .set(auth(principal.tokens.accessToken));
    expect(flagged.status).toBe(200);
    expect(flagged.body.data.rows).toHaveLength(1);

    const clean = await request(app)
      .get(`/api/v1/dashboard/attendance/needs-attention?section=${emptySection.id}`)
      .set(auth(principal.tokens.accessToken));
    expect(clean.status).toBe(200);
    expect(clean.body.data.rows).toHaveLength(0);
    expect(clean.body.data.totalFlagged).toBe(0);
  });

  it('rejects students access', async () => {
    const student = await loginAs('student', { email: `student.flag.${Date.now()}@test.edu` });
    const res = await request(app)
      .get('/api/v1/dashboard/attendance/needs-attention')
      .set(auth(student.tokens.accessToken));
    expect(res.status).toBe(403);
  });
});

describe('Dashboard adviser alerts', () => {
  let principal: Awaited<ReturnType<typeof loginAs>>;
  let teacher: Awaited<ReturnType<typeof loginAs>>;
  let rk: Awaited<ReturnType<typeof loginAs>>;
  let studentLow: string;
  let studentOk: string;
  let section: Awaited<ReturnType<typeof seedSection>>;
  let term: Awaited<ReturnType<typeof seedTerm>>;
  let sy: Awaited<ReturnType<typeof seedSchoolYear>>;

  beforeEach(async () => {
    await truncateAll();
    await invalidateDashboardCache();
    principal = await loginAs('principal');
    teacher = await loginAs('teacher');
    rk = await loginAs('record_keeper');
    studentLow = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    studentOk = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    sy = await seedSchoolYear(principal.user.id);
    term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
    section = await seedSection({
      gradeLevel: 'grade_9',
      schoolYearId: sy.id,
      adviserId: teacher.user.id,
      createdBy: rk.user.id,
    });
    await prisma.studentProfile.update({ where: { id: studentLow }, data: { sectionId: section.id } });
    await prisma.studentProfile.update({ where: { id: studentOk }, data: { sectionId: section.id } });
  });

  async function seedAttendance(student: string, statuses: string[]) {
    for (let i = 0; i < statuses.length; i++) {
      const d = new Date('2026-07-01');
      d.setDate(d.getDate() + i);
      await prisma.attendanceRecord.create({
        data: {
          studentId: student,
          sectionId: section.id,
          termId: term.id,
          attendanceDate: d,
          session: 'morning',
          status: statuses[i] as never,
          recordedBy: teacher.user.id,
        },
      });
    }
  }

  it('creates alerts for flagged students, notifies adviser, and lists them', async () => {
    await seedAttendance(studentLow, ['present', 'absent', 'absent', 'absent', 'absent']);
    await seedAttendance(studentOk, ['present', 'present', 'present', 'present', 'present', 'present', 'present']);

    const send = await request(app)
      .post('/api/v1/dashboard/attendance/needs-attention/alerts')
      .set(auth(principal.tokens.accessToken))
      .send({ tone: 'all' });
    expect(send.status).toBe(201);
    expect(send.body.data.total).toBe(2);
    expect(send.body.data.created).toBe(2);
    expect(send.body.data.skippedNoAdviser).toBe(0);
    expect(send.body.data.alerts).toHaveLength(2);
    const alertedIds = send.body.data.alerts.map((a: { studentId: string }) => a.studentId).sort();
    expect(alertedIds).toEqual([studentLow, studentOk].sort());
    expect(send.body.data.alerts[0].status).toBe('pending');
    expect(send.body.data.advisers).toHaveLength(1);
    expect(send.body.data.advisers[0]).toMatchObject({
      name: `${teacher.user.firstName} ${teacher.user.lastName}`,
      sectionName: section.sectionName,
    });

    const list = await request(app)
      .get('/api/v1/dashboard/attendance/needs-attention/alerts')
      .set(auth(principal.tokens.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);

    const adviserNotifications = await prisma.notification.count({
      where: { recipientId: teacher.user.id, notificationType: 'attendance_alert' },
    });
    expect(adviserNotifications).toBe(2);
  });

  it('is idempotent for pending alerts and reopens acknowledged ones', async () => {
    await seedAttendance(studentLow, ['present', 'absent', 'absent', 'absent', 'absent']);

    await request(app)
      .post('/api/v1/dashboard/attendance/needs-attention/alerts')
      .set(auth(principal.tokens.accessToken))
      .send({ tone: 'all' });
    const again = await request(app)
      .post('/api/v1/dashboard/attendance/needs-attention/alerts')
      .set(auth(principal.tokens.accessToken))
      .send({ tone: 'all' });
    expect(again.status).toBe(201);
    expect(again.body.data.created).toBe(0);

    const created = await prisma.adviserAlert.findFirstOrThrow({
      where: { studentId: studentLow },
    });
    await request(app)
      .patch(`/api/v1/dashboard/attendance/needs-attention/alerts/${created.id}`)
      .set(auth(teacher.tokens.accessToken))
      .send({ status: 'acknowledged' })
      .expect(200);

    const reopened = await request(app)
      .post('/api/v1/dashboard/attendance/needs-attention/alerts')
      .set(auth(principal.tokens.accessToken))
      .send({ tone: 'all' });
    expect(reopened.body.data.created).toBe(1);
    const after = await prisma.adviserAlert.findUniqueOrThrow({ where: { id: created.id } });
    expect(after.status).toBe('pending');
  });

  it('guards POST to principals only', async () => {
    const res = await request(app)
      .post('/api/v1/dashboard/attendance/needs-attention/alerts')
      .set(auth(rk.tokens.accessToken))
      .send({ tone: 'all' });
    expect(res.status).toBe(403);
  });
});

describe('SF10 audit trail', () => {
  let principal: Awaited<ReturnType<typeof loginAs>>;
  let rk: Awaited<ReturnType<typeof loginAs>>;
  let studentId: string;
  let term: Awaited<ReturnType<typeof seedTerm>>;
  let sy: Awaited<ReturnType<typeof seedSchoolYear>>;

  beforeEach(async () => {
    await truncateAll();
    await invalidateDashboardCache();
    principal = await loginAs('principal');
    rk = await loginAs('record_keeper');
    studentId = await createUser({ role: 'student', gradeLevel: 'grade_9' });
    sy = await seedSchoolYear(principal.user.id);
    term = await seedTerm(sy.id, 'junior_high', 'term_1', principal.user.id);
  });

  it('lists report card lifecycle events (create, ready, release) with actor + student resolution', async () => {
    const student = await loginAs('student', { email: `student.audit.${Date.now()}@test.edu` });
    const created = await request(app)
      .post('/api/v1/report-cards')
      .set(auth(rk.tokens.accessToken))
      .send({ studentId: student.user.id, termId: term.id, source: 'system_generated' });
    expect(created.status).toBe(201);
    const cardId = created.body.data.id;

    await request(app)
      .post(`/api/v1/report-cards/${cardId}/ready`)
      .set(auth(rk.tokens.accessToken))
      .expect(200);
    await request(app)
      .post(`/api/v1/report-cards/${cardId}/release`)
      .set(auth(rk.tokens.accessToken))
      .expect(200);

    const res = await request(app)
      .get('/api/v1/dashboard/sf10/audit-trail')
      .set(auth(principal.tokens.accessToken))
      .expect(200);

    expect(res.body.data.total).toBeGreaterThanOrEqual(3);
    const actions = res.body.data.entries.map((e: { action: string }) => e.action);
    expect(actions).toContain('CREATE');
    expect(actions).toContain('READY');
    expect(actions).toContain('RELEASE');

    const releaseEntry = res.body.data.entries.find((e: { action: string }) => e.action === 'RELEASE');
    expect(releaseEntry.actor.fullName).toContain(rk.user.lastName);
    expect(releaseEntry.student.fullName).toContain(student.user.lastName);
    expect(releaseEntry.student.lrn).toBeTruthy();
    expect(releaseEntry.student.gradeLabel).toBeTruthy();
    expect(releaseEntry.termLabel).toBe(term.termLabel);
  });

  it('search filters by student name', async () => {
    const student = await loginAs('student', { email: `student.audit2.${Date.now()}@test.edu` });
    await request(app)
      .post('/api/v1/report-cards')
      .set(auth(rk.tokens.accessToken))
      .send({ studentId: student.user.id, termId: term.id, source: 'system_generated' })
      .expect(201);

    const res = await request(app)
      .get(`/api/v1/dashboard/sf10/audit-trail?search=${encodeURIComponent(student.user.lastName)}`)
      .set(auth(principal.tokens.accessToken))
      .expect(200);

    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    const allMatch = res.body.data.entries.every(
      (e: { student: { fullName: string } | null }) => e.student?.fullName.includes(student.user.lastName)
    );
    expect(allMatch).toBe(true);
  });

  it('requires staff role', async () => {
    const student = await loginAs('student', { email: `student.audit3.${Date.now()}@test.edu` });
    await request(app)
      .get('/api/v1/dashboard/sf10/audit-trail')
      .set(auth(student.tokens.accessToken))
      .expect(403);
  });
});
