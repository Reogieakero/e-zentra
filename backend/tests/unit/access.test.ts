import { isAdviserOrAssignedTeacher, isBandOwner, isPrincipal } from '../../src/utils/access';

describe('viewer access helpers', () => {
  it('resolves grade-band ownership', () => {
    expect(isBandOwner('record_keeper', 'grade_7')).toBe(true);
    expect(isBandOwner('record_keeper', 'grade_11')).toBe(false);
    expect(isBandOwner('registrar', 'grade_12')).toBe(true);
    expect(isBandOwner('principal', 'grade_10')).toBe(false);
  });

  it('recognizes the principal', () => {
    expect(isPrincipal({ id: 'p', role: 'principal' })).toBe(true);
    expect(isPrincipal({ id: 't', role: 'teacher' })).toBe(false);
  });

  it('recognizes adviser but not unrelated teachers', () => {
    const section = { id: 'sec', adviserId: 'teacher-a' };
    expect(isAdviserOrAssignedTeacher({ id: 'teacher-a', role: 'teacher' }, section)).toBe(true);
    expect(isAdviserOrAssignedTeacher({ id: 'teacher-b', role: 'teacher' }, section)).toBe(false);
    expect(isAdviserOrAssignedTeacher({ id: 'teacher-a', role: 'registrar' }, section)).toBe(false);
    expect(isAdviserOrAssignedTeacher({ id: 'teacher-b', role: 'teacher' }, { id: 'sec', adviserId: null })).toBe(false);
  });
});
