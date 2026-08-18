"use client";

import { useState } from "react";
import AnecdotalHeader from "@/components/anecdotal/anecdotal-header";
import AnecdotalNotice from "@/components/anecdotal/anecdotal-notice";
import AnecdotalStats, { AnecdotalStatsLoading } from "@/components/anecdotal/anecdotal-stats";
import AnecdotalCategoryBreakdown from "@/components/anecdotal/anecdotal-category-breakdown";
import AnecdotalVolumeChart from "@/components/anecdotal/anecdotal-volume-chart";
import AnecdotalTable from "@/components/anecdotal/anecdotal-table";
import AnecdotalToolbar from "@/components/anecdotal/anecdotal-toolbar";
import AnecdotalDrawer from "@/components/anecdotal/anecdotal-drawer";
import {
  AnecdotalEmpty,
  AnecdotalError,
  AnecdotalTableLoading,
} from "@/components/anecdotal/anecdotal-states";
import { TablePagination } from "@/components/ui/table-pagination";
import { useAnecdotalRecords, exportAnecdotalCsv, type AnecdotalRecord } from "@/lib/anecdotal";
import { useAnecdotalQueryState } from "@/hooks/use-anecdotal-query";
import styles from "./page.module.css";

export default function AnecdotalPage() {
  const { data, error, isLoading, refresh } = useAnecdotalRecords({});
  const [selected, setSelected] = useState<AnecdotalRecord | null>(null);

  const query = useAnecdotalQueryState(data?.data ?? []);

  const loading = isLoading && !data;

  if (error && !data) {
    return <AnecdotalError error={error} onRetry={refresh} />;
  }

  return (
    <>
      <AnecdotalHeader />

      <AnecdotalNotice />

      {loading ? (
        <AnecdotalStatsLoading cards={4} />
      ) : (
        <AnecdotalStats stats={query.stats} />
      )}

      <div className={styles.analyticsGrid}>
        {loading ? (
          <div className={styles.cardSkeleton} />
        ) : (
          <div className={styles.breakdownCol}>
            <AnecdotalCategoryBreakdown data={query.categoryCounts} total={query.stats.total} />
          </div>
        )}
        {loading ? (
          <div className={styles.cardSkeleton} />
        ) : (
          <div className={styles.volumeCol}>
            <AnecdotalVolumeChart data={query.monthlyVolume} />
          </div>
        )}
      </div>

      <section className={styles.tableCard}>
        <div className={styles.tableHead}>
          <div>
            <h4 className={styles.tableTitle}>Recent Anecdotal Records</h4>
            <p className={styles.tableSubtitle}>Submitted by class advisers · view only</p>
          </div>
          <span className={styles.totalBadge}>{query.stats.total} total</span>
        </div>

        <AnecdotalToolbar
          search={query.search}
          onSearchChange={query.setSearch}
          category={query.category}
          onCategoryChange={query.setCategory}
        />

        {loading ? (
          <AnecdotalTableLoading />
        ) : query.pageRecords.length === 0 ? (
          <AnecdotalEmpty />
        ) : (
          <>
            <AnecdotalTable records={query.pageRecords} onSelect={setSelected} />
            <TablePagination
              page={query.page - 1}
              pageCount={query.totalPages}
              info={
                query.totalCount > 0
                  ? `Showing ${query.from}–${query.to} of ${query.totalCount} records`
                  : "No records"
              }
              onPageChange={(p) => query.setPage(p + 1)}
              className={styles.footer}
            />
          </>
        )}
      </section>

      <p className={styles.footnote}>
        Data is aggregated from anecdotal entries submitted by class advisers. Administrators can view, filter, and export
        records for reporting purposes; only advisers assigned to a section may create or edit entries.
      </p>

      {selected && (
        <AnecdotalDrawer
          record={selected}
          onClose={() => setSelected(null)}
          onExport={(record) => exportAnecdotalCsv([record], `anecdotal-${record.id}.csv`)}
        />
      )}
    </>
  );
}
