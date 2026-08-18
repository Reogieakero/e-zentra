"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSf10Summary, type Sf10Params } from "@/lib/dashboard";
import { Sf10Records, Sf10RecordsLoading } from "./sf10-records";
import { Sf10Preview } from "./sf10-preview";
import { Sf10PageError } from "./sf10-states";
import styles from "./sf10-scope-page.module.css";

interface Sf10ScopePageProps {
  grade: string;
  section?: string;
}

export function Sf10ScopePage({ grade, section }: Sf10ScopePageProps) {
  const [search, setSearch] = useState("");
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
      grade,
      section: section || undefined,
      sort: "last_updated",
      page,
      pageSize: 12,
    }),
    [debounced, grade, section, page]
  );

  const { data, error, refresh, isValidating } = useSf10Summary(params);

  const gradeLabel = useMemo(
    () => (data?.folders ?? []).find((f) => f.gradeLevel === grade)?.label ?? grade,
    [data, grade]
  );

  const selectedRecord = useMemo(
    () => data?.records.find((r) => r.studentId === selectedId) ?? null,
    [data, selectedId]
  );

  const goPage = (p: number) => {
    if (p < 1 || (data && p > Math.max(1, Math.ceil(data.total / (data.pageSize || 12))))) return;
    setPage(p);
  };

  const loading = !data && !error;

  if (loading) {
    return (
      <div className={styles.page}>
        <ScopeHeaderLoading />
        <Sf10RecordsLoading />
      </div>
    );
  }

  if (error || !data) {
    return <Sf10PageError error={error} onRetry={refresh} />;
  }

  const backHref = section ? `/principal/sf10/${grade}` : "/principal/sf10";
  const backLabel = section ? "All Sections" : "All Grades";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <Link href={backHref} className={styles.backLink}>
            <ArrowLeft className={styles.backIcon} />
            {backLabel}
          </Link>
          <h1 className={styles.title}>
            {gradeLabel}
            {section ? ` - ${section}` : ""}
          </h1>
          <p className={styles.subtitle}>
            {data.schoolYear ? `School Year ${data.schoolYear}` : "No active school year"}
          </p>
        </div>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{data.counts.total.toLocaleString()}</span>
            <span className={styles.statLabel}>Records</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{data.counts.released.toLocaleString()}</span>
            <span className={styles.statLabel}>Released</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{data.counts.missing.toLocaleString()}</span>
            <span className={styles.statLabel}>Missing</span>
          </div>
        </div>
      </header>

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
        title={section ? `${gradeLabel} - ${section} Records` : `${gradeLabel} Records`}
        subtitle="SF10 records for learners in this scope."
      />

      {selectedRecord && <Sf10Preview record={selectedRecord} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

export function Sf10ScopePageLoading() {
  return (
    <div className={styles.page}>
      <ScopeHeaderLoading />
      <Sf10RecordsLoading />
    </div>
  );
}

function ScopeHeaderLoading() {
  return (
    <header className={styles.header}>
      <div className={styles.headerMain}>
        <div className={`${styles.skeleton} ${styles.skBack}`} />
        <div className={`${styles.skeleton} ${styles.skTitle}`} />
        <div className={`${styles.skeleton} ${styles.skSub}`} />
      </div>
      <div className={styles.stats}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`${styles.skeleton} ${styles.skStat}`} />
        ))}
      </div>
    </header>
  );
}