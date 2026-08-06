import { api } from "@/lib/api";
import { getTokens, getUser } from "@/lib/auth";
import useSWR from "swr";

export interface DashboardStats {
  totalStudents: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  excusedToday: number;
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
  totalCount: number;
  rate: number;
  absentRate: number;
}

export interface DailyTrend {
  day: string;
  label: string;
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
}

export async function fetchDashboardOverview(): Promise<DashboardOverview> {
  const token = getTokens()?.accessToken;
  const { data } = await api<{ data: DashboardOverview }>("/dashboard/overview", { token });
  return data;
}

const REFRESH_INTERVAL_MS = 60_000;

export function useDashboardOverview() {
  const userId = getUser()?.id ?? "anon";
  const key = userId === "anon" ? null : ["/dashboard/overview", userId];

  const { data, error, isLoading, isValidating, mutate } = useSWR<DashboardOverview>(
    key,
    fetchDashboardOverview,
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
