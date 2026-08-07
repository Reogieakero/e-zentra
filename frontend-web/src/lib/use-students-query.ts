import { useEffect, useRef, useState } from "react";
import { useStudents, useStudentDetail, type StudentDetail } from "@/lib/students";

export interface StudentsQuery {
  page: number;
  pageSize: number;
  search: string;
  grade: string;
  sectionId: string;
  schoolYearId: string;
  status: string;
}

export interface StudentsQueryState {
  search: string;
  setSearch: (v: string) => void;
  query: StudentsQuery;
  setFilter: (patch: Partial<StudentsQuery>) => void;
  setPage: (page: number) => void;
}

export function useStudentsQueryState() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState<StudentsQuery>({
    page: 1,
    pageSize: 10,
    search: "",
    grade: "all",
    sectionId: "",
    schoolYearId: "",
    status: "all",
  });
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const schoolYearInitialized = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setQuery((q) => ({ ...q, search }));
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, error, refresh } = useStudents({
    page: query.page,
    pageSize: query.pageSize,
    search: debounced,
    grade: query.grade === "all" ? undefined : query.grade,
    sectionId: query.sectionId || undefined,
    schoolYearId: query.schoolYearId || undefined,
    status: query.status === "all" ? undefined : query.status,
  });

  useEffect(() => {
    if (schoolYearInitialized.current) return;
    const activeYearId = data?.filters?.activeYearId;
    if (activeYearId) {
      schoolYearInitialized.current = true;
      // Sync once: default the year filter to the active school year after the first load.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery((q) => ({ ...q, schoolYearId: activeYearId, page: 1 }));
    }
  }, [data?.filters?.activeYearId]);

  const detail = useStudentDetail(selectedId);
  const selectedDetail: StudentDetail["data"] | undefined = detail.data?.data ?? undefined;

  const setFilter = (patch: Partial<StudentsQuery>) => setQuery((q) => ({ ...q, ...patch, page: 1 }));
  const setPage = (page: number) => setQuery((q) => ({ ...q, page }));

  const sections =
    data?.filters.sections.filter(
      (s) =>
        (query.grade === "all" || s.gradeLevel === query.grade) &&
        (!query.schoolYearId || s.schoolYearId === query.schoolYearId)
    ) ?? [];

  const totalCount = data?.total ?? 0;
  const pageSize = query.pageSize;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount === 0 ? 0 : (query.page - 1) * pageSize + 1;
  const to = Math.min(query.page * pageSize, totalCount);

  return {
    search,
    setSearch,
    query,
    setFilter,
    setPage,
    data,
    error,
    refresh,
    sections,
    stats: data?.stats,
    totalCount,
    totalPages,
    from,
    to,
    selectedId,
    setSelectedId,
    selectedDetail,
  };
}

export type StudentsQueryResult = ReturnType<typeof useStudentsQueryState>;