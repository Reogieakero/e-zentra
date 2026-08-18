import { api } from "@/lib/api";
import { getTokens, getUser } from "@/lib/auth";
import useSWR from "swr";

export type AnecdotalCategory =
  | "Positive Behavior"
  | "Academic"
  | "Behavioral Concern"
  | "Needs Follow-up";

export interface AnecdotalFollowup {
  id: string;
  anecdotalRecordId: string;
  followedUpBy: string;
  followupDate: string;
  followupNotes: string;
  createdAt: string;
}

export interface AnecdotalPerson {
  id: string;
  firstName: string;
  lastName: string;
}

export interface AnecdotalSection {
  id: string;
  sectionName: string;
  gradeLevel: string;
}

export interface AnecdotalRecord {
  id: string;
  formReference: string;
  observerId: string;
  studentId: string;
  sectionId: string;
  termId: string;
  observationDate: string;
  observationTime: string | null;
  incidentDescription: string;
  locationSetting: string | null;
  notesRecommendationsActions: string | null;
  classPerformance: string | null;
  attendanceSummary: string | null;
  confidentialityLevel: string;
  createdAt: string;
  updatedAt: string;
  student: AnecdotalPerson;
  observer: AnecdotalPerson;
  section: AnecdotalSection;
  term: { id: string; termLabel: string } | null;
  followups: AnecdotalFollowup[];
}

export interface AnecdotalListResponse {
  data: AnecdotalRecord[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

export interface AnecdotalQuery {
  sectionId?: string;
  termId?: string;
}

const CATEGORY_ORDER: AnecdotalCategory[] = [
  "Positive Behavior",
  "Academic",
  "Behavioral Concern",
  "Needs Follow-up",
];

export const CATEGORY_META: Record<
  AnecdotalCategory,
  { color: string; tone: "brand" | "info" | "warning" | "danger" }
> = {
  "Positive Behavior": { color: "#16a34a", tone: "brand" },
  Academic: { color: "#38bdf8", tone: "info" },
  "Behavioral Concern": { color: "#fbbf24", tone: "warning" },
  "Needs Follow-up": { color: "#f87171", tone: "danger" },
};

export function deriveCategory(record: AnecdotalRecord): AnecdotalCategory {
  const text =
    `${record.incidentDescription} ${record.notesRecommendationsActions ?? ""} ${record.attendanceSummary ?? ""} ${record.classPerformance ?? ""}`.toLowerCase();
  if (
    /(disrupt|behavior|conduct|inappropriate|argument|fought|fight|bullying|defian|tardy|absent|skip|cheat|rude|disrespect|aggressive)/.test(
      text
    )
  ) {
    return "Behavioral Concern";
  }
  if (/(referral|guidance|counselor|follow.?up|monitor|check.?in|intervention|support plan)/.test(text)) {
    return "Needs Follow-up";
  }
  if (record.classPerformance) return "Academic";
  return "Positive Behavior";
}

export function studentName(person: AnecdotalPerson): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function categoryColor(category: AnecdotalCategory): string {
  return CATEGORY_META[category].color;
}

export function categoryTone(category: AnecdotalCategory): "brand" | "info" | "warning" | "danger" {
  return CATEGORY_META[category].tone;
}

export function categoryList(): AnecdotalCategory[] {
  return CATEGORY_ORDER;
}

async function fetchAnecdotalPage(
  token: string,
  page: number,
  pageSize: number,
  query: AnecdotalQuery
): Promise<AnecdotalListResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (query.sectionId) params.set("sectionId", query.sectionId);
  if (query.termId) params.set("termId", query.termId);
  return api<AnecdotalListResponse>(`/anecdotal-records?${params.toString()}`, { token });
}

export async function fetchAllAnecdotalRecords(
  token: string,
  query: AnecdotalQuery = {}
): Promise<AnecdotalListResponse> {
  const pageSize = 100;
  const records: AnecdotalRecord[] = [];
  let page = 1;
  let total = 0;
  while (true) {
    const res = await fetchAnecdotalPage(token, page, pageSize, query);
    total = res.total;
    records.push(...res.data);
    if (!res.hasMore || records.length > 2000) break;
    page += 1;
  }
  return { data: records, page: 1, pageSize: records.length || 1, total, hasMore: false };
}

export async function fetchAnecdotalRecord(id: string): Promise<AnecdotalRecord> {
  const token = getTokens()?.accessToken;
  if (!token) throw new Error("Missing access token");
  const { data } = await api<{ data: AnecdotalRecord }>(`/anecdotal-records/${id}`, { token });
  return data;
}

export function useAnecdotalRecords(query: AnecdotalQuery = {}) {
  const userId = getUser()?.id ?? "anon";
  const key =
    userId === "anon"
      ? null
      : ["/anecdotal-records/all", userId, query.sectionId ?? "", query.termId ?? ""];
  const { data, error, isLoading, isValidating, mutate } = useSWR<AnecdotalListResponse>(
    key,
    () => {
      const token = getTokens()?.accessToken;
      if (!token) throw new Error("Missing access token");
      return fetchAllAnecdotalRecords(token, query);
    },
    { revalidateOnFocus: false, keepPreviousData: true }
  );
  return {
    data,
    error: error ?? null,
    isLoading,
    isValidating,
    refresh: () => mutate(),
  };
}

export function useAnecdotalRecord(id: string | null) {
  const userId = getUser()?.id ?? "anon";
  const key = id && userId !== "anon" ? ["/anecdotal-records/detail", userId, id] : null;
  const { data, error, isLoading } = useSWR<AnecdotalRecord>(
    key,
    () => fetchAnecdotalRecord(id!),
    { revalidateOnFocus: false }
  );
  return { data, error: error ?? null, isLoading };
}

export function exportAnecdotalCsv(
  records: AnecdotalRecord[],
  filename = "anecdotal-records.csv"
): void {
  const header = [
    "Student",
    "Grade & Section",
    "Date",
    "Category",
    "Adviser",
    "Observation Note",
  ];
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = records.map((r) => [
    studentName(r.student),
    `${r.section.gradeLevel} – ${r.section.sectionName}`,
    new Date(r.observationDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    deriveCategory(r),
    studentName(r.observer),
    r.incidentDescription,
  ]);
  const csv = [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
