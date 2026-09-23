// The Reservations list — the module's home screen. Assembles the pieces
// built in Tasks 1-7 (fixture, model, KPI cards, filter bar, row) into the
// page the sidebar's "Reservations" link opens. Replaces the old KPI-tiles
// + quick-links hub outright. Task 12 wires in the three dialogs built in
// Tasks 9-11 (add/edit form, detail, cancel) — the module's last seam.
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Plus, Printer, Search, Settings } from "lucide-react";
import { getReservationContactLink, getReservationDaySummary, type ReservationCancellationPreviewResponse } from "@octopus/api-client";
import { Button, EmptyState, Input, Select } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { TODAY, type Reservation, type ReservationStatus } from "@/shared/api/mock-reservations";
import { useReservationActions, useReservations, useReservationsStatus } from "./_shared/reservations-store";
import { describeReservationError, isExpiredReservation, isSlotTakenError } from "./_shared/reservations-api";
import { NEW_RESERVATION_PATH } from "./_shared/paths";
import { KpiCards } from "./_shared/kpi-cards";
import { FilterBar } from "./_shared/filter-bar";
import {
  applyCancel,
  applyDuplicate,
  applyFormSubmit,
  applyShareLink,
  deriveKpis,
  effectiveDate,
  EMPTY_FILTERS,
  formatDisplayDate,
  visibleRows,
  type CancelPayload,
  type ListFilters,
  type SortKey,
} from "./_shared/model";
import { ReservationRow, ROW_LIST_MIN_WIDTH, type RowMenu } from "./_shared/reservation-row";
import { ReservationFormModal } from "./modals/reservation-form-modal";
import { ReservationDetailModal } from "./modals/reservation-detail-modal";
import { CancelReservationModal } from "./modals/cancel-reservation-modal";
import { ReservationSettingsModal } from "./modals/reservation-settings-modal";
import { buildIcs, reminderMessage, whatsappHref } from "./_shared/guest-actions";
import { downloadFile } from "./_shared/download";

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
// `tab` lets the row menu's "Add Note" open the edit form straight onto Notes.
type FormTab = "details" | "guest" | "notes";
type FormState = { mode: "add" } | { mode: "edit"; id: string; tab?: FormTab } | null;

