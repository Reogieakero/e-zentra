"use client";

import StudentsHeader from "@/components/students/students-header";
import StudentsStats, { StudentsStatsLoading } from "@/components/students/students-stats";
import StudentsToolbar from "@/components/students/students-toolbar";
import StudentsTable from "@/components/students/students-table";
import StudentsPagination from "@/components/students/students-pagination";
import { StudentsEmpty, StudentsError, StudentsTableLoading } from "@/components/students/students-states";
import StudentDrawer from "@/components/students/students-drawer";
import { useStudentsQueryState } from "@/hooks/use-students-query";
import styles from "./students.module.css";

export default function StudentsPage() {
  const {
    search,
    setSearch,
    query,
    setFilter,
    setPage,
    data,
    error,
    refresh,
    sections,
    stats,
    totalCount,
    totalPages,
    from,
    to,
    selectedId,
    setSelectedId,
    selectedDetail,
  } = useStudentsQueryState();

  if (error && !data) {
    return <StudentsError error={error} onRetry={refresh} />;
  }

  return (
    <>
      <StudentsHeader />

      {!data ? <StudentsStatsLoading cards={4} /> : <StudentsStats stats={stats} />}

      {data ? (
        <div className={styles.card}>
          <StudentsToolbar
            search={search}
            onSearchChange={setSearch}
            query={query}
            sections={sections}
            years={data.filters.years}
            onFilterChange={setFilter}
          />

          {data.data.length === 0 ? (
            <StudentsEmpty />
          ) : (
            <>
              <StudentsTable page={data} onSelect={setSelectedId} />
              {data.data.length > 0 && (
                <StudentsPagination
                  page={query.page}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  from={from}
                  to={to}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      ) : (
        <StudentsTableLoading />
      )}

      {selectedId && <StudentDrawer student={selectedDetail} onClose={() => setSelectedId(null)} />}
    </>
  );
}