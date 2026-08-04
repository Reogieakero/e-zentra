export type OcrEngineName = 'fake' | 'paddle' | 'textract';

export interface OcrField {
  key: string;
  rawValue: string;
  confidence: number;
  page: number;
}

export interface OcrStudentMatch {
  rawLrn: string;
  rawName: string | null;
  confidence: number;
  lrn: string | null;
  studentId: string | null;
}

export interface OcrGradeRow {
  subjectCode: string;
  grade: number | null;
  remarks: string | null;
  confidence: number;
  rawGrade: string;
  valid: boolean;
  issue: string | null;
}

export interface OcrResult {
  engine: OcrEngineName;
  pageCount: number;
  studentMatch: OcrStudentMatch;
  gradeRows: OcrGradeRow[];
  overallConfidence: number;
  raw: unknown;
}

export interface OcrExtractInput {
  filePath: string;
  kind: string;
  hints?: {
    lrn?: string | null;
    studentName?: string | null;
    subjectCodes?: string[];
  };
}

export interface OcrEngine {
  readonly name: OcrEngineName;
  extract(input: OcrExtractInput): Promise<OcrResult>;
}
