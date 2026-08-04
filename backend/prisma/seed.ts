import { AccountStatus, GradeLevel, PrismaClient, Role, Sex, type TermNumber } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Zentra@2026!';
const SY = '2026-2027';

interface UserSeed {
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  password?: string;
  accountStatus?: AccountStatus;
  provisioningType?: 'self_registered' | 'hardcoded';
  employeeId?: string;
  lrn?: string;
  gradeLevel?: GradeLevel;
  sex?: Sex;
  birthdate?: string;
  relationship?: 'mother' | 'father' | 'guardian';
}

async function hash(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

async function seedUser(input: UserSeed): Promise<{ id: string }> {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) return { id: existing.id };

  const passwordHash = await hash(input.password ?? DEFAULT_PASSWORD);
  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      accountStatus: input.accountStatus ?? 'active',
      provisioningType: input.provisioningType ?? 'hardcoded',
    },
  });

  if (input.role === 'student') {
    await prisma.studentProfile.create({
      data: {
        id: user.id,
        lrn: input.lrn ?? `1000000000${user.id.slice(0, 4)}`,
        birthdate: new Date(input.birthdate ?? '2008-01-15'),
        sex: input.sex ?? 'male',
        gradeLevel: input.gradeLevel ?? 'grade_7',
      },
    });
  }
  if (input.role === 'parent') {
    await prisma.parentProfile.create({
      data: { id: user.id, relationship: input.relationship ?? 'guardian' },
    });
  }
  if (['teacher', 'registrar', 'record_keeper', 'adm_coordinator', 'guidance_counselor', 'principal', 'nurse'].includes(input.role)) {
    await prisma.staffProfile.create({
      data: { id: user.id, employeeId: input.employeeId ?? `EMP-${user.id.slice(0, 8)}` },
    });
  }
  return { id: user.id };
}

async function seedAcademicStructure() {
  let sy = await prisma.schoolYear.findUnique({ where: { yearLabel: SY } });
  if (!sy) {
    sy = await prisma.schoolYear.create({
      data: {
        yearLabel: SY,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2027-03-31'),
        status: 'active',
        createdBy: (await prisma.user.findUniqueOrThrow({ where: { email: 'principal@zentra.edu' } })).id,
      },
    });
  }

  const sectionsByGrade = new Map<GradeLevel, { id: string; adviserId: string | null }>();
  const sectionNames: Record<GradeLevel, string> = {
    grade_7: 'Newton',
    grade_8: 'Rizal',
    grade_9: 'Euclid',
    grade_10: 'Curie',
    grade_11: 'Galilei',
    grade_12: 'Einstein',
  };

  for (const grade of Object.keys(sectionNames) as GradeLevel[]) {
    const adviserEmail = grade === 'grade_11' || grade === 'grade_12' ? 'teacher.shs@zentra.edu' : 'teacher.jhs@zentra.edu';
    const adviser = await prisma.user.findUnique({ where: { email: adviserEmail } });
    let section = await prisma.section.findFirst({ where: { sectionName: sectionNames[grade], schoolYearId: sy.id } });
    if (!section) {
      const bandOwner = grade === 'grade_11' || grade === 'grade_12' ? 'registrar@zentra.edu' : 'record.keeper@zentra.edu';
      section = await prisma.section.create({
        data: {
          sectionName: sectionNames[grade],
          gradeLevel: grade,
          schoolYearId: sy.id,
          adviserId: adviser?.id,
          createdBy: (await prisma.user.findUniqueOrThrow({ where: { email: bandOwner } })).id,
        },
      });
    }
    sectionsByGrade.set(grade, { id: section.id, adviserId: adviser?.id ?? null });
  }

  const subjectNames = ['Mathematics', 'English', 'Science', 'Filipino'];
  for (const grade of Object.keys(sectionNames) as GradeLevel[]) {
    const bandOwner = grade === 'grade_11' || grade === 'grade_12' ? 'registrar@zentra.edu' : 'record.keeper@zentra.edu';
    for (const name of subjectNames) {
      const code = `${name.slice(0, 3).toUpperCase()}-${grade.replace('grade_', '')}`;
      const subject = await prisma.subject.findUnique({ where: { subjectCode: code } });
      if (!subject) {
        await prisma.subject.create({
          data: {
            subjectName: `${name} ${grade.replace('grade_', '')}`,
            subjectCode: code,
            gradeLevel: grade,
            createdBy: (await prisma.user.findUniqueOrThrow({ where: { email: bandOwner } })).id,
          },
        });
      }
    }
  }

  const termLabels: Record<number, string> = { 1: '1st Trimester', 2: '2nd Trimester', 3: '3rd Trimester' };
  const termMap = new Map<string, { id: string; band: 'junior_high' | 'senior_high'; number: number }>();
  for (const band of ['junior_high', 'senior_high'] as const) {
    for (let i = 1; i <= 3; i++) {
      const existing = await prisma.term.findUnique({
        where: { schoolYearId_gradeBand_termNumber: { schoolYearId: sy.id, gradeBand: band, termNumber: `term_${i}` as TermNumber } },
      });
      let term = existing;
      if (!term) {
        term = await prisma.term.create({
          data: {
            schoolYearId: sy.id,
            gradeBand: band,
            termNumber: `term_${i}` as TermNumber,
            termLabel: termLabels[i],
            startDate: new Date(`2026-${band === 'junior_high' ? '06' : '06'}-01`),
            endDate: new Date(`2027-0${3}-31`),
            status: 'active',
            createdBy: (await prisma.user.findUniqueOrThrow({ where: { email: 'principal@zentra.edu' } })).id,
          },
        });
      }
      termMap.set(`${band}-${i}`, { id: term.id, band, number: i });
    }
  }

  return { sy, sectionsByGrade, termMap };
}

