// The Reservations list — the module's home screen. Assembles the pieces
// built in Tasks 1-7 (fixture, model, KPI cards, filter bar, row) into the
// page the sidebar's "Reservations" link opens. Replaces the old KPI-tiles
// + quick-links hub outright. Task 12 wires in the three dialogs built in
// Tasks 9-11 (add/edit form, detail, cancel) — the module's last seam.
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Plus, Printer, Search } from "lucide-react";
import { Button, EmptyState, Input, Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import {
  reservations as initialReservations,
  type Reservation,
  type ReservationStatus,
} from "@/shared/api/mock-reservations";
import { KpiCards } from "./_shared/kpi-cards";
import { FilterBar } from "./_shared/filter-bar";
import {
  EMPTY_FILTERS,
  deriveKpis,
  freshPaymentLink,
  NOW_MINUTES,
  nowTimestampLabel,
  refundPolicy,
  visibleRows,
  type ListFilters,
  type SortKey,
} from "./_shared/model";
import { ReservationRow, ROW_LIST_MIN_WIDTH, type RowMenu } from "./_shared/reservation-row";
import { ReservationFormModal } from "./modals/reservation-form-modal";
import { ReservationDetailModal } from "./modals/reservation-detail-modal";
import { CancelReservationModal } from "./modals/cancel-reservation-modal";

// Mirrors CancelReservationModal's onConfirm payload shape (not exported
// from that file, so restated here rather than widening its module surface
// for a single consumer).
type CancelPayload = { actionType: "guest" | "restaurant" | "no-show"; reason: string; note: string };

const SORT_OPTIONS: readonly { value: SortKey; labelKey: string }[] = [
  { value: "time-asc", labelKey: "reservations.list.sort.timeEarliest" },
  { value: "time-desc", labelKey: "reservations.list.sort.timeLatest" },
  { value: "party", labelKey: "reservations.list.sort.partySize" },
  { value: "status", labelKey: "reservations.list.sort.status" },
];

// Only one row's Status/Actions popover is open at a time, across the whole
// list — held here rather than inside each row (see reservation-row.tsx).
type OpenMenu = { id: string; menu: "status" | "actions" } | null;

// The three dialogs this page can show. Exactly one of the three id/mode
// fields below is non-null at a time — every "open X" transition clears the
// other two, rather than each dialog tracking its own independent flag.
type FormState = { mode: "add" } | { mode: "edit"; id: string } | null;

// The next free "RSV-xxxx" ref, scanned off whatever is currently in state
// (not the static fixture) so repeated duplicates keep incrementing.
function nextRef(rows: readonly Reservation[]): string {
  let max = 0;
  for (const r of rows) {
    const match = /^RSV-(\d+)$/.exec(r.ref);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `RSV-${max + 1}`;
}

export function ReservationsPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Reservation[]>(initialReservations);
  const [filters, setFilters] = useState<ListFilters>(EMPTY_FILTERS);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  // Dialog state — see FormState above. `detailId`/`cancelId` are null
  // whenever the form is open and vice versa; every opener below clears the
  // other two so at most one dialog is ever visible.
  const [formState, setFormState] = useState<FormState>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const visible = useMemo(() => visibleRows(rows, filters), [rows, filters]);
  const kpis = useMemo(() => deriveKpis(visible), [visible]);
  const areas = useMemo(
    () => Array.from(new Set(rows.map((r) => r.area))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const formReservation = formState?.mode === "edit" ? (rows.find((r) => r.id === formState.id) ?? null) : null;
  const detailReservation = detailId ? (rows.find((r) => r.id === detailId) ?? null) : null;
  const cancelReservation = cancelId ? (rows.find((r) => r.id === cancelId) ?? null) : null;

  // Openers. Each closes the other two dialogs first — only one is ever
  // showing, however it was reached (row menu, row body click, or a footer
  // button inside another dialog).
  function openAddReservation() {
    setDetailId(null);
    setCancelId(null);
    setFormState({ mode: "add" });
  }

  function openEdit(id: string) {
    setDetailId(null);
    setCancelId(null);
    setFormState({ mode: "edit", id });
  }

  function openDetail(id: string) {
    setFormState(null);
    setCancelId(null);
    setDetailId(id);
  }

  // Both the row's Status menu and its "..." menu, plus the edit form's and
  // detail dialog's own "Cancel Reservation" buttons, route their choice
  // through here rather than setting status: "Cancelled" directly — so
  // nothing silently cancels a booking without the confirm dialog.
  function requestCancel(id: string) {
    setFormState(null);
    setDetailId(null);
    setCancelId(id);
  }

  function closeDialogs() {
    setFormState(null);
    setDetailId(null);
    setCancelId(null);
  }

  function handleStatus(id: string, status: ReservationStatus) {
    if (status === "Cancelled") {
      requestCancel(id);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  function handleDuplicate(id: string) {
    setRows((prev) => {
      const index = prev.findIndex((r) => r.id === id);
      if (index === -1) return prev;
      const copy: Reservation = { ...prev[index], id: crypto.randomUUID(), ref: nextRef(prev) };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  // Form submit — add inserts a new row, edit replaces the existing one in
  // place. The form leaves `id`/`ref` as empty strings in add mode (it has
  // no fields for them), so real values are assigned here, reusing the same
  // `nextRef` helper Duplicate uses. `intent` decides the resulting status
  // regardless of what mode produced the draft: "confirm" -> Confirmed,
  // "pending" -> Pending — the edit form only ever submits "confirm" (it has
  // no "save as pending" footer button), so saving an edit always confirms.
  function handleFormSubmit(draft: Reservation, intent: "pending" | "confirm") {
    const status: ReservationStatus = intent === "confirm" ? "Confirmed" : "Pending";
    if (formState?.mode === "add") {
      const row: Reservation = { ...draft, id: crypto.randomUUID(), ref: nextRef(rows), status };
      setRows((prev) => [...prev, row]);
    } else if (formState?.mode === "edit") {
      setRows((prev) => prev.map((r) => (r.id === formState.id ? { ...draft, id: r.id, ref: r.ref, status } : r)));
    }
    closeDialogs();
  }

  // Cancel confirm. "no-show" is not a cancellation — it sets status to
  // "No-show" and leaves the deposit untouched. A genuine cancellation
  // ("guest"/"restaurant") sets status: "Cancelled" with a cancelledAt
  // timestamp and the chosen reason, and refunds the deposit only when the
  // refund policy's tier is "full" or "partial" (never for "none", and
  // never when there's no deposit to refund).
  function handleCancelConfirm(id: string, payload: CancelPayload) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        if (payload.actionType === "no-show") {
          return { ...r, status: "No-show" };
        }
        const tier = refundPolicy(r, NOW_MINUTES).tier;
        const deposit =
          r.deposit && (tier === "full" || tier === "partial") ? { ...r.deposit, state: "refunded" as const } : r.deposit;
        return {
          ...r,
          status: "Cancelled" as const,
          cancelledAt: nowTimestampLabel(),
          cancelReason: payload.reason,
          deposit,
        };
      })
    );
    closeDialogs();
  }

  // Share Link (row's "..." menu, pending state) and Resend Link (the
  // detail dialog's link-sent/failed/expired footers) both stamp a fresh
  // payment link and move the deposit to "link-sent" — so the detail
  // dialog, if open, visibly moves to its link-sent state.
  function shareOrResendLink(id: string) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id || !r.deposit) return r;
        return { ...r, deposit: { ...r.deposit, state: "link-sent" }, paymentLink: freshPaymentLink(r) };
      })
    );
  }

  const allCountText = t("reservations.list.allCount").replace("{n}", String(visible.length));

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("reservations.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("reservations.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Printer size={14} />} onClick={() => window.print()}>
            {t("reservations.list.print")}
          </Button>
          <Button variant="primary" icon={<Plus size={14} />} onClick={openAddReservation}>
            {t("reservations.list.addNew")}
          </Button>
        </div>
      </header>

      <div className="mt-4">
        <KpiCards kpis={kpis} />
      </div>

      <div className="mt-4">
        <FilterBar filters={filters} onChange={setFilters} areas={areas} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{allCountText}</p>
        <div className="order-3 w-full sm:order-none sm:max-w-[360px] sm:flex-1 sm:px-6">
          <Input
            icon={<Search size={14} />}
            placeholder={t("common.search")}
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[var(--octo-text-muted)]">{t("reservations.list.sortedBy")}</span>
          <Select
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value as SortKey })}
            className="!w-auto !py-[7px]"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3">
        {visible.length === 0 ? (
          <EmptyState title={t("reservations.list.empty")} />
        ) : (
          // Rows are a fixed-column grid (see reservation-row.tsx) so they
          // scan as a table; this scrolls horizontally on narrow laptop
          // widths instead of squeezing the columns out of alignment.
          <div className="overflow-x-auto">
            <div className={clsx("flex flex-col gap-2.5", ROW_LIST_MIN_WIDTH)}>
              {visible.map((reservation) => (
                <ReservationRow
                  key={reservation.id}
                  reservation={reservation}
                  menu={openMenu?.id === reservation.id ? openMenu.menu : "none"}
                  onOpenMenu={(menu: RowMenu) => setOpenMenu(menu === "none" ? null : { id: reservation.id, menu })}
                  onOpen={() => openDetail(reservation.id)}
                  onEdit={() => openEdit(reservation.id)}
                  onStatus={(status) => handleStatus(reservation.id, status)}
                  onDuplicate={() => handleDuplicate(reservation.id)}
                  onSharePaymentLink={() => shareOrResendLink(reservation.id)}
                  onCancel={() => requestCancel(reservation.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <ReservationFormModal
        open={formState !== null}
        mode={formState?.mode ?? "add"}
        reservation={formReservation}
        onClose={closeDialogs}
        onSubmit={handleFormSubmit}
        onRequestCancel={() => {
          if (formState?.mode === "edit") requestCancel(formState.id);
        }}
      />

      <ReservationDetailModal
        open={detailId !== null}
        reservation={detailReservation}
        onClose={closeDialogs}
        onEdit={() => detailId && openEdit(detailId)}
        onCancel={() => detailId && requestCancel(detailId)}
        onResendLink={() => detailId && shareOrResendLink(detailId)}
        onShareLink={() => detailId && shareOrResendLink(detailId)}
      />

      <CancelReservationModal
        open={cancelId !== null}
        reservation={cancelReservation}
        onClose={closeDialogs}
        onConfirm={(payload) => cancelId && handleCancelConfirm(cancelId, payload)}
      />
    </div>
  );
}
