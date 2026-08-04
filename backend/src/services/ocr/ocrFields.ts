import { OcrField, OcrGradeRow, OcrStudentMatch } from './types';

const LRN_PATTERN = /^\d{12}$/;
export const GRADE_MIN = 60;
export const GRADE_MAX = 100;

export function cleanLrn(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, '');
  return LRN_PATTERN.test(digits) ? digits : null;
}

export function parseGrade(raw: string): number | null {
  const normalized = raw.trim().replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function buildStudentMatch(fields: OcrField[]): OcrStudentMatch {
  const lrnField = fields.find((f) => f.key === 'lrn');
  const nameField = fields.find((f) => f.key === 'student_name');
  const rawLrn = lrnField?.rawValue ?? '';
  const lrn = cleanLrn(rawLrn);
  return {
    rawLrn: rawLrn,
    rawName: nameField?.rawValue ?? null,
    confidence: Math.min(lrnField?.confidence ?? 1, nameField?.confidence ?? 1),
    lrn,
    studentId: null,
  };
}

export async function resolveStudentMatch(
  studentMatch: OcrStudentMatch,
  lrnLookup: (lrn: string) => Promise<string | null>
): Promise<OcrStudentMatch> {
  if (!studentMatch.lrn) return studentMatch;
  const studentId = await lrnLookup(studentMatch.lrn);
  return { ...studentMatch, studentId };
}

export function buildGradeRows(fields: OcrField[], subjectCodes: ReadonlySet<string>): OcrGradeRow[] {
  const gradeFields = fields.filter((f) => f.key.startsWith('grade:'));
  const rows: OcrGradeRow[] = [];

  for (const gf of gradeFields) {
    const subjectCode = gf.key.slice('grade:'.length);
    const remarksField = fields.find((f) => f.key === `remarks:${subjectCode}`);
    const rawGrade = gf.rawValue;
    const grade = parseGrade(rawGrade);

    let issue: string | null = null;
    if (!grade) issue = 'Could not parse a numeric grade';
    else if (grade < GRADE_MIN || grade > GRADE_MAX) issue = `Grade out of range (${GRADE_MIN}-${GRADE_MAX})`;
    if (!subjectCodes.has(subjectCode)) issue = issue ? `${issue}; unknown subject code` : `Unknown subject code '${subjectCode}'`;

    rows.push({
      subjectCode,
      grade,
      remarks: remarksField?.rawValue ?? null,
      confidence: Math.min(gf.confidence, remarksField?.confidence ?? 1),
      rawGrade,
      valid: issue === null,
      issue,
    });
  }

  return rows;
}

export function computeOverallConfidence(rows: OcrGradeRow[], studentConfidence: number): number {
  if (rows.length === 0) return studentConfidence;
  const minRow = Math.min(...rows.map((r) => r.confidence));
  return Math.min(studentConfidence, minRow);
}

export function isHighConfidence(overallConfidence: number, threshold: number): boolean {
  return overallConfidence >= threshold;
}