async function seedTeacherAssignments(sectionsByGrade: Map<GradeLevel, { id: string; adviserId: string | null }>) {
  const teacherJhs = await prisma.user.findUniqueOrThrow({ where: { email: 'teacher.jhs@zentra.edu' } });
  const teacherShs = await prisma.user.findUniqueOrThrow({ where: { email: 'teacher.shs@zentra.edu' } });
  const recordKeeper = await prisma.user.findUniqueOrThrow({ where: { email: 'record.keeper@zentra.edu' } });
  const registrar = await prisma.user.findUniqueOrThrow({ where: { email: 'registrar@zentra.edu' } });
  const sy = await prisma.schoolYear.findUniqueOrThrow({ where: { yearLabel: SY } });

  for (const grade of ['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12'] as GradeLevel[]) {
    const section = sectionsByGrade.get(grade)!;
    const teacher = grade === 'grade_11' || grade === 'grade_12' ? teacherShs : teacherJhs;
    const assignedBy = grade === 'grade_11' || grade === 'grade_12' ? registrar : recordKeeper;
    const mathSubject = await prisma.subject.findUnique({ where: { subjectCode: `MAT-${grade.replace('grade_', '')}` } });
    if (!mathSubject) continue;
    const existing = await prisma.teacherSubjectAssignment.findUnique({
      where: {
        teacherId_subjectId_sectionId_schoolYearId: {
          teacherId: teacher.id,
          subjectId: mathSubject.id,
          sectionId: section.id,
          schoolYearId: sy.id,
        },
      },
    });
    if (!existing) {
      await prisma.teacherSubjectAssignment.create({
        data: {
          teacherId: teacher.id,
          subjectId: mathSubject.id,
          sectionId: section.id,
          schoolYearId: sy.id,
          assignedBy: assignedBy.id,
          isActive: true,
        },
      });
    }
  }
}

async function seedParents() {
  const links: Array<[string, string]> = [
    ['parent.g7@zentra.edu', 'student.g7@zentra.edu'],
    ['parent.g12@zentra.edu', 'student.g12@zentra.edu'],
  ];
  for (const [parentEmail, studentEmail] of links) {
    const parent = await prisma.user.findUniqueOrThrow({ where: { email: parentEmail } });
    const student = await prisma.user.findUniqueOrThrow({ where: { email: studentEmail } });
    const existing = await prisma.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
    });
    if (!existing) {
      await prisma.parentStudentLink.create({
        data: { parentId: parent.id, studentId: student.id, status: 'confirmed' },
      });
    }
  }
}

async function seedGradeComponents(termMap: Map<string, { id: string; band: 'junior_high' | 'senior_high'; number: number }>) {
  const jhsTerm1 = termMap.get('junior_high-1')!;
  const shsTerm1 = termMap.get('senior_high-1')!;
  for (const grade of ['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12'] as GradeLevel[]) {
    const subject = await prisma.subject.findUnique({ where: { subjectCode: `MAT-${grade.replace('grade_', '')}` } });
    if (!subject) continue;
    const term = grade === 'grade_11' || grade === 'grade_12' ? shsTerm1 : jhsTerm1;
    const existing = await prisma.gradeComponent.findFirst({ where: { subjectId: subject.id, termId: term.id } });
    if (existing) continue;
    await prisma.gradeComponent.createMany({
      data: [
        { subjectId: subject.id, componentType: 'quiz', weightPercentage: 30, termId: term.id },
        { subjectId: subject.id, componentType: 'performance_task', weightPercentage: 50, termId: term.id },
        { subjectId: subject.id, componentType: 'exam', weightPercentage: 20, termId: term.id },
      ],
    });
  }
}









const time = (h: string): Date => {
  const parts = h.split(':');
  const hh = Number(parts[0]);
  const mm = parts.length > 1 ? Number(parts[1]) : 0;
  return new Date(2000, 0, 1, hh, mm, 0, 0);
};

