// The Reservations list — the module's home screen. Assembles the pieces
// built in Tasks 1-7 (fixture, model, KPI cards, filter bar, row) into the
// page the sidebar's "Reservations" link opens. Replaces the old KPI-tiles
// + quick-links hub outright.
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
import { EMPTY_FILTERS, deriveKpis, visibleRows, type ListFilters, type SortKey } from "./_shared/model";
import { ReservationRow, ROW_LIST_MIN_WIDTH, type RowMenu } from "./_shared/reservation-row";

const SORT_OPTIONS: readonly { value: SortKey; labelKey: string }[] = [
  { value: "time-asc", labelKey: "reservations.list.sort.timeEarliest" },
  { value: "time-desc", labelKey: "reservations.list.sort.timeLatest" },
  { value: "party", labelKey: "reservations.list.sort.partySize" },
  { value: "status", labelKey: "reservations.list.sort.status" },
];

// Only one row's Status/Actions popover is open at a time, across the whole
// list — held here rather than inside each row (see reservation-row.tsx).
type OpenMenu = { id: string; menu: "status" | "actions" } | null;

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

  const visible = useMemo(() => visibleRows(rows, filters), [rows, filters]);
  const kpis = useMemo(() => deriveKpis(visible), [visible]);
  const areas = useMemo(
    () => Array.from(new Set(rows.map((r) => r.area))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  // TODO(task-12): this should open the cancel dialog (built in Task 11)
  // instead of doing nothing. Both the row's Status menu and its "..." menu
  // route their Cancel choice through here rather than setting
  // status: "Cancelled" directly, so neither silently cancels a booking.
  function requestCancel(_id: string) {
    // no-op until Task 12 wires the cancel dialog to this seam
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

  // Stubs for the pieces later tasks still have to build. Wiring them here
  // now would mean inventing UI this task was not asked to build.
  // TODO(task-10): open the reservation detail dialog.
  function openDetail(_id: string) {}
  // TODO(task-9): open the edit form, pre-filled for this reservation.
  function openEdit(_id: string) {}
  // TODO(task-9): open the add-reservation form.
  function openAddReservation() {}
  // TODO(task-12): actually share the payment link (SMS/WhatsApp/email).
  function sharePaymentLink(_id: string) {}

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
                  onSharePaymentLink={() => sharePaymentLink(reservation.id)}
                  onCancel={() => requestCancel(reservation.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
