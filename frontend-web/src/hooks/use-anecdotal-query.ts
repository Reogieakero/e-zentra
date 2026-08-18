import { useEffect, useMemo, useState } from "react";
import {
  categoryList,
  deriveCategory,
  studentName,
  type AnecdotalCategory,
  type AnecdotalRecord,
} from "@/lib/anecdotal";

type StatKey = "positive" | "academic" | "behavioral" | "followup";

const CATEGORY_STAT_KEY: Record<AnecdotalCategory, StatKey> = {
  "Positive Behavior": "positive",
  Academic: "academic",
  "Behavioral Concern": "behavioral",
  "Needs Follow-up": "followup",
};

export interface AnecdotalQueryState {
  search: string;
  setSearch: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  records: AnecdotalRecord[];
  totalCount: number;
  totalPages: number;
  from: number;
  to: number;
  pageRecords: AnecdotalRecord[];
  stats: {
    total: number;
    positive: number;
    academic: number;
    behavioral: number;
    followup: number;
  };
  categoryCounts: Array<{ category: AnecdotalCategory; count: number }>;
  monthlyVolume: Array<{ key: string; label: string; total: number }>;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function useAnecdotalQueryState(records: AnecdotalRecord[]) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced, category]);

  const stats = useMemo(() => {
    const counts: Record<AnecdotalCategory, number> = {
      "Positive Behavior": 0,
      Academic: 0,
      "Behavioral Concern": 0,
      "Needs Follow-up": 0,
    };
    for (const r of records) {
      counts[deriveCategory(r)] += 1;
    }
    return {
      total: records.length,
      positive: counts["Positive Behavior"],
      academic: counts.Academic,
      behavioral: counts["Behavioral Concern"],
      followup: counts["Needs Follow-up"],
    };
  }, [records]);

  const categoryCounts = useMemo(
    () => categoryList().map((category) => ({ category, count: stats[CATEGORY_STAT_KEY[category]] })),
    [stats]
  );

  const monthlyVolume = useMemo(() => {
    const buckets = new Map<string, { key: string; label: string; total: number; ts: number }>();
    for (const r of records) {
      const d = new Date(r.observationDate);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.total += 1;
      } else {
        buckets.set(key, {
          key,
          label: MONTH_LABELS[d.getMonth()],
          total: 1,
          ts: d.getTime(),
        });
      }
    }
    return Array.from(buckets.values())
      .sort((a, b) => a.ts - b.ts)
      .map(({ key, label, total }) => ({ key, label, total }));
  }, [records]);

  const filtered = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    return records.filter((r) => {
      if (category !== "all" && deriveCategory(r) !== category) return false;
      if (!term) return true;
      const haystack = `${studentName(r.student)} ${r.section.sectionName} ${studentName(
        r.observer
      )} ${r.incidentDescription}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [records, debounced, category]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalCount);
  const pageRecords = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    search,
    setSearch,
    category,
    setCategory,
    page: safePage,
    setPage,
    pageSize,
    records: filtered,
    totalCount,
    totalPages,
    from,
    to,
    pageRecords,
    stats,
    categoryCounts,
    monthlyVolume,
  };
}