async function seedDemoData(
  sectionsByGrade: Map<GradeLevel, { id: string; adviserId: string | null }>,
  termMap: Map<string, { id: string; band: 'junior_high' | 'senior_high'; number: number }>,
) {
  if ((await prisma.notification.count()) > 0) {
    console.log('Demo dataset already present; skipping.');
    return;
  }

  const pick = <T,>(arr: readonly T[], i: number): T => arr[i % arr.length];

  const teachers = await prisma.user.findMany({ where: { role: 'teacher', accountStatus: 'active' } });
  const students = await prisma.user.findMany({ where: { role: 'student' } });
  const parents = await prisma.user.findMany({ where: { role: 'parent' } });
  const principal = await prisma.user.findUniqueOrThrow({ where: { email: 'principal@zentra.edu' } });
  const registrar = await prisma.user.findUniqueOrThrow({ where: { email: 'registrar@zentra.edu' } });
  const recordKeeper = await prisma.user.findUniqueOrThrow({ where: { email: 'record.keeper@zentra.edu' } });
  const adm = await prisma.user.findUniqueOrThrow({ where: { email: 'adm@zentra.edu' } });
  const counselor = await prisma.user.findUniqueOrThrow({ where: { email: 'counselor@zentra.edu' } });
  const nurse = await prisma.user.findUniqueOrThrow({ where: { email: 'nurse@zentra.edu' } });

  
  let studentProfiles = await prisma.studentProfile.findMany();
  const sectionIdFor = new Map(studentProfiles.map((sp) => [sp.id, sp.sectionId]));
  for (const sp of studentProfiles) {
    if (!sp.sectionId) {
      const sec = sectionsByGrade.get(sp.gradeLevel)!.id;
      await prisma.studentProfile.update({ where: { id: sp.id }, data: { sectionId: sec } });
      sectionIdFor.set(sp.id, sec);
    }
  }
  studentProfiles = await prisma.studentProfile.findMany();
  const studentInfo = new Map(
    studentProfiles.map((sp) => [sp.id, { gradeLevel: sp.gradeLevel, sectionId: sectionIdFor.get(sp.id) ?? sp.sectionId! }]),
  );
  const isShs = (sid: string) => studentInfo.get(sid)!.gradeLevel === 'grade_11' || studentInfo.get(sid)!.gradeLevel === 'grade_12';
  const termFor = (sid: string) => (isShs(sid) ? termMap.get('senior_high-1')! : termMap.get('junior_high-1')!);

  
  for (let i = 0; i < parents.length; i++) {
    const student = pick(students, i);
    const existing = await prisma.parentStudentLink.findUnique({
      where: { parentId_studentId: { parentId: parents[i].id, studentId: student.id } },
    });
    if (!existing) {
      await prisma.parentStudentLink.create({
        data: { parentId: parents[i].id, studentId: student.id, status: i % 3 === 0 ? 'pending_confirmation' : 'confirmed' },
      });
    }
  }

  
  for (let start = 2017; start <= 2025; start++) {
    const label = `${start}-${start + 1}`;
    const exists = await prisma.schoolYear.findUnique({ where: { yearLabel: label } });
    if (!exists) {
      await prisma.schoolYear.create({
        data: {
          yearLabel: label,
          startDate: new Date(start, 5, 1),
          endDate: new Date(start + 1, 2, 31),
          status: 'completed',
          createdBy: principal.id,
        },
      });
    }
  }

  
  const lastSy = await prisma.schoolYear.findUniqueOrThrow({ where: { yearLabel: '2025-2026' } });
  const termLabelOf: Record<number, string> = { 1: '1st Trimester', 2: '2nd Trimester', 3: '3rd Trimester' };
  for (const band of ['junior_high', 'senior_high'] as const) {
    for (let i = 1; i <= 3; i++) {
      const exists = await prisma.term.findUnique({
        where: { schoolYearId_gradeBand_termNumber: { schoolYearId: lastSy.id, gradeBand: band, termNumber: `term_${i}` as TermNumber } },
      });
      if (!exists) {
        await prisma.term.create({
          data: {
            schoolYearId: lastSy.id,
            gradeBand: band,
            termNumber: `term_${i}` as TermNumber,
            termLabel: termLabelOf[i],
            startDate: new Date(2025, 5, 1),
            endDate: new Date(2026, 2, 31),
            status: 'completed',
            createdBy: principal.id,
          },
        });
      }
    }
  }

  
  const altSections: Record<GradeLevel, string> = {
    grade_7: 'Apollo', grade_8: 'Bayan', grade_9: 'Cebu', grade_10: 'Davao', grade_11: 'Eagle', grade_12: 'Fuego',
  };
  const teacher2Jhs = await prisma.user.findUnique({ where: { email: 'teacher2.jhs@zentra.edu' } });
  const teacher2Shs = await prisma.user.findUnique({ where: { email: 'teacher2.shs@zentra.edu' } });
  for (const grade of Object.keys(altSections) as GradeLevel[]) {
    const exists = await prisma.section.findFirst({ where: { sectionName: altSections[grade], schoolYearId: lastSy.id } });
    if (!exists) {
      const adviser = grade === 'grade_11' || grade === 'grade_12' ? teacher2Shs : teacher2Jhs;
      const createdBy = grade === 'grade_11' || grade === 'grade_12' ? registrar.id : recordKeeper.id;
      await prisma.section.create({
        data: {
          sectionName: altSections[grade],
          gradeLevel: grade,
          schoolYearId: lastSy.id,
          adviserId: adviser?.id ?? null,
          createdBy,
        },
      });
    }
  }

  
  const sectionIds = [...sectionsByGrade.values()].map((s) => s.id);
  const sy2627 = await prisma.schoolYear.findUniqueOrThrow({ where: { yearLabel: '2026-2027' } });
  for (const grade of ['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12'] as GradeLevel[]) {
    const section = sectionsByGrade.get(grade)!;
    const teacher = grade === 'grade_11' || grade === 'grade_12' ? teacher2Shs ?? teachers[1] : teacher2Jhs ?? teachers[0];
    const assignedBy = grade === 'grade_11' || grade === 'grade_12' ? registrar : recordKeeper;
    for (const codeBase of ['ENG', 'SCI', 'FIL']) {
      const subject = await prisma.subject.findUnique({ where: { subjectCode: `${codeBase}-${grade.replace('grade_', '')}` } });
      if (!subject) continue;
      const existing = await prisma.teacherSubjectAssignment.findUnique({
        where: {
          teacherId_subjectId_sectionId_schoolYearId: {
            teacherId: teacher.id,
            subjectId: subject.id,
            sectionId: section.id,
            schoolYearId: sy2627.id,
          },
        },
      });
      if (!existing) {
        await prisma.teacherSubjectAssignment.create({
          data: { teacherId: teacher.id, subjectId: subject.id, sectionId: section.id, schoolYearId: sy2627.id, assignedBy: assignedBy.id, isActive: true },
        });
      }
    }
  }

  
  const jhsTerm1 = termMap.get('junior_high-1')!;
  const shsTerm1 = termMap.get('senior_high-1')!;
  for (const grade of ['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12'] as GradeLevel[]) {
    const term = grade === 'grade_11' || grade === 'grade_12' ? shsTerm1 : jhsTerm1;
    for (const codeBase of ['ENG', 'SCI', 'FIL']) {
      const subject = await prisma.subject.findUnique({ where: { subjectCode: `${codeBase}-${grade.replace('grade_', '')}` } });
      if (!subject) continue;
      const existing = await prisma.gradeComponent.findFirst({ where: { subjectId: subject.id, termId: term.id } });
      if (existing) continue;
      await prisma.gradeComponent.createMany({
        data: [
          { subjectId: subject.id, componentType: 'quiz', weightPercentage: 30, termId: term.id },
          { subjectId: subject.id, componentType: 'performance_task', weightPercentage: 50, termId: term.id },
          { subjectId: subject.id, componentType: 'exam', weightPercentage: 20, termId: term.id },
        ],
      });
    }
  }

  
  if ((await prisma.refreshToken.count()) < 10) {
    await prisma.refreshToken.createMany({
      data: await Promise.all(
        Array.from({ length: 10 }, async (_, i) => ({
          userId: pick([...teachers, ...students, principal, adm], i).id,
          tokenHash: await hash(`demo-refresh-token-${i}`),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        })),
      ),
    });
  }

  
  await prisma.adviserAccessRequest.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({
      adviserId: pick(teachers, i).id,
      sectionId: pick(sectionIds, i),
      reason: `Demo access request ${i + 1}: needs to view case records for intervention monitoring.`,
      status: i % 3 === 0 ? 'approved' : i % 3 === 1 ? 'denied' : 'pending',
      reviewedBy: i % 3 === 2 ? null : registrar.id,
      reviewedAt: i % 3 === 2 ? null : new Date(2026, 5, i + 5),
    })),
  });

  
  const anecdotalCreated = await prisma.anecdotalRecord.createManyAndReturn({
    data: Array.from({ length: 12 }, (_, i) => {
      const student = pick(students, i);
      return {
        observerId: pick(teachers, i).id,
        studentId: student.id,
        sectionId: studentInfo.get(student.id)!.sectionId,
        termId: termFor(student.id).id,
        observationDate: new Date(2026, 5, (i % 27) + 2),
        observationTime: time(pick(['09:00', '10:00', '13:00'], i)),
        incidentDescription: `Anecdotal note ${i + 1}: observed classroom behavior during a period.`,
        locationSetting: 'Classroom',
        notesRecommendationsActions: 'Monitor progress; schedule a check-in.',
        classPerformance: 'Satisfactory',
        attendanceSummary: 'Regular',
        confidentialityLevel: pick(['confidential', 'internal_staff', 'parent_visible'] as const, i),
      };
    }),
  });

  
  await prisma.anecdotalRecordFollowup.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({
      anecdotalRecordId: pick(anecdotalCreated, i).id,
      followedUpBy: pick(teachers, i).id,
      followupDate: new Date(2026, 6, (i % 27) + 2),
      followupNotes: `Follow-up ${i + 1}: behavior improving; continue monitoring.`,
    })),
  });

  
  const referralCreated = await prisma.referral.createManyAndReturn({
    data: Array.from({ length: 12 }, (_, i) => ({
      anecdotalRecordId: pick(anecdotalCreated, i).id,
      referredToRole: pick(['nurse', 'guidance_counselor', 'adm_coordinator', 'principal'] as const, i),
      referredBy: pick(teachers, i).id,
      reasonForReferral: `Referral ${i + 1}: learner needs specialist attention for academic/behavioral support.`,
      confidentialityLevel: 'confidential',
    })),
  });

  
  await prisma.healthRecord.createMany({
    data: Array.from({ length: 12 }, (_, i) => {
      const student = pick(students, i);
      return {
        studentId: student.id,
        sectionId: studentInfo.get(student.id)!.sectionId,
        termId: termFor(student.id).id,
        referralId: i < 4 ? referralCreated[i].id : null,
        visitDate: new Date(2026, 5, (i % 27) + 3),
        visitTime: time('10:30'),
        reasonForVisit: `Clinic visit ${i + 1}: headache / fever check-up.`,
        vitalSigns: { temperature: '36.8', bloodPressure: '110/70' },
        diagnosisAssessment: 'Mild flu symptoms',
        treatmentGiven: 'Rest, hydration and monitoring.',
        medicationAdministered: 'Paracetamol 500mg',
        recommendation: pick(['rest_in_clinic', 'sent_home', 'referred_to_hospital', 'returned_to_class'] as const, i),
        parentNotified: i % 2 === 0,
        attendedBy: nurse.id,
        confidentialityLevel: 'internal_staff',
      };
    }),
  });

  
  await prisma.homeVisitationRecord.createMany({
    data: Array.from({ length: 12 }, (_, i) => {
      const student = pick(students, i);
      return {
        studentId: student.id,
        sectionId: studentInfo.get(student.id)!.sectionId,
        termId: termFor(student.id).id,
        referralId: i >= 4 && i < 8 ? referralCreated[i].id : null,
        visitContext: pick(['adm_followup', 'guidance_counseling'] as const, i),
        personVisitedName: 'Guardian',
        relationToStudent: 'guardian',
        address: 'Sample Barangay, Municipality',
        reasonForVisitation: `Home visit ${i + 1}: check on learner welfare.`,
        visitDate: new Date(2026, 6, (i % 27) + 2),
        visitTime: time('14:00'),
        homeConditionObservation: 'Stable household conditions.',
        familyConditionObservation: 'Supportive family.',
        detailsOfConcern: 'None major.',
        learnerAgreement: 'Student agrees to comply with intervention.',
        familyAgreement: 'Family agrees to support the plan.',
        conductedBy: counselor.id,
        studentSigned: true,
        parentSigned: true,
        adviserSigned: i % 2 === 0,
        certificationIssued: i % 3 === 0,
        certificationPurpose: i % 3 === 0 ? 'Court appearance support' : null,
        certificationIssuedDate: i % 3 === 0 ? new Date(2026, 6, (i % 27) + 4) : null,
        certifiedBy: i % 3 === 0 ? principal.id : null,
        confidentialityLevel: 'internal_staff',
      };
    }),
  });

  
  await prisma.admLearnerProfile.createMany({
    data: Array.from({ length: 12 }, (_, i) => {
      const student = pick(students, i);
      return {
        studentId: student.id,
        sectionId: studentInfo.get(student.id)!.sectionId,
        termId: termFor(student.id).id,
        referralId: referralCreated[i].id,
        teacherAdviserId: pick(teachers, i).id,
        reasonForAdm: `ADM intervention ${i + 1}: learner needs an alternative delivery mode.`,
        admInterventionDescription: 'Modular learning plan with weekly check-ins.',
        admInterventionResult: i % 2 === 0 ? 'Improved performance' : null,
        preparedBy: counselor.id,
        alternateAdmCoordinatorId: null,
        certificationIssued: i % 4 === 0,
        certificationIssuedDate: i % 4 === 0 ? new Date(2026, 7, (i % 27) + 1) : null,
        certifiedBy: i % 4 === 0 ? principal.id : null,
        approvedBy: i % 3 !== 0 ? adm.id : null,
        confidentialityLevel: 'confidential',
        status: pick(['draft', 'submitted', 'approved'] as const, i),
      };
    }),
  });

  
  const admProfiles = await prisma.admLearnerProfile.findMany();
  await prisma.admParentMeeting.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({
      admLearnerProfileId: pick(admProfiles, i).id,
      meetingDate: new Date(2026, 6, (i % 25) + 3),
      parentsAttended: i % 2 === 0,
      confirmedBy: adm.id,
      confirmedVia: pick(['parent_app', 'staff_recorded'] as const, i),
      minutesOfMeeting: `Meeting minutes ${i + 1}: discussed the intervention plan and learner progress.`,
      attendanceLogbookReference: `LB-2026-${String(i + 1).padStart(4, '0')}`,
      conductedBy: counselor.id,
      adviserId: pick(teachers, i).id,
    })),
  });

  
  await prisma.admModule.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({
      admLearnerProfileId: pick(admProfiles, i).id,
      releaseDate: new Date(2026, 6, (i % 25) + 5),
      distributionSchedule: `Weekly distribution schedule ${i + 1}`,
      submissionDeadline: new Date(2026, 7, (i % 25) + 10),
      followupCounselingNotes: `Counseling notes ${i + 1}: learner progressing well.`,
      status: pick(['released', 'in_progress', 'submitted', 'student_returned'] as const, i),
      submittedBy: i % 4 >= 2 ? pick(students, i).id : null,
      approvedBy: adm.id,
    })),
  });

  
  await prisma.attendanceRecord.createMany({
    data: Array.from({ length: 12 }, (_, i) => {
      const student = pick(students, i);
      return {
        studentId: student.id,
        sectionId: studentInfo.get(student.id)!.sectionId,
        termId: termFor(student.id).id,
        attendanceDate: new Date(2026, 5, (i % 27) + 4),
        session: pick(['morning', 'afternoon'] as const, i),
        status: pick(['present', 'absent', 'late', 'excused'] as const, i),
        remarks: i % 4 === 1 ? 'Family emergency' : null,
        recordedBy: pick(teachers, i).id,
      };
    }),
  });

  
  const mathSubjects = await prisma.subject.findMany({ where: { subjectCode: { startsWith: 'MAT-' } } });
  const gradeNumOf = (code: string) => Number(code.split('-')[1]);
  const assessmentsCreated = await prisma.assessment.createManyAndReturn({
    data: Array.from({ length: 12 }, (_, i) => {
      const subject = pick(mathSubjects, i);
      const gradeNum = gradeNumOf(subject.subjectCode);
      const section = sectionsByGrade.get(`grade_${gradeNum}` as GradeLevel)!;
      return {
        subjectId: subject.id,
        sectionId: section.id,
        termId: gradeNum >= 11 ? shsTerm1.id : jhsTerm1.id,
        teacherId: pick(teachers, i).id,
        componentType: pick(['quiz', 'performance_task', 'exam'] as const, i),
        title: `Math Assessment ${i + 1}`,
        maxScore: 50,
        dateGiven: new Date(2026, 5, (i % 25) + 5),
      };
    }),
  });

  
  await prisma.studentGrade.createMany({
    data: Array.from({ length: 12 }, (_, i) => {
      const assessment = pick(assessmentsCreated, i);
      const student = pick(students, i);
      return {
        assessmentId: assessment.id,
        studentId: student.id,
        score: ((i * 7) % 45) + 5,
        remarks: null,
        recordedBy: assessment.teacherId,
      };
    }),
  });

  
  await prisma.finalGrade.createMany({
    data: Array.from({ length: 12 }, (_, i) => {
      const student = pick(students, i);
      const subject = pick(mathSubjects, i);
      const gradeNum = gradeNumOf(subject.subjectCode);
      const bandOwner = gradeNum >= 11 ? registrar : recordKeeper;
      return {
        studentId: student.id,
        subjectId: subject.id,
        sectionId: studentInfo.get(student.id)!.sectionId,
        termId: gradeNum >= 11 ? shsTerm1.id : jhsTerm1.id,
        quizAverage: 85,
        performanceTaskAverage: 88,
        examAverage: 82,
        initialGrade: 85.4,
        transmutedGrade: 88,
        remarks: 'passed',
        finalizedBy: bandOwner.id,
        finalizedAt: new Date(2026, 6, 10),
        isLocked: i % 3 === 0,
        lockedBy: i % 3 === 0 ? bandOwner.id : null,
        lockedAt: i % 3 === 0 ? new Date(2026, 6, 12) : null,
      };
    }),
  });

  
  await prisma.studentRiskAssessment.createMany({
    data: Array.from({ length: 12 }, (_, i) => {
      const student = pick(students, i);
      const academic = i % 4 === 0;
      const attendance = i % 4 === 1;
      const behavioral = i % 4 === 2;
      const count = [academic, attendance, behavioral].filter(Boolean).length;
      return {
        studentId: student.id,
        sectionId: studentInfo.get(student.id)!.sectionId,
        termId: termFor(student.id).id,
        academicRisk: academic,
        attendanceRisk: attendance,
        behavioralRisk: behavioral,
        riskCount: count,
        riskLevel: count >= 2 ? 'high' : count === 1 ? 'moderate' : 'low',
      };
    }),
  });

  
  await prisma.recordFlag.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({
      sourceTable: pick(['anecdotal_records', 'attendance_records', 'referrals'] as const, i),
      sourceRecordId: pick([...anecdotalCreated, ...referralCreated], i).id,
      flaggedBy: pick([...teachers, recordKeeper], i).id,
      flagReason: `Flag ${i + 1}: record requires review.`,
      status: i % 3 === 0 ? 'open' : 'resolved',
      resolvedBy: i % 3 === 0 ? null : registrar.id,
      resolvedAt: i % 3 === 0 ? null : new Date(2026, 6, 15),
    })),
  });

  
  await prisma.auditLog.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({
      actorId: pick([principal, registrar, recordKeeper, adm], i).id,
      action: pick(['create', 'update', 'delete', 'approve', 'finalize'] as const, i),
      tableName: pick(['anecdotal_records', 'sections', 'subjects', 'terms'] as const, i),
      recordId: pick(anecdotalCreated, i).id,
      newValue: { note: `audit entry ${i + 1}` },
    })),
  });

  
  await prisma.studentReflection.createMany({
    data: Array.from({ length: 12 }, (_, i) => {
      const student = pick(students, i);
      return {
        studentId: student.id,
        termId: termFor(student.id).id,
        subjectId: pick(mathSubjects, i).id,
        prompt: 'What did you learn this term?',
        content: `Reflection ${i + 1}: I learned problem solving and better study habits.`,
      };
    }),
  });

  
  await prisma.reportCard.createMany({
    data: Array.from({ length: 12 }, (_, i) => {
      const student = pick(students, i);
      return {
        studentId: student.id,
        termId: termFor(student.id).id,
        source: pick(['system_generated', 'scanned_upload'] as const, i),
        fileUrl: null,
        status: pick(['pending', 'ready', 'released'] as const, i),
        generatedAt: i % 3 === 0 ? null : new Date(2026, 6, 5),
        scannedBy: null,
        managedBy: i % 3 === 1 ? recordKeeper.id : i % 3 === 2 ? registrar.id : null,
        releasedAt: i % 3 === 2 ? new Date(2026, 6, 20) : null,
      };
    }),
  });

  
  await prisma.notification.createMany({
    data: Array.from({ length: 12 }, (_, i) => ({
      recipientId: pick(students, i).id,
      sourceTable: pick(['anecdotal_records', 'referrals', 'final_grades', 'attendance_records'] as const, i),
      sourceRecordId: pick(anecdotalCreated, i).id,
      notificationType: pick(
        ['new_anecdotal_record', 'new_referral', 'grade_posted', 'attendance_alert', 'new_followup', 'record_flagged'] as const,
        i,
      ),
      title: `Demo notification ${i + 1}`,
      message: `Demo notification message ${i + 1}.`,
      isRead: i % 2 === 0,
      readAt: i % 2 === 0 ? new Date() : null,
    })),
  });

  const countTasks: Array<[string, () => Promise<number>]> = [
    ['users', () => prisma.user.count()],
    ['student_profiles', () => prisma.studentProfile.count()],
    ['parent_profiles', () => prisma.parentProfile.count()],
    ['parent_student_links', () => prisma.parentStudentLink.count()],
    ['staff_profiles', () => prisma.staffProfile.count()],
    ['refresh_tokens', () => prisma.refreshToken.count()],
    ['school_years', () => prisma.schoolYear.count()],
    ['terms', () => prisma.term.count()],
    ['sections', () => prisma.section.count()],
    ['subjects', () => prisma.subject.count()],
    ['teacher_subject_assignments', () => prisma.teacherSubjectAssignment.count()],
    ['adviser_access_requests', () => prisma.adviserAccessRequest.count()],
    ['anecdotal_records', () => prisma.anecdotalRecord.count()],
    ['anecdotal_record_followups', () => prisma.anecdotalRecordFollowup.count()],
    ['referrals', () => prisma.referral.count()],
    ['health_records', () => prisma.healthRecord.count()],
    ['home_visitation_records', () => prisma.homeVisitationRecord.count()],
    ['adm_learner_profiles', () => prisma.admLearnerProfile.count()],
    ['adm_parent_meetings', () => prisma.admParentMeeting.count()],
    ['adm_modules', () => prisma.admModule.count()],
    ['attendance_records', () => prisma.attendanceRecord.count()],
    ['grade_components', () => prisma.gradeComponent.count()],
    ['assessments', () => prisma.assessment.count()],
    ['student_grades', () => prisma.studentGrade.count()],
    ['final_grades', () => prisma.finalGrade.count()],
    ['student_risk_assessments', () => prisma.studentRiskAssessment.count()],
    ['record_flags', () => prisma.recordFlag.count()],
    ['audit_log', () => prisma.auditLog.count()],
    ['student_reflections', () => prisma.studentReflection.count()],
    ['report_cards', () => prisma.reportCard.count()],
    ['notifications', () => prisma.notification.count()],
  ];
  const counts: Array<[string, number]> = [];
  for (const [name, run] of countTasks) counts.push([name, await run()]);

  console.log('Demo dataset complete. Per-table counts:');
  for (const [name, count] of counts) console.log(`  ${name.padEnd(30)} ${count}`);
}

