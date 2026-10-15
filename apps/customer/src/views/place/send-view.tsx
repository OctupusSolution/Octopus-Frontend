"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { usePlaceScan } from "@/features/place/place-scan-context";
import {
  PLACE_PROBLEM_KEY,
  cartSignature,
  idempotencyKeyFor,
  placeProblemOf,
  reconcileCart,
  toScanLines,
  type PlaceProblem,
  type ScanOrderConfirmation,
} from "@/shared/lib/place-order";
import { appendSentOrder, safeLocalStorage } from "@/shared/lib/place-storage";
import { PLACE_ROUTES, computeTableBill } from "@/shared/lib/table-flow";
import { TableBackTitle, TableButton, TableMoney } from "@/shared/ui/table";

/** The cart sent as an order: the backend's order request for this code. No payment here —
 *  the bill is settled at the table. A retry of the same cart reuses its Idempotency-Key. */
export function PlaceSendView() {
  const { t } = useI18n();
  const router = useRouter();
  const { key, menu, ordering } = usePlaceScan();
  const { state, removeLine, replaceLine, clearCart } = useOrderingSession();
  const routes = PLACE_ROUTES(key);
  const idem = useRef<{ signature: string; key: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<PlaceProblem | null>(null);
  const [removed, setRemoved] = useState(0);
  // The basis the cart was last checked against; a newer scan after a refresh re-checks it.
  const checkedBasis = useRef<string | null>(ordering?.basis ?? null);

  // After "the menu was updated", the layout re-reads the scan; bring the cart in line with it.
  useEffect(() => {
    if (!ordering || checkedBasis.current === ordering.basis) return;
    checkedBasis.current = ordering.basis;
    const r = reconcileCart(state.lines, menu, ordering);
    r.dropped.forEach((l) => removeLine(l.lineId));
    r.repriced.forEach((l) =>
      replaceLine(l.lineId, l.menuItemId, l.name, l.unitPriceSar, l.quantity, l.modifiers, l.notes, l.customerImageName, l.customerImageSize)
    );
    setRemoved(r.dropped.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordering?.basis]);

  const bill = computeTableBill(state.lines, 0, null);

  async function send() {
    if (pending || !ordering) return;
    const { lines, unknown } = toScanLines(state.lines, ordering);
    if (unknown.length > 0 || lines.length === 0) {
      setProblem("basisChanged");
      return;
    }
    idem.current = idempotencyKeyFor(cartSignature(state.lines), idem.current, () => crypto.randomUUID());
    setPending(true);
    setProblem(null);
    try {
      const res = await fetch(`/api/place-orders?code=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idem.current.key },
        body: JSON.stringify({ basis: ordering.basis, lines }),
      });
      const text = await res.text();
      if (res.ok) {
        const confirmation = JSON.parse(text) as ScanOrderConfirmation;
        appendSentOrder(safeLocalStorage(), key, confirmation);
        clearCart();
        idem.current = null;
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
      if (next === "basisChanged") router.refresh(); // the layout re-scans; the effect above re-checks the cart
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
