import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./students-pagination.module.css";

interface StudentsPaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
}

export default function StudentsPagination({
  page,
  totalPages,
  totalCount,
  from,
  to,
  onPageChange,
}: StudentsPaginationProps) {
  return (
    <div className={styles.pagination}>
      <span className={styles.paginationInfo}>
        Showing {from}–{to} of {totalCount} students
      </span>
      <div className={styles.paginationControls}>
        <button
          className={styles.pageArrow}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft size={15} /> Previous
        </button>
        {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => {
          const pageNum = i + 1;
          return (
            <button
              key={pageNum}
              className={`${styles.pageNum} ${pageNum === page ? styles.pageNumActive : ""}`}
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </button>
          );
        })}
        {totalPages > 5 && <span className={styles.pageEllipsis}>…</span>}
        <button
          className={styles.paginationArrow}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}