async function main() {
  const users: UserSeed[] = [
    { email: 'principal@zentra.edu', role: 'principal', firstName: 'Amelia', lastName: 'Principal', employeeId: 'EMP-0001' },
    { email: 'registrar@zentra.edu', role: 'registrar', firstName: 'Rita', lastName: 'Registrar', employeeId: 'EMP-0002' },
    { email: 'record.keeper@zentra.edu', role: 'record_keeper', firstName: 'Rex', lastName: 'Recordkeeper', employeeId: 'EMP-0003' },
    { email: 'adm@zentra.edu', role: 'adm_coordinator', firstName: 'Aaron', lastName: 'AdmCoord', employeeId: 'EMP-0004' },
    { email: 'counselor@zentra.edu', role: 'guidance_counselor', firstName: 'Gina', lastName: 'Counselor', employeeId: 'EMP-0005' },
    { email: 'nurse@zentra.edu', role: 'nurse', firstName: 'Nora', lastName: 'Nurse', employeeId: 'EMP-0006' },
    { email: 'teacher.jhs@zentra.edu', role: 'teacher', firstName: 'Tina', lastName: 'JhsTeacher', employeeId: 'EMP-0007' },
    { email: 'teacher.shs@zentra.edu', role: 'teacher', firstName: 'Tom', lastName: 'ShsTeacher', employeeId: 'EMP-0008' },
    { email: 'student.g7@zentra.edu', role: 'student', firstName: 'Ana', lastName: 'Gseven', lrn: '111111111111', gradeLevel: 'grade_7', sex: 'female', birthdate: '2013-03-12' },
    { email: 'student.g10@zentra.edu', role: 'student', firstName: 'Ben', lastName: 'Gten', lrn: '222222222222', gradeLevel: 'grade_10', sex: 'male', birthdate: '2010-05-20' },
    { email: 'student.g11@zentra.edu', role: 'student', firstName: 'Cara', lastName: 'Geleven', lrn: '333333333333', gradeLevel: 'grade_11', sex: 'female', birthdate: '2009-08-14' },
    { email: 'student.g12@zentra.edu', role: 'student', firstName: 'Drew', lastName: 'Gtwelve', lrn: '444444444444', gradeLevel: 'grade_12', sex: 'male', birthdate: '2008-01-15' },
    { email: 'parent.g7@zentra.edu', role: 'parent', firstName: 'Pam', lastName: 'ParentG7', relationship: 'mother' },
    { email: 'parent.g12@zentra.edu', role: 'parent', firstName: 'Paul', lastName: 'ParentG12', relationship: 'father' },
    { email: 'pending.student@zentra.edu', role: 'student', firstName: 'Pia', lastName: 'Pending', lrn: '555555555555', gradeLevel: 'grade_9', sex: 'female', accountStatus: 'pending', provisioningType: 'self_registered' },
    { email: 'pending.teacher@zentra.edu', role: 'teacher', firstName: 'Pat', lastName: 'PendingTeacher', employeeId: 'EMP-9999', accountStatus: 'pending', provisioningType: 'self_registered' },
  ];

  for (const u of users) {
    await seedUser(u);
  }

  const extraUsers: UserSeed[] = [
    { email: 'student.s1@zentra.edu', role: 'student', firstName: 'S1', lastName: 'StudentOne', lrn: '600000000001', gradeLevel: 'grade_7', sex: 'male', birthdate: '2013-04-01' },
    { email: 'student.s2@zentra.edu', role: 'student', firstName: 'S2', lastName: 'StudentTwo', lrn: '600000000002', gradeLevel: 'grade_8', sex: 'female', birthdate: '2012-06-11' },
    { email: 'student.s3@zentra.edu', role: 'student', firstName: 'S3', lastName: 'StudentThree', lrn: '600000000003', gradeLevel: 'grade_9', sex: 'male', birthdate: '2011-03-22' },
    { email: 'student.s4@zentra.edu', role: 'student', firstName: 'S4', lastName: 'StudentFour', lrn: '600000000004', gradeLevel: 'grade_10', sex: 'female', birthdate: '2010-09-05' },
    { email: 'student.s5@zentra.edu', role: 'student', firstName: 'S5', lastName: 'StudentFive', lrn: '600000000005', gradeLevel: 'grade_11', sex: 'male', birthdate: '2009-01-18' },
    { email: 'student.s6@zentra.edu', role: 'student', firstName: 'S6', lastName: 'StudentSix', lrn: '600000000006', gradeLevel: 'grade_12', sex: 'female', birthdate: '2008-07-29' },
    { email: 'student.s7@zentra.edu', role: 'student', firstName: 'S7', lastName: 'StudentSeven', lrn: '600000000007', gradeLevel: 'grade_7', sex: 'female', birthdate: '2013-11-02' },
    { email: 'student.s8@zentra.edu', role: 'student', firstName: 'S8', lastName: 'StudentEight', lrn: '600000000008', gradeLevel: 'grade_8', sex: 'male', birthdate: '2012-01-15' },
    { email: 'parent.p1@zentra.edu', role: 'parent', firstName: 'P1', lastName: 'ParentOne', relationship: 'mother' },
    { email: 'parent.p2@zentra.edu', role: 'parent', firstName: 'P2', lastName: 'ParentTwo', relationship: 'father' },
    { email: 'parent.p3@zentra.edu', role: 'parent', firstName: 'P3', lastName: 'ParentThree', relationship: 'guardian' },
    { email: 'parent.p4@zentra.edu', role: 'parent', firstName: 'P4', lastName: 'ParentFour', relationship: 'mother' },
    { email: 'parent.p5@zentra.edu', role: 'parent', firstName: 'P5', lastName: 'ParentFive', relationship: 'father' },
    { email: 'parent.p6@zentra.edu', role: 'parent', firstName: 'P6', lastName: 'ParentSix', relationship: 'guardian' },
    { email: 'parent.p7@zentra.edu', role: 'parent', firstName: 'P7', lastName: 'ParentSeven', relationship: 'mother' },
    { email: 'parent.p8@zentra.edu', role: 'parent', firstName: 'P8', lastName: 'ParentEight', relationship: 'father' },
    { email: 'parent.p9@zentra.edu', role: 'parent', firstName: 'P9', lastName: 'ParentNine', relationship: 'guardian' },
    { email: 'parent.p10@zentra.edu', role: 'parent', firstName: 'P10', lastName: 'ParentTen', relationship: 'mother' },
    { email: 'teacher2.jhs@zentra.edu', role: 'teacher', firstName: 'Uno', lastName: 'JhsTwo', employeeId: 'EMP-0010' },
    { email: 'teacher2.shs@zentra.edu', role: 'teacher', firstName: 'Dos', lastName: 'ShsTwo', employeeId: 'EMP-0011' },
  ];
  for (const u of extraUsers) {
    await seedUser(u);
  }

  await seedParents();

  const { sectionsByGrade, termMap } = await seedAcademicStructure();
  await seedTeacherAssignments(sectionsByGrade);
  await seedGradeComponents(termMap);
  await seedDemoData(sectionsByGrade, termMap);

  const count = await prisma.user.count();
  console.log(`Seed complete. ${count} user accounts, 6 sections, 24 subjects, 6 terms (3 per grade band).`);
  console.log(`All accounts use password: ${DEFAULT_PASSWORD}`);
  console.log('Pending accounts for approval testing: pending.student@zentra.edu (Grade 9, JHS), pending.teacher@zentra.edu');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
