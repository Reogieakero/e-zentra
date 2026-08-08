import { GradeLevel } from '@prisma/client';

export type Sf10Sort = 'last_updated' | 'name_az' | 'status';

export type Sf10StatusCode = 'complete' | 'pending' | 'missing';

export interface Sf10ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  grade?: GradeLevel;
  status?: 'complete' | 'pending' | 'missing';
  year?: string;
  sort?: Sf10Sort;
}

export interface Sf10Folder {
  gradeLevel: GradeLevel;
  label: string;
  count: number;
}

export interface Sf10SummaryCounts {
  total: number;
  complete: number;
  pending: number;
  missing: number;
  completePercent: number;
}

export interface Sf10Record {
  studentId: string;
  lrn: string;
  fullName: string;
  gradeLevel: GradeLevel;
  gradeLabel: string;
  sectionName: string | null;
  schoolYear: string;
  status: Sf10StatusCode;
  fileName: string;
  fileUrl: string | null;
  fileSizeBytes: number | null;
  handledBy: string | null;
  lastUpdated: string;
}

export interface Sf10SummaryData {
  schoolYear: string | null;
  folders: Sf10Folder[];
  counts: Sf10SummaryCounts;
  records: Sf10Record[];
  total: number;
  page: number;
  pageSize: number;
}