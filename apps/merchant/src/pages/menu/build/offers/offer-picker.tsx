// "Add existing offer": the business's offers (GET /menu/offers) that this
// menu does not show yet. Offers are business-level, so adding one places the
// same offer in this menu's Offers section rather than copying it.
import { useEffect, useState } from "react";
import { Button, Modal } from "@ui/primitives";
import type { OfferSummaryResponse } from "@octopus/api-client";
import { describeApiError, listAllOffers } from "@/entities/menu";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { useMenuCopy } from "../../copy";

export function OfferPicker({
  open,
  excludeIds,
  busy,
  onClose,
  onPick,
}: {
  open: boolean;
  excludeIds: string[];
  busy: boolean;
  onClose: () => void;
  onPick: (offerId: string) => void;
}) {
  const c = useMenuCopy();
  const { locale } = useI18n();
  const { activeBusinessId } = useAuth();
  const [rows, setRows] = useState<OfferSummaryResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !activeBusinessId) return;
    let cancelled = false;
    setRows(null);
    setError(null);
    listAllOffers(activeBusinessId)
      .then((data) => !cancelled && setRows(data))
      .catch((err) => !cancelled && setError(describeApiError(err)));
    return () => {
      cancelled = true;
    };
  }, [open, activeBusinessId]);

  const name = (n: Record<string, string>) => n[locale] || n.en || n.ar || Object.values(n)[0] || "—";
  const shown = (rows ?? []).filter((o) => !excludeIds.includes(o.id));

  return (
    <Modal open={open} onClose={onClose} title={c("offers.pickTitle")} className="max-w-[520px]">
      {error && (
        <p role="alert" className="rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
          {error}
        </p>
      )}
      <ul className="mt-1 max-h-[48vh] space-y-2 overflow-y-auto">
        {rows === null && !error ? (
          <li className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{c("loading")}</li>
        ) : shown.length === 0 ? (
          <li className="py-6 text-center text-[13px] text-[var(--octo-text-muted)]">{c("empty")}</li>
        ) : (
          shown.map((o) => (
            <li key={o.id} className="flex items-center gap-3 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-[var(--octo-text-primary)]">{name(o.name)}</p>
                <p dir="ltr" className="truncate text-start text-[11.5px] text-[var(--octo-text-muted)]">
                  /{o.slug} · {o.isActive ? c("offers.active") : c("offers.inactive")}
                  {!o.isComplete ? ` · ${c("offers.incomplete")}` : ""}
                </p>
              </div>
              <Button size="sm" disabled={busy} onClick={() => onPick(o.id)}>
                {c("add")}
              </Button>
            </li>
          ))
        )}
      </ul>
    </Modal>
  );
}
