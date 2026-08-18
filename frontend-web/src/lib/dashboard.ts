import { useEffect } from "react";
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
  present: number;
  total: number;
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
  averagePresentPerDay: number;
  presentTotal: number;
  trackedSchoolDays: number;
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

export interface NeedsAttentionStudent {
  studentId: string;
  lrn: string;
  fullName: string;
  sectionId: string;
  sectionName: string;
  gradeLabel: string;
  adviserId?: string | null;
  adviserName?: string | null;
  present: number;
  late: number;
  absent: number;
  excused: number;
  notLogged: number;
  total: number;
  rate: number;
  tone: "danger" | "warn";
}

export interface NeedsAttentionReport {
  schoolYear: string | null;
  totalFlagged: number;
  dangerCount: number;
  warnCount: number;
  rows: NeedsAttentionStudent[];
}

export async function fetchNeedsAttention(
  grade?: string,
  section?: string
): Promise<NeedsAttentionReport> {
  const token = getTokens()?.accessToken;
  if (!token) throw new Error("Missing access token");
  const params = new URLSearchParams();
  if (grade && grade !== "all") params.set("grade", grade);
  if (section) params.set("section", section);
  const qstr = params.toString();
  const { data } = await api<{ data: NeedsAttentionReport }>(
    `/dashboard/attendance/needs-attention${qstr ? `?${qstr}` : ""}`,
    { token }
  );
  return data;
}

export function useNeedsAttention(grade: string = "all", section: string = "") {
  const userId = getUser()?.id ?? "anon";
  const key = userId === "anon" ? null : ["/dashboard/attendance/needs-attention", userId, grade, section];
  const { data, error, isLoading, isValidating, mutate } = useSWR<NeedsAttentionReport>(
    key,
    () => fetchNeedsAttention(grade, section),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      keepPreviousData: true,
    }
  );
  return { data, error: error ?? null, isLoading, isValidating, refresh: () => mutate() };
}

export interface AdviserAlert {
  id: string;
  studentId: string;
  studentName: string;
  lrn: string;
  sectionName: string;
  gradeLabel: string;
  adviserName?: string;
  status: "pending" | "acknowledged" | "commented";
  note: string | null;
  rate: number;
  tone: "danger" | "warn";
  issuedById: string;
  issuedByName: string;
  acknowledgedAt: string | null;
  createdAt: string;
}

export interface AdviserAlertAdviser {
  id: string;
  name: string;
  sectionName: string;
  sectionId: string;
}

export interface AdviserAlertSendResult {
  created: number;
  notified: number;
  skippedNoAdviser: number;
  total: number;
  advisers: AdviserAlertAdviser[];
  alerts: AdviserAlert[];
}

export async function fetchAdviserAlerts(grade?: string, section?: string): Promise<AdviserAlert[]> {
  const token = getTokens()?.accessToken;
  if (!token) throw new Error("Missing access token");
  const params = new URLSearchParams();
  if (grade && grade !== "all") params.set("grade", grade);
  if (section) params.set("section", section);
  const qstr = params.toString();
  const { data } = await api<{ data: AdviserAlert[] }>(
    `/dashboard/attendance/needs-attention/alerts${qstr ? `?${qstr}` : ""}`,
    { token }
  );
  return data;
}

export async function sendAdviserAlerts(payload: {
  grade?: string;
  section?: string;
  tone?: "danger" | "warn" | "all";
}): Promise<AdviserAlertSendResult> {
  const token = getTokens()?.accessToken;
  if (!token) throw new Error("Missing access token");
  const { data } = await api<{ data: AdviserAlertSendResult }>(
    "/dashboard/attendance/needs-attention/alerts",
    { token, method: "POST", body: payload }
  );
  return data;
}

