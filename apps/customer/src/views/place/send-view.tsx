"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { usePlaceScan } from "@/features/place/place-scan-context";
import {
  PLACE_PROBLEM_KEY,
  cartSignature,
  idempotencyKeyFor,
  placeProblemOf,
  toScanLines,
  type PlaceProblem,
  type ScanOrderConfirmation,
} from "@/shared/lib/place-order";
import {
  appendSentOrder,
  clearPendingSend,
  readPendingSend,
  safeLocalStorage,
  safeSessionStorage,
  writePendingSend,
} from "@/shared/lib/place-storage";
import { PLACE_ROUTES, computeTableBill } from "@/shared/lib/table-flow";
import { TableBackTitle, TableButton, TableMoney } from "@/shared/ui/table";

/** A request id that also works off a secure context (crypto.randomUUID needs HTTPS). */
function newRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** The cart sent as an order: the backend's order request for this code. No payment here —
 *  the bill is settled at the table. The Idempotency-Key of an unconfirmed send is kept per code
 *  in sessionStorage, so a retry — even from a reloaded page — replays instead of ordering twice.
 *  Keeping the cart in line with menu updates is PlaceCartGuard's job (in the layout). */
export function PlaceSendView() {
  const { t } = useI18n();
  const router = useRouter();
  const { key, ordering } = usePlaceScan();
  const { state, removeLine, clearCart } = useOrderingSession();
  const routes = PLACE_ROUTES(key);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<PlaceProblem | null>(null);
  const [removed, setRemoved] = useState(0);

  const bill = computeTableBill(state.lines, 0, null);

  async function send() {
    if (pending || !ordering) return;
    const { lines, unknown } = toScanLines(state.lines, ordering);
    if (unknown.length > 0) {
      // Lines this code cannot take (not orderable here, or no longer on the menu): take them out
      // and say so, rather than refusing the whole cart without saying which.
      unknown.forEach((lineId) => removeLine(lineId));
      setRemoved(unknown.length);
      return;
    }
    if (lines.length === 0) return;
    const session = safeSessionStorage();
    const idem = idempotencyKeyFor(cartSignature(state.lines), readPendingSend(session, key), newRequestId);
    writePendingSend(session, key, idem);
    setPending(true);
    setProblem(null);
    setRemoved(0);
    try {
      const res = await fetch(`/api/place-orders?code=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idem.key },
        body: JSON.stringify({ basis: ordering.basis, lines }),
      });
      const text = await res.text();
      if (res.ok) {
        const confirmation = JSON.parse(text) as ScanOrderConfirmation;
        appendSentOrder(safeLocalStorage(), key, confirmation);
        clearPendingSend(session, key);
        clearCart();
        router.push(`${routes.order}?ref=${encodeURIComponent(confirmation.reference)}`);
        return;
      }
      let code: string | undefined;
      try {
        code = (JSON.parse(text) as { errorCode?: string }).errorCode;
      } catch {
        // Not JSON: the status alone decides.
      }
      const next = res.status === 502 ? "network" : placeProblemOf(res.status, code);
      // The layout re-reads the scan; PlaceCartGuard moves the cart onto the new menu.
      if (next === "basisChanged") router.refresh();
      setProblem(next);
    } catch {
      setProblem("network");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col gap-4 px-4 pb-8 pt-[max(16px,env(safe-area-inset-top))]">
      <TableBackTitle title={t("store.place.send")} backHref={routes.cart} backLabel={t("store.table.back")} />

      <ul className="flex flex-col divide-y divide-gray-100 rounded-[16px] bg-white px-4">
        {state.lines.map((l) => (
          <li key={l.lineId} className="flex items-start justify-between gap-3 py-3 text-[14px]">
            <span className="min-w-0 flex-1 font-medium text-gray-900">
              {l.name} × {l.quantity}
              {l.modifiers.length > 0 && (
                <span className="block text-[12px] font-normal text-gray-500">{l.modifiers.map((m) => m.label).join("، ")}</span>
              )}
            </span>
            <TableMoney amount={(l.unitPriceSar + l.modifiers.reduce((s, m) => s + m.priceDeltaSar, 0)) * l.quantity} />
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between rounded-[16px] bg-white px-4 py-3 text-[16px] font-bold text-gray-900">
        <span>{t("store.place.total")}</span>
        <TableMoney amount={bill.payableSar} />
      </div>
      <p className="text-[12px] text-gray-500">{t("store.place.estimate")}</p>

      {removed > 0 && <p className="rounded-[12px] bg-amber-50 p-3 text-[13px] text-amber-900">{t("store.place.itemsRemoved", { n: removed })}</p>}
      {problem && (
        <p role="alert" className="rounded-[12px] bg-red-50 p-3 text-[13px] font-medium text-red-800">
          {t(PLACE_PROBLEM_KEY[problem])}
        </p>
      )}

      <div className="mt-auto">
        {ordering ? (
          <TableButton onClick={() => void send()} disabled={pending || state.lines.length === 0}>
            {pending ? t("store.place.sending") : problem === "network" ? t("store.place.sendAgain") : t("store.place.send")}
          </TableButton>
        ) : (
          <p className="rounded-[12px] bg-amber-50 p-3 text-center text-[14px] font-medium text-amber-900">{t("store.place.browseOnly")}</p>
        )}
      </div>
    </div>
  );
}
