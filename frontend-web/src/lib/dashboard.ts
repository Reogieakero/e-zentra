import { api } from "@/lib/api";
import { getTokens, getUser } from "@/lib/auth";
import useSWR from "swr";

export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  excusedToday: number;
  notLoggedToday: number;
  totalToday: number;
  presentRate: number;
  anecdotalThisMonth: number;
  sf10Count: number;
  admActive: number;
  admPending: number;
  atRiskCount: number;
  pendingActions: number;
}

export interface AtRiskStudent {
  studentId: string;
  firstName: string;
  lastName: string;
  sectionName: string | null;
  riskLevel: "high" | "moderate" | "low";
  attendanceRate: number | null;
  academicAvg: number | null;
  anecdoteCount: number;
}

export interface AdmApproval {
  id: string;
  studentName: string;
  sectionName: string;
  preparedBy: string;
  status: string;
}

export interface SectionAttendance {
  sectionId: string;
  sectionName: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  totalCount: number;
  rate: number;
  absentRate: number;
  lateRate: number;
  excusedRate: number;
}

export interface DailyTrend {
  day: string;
  label: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  notLogged: number;
  rate: number | null;
}

export interface HeatmapDay {
  day: string;
  label: string;
  rate: number;
  level: number;
}

export interface SectionHeatmap {
  sectionId: string;
  sectionName: string;
  days: HeatmapDay[];
}

export interface DashboardOverview {
  stats: DashboardStats;
  atRiskStudents: AtRiskStudent[];
  admForApproval: AdmApproval[];
  sectionAttendance: SectionAttendance[];
  dailyTrend: DailyTrend[];
  heatmap: SectionHeatmap[];
  schoolYear: string | null;
  term: string | null;
}

export async function fetchDashboardOverview(month?: string): Promise<DashboardOverview> {
  const token = getTokens()?.accessToken;
  const query = month ? `?month=${month}` : "";
  const { data } = await api<{ data: DashboardOverview }>(`/dashboard/overview${query}`, { token });
  return data;
}

const REFRESH_INTERVAL_MS = 60_000;

export function useDashboardOverview(month?: string) {
  const userId = getUser()?.id ?? "anon";
  const key = userId === "anon" ? null : ["/dashboard/overview", userId, month ?? "all"];

  const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardOverview>(
    key,
    () => fetchDashboardOverview(month),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: REFRESH_INTERVAL_MS,
      keepPreviousData: true,
    }
  );

  return {
    data,
    error: error ?? null,
    isLoading,
    isValidating,
    refresh: () => mutate(),
  };
}

export interface ReportSeriesPoint {
  key: string;
  shortLabel: string;
  label: string;
  year: number;
  month: number;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  notLogged: number;
  rate: number | null;
}

export interface ReportStatBlocks {
  averageRate: number;
  bestPeriod: { key: string; label: string; rate: number } | null;
  lowestPeriod: { key: string; label: string; rate: number } | null;
  periodsAboveTarget: number;
  periodsTracked: number;
}

export interface ReportGradeLevel {
  gradeLevel: string;
  label: string;
  presentCount: number;
  absentCount: number;
  totalCount: number;
  rate: number;
}

export interface AttendanceReport {
  schoolYear: string | null;
  term: string | null;
  targetRate: number;
  granularity: "monthly" | "daily";
  enrollmentTotal: number;
  series: ReportSeriesPoint[];
  statBlocks: ReportStatBlocks;
  gradeLevels: ReportGradeLevel[];
  insights: string[];
}

export interface ReportSection {
  id: string;
  sectionName: string;
}

export async function fetchAttendanceReport(
  token: string,
  view: "monthly" | "daily",
  grade?: string,
  section?: string
): Promise<AttendanceReport> {
  const params = new URLSearchParams({ view });
  if (grade && grade !== "all") params.set("grade", grade);
  if (section) params.set("section", section);
  const { data } = await api<{ data: AttendanceReport }>(`/dashboard/attendance/report?${params.toString()}`, { token });
  return data;
}

export async function fetchSectionsByGrade(token: string, gradeLevel: string): Promise<ReportSection[]> {
  return api<ReportSection[]>(`/dashboard/attendance/sections?grade=${gradeLevel}`, { token });
}

export function useAttendanceReport(view: "monthly" | "daily", grade: string = "all", section: string = "") {
  const userId = getUser()?.id ?? "anon";
  const key = ["/dashboard/attendance/report", userId, view, grade, section];
  const { data, error, isLoading } = useSWR<AttendanceReport>(
    key,
    async () => {
      const token = getTokens()?.accessToken;
      if (!token) throw new Error("Missing access token");
      return fetchAttendanceReport(token, view, grade, section);
    },
    {
      revalidateOnFocus: true,
      refreshInterval: 60_000,
    }
  );
  return { data, error: error ?? null, isLoading };
}