export function useAdviserAlerts(grade: string = "all", section: string = "") {
  const userId = getUser()?.id ?? "anon";
  const key = userId === "anon" ? null : ["/dashboard/attendance/needs-attention/alerts", userId, grade, section];
  const { data, error, isLoading, mutate } = useSWR<AdviserAlert[]>(
    key,
    () => fetchAdviserAlerts(grade, section),
    { revalidateOnFocus: true, keepPreviousData: true }
  );
  return { data: data ?? [], error: error ?? null, isLoading, refresh: () => mutate() };
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

export interface SectionRosterStudent {
  studentId: string;
  lrn: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  gradeLabel: string;
  sectionName: string | null;
  present: number;
  late: number;
  absent: number;
  excused: number;
  notLogged: number;
  total: number;
  rate: number | null;
}

async function fetchSectionRoster(token: string, sectionId: string): Promise<SectionRosterStudent[]> {
  const { data } = await api<{ data: SectionRosterStudent[] }>(
    `/dashboard/attendance/section/${sectionId}/students`,
    { token }
  );
  return data;
}

export function useSectionRoster(sectionId: string) {
  const userId = getUser()?.id ?? "anon";
  const enabled = Boolean(sectionId);
  const key = enabled ? ["/dashboard/attendance/section/students", userId, sectionId] : null;
  const { data, error, isLoading } = useSWR<SectionRosterStudent[]>(
    key,
    async () => {
      const token = getTokens()?.accessToken;
      if (!token) throw new Error("Missing access token");
      return fetchSectionRoster(token, sectionId);
    },
    { revalidateOnFocus: true }
  );
  return { data: data ?? [], error: error ?? null, isLoading: enabled && isLoading };
}

export interface StudentAttendanceTrendPoint {
  month: string;
  label: string;
  full: string;
  present: number;
  late: number;
  absent: number;
  excused: number;
  logged: number;
  notLogged: number;
  rate: number | null;
}

async function fetchStudentAttendanceTrend(token: string, studentId: string): Promise<StudentAttendanceTrendPoint[]> {
  const { data } = await api<{ data: StudentAttendanceTrendPoint[] }>(
    `/dashboard/attendance/student/${studentId}/trend`,
    { token }
  );
  return data;
}

export function useStudentAttendanceTrend(studentId: string | null) {
  const userId = getUser()?.id ?? "anon";
  const key = studentId && userId !== "anon" ? ["/dashboard/attendance/student/trend", userId, studentId] : null;
  const { data, error, isLoading } = useSWR<StudentAttendanceTrendPoint[]>(
    key,
    async () => {
      const token = getTokens()?.accessToken;
      if (!token) throw new Error("Missing access token");
      return fetchStudentAttendanceTrend(token, studentId!);
    },
    { revalidateOnFocus: false }
  );
  return { data: data ?? [], error: error ?? null, isLoading: key ? isLoading : false };
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
  notLogged: number;
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
  present: number;
  total: number;
  rate: number;
  level: number;
}

export interface PerfectAttendanceRow {
  studentId: string;
  fullName: string;
  sectionName: string;
  gradeLabel: string;
  daysPresent: number;
  totalSchoolDays: number;
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
  adviserName: string | null;
  rate: number;
  studentCount: number;
  avgPresent: number;
}

export type AllSectionsRow = TopSection;

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
  section: string = "",
  date?: string
): Promise<AttendanceSummary> {
  const token = getTokens()?.accessToken;
  if (!token) throw new Error("Missing access token");
  const params = new URLSearchParams({ view });
  if (grade && grade !== "all") params.set("grade", grade);
  if (section) params.set("section", section);
  if (date) params.set("date", date);
  const { data } = await api<{ data: AttendanceSummary }>(
    `/dashboard/attendance/summary?${params.toString()}`,
    { token }
  );
  return data;
}

export function useAttendanceSummary(view: "monthly" | "daily" = "monthly", grade: string = "all", section: string = "", date?: string) {
  const userId = getUser()?.id ?? "anon";
  const key =
    userId === "anon"
      ? null
      : ["/dashboard/attendance/summary", userId, view, grade, section, date ?? "today"];
  const storageKey = key ? `zentra:attendance:summary:v4:${key.slice(1).join("|")}` : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR<AttendanceSummary>(
    key,
    () => fetchAttendanceSummary(view, grade, section, date),
    {
      onSuccess: (data) => {
        if (!storageKey) return;
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(data));
        } catch {
        }
      },
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: REFRESH_INTERVAL_MS,
      keepPreviousData: true,
    }
  );

  useEffect(() => {
    if (!storageKey) return;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(storageKey);
    } catch {
      return;
    }
    if (!raw) return;
    let parsed: AttendanceSummary;
    try {
      parsed = JSON.parse(raw) as AttendanceSummary;
    } catch {
      return;
    }
    mutate(parsed, { revalidate: false });
  }, [storageKey, mutate]);

  return { data, error: error ?? null, isLoading, isValidating, refresh: () => mutate() };
}

