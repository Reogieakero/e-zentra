import { OcrEngine, OcrExtractInput, OcrField, OcrGradeRow, OcrResult } from './types';
import { buildGradeRows, buildStudentMatch, computeOverallConfidence, resolveStudentMatch } from './ocrFields';

export interface FakeEngineData {
  lrn?: string;
  studentName?: string;
  grades?: Array<{ subjectCode: string; grade: number; remarks?: string | null }>;
  confidence?: number;
  unmatched?: boolean;
}

function makeFields(data: FakeEngineData, hints: OcrExtractInput['hints']): OcrField[] {
  const confidence = data.confidence ?? 0.99;
  const lrn = data.lrn ?? hints?.lrn ?? null;
  const name = data.studentName ?? hints?.studentName ?? null;

  const fields: OcrField[] = [];
  if (lrn) fields.push({ key: 'lrn', rawValue: lrn, confidence, page: 1 });
  if (name) fields.push({ key: 'student_name', rawValue: name, confidence, page: 1 });

  const grades = data.grades ?? (hints?.subjectCodes ?? []).map((subjectCode, i) => ({
    subjectCode,
    grade: 86 + (i % 12),
    remarks: 'Passed',
  }));

  for (const g of grades) {
    fields.push({ key: `grade:${g.subjectCode}`, rawValue: String(g.grade), confidence, page: 1 });
    if (g.remarks != null) {
      fields.push({ key: `remarks:${g.subjectCode}`, rawValue: g.remarks, confidence, page: 1 });
    }
  }
  return fields;
}

export class FakeEngine implements OcrEngine {
  readonly name = 'fake' as const;

  constructor(private readonly data: FakeEngineData = {}) {}

  async extract(input: OcrExtractInput): Promise<OcrResult> {
    const fields = makeFields(this.data, input.hints);
    const studentMatch = await resolveStudentMatch(buildStudentMatch(fields), async () => null);
    const gradeRows: OcrGradeRow[] = buildGradeRows(fields, new Set(input.hints?.subjectCodes ?? []));
    const overallConfidence = computeOverallConfidence(gradeRows, studentMatch.confidence);
    return {
      engine: this.name,
      pageCount: 1,
      studentMatch,
      gradeRows,
      overallConfidence,
      raw: { fake: true, fields },
    };
  }
}