export function useSectionsByGrade(grade: string) {
  const userId = getUser()?.id ?? "anon";
  const enabled = Boolean(grade && grade !== "all");
  const key = enabled ? ["/dashboard/attendance/sections", userId, grade] : null;
  const { data, error, isLoading } = useSWR<ReportSection[]>(
    key,
    async () => {
      const token = getTokens()?.accessToken;
      if (!token) throw new Error("Missing access token");
      return fetchSectionsByGrade(token, grade);
    },
    { revalidateOnFocus: true }
  );
  return { data: data ?? [], error: error ?? null, isLoading: enabled && isLoading };
}

export interface AiRecommendationResult {
  ok: boolean;
  summary: string;
  recommendations: string[];
  model: string;
  reason?: string;
}

export interface TodayAttendance {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  presentRate: number;
}

export interface MonthlyTrendPoint {
  key: string;
  label: string;
  full?: string;
  total?: number;
  rate: number | null;
  present?: number;
  absent?: number;
  late?: number;
  excused?: number;
  notLogged?: number;
}

export interface HeatmapCell {
  key: string;
  label: string;
  rate: number;
  level: number;
}

export interface PerfectAttendanceRow {
  studentId: string;
  fullName: string;
  sectionName: string;
  gradeLabel: string;
  daysPresent: number;
  rate: number;
}

export interface LowAttendanceRow {
  studentId: string;
  fullName: string;
  sectionName: string;
  gradeLabel: string;
  rate: number;
  tone: "danger" | "warn";
}

export interface TopSection {
  sectionId: string;
  sectionName: string;
  gradeLabel: string;
  rate: number;
  studentCount: number;
}

export interface AttendanceSummary {
  schoolYear: string | null;
  totalEnrolled: number;
  today: TodayAttendance;
  monthlyTrend: MonthlyTrendPoint[];
  heatmap: HeatmapCell[];
  perfectAttendance: PerfectAttendanceRow[];
  lowAttendance: LowAttendanceRow[];
  topSections: TopSection[];
}

export async function fetchAttendanceSummary(
  view: "monthly" | "daily" = "monthly",
  grade: string = "all",
  section: string = ""
): Promise<AttendanceSummary> {
  const token = getTokens()?.accessToken;
  if (!token) throw new Error("Missing access token");
  const params = new URLSearchParams({ view });
  if (grade && grade !== "all") params.set("grade", grade);
  if (section) params.set("section", section);
  const { data } = await api<{ data: AttendanceSummary }>(
    `/dashboard/attendance/summary?${params.toString()}`,
    { token }
  );
  return data;
}

export function useAttendanceSummary(view: "monthly" | "daily" = "monthly", grade: string = "all", section: string = "") {
  const userId = getUser()?.id ?? "anon";
  const key =
    userId === "anon"
      ? null
      : ["/dashboard/attendance/summary", userId, view, grade, section];
  const { data, error, isLoading, isValidating, mutate } = useSWR<AttendanceSummary>(
    key,
    () => fetchAttendanceSummary(view, grade, section),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: REFRESH_INTERVAL_MS,
      keepPreviousData: true,
    }
  );
  return { data, error: error ?? null, isLoading, isValidating, refresh: () => mutate() };
}

export async function fetchAiRecommendations(
  view: "monthly" | "daily",
  grade?: string,
  section?: string
): Promise<AiRecommendationResult> {
  const params = new URLSearchParams({ view });
  if (grade && grade !== "all") params.set("grade", grade);
  if (section) params.set("section", section);
  const token = getTokens()?.accessToken;
  if (!token) throw new Error("Missing access token");
  return api<AiRecommendationResult>(`/dashboard/attendance/report/ai-recommendations?${params.toString()}`, { token });
}

export type Sf10StatusCode = "complete" | "pending" | "missing";

export interface Sf10Folder {
  gradeLevel: string;
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

export interface Sf10Summary {
  schoolYear: string | null;
  folders: Sf10Folder[];
  counts: Sf10SummaryCounts;
  records: Sf10Record[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Sf10Params {
  search?: string;
  grade?: string;
  status?: Sf10StatusCode;
  year?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchSf10Summary(params: Sf10Params): Promise<Sf10Summary> {
  const token = getTokens()?.accessToken;
  if (!token) throw new Error("Missing access token");
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.grade) qs.set("grade", params.grade);
  if (params.status) qs.set("status", params.status);
  if (params.year) qs.set("year", params.year);
  if (params.sort) qs.set("sort", params.sort);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const qstr = qs.toString();
  const { data } = await api<{ data: Sf10Summary }>(`/dashboard/sf10/summary${qstr ? `?${qstr}` : ""}`, { token });
  return data;
}

export function useSf10Summary(params: Sf10Params) {
  const userId = getUser()?.id ?? "anon";
  const key = userId === "anon" ? null : ["/dashboard/sf10/summary", userId, params];
  const { data, error, isLoading, isValidating, mutate } = useSWR<Sf10Summary>(
    key,
    () => fetchSf10Summary(params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      keepPreviousData: true,
    }
  );
  return { data, error: error ?? null, isLoading, isValidating, refresh: () => mutate() };
}