export async function fetchAllSectionsAttendance(): Promise<AllSectionsRow[]> {
  const token = getTokens()?.accessToken;
  if (!token) throw new Error("Missing access token");
  const { data } = await api<{ data: AllSectionsRow[] }>("/dashboard/attendance/all-sections", { token });
  return data;
}

export function useAllSectionsAttendance() {
  const userId = getUser()?.id ?? "anon";
  const key = userId === "anon" ? null : ["/dashboard/attendance/all-sections", userId];
  const storageKey = key ? `zentra:attendance:all-sections:v2:${key.slice(1).join("|")}` : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR<AllSectionsRow[]>(
    key,
    () => fetchAllSectionsAttendance(),
    {
      onSuccess: (data) => {
        if (!storageKey) return;
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(data));
        } catch {
        }
      },
      revalidateOnFocus: true,
      keepPreviousData: true,
    }
  );

  useEffect(() => {
    if (!storageKey) return;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(storageKey);
    } catch {
      return;
    }
    if (!raw) return;
    let parsed: AllSectionsRow[];
    try {
      parsed = JSON.parse(raw) as AllSectionsRow[];
    } catch {
      return;
    }
    mutate(parsed, { revalidate: false });
  }, [storageKey, mutate]);

  return { data: data ?? [], error: error ?? null, isLoading, isValidating, refresh: () => mutate() };
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

export type Sf10StatusCode = "released" | "ready" | "missing";

export interface Sf10Folder {
  gradeLevel: string;
  label: string;
  count: number;
}

export interface Sf10Section {
  sectionId: string;
  sectionName: string;
  gradeLevel: string;
  count: number;
  adviserName: string | null;
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
  sections: Sf10Section[];
  counts: Sf10SummaryCounts;
  records: Sf10Record[];
  recentAttached: Sf10Record[];
  readyList: Sf10Record[];
  missingList: Sf10Record[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Sf10Params {
  search?: string;
  grade?: string;
  section?: string;
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
  if (params.section) qs.set("section", params.section);
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

export interface Sf10AuditEntry {
  id: string;
  action: string;
  actor: { id: string; fullName: string; role: string } | null;
  student: {
    id: string;
    fullName: string;
    lrn: string;
    gradeLabel: string;
    sectionName: string | null;
  } | null;
  termLabel: string | null;
  fileName: string | null;
  fileUrl: string | null;
  detail: Record<string, unknown> | null;
  createdAt: string;
}

export interface Sf10AuditTrail {
  entries: Sf10AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Sf10AuditParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function fetchSf10AuditTrail(params: Sf10AuditParams): Promise<Sf10AuditTrail> {
  const token = getTokens()?.accessToken;
  if (!token) throw new Error("Missing access token");
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("pageSize", String(params.pageSize));
  const qstr = qs.toString();
  const { data } = await api<{ data: Sf10AuditTrail }>(
    `/dashboard/sf10/audit-trail${qstr ? `?${qstr}` : ""}`,
    { token }
  );
  return data;
}

export function useSf10AuditTrail(params: Sf10AuditParams) {
  const userId = getUser()?.id ?? "anon";
  const key = userId === "anon" ? null : ["/dashboard/sf10/audit-trail", userId, params];
  const { data, error, isLoading, isValidating, mutate } = useSWR<Sf10AuditTrail>(
    key,
    () => fetchSf10AuditTrail(params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      keepPreviousData: true,
    }
  );
  return { data, error: error ?? null, isLoading, isValidating, refresh: () => mutate() };
}
