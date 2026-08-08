"use client";

import { useSf10Summary, type Sf10Params } from "@/lib/dashboard";
import { Sf10Header } from "@/components/sf10/sf10-header";
import { Sf10Overview, Sf10OverviewLoading } from "@/components/sf10/sf10-overview";
import { Sf10Records, Sf10RecordsLoading } from "@/components/sf10/sf10-records";
import { Sf10Preview } from "@/components/sf10/sf10-preview";
import { Sf10PageError } from "@/components/sf10/sf10-states";
import { useEffect, useMemo, useState } from "react";
import styles from "@/components/sf10/sf10.module.css";

export const SF10_GRADE_OPTIONS = [
  { value: "all", label: "Grade: All Grades" },
  { value: "grade_7", label: "Grade: 7" },
  { value: "grade_8", label: "Grade: 8" },
  { value: "grade_9", label: "Grade: 9" },
  { value: "grade_10", label: "Grade: 10" },
  { value: "grade_11", label: "Grade: 11" },
  { value: "grade_12", label: "Grade: 12" },
];

export const SF10_STATUS_OPTIONS = [
  { value: "all", label: "Status: All" },
  { value: "complete", label: "Status: Complete" },
  { value: "pending", label: "Status: Pending" },
  { value: "missing", label: "Status: Missing" },
];

export const SF10_YEAR_OPTIONS = [
  { value: "all", label: "Year: 2025-2026" },
  { value: "2024-2025", label: "Year: 2024-2025" },
  { value: "2023-2024", label: "Year: 2023-2024" },
];

export const SF10_SORT_OPTIONS = [
  { value: "last_updated", label: "Sort: Last Updated" },
  { value: "name_az", label: "Sort: Name (A-Z)" },
  { value: "status", label: "Sort: Status" },
];

export default function Sf10Page() {
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("all");
  const [status, setStatus] = useState("all");
  const [year, setYear] = useState("all");
  const [sort, setSort] = useState("last_updated");
  const [page, setPage] = useState(1);
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo<Sf10Params>(
    () => ({
      search: debounced || undefined,
      grade: grade === "all" ? undefined : grade,
      status: status === "all" ? undefined : (status as Sf10Params["status"]),
      year: year === "all" ? undefined : year,
      sort,
      page,
      pageSize: 12,
    }),
    [debounced, grade, status, year, sort, page]
  );

  const { data, error, refresh, isValidating } = useSf10Summary(params);

  const selectedRecord = useMemo(
    () => data?.records.find((r) => r.studentId === selectedId) ?? null,
    [data, selectedId]
  );

  const handleFilter =
    (setter: (v: string) => void) =>
    (v: string) => {
      setter(v);
      setPage(1);
    };

  const goPage = (p: number) => {
    if (p < 1 || (data && p > Math.max(1, Math.ceil(data.total / (data.pageSize || 12))))) return;
    setPage(p);
  };

  if (error && !data) {
    return <Sf10PageError error={error} onRetry={refresh} />;
  }

  return (
    <div className={styles.page}>
      <Sf10Header schoolYear={data?.schoolYear ?? null} total={data?.counts.total ?? 0} />

      {!data ? (
        <Sf10OverviewLoading />
      ) : (
        <Sf10Overview
          folders={data.folders}
          counts={data.counts}
          schoolYear={data.schoolYear}
          activeGrade={grade}
          onGradeClick={handleFilter(setGrade)}
        />
      )}

      {!data ? (
        <Sf10RecordsLoading />
      ) : (
        <Sf10Records
          records={data.records}
          total={data.total}
          page={page}
          pageSize={data.pageSize}
          search={search}
          onSearchChange={setSearch}
          grade={grade}
          onGradeChange={handleFilter(setGrade)}
          status={status}
          onStatusChange={handleFilter(setStatus)}
          year={year}
          onYearChange={handleFilter(setYear)}
          sort={sort}
          onSortChange={handleFilter(setSort)}
          onPageChange={goPage}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          isValidating={isValidating}
        />
      )}

      {selectedRecord && <Sf10Preview record={selectedRecord} onClose={() => setSelectedId(null)} />}
    </div>
  );
}