import { computeFinalGrade, transmuteGrade } from '../../src/utils/gradeComputation';
import { gradeBandForGradeLevel, gradeBandOwner, gradeBandOwnedBy, canManageGradeLevel } from '../../src/utils/gradeBand';
import { redactSensitiveFields, viewerSeesSensitiveFields } from '../../src/utils/confidentiality';
import { buildCursorResult, buildOffsetResult, parseCursorPagination, parseOffsetPagination } from '../../src/utils/pagination';

describe('grade computation', () => {
  const weights = [
    { componentType: 'quiz' as const, weightPercentage: 30 },
    { componentType: 'performance_task' as const, weightPercentage: 50 },
    { componentType: 'exam' as const, weightPercentage: 20 },
  ];

  it('computes weighted initial grade and DepEd-transmuted grade', () => {
    const assessments = [
      { id: 'a1', componentType: 'quiz' as const, maxScore: 100 },
      { id: 'a2', componentType: 'performance_task' as const, maxScore: 50 },
      { id: 'a3', componentType: 'exam' as const, maxScore: 100 },
    ];
    const scores = [
      { assessmentId: 'a1', score: 80 },
      { assessmentId: 'a2', score: 40 },
      { assessmentId: 'a3', score: 70 },
    ];
    const result = computeFinalGrade(assessments, scores, weights);
    expect(result.quizAverage).toBe(80);
    expect(result.performanceTaskAverage).toBe(80);
    expect(result.examAverage).toBe(70);
    expect(result.initialGrade).toBe(78);
    expect(result.transmutedGrade).toBe(78);
    expect(result.remarks).toBe('passed');
  });

  it('marks incomplete when a component has no scores', () => {
    const assessments = [
      { id: 'a1', componentType: 'quiz' as const, maxScore: 100 },
      { id: 'a2', componentType: 'exam' as const, maxScore: 100 },
    ];
    const scores = [{ assessmentId: 'a1', score: 90 }];
    const result = computeFinalGrade(assessments, scores, weights);
    expect(result.performanceTaskAverage).toBeNull();
    expect(result.remarks).toBe('incomplete');
  });

  it('flags failure below 75 and transmutes per DepEd table', () => {
    expect(transmuteGrade(100)).toBe(100);
    expect(transmuteGrade(77)).toBe(77);
    expect(transmuteGrade(60)).toBe(67);
    expect(transmuteGrade(39)).toBe(60);
    expect(transmuteGrade(73)).toBe(74);
    const result = computeFinalGrade(
      [
        { id: 'a1', componentType: 'quiz' as const, maxScore: 100 },
        { id: 'a2', componentType: 'performance_task' as const, maxScore: 100 },
        { id: 'a3', componentType: 'exam' as const, maxScore: 100 },
      ],
      [
        { assessmentId: 'a1', score: 50 },
        { assessmentId: 'a2', score: 50 },
        { assessmentId: 'a3', score: 50 },
      ],
      weights
    );
    expect(result.initialGrade).toBe(50);
    expect(result.transmutedGrade).toBe(64);
    expect(result.remarks).toBe('failed');
  });
});

describe('grade band resolution', () => {
  it('maps grade levels to bands', () => {
    expect(gradeBandForGradeLevel('grade_7')).toBe('junior_high');
    expect(gradeBandForGradeLevel('grade_10')).toBe('junior_high');
    expect(gradeBandForGradeLevel('grade_11')).toBe('senior_high');
    expect(gradeBandForGradeLevel('grade_12')).toBe('senior_high');
  });

  it('assigns owners per band', () => {
    expect(gradeBandOwner('junior_high')).toBe('record_keeper');
    expect(gradeBandOwner('senior_high')).toBe('registrar');
  });

  it('cross-checks role against grade band', () => {
    expect(gradeBandOwnedBy('junior_high', 'record_keeper')).toBe(true);
    expect(gradeBandOwnedBy('junior_high', 'registrar')).toBe(false);
    expect(canManageGradeLevel('record_keeper', 'grade_9')).toBe(true);
    expect(canManageGradeLevel('record_keeper', 'grade_12')).toBe(false);
    expect(canManageGradeLevel('registrar', 'grade_12')).toBe(true);
  });
});

describe('confidentiality filtering', () => {
  it('staff always sees sensitive fields', () => {
    expect(viewerSeesSensitiveFields('confidential', { role: 'teacher', id: 'x' }, 'author')).toBe(true);
  });

  it('student/parent do not see confidential fields', () => {
    expect(viewerSeesSensitiveFields('confidential', { role: 'student', id: 'student' }, 'author')).toBe(false);
    expect(viewerSeesSensitiveFields('internal_staff', { role: 'parent', id: 'p' }, 'author')).toBe(false);
  });

  it('student/parent see parent_visible fields', () => {
    expect(viewerSeesSensitiveFields('parent_visible', { role: 'student', id: 's' }, 'author')).toBe(true);
  });

  it('redacts sensitive fields to null for student/parent', () => {
    const record = { id: 'r', status: 'pending', reason_for_referral: 'secret' };
    const redacted = redactSensitiveFields(
      record as Record<string, unknown>,
      'confidential',
      { role: 'parent', id: 'p' },
      'staff',
      ['reason_for_referral']
    );
    expect(redacted.status).toBe('pending');
    expect(redacted.reason_for_referral).toBeNull();
  });

  it('recursively redacts nested objects and arrays', () => {
    const record = {
      id: 'r',
      observerId: 'staff',
      incidentDescription: 'secret',
      followups: [
        { id: 'f1', followupNotes: 'still secret' },
        { id: 'f2', followupNotes: 'more secret' },
      ],
      nested: { deep: { incidentDescription: 'deep secret' } },
    };
    const redacted = redactSensitiveFields(
      record as Record<string, unknown>,
      'confidential',
      { role: 'parent', id: 'p' },
      'staff',
      ['incidentDescription', 'followupNotes']
    );
    expect(redacted.id).toBe('r');
    expect(redacted.incidentDescription).toBeNull();
    expect(redacted.followups).toEqual([
      { id: 'f1', followupNotes: null },
      { id: 'f2', followupNotes: null },
    ]);
    expect(redacted.nested).toEqual({ deep: { incidentDescription: null } });
  });

  it('does not mutate the original record when redacting', () => {
    const record = { reason: 'secret' };
    const redacted = redactSensitiveFields(record as Record<string, unknown>, 'confidential', { role: 'student', id: 's' }, 'staff', ['reason']);
    expect(redacted.reason).toBeNull();
    expect(record.reason).toBe('secret');
  });
});

describe('pagination helpers', () => {
  it('parses and clamps offset pagination', () => {
    expect(parseOffsetPagination({})).toMatchObject({ page: 1, pageSize: 20 });
    expect(parseOffsetPagination({ page: '2', pageSize: '500' })).toMatchObject({ page: 2, pageSize: 100 });
    const built = buildOffsetResult([1], 25, { page: 2, pageSize: 10, skip: 10, take: 10 });
    expect(built).toMatchObject({ page: 2, pageSize: 10, total: 25, hasMore: true });
  });

  it('computes cursors for cursor pagination', () => {
    const items = [{ id: 'a' }, { id: 'b' }];
    const result = buildCursorResult(items as never[], { take: 1 });
    expect(result.nextCursor).toBe('a');
    expect(result.hasMore).toBe(true);

    const last = buildCursorResult([{ id: 'a' }] as never[], { take: 1 });
    expect(last.nextCursor).toBeNull();
    expect(last.hasMore).toBe(false);
    expect(parseCursorPagination({ limit: '50' })).toMatchObject({ take: 50 });
  });
});
