"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileUp,
  FileText,
  Loader2,
  Paperclip,
  ScanLine,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSf10AuditTrail, type Sf10AuditEntry } from "@/lib/dashboard";
import { SearchInput } from "@/components/ui/search-input";
import { TablePagination } from "@/components/ui/table-pagination";
import styles from "./sf10-audit-trail.module.css";

const ACTION_META: Record<string, { label: string; icon: typeof Eye; cls: string }> = {
  UPLOAD: { label: "SF10 file attached", icon: Paperclip, cls: styles.toneAttach },
  CREATE: { label: "SF10 record created", icon: FileUp, cls: styles.toneAttach },
  VIEW: { label: "SF10 viewed", icon: Eye, cls: styles.toneView },
  READY: { label: "Marked ready for release", icon: CheckCircle2, cls: styles.toneReady },
  RELEASE: { label: "Released to student", icon: Send, cls: styles.toneRelease },
  GENERATE: { label: "SF10 generated", icon: Sparkles, cls: styles.toneGenerate },
  OCR_ENQUEUE: { label: "Scan started", icon: Loader2, cls: styles.toneOcr },
  OCR_COMPLETE: { label: "Scan finished", icon: ScanLine, cls: styles.toneOcr },
  OCR_FAILED: { label: "Scan failed", icon: AlertTriangle, cls: styles.toneError },
  OCR_APPROVE: { label: "Scanned grades approved", icon: ThumbsUp, cls: styles.toneOcr },
  OCR_REJECT: { label: "Scanned grades rejected", icon: ThumbsDown, cls: styles.toneError },
};

const ROLE_LABEL: Record<string, string> = {
  principal: "Principal",
  registrar: "Registrar",
  record_keeper: "Record Keeper",
  teacher: "Teacher",
  guidance_counselor: "Guidance Counselor",
  adm_coordinator: "ADM Coordinator",
  nurse: "School Nurse",
  student: "Student",
  parent: "Parent",
};

function actionMeta(action: string) {
  return (
    ACTION_META[action] ?? {
      label: action,
      icon: FileText,
      cls: styles.toneView,
    }
  );
}

function roleLabel(role: string | undefined): string {
  return role ? (ROLE_LABEL[role] ?? role) : "";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AuditRow({ entry }: { entry: Sf10AuditEntry }) {
  const meta = actionMeta(entry.action);
  const Icon = meta.icon;

  return (
    <li className={styles.row}>
      <div className={`${styles.rowIcon} ${meta.cls}`}>
        <Icon className={styles.rowIconInner} size={16} />
      </div>
      <div className={styles.rowMain}>
        <div className={styles.rowTitle}>
          <span className={styles.rowAction}>{meta.label}</span>
          <span className={styles.rowDot}>·</span>
          <span className={styles.rowStudent}>{entry.student?.fullName ?? "Unknown student"}</span>
        </div>
        {entry.actor ? (
          <div className={styles.rowSub}>
            by {entry.actor.fullName}
            {roleLabel(entry.actor.role) ? <span className={styles.rowRole}>{roleLabel(entry.actor.role)}</span> : null}
          </div>
        ) : null}
      </div>
      <div className={styles.rowMeta}>
        <span className={styles.rowTime}>{formatTime(entry.createdAt)}</span>
      </div>
    </li>
  );
}

export function Sf10AuditTrail({
  title = "SF10 Audit Trail",
  subtitle = "Activity log for learner's permanent academic records.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const params = useMemo(
    () => ({ search: debounced || undefined, page, pageSize: 20 }),
    [debounced, page]
  );

  const { data, error, isValidating } = useSf10AuditTrail(params);

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (data?.pageSize || 20)));
  const from = total === 0 ? 0 : (page - 1) * (data?.pageSize || 20) + 1;
  const to = Math.min(page * (data?.pageSize || 20), total);

  const goPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
  };

  return (
    <div className={styles.auditCard}>
      {isValidating && (
        <div className={styles.loadingStrip}>
          <div className={styles.loadingBar} />
        </div>
      )}
      <div className={styles.auditTop}>
        <div className={styles.auditHeader}>
          <div className={styles.auditMeta}>
            <h2 className={styles.auditTitle}>{title}</h2>
            <p className={styles.auditSubtitle}>{subtitle}</p>
          </div>
        </div>
        <div className={styles.toolbar}>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search student, LRN, or staff..."
            aria-label="Search SF10 audit trail"
            className={styles.searchWrap}
          />
        </div>
      </div>

      {error ? (
        <div className={styles.errorState}>
          <AlertTriangle className={styles.errorIcon} size={22} />
          <p className={styles.emptyTitle}>Could not load the audit trail</p>
          <p className={styles.emptyText}>{error.message}</p>
        </div>
      ) : !data ? (
        <div className={styles.skOverlay}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={`${styles.skeleton} ${styles.skRow}`} />
          ))}
        </div>
      ) : data.entries.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FileText size={22} />
          </div>
          <p className={styles.emptyTitle}>No audit activity found</p>
          <p className={styles.emptyText}>Try adjusting your search terms.</p>
        </div>
      ) : (
        <ul className={styles.feed}>
          {data.entries.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}

      <TablePagination
        page={page - 1}
        pageCount={totalPages}
        info={`Showing ${from}–${to} of ${total.toLocaleString()} events`}
        onPageChange={(p) => goPage(p + 1)}
        className={styles.auditPager}
      />
    </div>
  );
}

export function Sf10AuditTrailLoading() {
  return (
    <div className={styles.auditCard}>
      <div className={styles.auditTop}>
        <div className={styles.auditHeader}>
          <div className={styles.auditMeta}>
            <div className={`${styles.skeleton} ${styles.skCardTitle}`} />
            <div className={`${styles.skeleton} ${styles.skSub}`} />
          </div>
        </div>
        <div className={`${styles.skeleton} ${styles.skSearch}`} />
      </div>
      <div className={styles.skOverlay}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className={`${styles.skeleton} ${styles.skRow}`} />
        ))}
      </div>
      <div className={styles.pagination}>
        <div className={`${styles.skeleton} ${styles.skPageInfo}`} />
      </div>
    </div>
  );
}
