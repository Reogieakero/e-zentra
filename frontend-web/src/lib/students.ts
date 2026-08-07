import { api } from "@/lib/api";
import { getTokens, getUser } from "@/lib/auth";
import useSWR from "swr";

export interface StudentRow {
  studentId: string;
  lrn: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  sex: string;
  gradeLevel: string;
  gradeLabel: string;
  sectionName: string | null;
  adviser: string | null;
  accountStatus: string;
  attendance: number | null;
  riskLevel: string | null;
  sf10: string;
  lastUpdated: string | null;
}

export interface StudentStats {
  total: number;
  active: number;
  newEnrollees: number;
  graduated: number;
  atRiskTotal: number;
  atRiskHigh: number;
  atRiskModerate: number;
}

export type StudentsPage = StudentsPageData;

export interface StudentsPageData {
  data: StudentRow[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  stats: StudentStats;
  filters: {
    years: Array<{ id: string; yearLabel: string }>;
    sections: Array<{ id: string; sectionName: string; gradeLevel: string; schoolYearId: string }>;
  };
}

export interface StudentQuery {
  page: number;
  pageSize: number;
  search?: string;
  grade?: string;
  sectionId?: string;
  schoolYearId?: string;
  status?: string;
}

export async function fetchStudents(query: StudentQuery): Promise<StudentsPage> {
  const token = getTokens()?.accessToken;
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  if (query.search) params.set("search", query.search);
  if (query.grade) params.set("grade", query.grade);
  if (query.sectionId) params.set("sectionId", query.sectionId);
  if (query.schoolYearId) params.set("schoolYearId", query.schoolYearId);
  if (query.status) params.set("status", query.status);
  return api<StudentsPage>(`/students?${params.toString()}`, { token });
}

export function useStudents(query: Omit<StudentQuery, "pageSize"> & { pageSize?: number }) {
  const userId = getUser()?.id ?? "anon";
  const pageSize = query.pageSize ?? 10;
  const key = userId === "anon" ? null : ["/students", userId, query.page, pageSize, query.search ?? "", query.grade ?? "", query.sectionId ?? "", query.schoolYearId ?? "", query.status ?? ""];
  const { data, error, isLoading, isValidating, mutate } = useSWR<StudentsPage>(
    key,
    () => fetchStudents({ ...query, page: query.page, pageSize }),
    { keepPreviousData: true, revalidateOnFocus: false }
  );
  return {
    data,
    error: error ?? null,
    isLoading,
    isValidating,
    refresh: () => mutate(),
  };
}

export interface StudentAcademicTerm {
  termLabel: string;
  grades: Array<{ subjectName: string; grade: number }>;
  average: number | null;
}

export interface StudentDetail {
  data: {
    studentId: string;
    lrn: string;
    email: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    fullName: string;
    phone: string | null;
    photoUrl: string | null;
    sex: string;
    birthdate: string | null;
    address: string | null;
    accountStatus: string;
    sectionName: string | null;
    gradeLevel: string;
    gradeLabel: string;
    schoolYear: string | null;
    adviserName: string | null;
    adviserPhone: string | null;
    parents: Array<{ name: string; phone: string | null }>;
    attendance: number | null;
    anecdotalCount: number;
    generalAverage: number | null;
    academicRecord: StudentAcademicTerm[];
    risk: {
      riskLevel: string;
      academicRisk: boolean;
      attendanceRisk: boolean;
      behavioralRisk: boolean;
      termLabel: string | null;
      computedAt: string | null;
    } | null;
    reportCard: { status: string; termLabel: string | null } | null;
    recentAttendance: Array<{ date: string; morning: string | null; afternoon: string | null }>;
    recentActivity: Array<{
      id: string;
      type: string;
      text: string;
      timestamp: string | null;
    }>;
  };
}
export type AcademicTerm = StudentDetail["data"]["academicRecord"][number];

export async function fetchStudentDetail(id: string): Promise<StudentDetail> {
  const token = getTokens()?.accessToken;
  return api<StudentDetail>(`/students/${id}`, { token });
}

export function useStudentDetail(id: string | null) {
  const userId = getUser()?.id ?? "anon";
  const key = userId !== "anon" && id ? ["/students/detail", userId, id] : null;
  const { data, error, isLoading } = useSWR<StudentDetail>(key, () => fetchStudentDetail(id!), {
    revalidateOnFocus: false,
  });
  return { data, error: error ?? null, isLoading };
}