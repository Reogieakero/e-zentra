import fs from 'fs';
import { config } from '../../config/env';
import { ApiError } from '../../utils/ApiError';
import { OcrEngine, OcrEngineName, OcrExtractInput, OcrField, OcrGradeRow, OcrResult, OcrStudentMatch } from './types';
import { buildGradeRows, buildStudentMatch, computeOverallConfidence } from './ocrFields';

interface ServiceResponse {
  pageCount: number;
  studentMatch?: {
    rawLrn?: string;
    rawName?: string | null;
    confidence?: number;
  };
  fields?: Array<{ key: string; rawValue: string; confidence?: number; page?: number }>;
  gradeRows?: OcrGradeRow[];
  overallConfidence?: number;
  raw?: unknown;
}

export class HttpOcrEngine implements OcrEngine {
  readonly name: OcrEngineName;

  constructor(name: OcrEngineName) {
    this.name = name;
  }

  async extract(input: OcrExtractInput): Promise<OcrResult> {
    const serviceUrl = config.ocr.serviceUrl;
    if (!serviceUrl) {
      throw ApiError.internal('OCR_SERVICE_URL is not configured for the selected OCR engine');
    }
    if (!fs.existsSync(input.filePath)) {
      throw ApiError.internal(`OCR input file not found: ${input.filePath}`);
    }

    const fileBytes = fs.readFileSync(input.filePath);
    const body = new FormData();
    body.append('kind', input.kind);
    body.append('file', new Blob([fileBytes]), input.filePath.split(/[\\/]/).pop() ?? 'file.pdf');

    const headers: Record<string, string> = {};
    if (config.ocr.serviceToken) headers['Authorization'] = `Bearer ${config.ocr.serviceToken}`;

    let response: Response;
    try {
      response = await fetch(`${serviceUrl.replace(/\/$/, '')}/ocr`, { method: 'POST', headers, body });
    } catch (err) {
      throw ApiError.internal(`OCR service unreachable: ${(err as Error).message}`);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw ApiError.internal(`OCR service returned ${response.status}: ${text.slice(0, 300)}`);
    }

    const data = (await response.json()) as ServiceResponse;
    return this.normalize(data, input);
  }

  private normalize(data: ServiceResponse, input: OcrExtractInput): OcrResult {
    const fields: OcrField[] = (data.fields ?? []).map((f) => ({
      key: f.key,
      rawValue: f.rawValue,
      confidence: f.confidence ?? 0.9,
      page: f.page ?? 1,
    }));

    if (data.gradeRows && data.gradeRows.length > 0) {
      const studentMatch: OcrStudentMatch = {
        rawLrn: data.studentMatch?.rawLrn ?? '',
        rawName: data.studentMatch?.rawName ?? null,
        confidence: data.studentMatch?.confidence ?? 0.9,
        lrn: null,
        studentId: null,
      };
      const gradeRows = data.gradeRows.map((r) => ({
        ...r,
        rawGrade: r.rawGrade ?? '',
        remarks: r.remarks ?? null,
        valid: r.valid,
        issue: r.issue ?? null,
      }));
      const overallConfidence = data.overallConfidence ?? computeOverallConfidence(gradeRows, studentMatch.confidence);
      return {
        engine: this.name,
        pageCount: data.pageCount ?? 1,
        studentMatch,
        gradeRows,
        overallConfidence,
        raw: data.raw ?? data,
      };
    }

    const studentMatch = buildStudentMatch(fields);
    const subjectCodes = new Set(input.hints?.subjectCodes ?? []);
    const gradeRows = buildGradeRows(fields, subjectCodes);
    const overallConfidence = computeOverallConfidence(gradeRows, studentMatch.confidence);
    return {
      engine: this.name,
      pageCount: data.pageCount ?? 1,
      studentMatch,
      gradeRows,
      overallConfidence,
      raw: data.raw ?? data,
    };
  }
}
