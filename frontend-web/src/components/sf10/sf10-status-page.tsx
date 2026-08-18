"use client";

import { ChevronLeft } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSf10Summary, type Sf10Params, type Sf10StatusCode } from "@/lib/dashboard";
import { Sf10Records, Sf10RecordsLoading } from "./sf10-records";
import { Sf10Preview } from "./sf10-preview";
import { Sf10PageError } from "./sf10-states";
import styles from "./sf10-scope-page.module.css";

interface Sf10StatusPageProps {
  status: Sf10StatusCode;
  title: string;
  subtitle: string;
}

export function Sf10StatusPage({ status, title, subtitle }: Sf10StatusPageProps) {
  const router = useRouter();
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
      status,
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

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backChevron}
          aria-label="Back to SF10 records"
          onClick={() => router.push("/principal/sf10")}
        >
          <ChevronLeft size={16} />
        </button>
        <div className={styles.headerMain}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.subtitle}>{subtitle}</p>
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
        stats={[{ label: "Records", value: data.total }]}
        title={title}
        subtitle={subtitle}
      />

      {selectedRecord && <Sf10Preview record={selectedRecord} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

export function Sf10StatusPageLoading() {
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
      <div className={`${styles.skeleton} ${styles.skChevron}`} />
      <div className={styles.headerMain}>
        <div className={`${styles.skeleton} ${styles.skTitle}`} />
        <div className={`${styles.skeleton} ${styles.skSub}`} />
      </div>
    </header>
  );
}
