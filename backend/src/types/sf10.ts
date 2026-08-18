import { GradeLevel } from '@prisma/client';

export type Sf10Sort = 'last_updated' | 'name_az' | 'status';

export type Sf10StatusCode = 'released' | 'missing';

export interface Sf10ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  grade?: GradeLevel;
  section?: string;
  status?: 'released' | 'missing';
  year?: string;
  sort?: Sf10Sort;
}

export interface Sf10Folder {
  gradeLevel: GradeLevel;
  label: string;
  count: number;
}

export interface Sf10Section {
  sectionId: string;
  sectionName: string;
  gradeLevel: GradeLevel;
  count: number;
}

export interface Sf10SummaryCounts {
  total: number;
  released: number;
  missing: number;
  releasedPercent: number;
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
  sections: Sf10Section[];
  counts: Sf10SummaryCounts;
  records: Sf10Record[];
  recentAttached: Sf10Record[];
  missingList: Sf10Record[];
  total: number;
  page: number;
  pageSize: number;
}