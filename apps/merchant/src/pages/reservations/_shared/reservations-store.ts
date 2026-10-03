// The reservations list, held above any one page (the Add page is its own
// route and must be able to append a row the list then shows).
//
// Rows come from the Reservation API (see reservations-api.ts) and start
// empty. `setReservations` still swaps rows locally — the actions in
// `useReservationActions` call it with each server answer.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import type { Reservation, ReservationStatus } from "@/shared/api/mock-reservations";
import type { CancelPayload } from "./model";
import {
  cancelRow,
  cancellationPreview,
  changeStatus,
  createRow,
  describeReservationError,
  duplicateRow,
  findAlternatives,
  issueDepositRefund,
  issueLink,
  loadReservations,
  recheckDepositStatus,
  recordCashDeposit,
  refreshConfirmedDetails,
  refreshDepositDetails,
  reinstateRow,
  setHidden,
  updateRow,
  waiveDeposit as waiveDepositApi,
  type NewReservationInput,
} from "./reservations-api";

type Updater = Reservation[] | ((prev: Reservation[]) => Reservation[]);
type LoadState = "idle" | "loading" | "ready" | "error";

interface Snapshot {
  rows: Reservation[];
  state: LoadState;
  error: string | null;
  businessId: string | null;
}

let snap: Snapshot = { rows: [], state: "idle", error: null, businessId: null };
const listeners = new Set<() => void>();

function patch(next: Partial<Snapshot>) {
  snap = { ...snap, ...next };
  listeners.forEach((l) => l());
}

export function getReservations(): Reservation[] {
  return snap.rows;
}

export function setReservations(next: Updater): void {
  patch({ rows: typeof next === "function" ? next(snap.rows) : next });
}

export function subscribeReservations(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => snap;

async function load(businessId: string) {
  patch({ businessId, state: "loading", error: null, rows: snap.businessId === businessId ? snap.rows : [] });
  try {
    patch({ rows: await loadReservations(businessId), state: "ready" });
  } catch (err) {
    patch({ state: "error", error: describeReservationError(err) });
  }
}

/** Same shape as `useState`, so the list page's handlers read as before. */
export function useReservations(): [Reservation[], typeof setReservations] {
  const { activeBusinessId } = useAuth();
  const current = useSyncExternalStore(subscribeReservations, getSnapshot, getSnapshot);
  useEffect(() => {
    if (activeBusinessId && snap.businessId !== activeBusinessId) void load(activeBusinessId);
  }, [activeBusinessId]);
  return [current.rows, setReservations];
}

export function useReservationsStatus() {
  const { activeBusinessId } = useAuth();
  const current = useSyncExternalStore(subscribeReservations, getSnapshot, getSnapshot);
  const reload = useCallback(() => {
    if (activeBusinessId) void load(activeBusinessId);
  }, [activeBusinessId]);
  return { state: current.state, error: current.error, reload };
}

const replaceRow = (row: Reservation) => setReservations((prev) => prev.map((r) => (r.id === row.id ? row : r)));

/** Every write: one API call, then the server's answer replaces the row. */
export function useReservationActions() {
  const { activeBusinessId } = useAuth();
  const need = () => {
    if (!activeBusinessId) throw new Error("No active business");
    return activeBusinessId;
  };
  return {
    create: async (input: NewReservationInput) => {
      const row = await createRow(need(), input);
      setReservations((prev) => [...prev, row]);
      return row;
    },
    update: async (before: Reservation, draft: Reservation, resourceId?: string | null) =>
      replaceRow(await updateRow(need(), before, draft, resourceId)),
    setStatus: async (row: Reservation, status: ReservationStatus) => replaceRow(await changeStatus(need(), row, status)),
    setHidden: async (row: Reservation, hidden: boolean) => replaceRow(await setHidden(need(), row, hidden)),
    cancel: async (row: Reservation, payload: CancelPayload) => replaceRow(await cancelRow(need(), row, payload)),
    duplicate: async (row: Reservation) => {
      const copy = await duplicateRow(need(), row);
      setReservations((prev) => [...prev, copy]);
    },
    shareLink: async (row: Reservation) => replaceRow(await issueLink(need(), row)),
    /** Called when a reservation's detail dialog opens: swaps its terms-only
     *  deposit for the real attempt (link, method, paid-on, transaction id). */
    refreshDeposit: async (row: Reservation) => replaceRow(await refreshDepositDetails(need(), row)),
    /** Same moment, for the confirmed-on/confirmed-by shown on a confirmed
     *  reservation: replaces the createdAtUtc guess with the activity log's
     *  real "Confirmed" entry. */
    refreshConfirmed: async (row: Reservation) => replaceRow(await refreshConfirmedDetails(need(), row)),
    /** What the business's real refund bands say cancelling `row` right now
     *  would refund — the cancel dialog's own re-derivation of that policy
     *  could disagree with the server's, so it shows this instead. */
    previewCancel: (row: Reservation) => cancellationPreview(need(), row),
    /** The guest paid the deposit in person — settles it without a link. */
    recordCash: async (row: Reservation) => replaceRow(await recordCashDeposit(need(), row)),
    /** Waives the deposit this reservation would otherwise owe. */
    waiveDeposit: async (row: Reservation, reason: string) => replaceRow(await waiveDepositApi(need(), row, reason)),
    /** Requests the refund a cancelled, paid reservation already has due. */
    issueRefund: async (row: Reservation) => replaceRow(await issueDepositRefund(need(), row)),
    /** Asks the provider directly whether a sent link has been paid yet. */
    recheckDeposit: async (row: Reservation) => replaceRow(await recheckDepositStatus(need(), row)),
    /** Brings an expired reservation back (the server re-checks the slot). */
    reinstate: async (row: Reservation) => replaceRow(await reinstateRow(need(), row)),
    /** Nearest bookable times around a refused slot, on the same table/group. */
    alternatives: (
      slot: Parameters<typeof findAlternatives>[1],
      target: Parameters<typeof findAlternatives>[2]
    ) => findAlternatives(need(), slot, target),
  };
}
