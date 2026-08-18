"use client";

import { useRouter } from "next/navigation";
import { useSf10Summary, type Sf10Params } from "@/lib/dashboard";
import { Sf10Header, Sf10HeaderLoading } from "@/components/sf10/sf10-header";
import { Sf10Overview, Sf10OverviewLoading } from "@/components/sf10/sf10-overview";
import { Sf10Records, Sf10RecordsLoading } from "@/components/sf10/sf10-records";
import { Sf10Preview } from "@/components/sf10/sf10-preview";
import { Sf10SectionsModal } from "@/components/sf10/sf10-sections-modal";
import { Sf10PageError } from "@/components/sf10/sf10-states";
import { useEffect, useMemo, useState } from "react";
import styles from "@/components/sf10/sf10-page.module.css";

export default function Sf10Page() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [debounced, setDebounced] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openSectionsFor, setOpenSectionsFor] = useState<string | null>(null);

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
      status: status === "all" ? undefined : (status as Sf10Params["status"]),
      sort: "last_updated",
      page,
      pageSize: 12,
    }),
    [debounced, status, page]
  );

  const { data, error, refresh, isValidating } = useSf10Summary(params);

  const selectedRecord = useMemo(
    () => data?.records.find((r) => r.studentId === selectedId) ?? null,
    [data, selectedId]
  );

  const activeFolder = useMemo(
    () => (data?.folders ?? []).find((f) => f.gradeLevel === openSectionsFor) ?? null,
    [data, openSectionsFor]
  );

  const handleFilter =
    (setter: (v: string) => void) =>
    (v: string) => {
      setter(v);
      setPage(1);
    };

  const openSections = (sectionId: string) => {
    if (!activeFolder || !data) return;
    setOpenSectionsFor(null);
    if (sectionId === "all") {
      router.push(`/principal/sf10/${activeFolder.gradeLevel}`);
      return;
    }
    const section = data.sections.find(
      (s) => s.sectionId === sectionId && s.gradeLevel === activeFolder.gradeLevel
    );
    if (section) {
      router.push(`/principal/sf10/${activeFolder.gradeLevel}/${encodeURIComponent(section.sectionName)}`);
    }
  };

  const goPage = (p: number) => {
    if (p < 1 || (data && p > Math.max(1, Math.ceil(data.total / (data.pageSize || 12))))) return;
    setPage(p);
  };

  const loading = !data && !error;

  if (loading) {
    return (
      <div className={styles.page}>
        <Sf10HeaderLoading />
        <Sf10OverviewLoading />
        <Sf10RecordsLoading />
      </div>
    );
  }

  if (error || !data) {
    return <Sf10PageError error={error} onRetry={refresh} />;
  }

  return (
    <div className={styles.page}>
      <Sf10Header schoolYear={data.schoolYear} total={data.counts.total} />

      <Sf10Overview
        folders={data.folders}
        counts={data.counts}
        recentAttached={data.recentAttached}
        missingList={data.missingList}
        schoolYear={data.schoolYear}
        onGradeClick={(g) => setOpenSectionsFor(g)}
        onShowMissing={() => handleFilter(setStatus)("missing")}
      />

      <Sf10Records
        records={data.records}
        total={data.total}
        page={page}
        pageSize={data.pageSize}
        search={search}
        onSearchChange={setSearch}
        onPageChange={goPage}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId(id)}
        isValidating={isValidating}
      />

      {selectedRecord && <Sf10Preview record={selectedRecord} onClose={() => setSelectedId(null)} />}

      {activeFolder && (
        <Sf10SectionsModal
          open={!!openSectionsFor}
          gradeLabel={activeFolder.label}
          sections={data.sections.filter((s) => s.gradeLevel === activeFolder.gradeLevel)}
          onSelect={openSections}
          onClose={() => setOpenSectionsFor(null)}
        />
      )}
    </div>
  );
}