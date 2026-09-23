// "Recent bulk changes" under both bulk modals — GET /menu/bulk-operations.
// Collapsed by default so it never pushes the form down; `reloadKey` bumps
// after an execute so the change just made shows up at the top.
import { useEffect, useState } from "react";
import { ChevronDown, History } from "lucide-react";
import clsx from "clsx";
import type { BulkOperationSummaryResponse } from "@octopus/api-client";
import { describeApiError, recentBulkOperations } from "@/entities/menu";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { useMenuCopy, type MenuCopyKey } from "../copy";

export function BulkHistory({ kind, reloadKey = 0 }: { kind?: BulkOperationSummaryResponse["kind"]; reloadKey?: number }) {
  const c = useMenuCopy();
  const { locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BulkOperationSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !activeBusinessId) return;
    let cancelled = false;
    setError(null);
    recentBulkOperations(activeBusinessId)
      .then((data) => !cancelled && setRows(data))
      .catch((err) => !cancelled && setError(describeApiError(err)));
    return () => {
      cancelled = true;
    };
  }, [open, activeBusinessId, reloadKey]);

  const shown = (rows ?? []).filter((r) => !kind || r.kind === kind);
  const kindLabel = (k: string) => {
    const text = c(`bulk.kind.${k}` as MenuCopyKey);
    return text.startsWith("bulk.kind.") ? k : text;
  };

  return (
    <div className="mt-4 border-t border-[var(--octo-divider)] pt-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-start text-[13px] font-medium text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]"
      >
        <History size={15} aria-hidden />
        <span className="flex-1">{c("bulk.history")}</span>
        <ChevronDown size={15} aria-hidden className={clsx("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-2 max-h-[180px] space-y-1.5 overflow-y-auto">
          {error ? (
            <p role="alert" className="rounded-[9px] bg-error/10 px-3 py-2 text-[12px] text-error">
              {error}
            </p>
          ) : rows === null ? (
            <p className="py-3 text-center text-[12px] text-[var(--octo-text-muted)]">{c("loading")}</p>
          ) : shown.length === 0 ? (
            <p className="py-3 text-center text-[12px] text-[var(--octo-text-muted)]">{c("bulk.historyEmpty")}</p>
          ) : (
            shown.map((op) => (
              <div
                key={op.operationId}
                className="flex items-center justify-between gap-3 rounded-[8px] bg-[var(--octo-hover)] px-3 py-2 text-[12px]"
              >
                <span className="font-medium text-[var(--octo-text-primary)]">{kindLabel(op.kind)}</span>
                <span className="truncate text-[var(--octo-text-muted)]">
                  {new Date(op.executedAtUtc).toLocaleString(locale === "ar" ? "ar-SA" : "en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {op.executedBy ? ` · ${op.executedBy}` : ""}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
