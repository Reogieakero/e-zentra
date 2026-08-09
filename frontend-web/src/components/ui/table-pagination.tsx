import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./table-pagination.module.css";

interface TablePaginationProps {
  page: number;
  pageCount: number;
  info: string;
  onPageChange: (page: number) => void;
  showPager?: boolean;
  className?: string;
}

export function TablePagination({
  page,
  pageCount,
  info,
  onPageChange,
  showPager = true,
  className,
}: TablePaginationProps) {
  const safeCount = Math.max(1, pageCount);
  const pagerVisible = showPager && safeCount > 1;

  return (
    <div className={`${styles.footer} ${className ?? ""}`}>
      <span className={styles.info}>{info}</span>
      {pagerVisible && (
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 0}
            aria-label="Previous page"
          >
            <ChevronLeft className={styles.pageBtnIcon} />
          </button>
          <span className={styles.pageIndicator}>
            {page + 1} / {safeCount}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            onClick={() => onPageChange(page + 1)}
            disabled={page + 1 >= safeCount}
            aria-label="Next page"
          >
            <ChevronRight className={styles.pageBtnIcon} />
          </button>
        </div>
      )}
    </div>
  );
}