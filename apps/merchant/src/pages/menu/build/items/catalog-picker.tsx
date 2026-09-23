// "Add existing item": the business's catalog (GET /menu/items), searchable,
// so an item already on another menu is placed here rather than re-typed as a
// second copy. The picked ids go back to the step, which reads each in full.
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Search } from "lucide-react";
import { Button, Checkbox, Input, Modal } from "@ui/primitives";
import type { CatalogItemSummaryResponse } from "@octopus/api-client";
import { describeApiError, searchCatalogItems } from "@/entities/menu";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { useMenuCopy } from "../../copy";

export function CatalogPicker({
  open,
  excludeIds,
  busy,
  onClose,
  onPick,
}: {
  open: boolean;
  /** Items already in the section — shown, but not pickable. */
  excludeIds: string[];
  busy: boolean;
  onClose: () => void;
  onPick: (ids: string[]) => void;
}) {
  const c = useMenuCopy();
  const { locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const [query, setQuery] = useState("");
  const [unplaced, setUnplaced] = useState(false);
  const [rows, setRows] = useState<CatalogItemSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!open) {
      setPicked([]);
      return;
    }
    if (!activeBusinessId) return;
    let cancelled = false;
    setError(null);
    // Debounced: each keystroke would otherwise be a request.
    const timer = window.setTimeout(() => {
      searchCatalogItems(activeBusinessId, { search: query, unplaced })
        .then((data) => !cancelled && setRows(data))
        .catch((err) => !cancelled && setError(describeApiError(err)));
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, activeBusinessId, query, unplaced]);

  const name = (n: Record<string, string>) => n[locale] || n.en || n.ar || Object.values(n)[0] || "—";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={c("items.catalogTitle")}
      className="max-w-[560px]"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            {c("cancel")}
          </Button>
          <Button disabled={picked.length === 0 || busy} onClick={() => onPick(picked)}>
            {busy ? c("loading") : c("items.addSelected", { n: picked.length })}
          </Button>
        </div>
      }
    >
      <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{c("items.catalogHint")}</p>
      <div className="mt-3 space-y-2">
        <Input
          icon={<Search size={15} aria-hidden />}
          placeholder={c("search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Checkbox checked={unplaced} onChange={(e) => setUnplaced(e.target.checked)} label={c("items.unplacedOnly")} />
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          {error}
        </p>
      )}

      <ul className="mt-3 max-h-[44vh] space-y-1.5 overflow-y-auto">
        {rows === null ? (
          <li className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{c("loading")}</li>
        ) : rows.length === 0 ? (
          <li className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{c("items.noneFound")}</li>
        ) : (
          rows.map((row) => {
            const here = excludeIds.includes(row.id);
            const on = picked.includes(row.id);
            return (
              <li key={row.id}>
                <label
                  className={clsx(
                    "flex items-center gap-3 rounded-[10px] border px-3 py-2.5",
                    here ? "cursor-default opacity-60" : "cursor-pointer",
                    on ? "border-[var(--octo-accent)] bg-[var(--octo-selected)]" : "border-[var(--octo-border-card)]"
                  )}
                >
                  <Checkbox
                    checked={on || here}
                    disabled={here}
                    onChange={() => setPicked((p) => (p.includes(row.id) ? p.filter((x) => x !== row.id) : [...p, row.id]))}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-[var(--octo-text-primary)]">{name(row.name)}</span>
                    <span className="block truncate text-[11.5px] text-[var(--octo-text-muted)]">
                      {here ? c("items.alreadyHere") : [row.status, row.sku].filter(Boolean).join(" · ")}
                      {row.isUnavailable ? " · ⦸" : ""}
                    </span>
                  </span>
                  {row.basePrice && (
                    <span className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-[var(--octo-accent)]">
                      {row.basePrice.currency} {row.basePrice.amount}
                    </span>
                  )}
                </label>
              </li>
            );
          })
        )}
      </ul>
    </Modal>
  );
}