export function ReservationsPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  // Held in a module store, not component state: the Add page is its own
  // route and must be able to append a row this page then shows.
  const [rows] = useReservations();
  const status = useReservationsStatus();
  const actions = useReservationActions();
  const [actionError, setActionError] = useState<string | null>(null);
  // A failed call shows in the banner instead of being dropped.
  function run(job: Promise<unknown>) {
    setActionError(null);
    job.catch((err) => setActionError(describeReservationError(err)));
  }
  const [filters, setFilters] = useState<ListFilters>(() => ({ ...EMPTY_FILTERS, date: TODAY }));
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);

  // Dialog state — see FormState above. `detailId`/`cancelId` are null
  // whenever the form is open and vice versa; every opener below clears the
  // other two so at most one dialog is ever visible.
  const [formState, setFormState] = useState<FormState>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  // The dialog's own re-derivation of the refund policy could disagree with
  // the business's real bands — null while it's loading, so the dialog falls
  // back to that local guess only until the server's answer lands.
  const [cancelPreview, setCancelPreview] = useState<ReservationCancellationPreviewResponse | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const visible = useMemo(() => visibleRows(rows, filters), [rows, filters]);
  const localKpis = useMemo(() => deriveKpis(visible), [visible]);

  // The list's own rows are whatever page happened to load — the day summary
  // asks the server directly, so the cards read correctly even past a page
  // boundary (BACKEND_GAPS 4.10/4.11). Only meaningful for an unfiltered day:
  // status/area/source/query narrow `visible` in ways the summary endpoint
  // doesn't know about, so those keep the locally-derived counts.
  const { activeBusinessId } = useAuth();
  const day = effectiveDate(filters);
  const dayOnly = !filters.status && !filters.area && !filters.source && !filters.query.trim();
  const [daySummary, setDaySummary] = useState<{ date: string; total: number; byStatus: Record<string, number> } | null>(null);

  useEffect(() => {
    if (!activeBusinessId || !dayOnly) return;
    let cancelled = false;
    getReservationDaySummary(activeBusinessId, day)
      .then((res) => {
        if (!cancelled) setDaySummary({ date: day, ...res });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, day, dayOnly]);

  const kpis = useMemo(() => {
    if (!dayOnly || !daySummary || daySummary.date !== day) return localKpis;
    const count = (...serverKeys: string[]) =>
      serverKeys.reduce((sum, k) => sum + (daySummary.byStatus[k] ?? 0), 0);
    const total = daySummary.total;
    const confirmed = count("Confirmed");
    const pending = count("Pending", "Expired");
    const cancelled = count("Cancelled");
    const noShow = count("NoShow");
    const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100 * 100) / 100);
    return {
      total,
      confirmed,
      pending,
      cancelled,
      noShow,
      confirmedPct: pct(confirmed),
      pendingPct: pct(pending),
      cancelledPct: pct(cancelled),
      noShowPct: pct(noShow),
    };
  }, [dayOnly, daySummary, day, localKpis]);
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
  // Adding is a full page now: details, then picking the table on the floor.
  function openAddReservation() {
    navigate(NEW_RESERVATION_PATH);
  }

  function openEdit(id: string, tab?: FormTab) {
    setDetailId(null);
    setCancelId(null);
    setFormState({ mode: "edit", id, tab });
  }

  function openDetail(id: string) {
    setFormState(null);
    setCancelId(null);
    setDetailId(id);
    // The list only carries the deposit's terms (required/paid-or-not); the
    // real link, method, paid-on and transaction id live in its payment
    // attempts, fetched only now that the dialog showing them is opening.
    const row = rows.find((r) => r.id === id);
    if (row?.deposit) run(actions.refreshDeposit(row));
    // Same reasoning for confirmedOn/confirmedMethod: a createdAtUtc guess
    // until the activity log's real "Confirmed" entry replaces it here.
    if (row?.confirmedOn) run(actions.refreshConfirmed(row));
  }

  // Both the row's Status menu and its "..." menu, plus the edit form's and
  // detail dialog's own "Cancel Reservation" buttons, route their choice
  // through here rather than setting status: "Cancelled" directly — so
  // nothing silently cancels a booking without the confirm dialog.
  function requestCancel(id: string) {
    setFormState(null);
    setDetailId(null);
    setCancelId(id);
    setCancelPreview(null);
    const row = rows.find((r) => r.id === id);
    if (row) actions.previewCancel(row).then(setCancelPreview, () => setCancelPreview(null));
  }

  function closeDialogs() {
    setFormState(null);
    setDetailId(null);
    setCancelId(null);
    setCancelPreview(null);
  }

  // Every state transition below is a pure `(rows, ...) => Reservation[]`
  // reducer imported from _shared/model.ts (fix round 4, task A) — these
  // handlers just route the page's dialog-driven events into them and
  // manage which dialog is open. See model.test.ts for the transitions
  // themselves under test.
  function handleStatus(id: string, status: ReservationStatus) {
    if (status === "Cancelled") {
      requestCancel(id);
      return;
    }
    const row = rows.find((r) => r.id === id);
    if (row) run(actions.setStatus(row, status));
  }

  function handleDuplicate(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row) run(actions.duplicate(row));
  }

  function handleFormSubmit(
    draft: Reservation,
    intent: "pending" | "confirm",
    resourceId: string | null
  ): Promise<void> | void {
    const before = formState?.mode === "edit" ? rows.find((r) => r.id === formState.id) : null;
    if (!before) {
      run(actions.create({ draft, intent }));
      closeDialogs();
      return;
    }
    // An edit waits for the server so a refused new time can be answered in
    // the dialog itself, with the nearest free times (see the form modal).
    setActionError(null);
    return actions.update(before, draft, resourceId).then(closeDialogs, (err: unknown) => {
      if (isSlotTakenError(err)) throw err;
      setActionError(describeReservationError(err));
      closeDialogs();
    });
  }

  function handleCancelConfirm(id: string, payload: CancelPayload) {
    const row = rows.find((r) => r.id === id);
    if (row) run(actions.cancel(row, payload));
    closeDialogs();
  }

  // Share Link (row's "..." menu, pending state) and Resend Link (the
  // detail dialog's link-sent/failed/expired footers) both stamp a fresh
  // payment link and move the deposit to "link-sent" — so the detail
  // dialog, if open, visibly moves to its link-sent state.
  function shareOrResendLink(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row) run(actions.shareLink(row));
  }

  function recordCash(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row) run(actions.recordCash(row));
  }

  function requestWaiveDeposit(id: string, reason: string) {
    const row = rows.find((r) => r.id === id);
    if (row) run(actions.waiveDeposit(row, reason));
  }

  function issueRefund(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row) run(actions.issueRefund(row));
  }

  function recheckDeposit(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row) run(actions.recheckDeposit(row));
  }

  // Row menu actions that reach outside the app. The calendar entry needs no
  // server: it downloads as an .ics file any calendar app imports.
  //
  // The reminder used to build its own wa.me link and message text locally.
  // getReservationContactLink asks the server for both instead (the
  // business's own template, not a hardcoded one) — see BACKEND_GAPS 4's
  // "official contact link" note. The tab opens synchronously, before the
  // await, so the browser doesn't treat it as an unrequested popup; it falls
  // back to the local link only if the server call fails.
  function sendReminder(r: Reservation) {
    const win = window.open("", "_blank", "noopener,noreferrer");
    const fallback = () => {
      if (win) win.location.href = whatsappHref(r.phone, reminderMessage(t, r, locale));
    };
    if (!activeBusinessId) return fallback();
    getReservationContactLink(activeBusinessId, r.id, locale)
      .then((link) => {
        if (win) win.location.href = link.url;
      })
      .catch(fallback);
  }

  function exportToCalendar(r: Reservation) {
    downloadFile("reservation-" + r.ref + ".ics", buildIcs(t, r), "text/calendar;charset=utf-8");
  }

  const allCountText = t("reservations.list.allCount").replace("{n}", String(visible.length));

  // KPI card 1's label. The frame reads "Today's Reservations"; once
  // another day is picked it names that day instead, since the numbers are
  // scoped to whatever day filter is active.
  const kpiTotalLabel =
    filters.day === "today"
      ? t("reservations.list.kpi.today")
      : t("reservations.list.kpi.forDay").replace(
          "{day}",
          filters.day === "tomorrow" ? t("reservations.list.filter.tomorrow") : formatDisplayDate(filters.date, locale)
        );

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
          <Button variant="secondary" icon={<Settings size={14} />} onClick={() => setSettingsOpen(true)} aria-label={t("reservations.settings.title")} />
          <Button variant="secondary" icon={<Printer size={14} />} onClick={() => window.print()}>
            {t("reservations.list.print")}
          </Button>
          <Button variant="primary" icon={<Plus size={14} />} onClick={openAddReservation}>
            {t("reservations.list.addNew")}
          </Button>
        </div>
      </header>

      <ReservationSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {(status.error || actionError) && (
        <div role="alert" className="mt-4 flex items-center justify-between gap-3 rounded-[10px] bg-error/10 px-4 py-2.5 text-[13px] text-error">
          <span>{actionError ?? status.error}</span>
          {status.error && !actionError && (
            <button type="button" className="shrink-0 underline" onClick={status.reload}>
              Retry
            </button>
          )}
        </div>
      )}

      <div className="mt-4">
        <KpiCards kpis={kpis} totalLabel={kpiTotalLabel} />
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
          // scan as a table. Below ~1420px the grid's floor no longer fits
          // beside the sidebar, so the list scrolls horizontally instead of
          // squeezing columns out of alignment. Wider than that there is no
          // scroll container at all: overflow-x:auto forces overflow-y to
          // auto too, which clipped the row menus that open downward.
          <div className="max-[1419px]:overflow-x-auto">
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
                  onAddNote={() => openEdit(reservation.id, "notes")}
                  onSendReminder={() => sendReminder(reservation)}
                  onExportCalendar={() => exportToCalendar(reservation)}
                  onSharePaymentLink={() => shareOrResendLink(reservation.id)}
                  onCancel={() => requestCancel(reservation.id)}
                  onToggleHidden={() => run(actions.setHidden(reservation, !reservation.hidden))}
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
        onViewPayment={() => {
          if (formState?.mode === "edit") openDetail(formState.id);
        }}
        initialTab={formState?.mode === "edit" ? (formState.tab ?? "details") : "details"}
      />

      <ReservationDetailModal
        open={detailId !== null}
        reservation={detailReservation}
        onClose={closeDialogs}
        onEdit={() => detailId && openEdit(detailId)}
        onCancel={() => detailId && requestCancel(detailId)}
        onResendLink={() => detailId && shareOrResendLink(detailId)}
        onShareLink={() => detailId && shareOrResendLink(detailId)}
        onRecordCash={() => detailId && recordCash(detailId)}
        onWaiveDeposit={(reason) => detailId && requestWaiveDeposit(detailId, reason)}
        onIssueRefund={() => detailId && issueRefund(detailId)}
        onRecheckDeposit={() => detailId && recheckDeposit(detailId)}
        expired={detailId !== null && isExpiredReservation(detailId)}
        onReinstate={() => {
          const row = detailId ? rows.find((r) => r.id === detailId) : undefined;
          if (row) run(actions.reinstate(row));
        }}
      />

      <CancelReservationModal
        open={cancelId !== null}
        reservation={cancelReservation}
        preview={cancelPreview}
        onClose={closeDialogs}
        onConfirm={(payload) => cancelId && handleCancelConfirm(cancelId, payload)}
      />
    </div>
  );
}
