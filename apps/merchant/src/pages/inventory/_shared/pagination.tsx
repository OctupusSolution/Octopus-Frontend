import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  showingLabel: string;
}

export function Pagination({ page, pageCount, total, pageSize, onPageChange, showingLabel }: PaginationProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--octo-divider)] pt-3">
      <span className="text-[11.5px] text-[var(--octo-text-muted)]">
        {showingLabel.replace("{from}", String(from)).replace("{to}", String(to)).replace("{total}", String(total))}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="grid h-[26px] w-[26px] place-items-center rounded-[8px] border border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={13} className="rtl:hidden" />
          <ChevronRight size={13} className="hidden rtl:block" />
        </button>
        {Array.from({ length: pageCount }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1)
          .reduce<number[]>((acc, p) => {
            if (acc.length && p - acc[acc.length - 1] > 1) acc.push(-1);
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === -1 ? (
              <span key={`gap-${i}`} className="px-1 text-[11.5px] text-[var(--octo-text-faint)]">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === page ? "page" : undefined}
                onClick={() => onPageChange(p)}
                className={`grid h-[26px] min-w-[26px] place-items-center rounded-[8px] px-1.5 text-[11.5px] font-medium transition-colors ${
                  p === page ? "bg-[#0D6EFD] text-white" : "text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                }`}
              >
                {p}
              </button>
            )
          )}
        <button
          type="button"
          aria-label="Next page"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="grid h-[26px] w-[26px] place-items-center rounded-[8px] border border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight size={13} className="rtl:hidden" />
          <ChevronLeft size={13} className="hidden rtl:block" />
        </button>
      </div>
    </div>
  );
}
