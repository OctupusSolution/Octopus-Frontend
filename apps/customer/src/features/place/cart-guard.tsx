"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { remapCart } from "@/shared/lib/place-order";
import { readCartOrdering, safeSessionStorage, writeCartOrdering } from "@/shared/lib/place-storage";
import { usePlaceScan } from "./place-scan-context";

/** Keeps a stored cart meaningful across menu updates. The menu's refs are renumbered on every
 *  republish, so a cart filled from an older scan is moved line by line to the current menu
 *  through its stable entry and option ids — on load and whenever the scan's basis changes
 *  (e.g. after "the menu was updated"). Lines that no longer exist are removed, and the guest
 *  is told. Renders that notice, nothing else. */
export function PlaceCartGuard() {
  const { t } = useI18n();
  const { key, menu, ordering } = usePlaceScan();
  const { state, hydrated, removeLine, replaceLine } = useOrderingSession();
  const [notice, setNotice] = useState<{ removed: number; repriced: number } | null>(null);

  useEffect(() => {
    if (!hydrated || !ordering) return;
    const storage = safeSessionStorage();
    const filledFrom = readCartOrdering(storage, key);
    if (state.lines.length > 0 && filledFrom && filledFrom.basis !== ordering.basis) {
      const r = remapCart(state.lines, filledFrom, menu, ordering);
      r.dropped.forEach((l) => removeLine(l.lineId));
      r.keep.forEach((l) =>
        replaceLine(l.lineId, l.menuItemId, l.name, l.unitPriceSar, l.quantity, l.modifiers, l.notes, l.customerImageName, l.customerImageSize)
      );
      if (r.dropped.length > 0 || r.repriced.length > 0) setNotice({ removed: r.dropped.length, repriced: r.repriced.length });
    }
    writeCartOrdering(storage, key, ordering);
    // The cart is read once it has loaded and again for each new scan basis, not on every edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, ordering?.basis, key]);

  if (!notice) return null;
  return (
    <div role="status" className="sticky top-0 z-20 flex items-start justify-between gap-3 bg-amber-50 px-4 py-2 text-[13px] font-medium text-amber-900">
      <span>
        {t("store.place.cartUpdated")}
        {notice.removed > 0 ? ` ${t("store.place.itemsRemoved", { n: notice.removed })}` : ""}
      </span>
      <button type="button" className="shrink-0 font-semibold underline" onClick={() => setNotice(null)}>
        {t("store.place.dismiss")}
      </button>
    </div>
  );
}
