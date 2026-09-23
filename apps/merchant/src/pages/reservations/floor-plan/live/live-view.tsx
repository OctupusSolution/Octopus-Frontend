// The floor a host works from during service: every table in its live colour,
// the running counts, and what is happening at the table they pick.
import { useCallback, useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Boxes, CalendarCheck, ClipboardList, FilePen, Maximize2, MessageCircle, MoveHorizontal, PencilRuler, Search, SearchX, X } from "lucide-react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import {
  availabilitySummary,
  createBooking,
  defaultSlot,
  isAvailable,
  tableAvailability,
  zoneForTable,
  type Availability,
  type FloorItem,
  type FloorTable,
  type LiveStatus,
  type PublishedFloorPlan,
} from "@/entities/floor-plan";
import { PlanViewport, type ItemKind, type ZoomSetting } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { ConfirmModal } from "../_shared/confirm-modal";
import { DraftBanner } from "../_shared/draft-banner";
import { Dropdown, MenuItem } from "../_shared/dropdown";
import { PageHeader, PageShell } from "../_shared/page-header";
import { QUICK_BOX_PATH, SCRATCH_PATH, scratchPath } from "../_shared/paths";
import { PlanSummaryCard } from "../_shared/plan-summary-card";
import { StatusLegend } from "../_shared/status-legend";
import { ToastBanner, useToast } from "../_shared/toast";
import { useBookings, useFloorPlan, useLiveTables } from "../_shared/use-floor-plan";
import { BookTableModal } from "./book-table-modal";
import { BookingBar, BookingTablePanel, type SlotQuery } from "./booking-bar";
import { SendMessageModal, UpdateTableForm, ViewOrderModal } from "./live-modals";
import { TableDetailCard } from "./table-detail-card";

const TABLES_ONLY: ReadonlySet<ItemKind> = new Set(["table"]);
const ZOOM_STEPS = [50, 75, 100, 125, 150, 200];

type ModalId = "update" | "message" | "order" | "discard" | "editConflict" | "book";

export function LiveFloorPlan({ published }: { published: PublishedFloorPlan }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { activeBusiness } = useTenantConfig();
  const { draft, discardDraft } = useFloorPlan();
  const doc = published.doc;
  const live = useLiveTables(doc);
  const { toast, notify } = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [zoneId, setZoneId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<LiveStatus | null>(null);
  const [zoom, setZoom] = useState<ZoomSetting>({ mode: "fit" });
  const [percent, setPercent] = useState(100);
  const [modal, setModal] = useState<ModalId | null>(null);
  const [pendingEdit, setPendingEdit] = useState<"scratch" | "quick">("scratch");
  const [bookingMode, setBookingMode] = useState(false);
  const [slotQuery, setSlotQuery] = useState<SlotQuery>(() => ({ at: defaultSlot(Date.now()), partySize: 2 }));
  const { bookings, addBooking, removeBooking } = useBookings();

  const selected = selectedId ? live.byId.get(selectedId) ?? null : null;
  const q = query.trim().toLowerCase();

  const matches = useMemo(
    () =>
      live.entries.filter((entry) => {
        const zone = zoneForTable(doc, entry.table);
        return (
          (!q || entry.table.number.toLowerCase().includes(q) || entry.state.guestName.toLowerCase().includes(q)) &&
          (zoneId === "all" || zone?.id === zoneId) &&
          (!statusFilter || entry.state.status === statusFilter)
        );
      }),
    [live.entries, doc, q, zoneId, statusFilter]
  );

  const filtering = Boolean(q) || zoneId !== "all" || statusFilter !== null;
  const dimmedIds = useMemo(() => {
    if (!filtering) return new Set<string>();
    const matched = new Set(matches.map((m) => m.table.id));
    const dimmed = new Set(live.entries.filter((e) => !matched.has(e.table.id)).map((e) => e.table.id));
    if (zoneId !== "all") for (const zone of doc.zones) if (zone.id !== zoneId) dimmed.add(zone.id);
    return dimmed;
  }, [filtering, matches, live.entries, zoneId, doc.zones]);

  // A search that narrows the floor to a single table opens that table.
  useEffect(() => {
    if (q && matches.length === 1) {
      setSelectedId(matches[0].table.id);
      setDetailOpen(true);
    }
  }, [q, matches]);

  const availability = useMemo(() => {
    const map = new Map<string, Availability>();
    for (const entry of live.entries) map.set(entry.table.id, tableAvailability(entry.table, slotQuery, bookings));
    return map;
  }, [live.entries, slotQuery, bookings]);

  const bookingSummary = useMemo(
    () => availabilitySummary(live.entries.map((entry) => ({ table: entry.table, availability: availability.get(entry.table.id) ?? "booked" }))),
    [live.entries, availability]
  );

  // Booking mode repaints the floor as a yes/no answer for the chosen slot;
  // otherwise every table shows what is happening at it right now.
  const toneFor = useCallback(
    (table: FloorTable): LiveStatus => {
      if (bookingMode) return isAvailable(availability.get(table.id) ?? "booked") ? "available" : "occupied";
      return live.byId.get(table.id)?.state.status ?? (table.blocked ? "blocked" : "available");
    },
    [bookingMode, availability, live.byId]
  );
  const selectedIds = useMemo(() => new Set(selectedId ? [selectedId] : []), [selectedId]);

  function openEditor(target: "scratch" | "quick") {
    if (draft) {
      setPendingEdit(target);
      setModal("editConflict");
      return;
    }
    navigate(target === "quick" ? QUICK_BOX_PATH : scratchPath("live"));
  }

  const zoomLabel =
    zoom.mode === "fit" ? t("floorPlan.live.fitView") : zoom.mode === "fitWidth" ? t("floorPlan.live.fitWidth") : t("floorPlan.live.customZoom");
  const subtitle = [activeBusiness?.businessName?.trim(), doc.name].filter(Boolean).join(". ");
  const selectedZone = selected ? zoneForTable(doc, selected.table) : undefined;

  return (
    <PageShell>
      <PageHeader title={t("floorPlan.live.title")} subtitle={subtitle} />

      {draft && (
        <DraftBanner
          className="mt-6"
          draft={draft}
          onContinue={() => navigate(draft.method === "quick" ? QUICK_BOX_PATH : SCRATCH_PATH)}
          onDiscard={() => setModal("discard")}
        />
      )}

      <PlanSummaryCard
        className="mt-6"
        published={published}
        draft={null}
        action={
          <button
            type="button"
            onClick={() => openEditor("scratch")}
            className="h-12 w-full rounded-[10px] bg-[#0D6EFD] px-8 text-[16px] font-semibold text-white transition-opacity hover:opacity-90 lg:w-auto"
          >
            {t("floorPlan.live.edit")}
          </button>
        }
      />

      {bookingMode ? (
        <BookingBar className="mt-5" query={slotQuery} onQueryChange={setSlotQuery} summary={bookingSummary} now={live.now} />
      ) : (
        <StatusLegend
          className="mt-5"
          counts={live.counts}
          active={statusFilter}
          onToggle={(status) => setStatusFilter((current) => (current === status ? null : status))}
        />
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-[1_1_320px]">
          <span className="sr-only">{t("floorPlan.live.search")}</span>
          <Search size={20} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--octo-text-secondary)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("floorPlan.live.search")}
            className="h-11 w-full rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] pe-10 ps-11 text-[14.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-muted)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("floorPlan.live.clearSearch")}
              className="absolute end-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]"
            >
              <X size={15} />
            </button>
          )}
        </label>

        <button
          type="button"
          aria-pressed={bookingMode}
          onClick={() => {
            setBookingMode((on) => !on);
            setStatusFilter(null);
          }}
          className={clsx(
            "flex h-11 items-center gap-2 rounded-[10px] border px-3.5 text-[14.5px] font-medium transition-colors",
            bookingMode
              ? "border-[#0D6EFD] bg-[#0D6EFD]/[0.08] text-[#0D6EFD]"
              : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
          )}
        >
          <CalendarCheck size={18} />
          {t("floorPlan.booking.mode")}
        </button>

        <Dropdown
          label={zoneId === "all" ? t("floorPlan.live.allZones") : doc.zones.find((z) => z.id === zoneId)?.name ?? t("floorPlan.live.allZones")}
          buttonClassName="min-w-[150px]"
        >
          {(close) => (
            <>
              <MenuItem label={t("floorPlan.live.allZones")} selected={zoneId === "all"} onClick={() => { setZoneId("all"); close(); }} />
              {doc.zones.map((zone) => (
                <MenuItem key={zone.id} label={zone.name} selected={zoneId === zone.id} onClick={() => { setZoneId(zone.id); close(); }} />
              ))}
              {doc.zones.length === 0 && <p className="px-2.5 py-2 text-[12.5px] text-[var(--octo-text-muted)]">{t("floorPlan.live.noZones")}</p>}
            </>
          )}
        </Dropdown>

        <Dropdown label={zoomLabel} buttonClassName="min-w-[140px]">
          {(close) => (
            <>
              <MenuItem icon={<Maximize2 size={15} />} label={t("floorPlan.live.fitView")} selected={zoom.mode === "fit"} onClick={() => { setZoom({ mode: "fit" }); close(); }} />
              <MenuItem icon={<MoveHorizontal size={15} />} label={t("floorPlan.live.fitWidth")} selected={zoom.mode === "fitWidth"} onClick={() => { setZoom({ mode: "fitWidth" }); close(); }} />
            </>
          )}
        </Dropdown>

        <Dropdown label={`${percent}%`} buttonClassName="min-w-[104px]">
          {(close) =>
            ZOOM_STEPS.map((step) => (
              <MenuItem
                key={step}
                label={`${step}%`}
                selected={zoom.mode === "percent" && zoom.percent === step}
                onClick={() => {
                  setZoom({ mode: "percent", percent: step });
                  close();
                }}
              />
            ))
          }
        </Dropdown>

        <Dropdown label={t("floorPlan.live.editInBuilder")} buttonClassName="min-w-[180px]" panelClassName="w-[280px]">
          {(close) => (
            <>
              <MenuItem
                icon={<PencilRuler size={15} />}
                label={t("floorPlan.live.menu.builder")}
                description={t("floorPlan.live.menu.builderHint")}
                onClick={() => { close(); openEditor("scratch"); }}
              />
              <MenuItem
                icon={<Boxes size={15} />}
                label={t("floorPlan.live.menu.quick")}
                description={t("floorPlan.live.menu.quickHint")}
                onClick={() => { close(); openEditor("quick"); }}
              />
            </>
          )}
        </Dropdown>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        <div className="relative overflow-hidden rounded-[22px] border-[3px] border-[#1F2937] bg-white">
          <PlanViewport
            doc={doc}
            zoom={zoom}
            onScaleChange={setPercent}
            className="h-[clamp(520px,calc(100vh-220px),1100px)]"
            toneFor={toneFor}
            showSeats={bookingMode}
            showBackground={false}
            selectedIds={selectedIds}
            dimmedIds={dimmedIds}
            interactive={TABLES_ONLY}
            onItemPointerDown={(_event: ReactPointerEvent<SVGGElement>, item: FloorItem) => {
              setSelectedId(item.id);
              setDetailOpen(true);
            }}
            onBackgroundPointerDown={() => {
              setSelectedId(null);
              setDetailOpen(false);
            }}
          />
          {filtering && matches.length === 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
              <span className="flex items-center gap-2 rounded-full bg-[#111827]/85 px-4 py-2 text-[13px] font-medium text-white shadow-lg">
                <SearchX size={15} />
                {t("floorPlan.live.noMatches")}
              </span>
            </div>
          )}
          {live.entries.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="rounded-full bg-[#111827]/80 px-4 py-2 text-[13px] font-medium text-white">{t("floorPlan.live.noTables")}</span>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={detailOpen && selected !== null}
        onClose={() => setDetailOpen(false)}
        title={bookingMode ? selected?.table.number : undefined}
        className="max-w-md"
      >
        {bookingMode ? (
          <BookingTablePanel
            entry={selected}
            availability={selected ? availability.get(selected.table.id) ?? "booked" : null}
            bookings={bookings}
            query={slotQuery}
            onBook={() => setModal("book")}
            onCancelBooking={(booking) => {
              removeBooking(booking.id);
              notify(t("floorPlan.booking.cancelled").replace("{number}", selected?.table.number ?? ""), "info");
            }}
          />
        ) : (
          selected && (
            <div className="flex flex-col gap-4">
              <TableDetailCard entry={selected} zoneName={selectedZone?.name} now={live.now} />
              <UpdateTableForm
                entry={selected}
                now={live.now}
                embedded
                onSave={(state) => {
                  live.setTableState(selected.table.id, state);
                  notify(t("floorPlan.live.update.saved").replace("{number}", selected.table.number));
                }}
                onReset={() => {
                  live.clearTableState(selected.table.id);
                  notify(t("floorPlan.live.update.resetDone").replace("{number}", selected.table.number), "info");
                }}
              />
              <button
                type="button"
                disabled={!(selected.state.status === "occupied" || selected.state.status === "reserved")}
                onClick={() => setModal("message")}
                className="flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-[#DCFCE7] text-[17px] font-semibold text-[#15803D] transition-colors hover:bg-[#CBF5D8] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageCircle size={22} />
                {t("floorPlan.live.detail.sendMessage")}
              </button>
              <button
                type="button"
                disabled={!selected.state.orderId || selected.state.status !== "occupied"}
                onClick={() => setModal("order")}
                className={clsx(
                  "flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-[var(--octo-seg-bg)] text-[17px] font-semibold text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-track)] disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <ClipboardList size={22} />
                {t("floorPlan.live.detail.viewOrder")}
              </button>
            </div>
          )
        )}
      </Modal>
      <SendMessageModal
        open={modal === "message"}
        entry={selected}
        onClose={() => setModal(null)}
        onSent={(name) => {
          setModal(null);
          notify(t("floorPlan.live.message.sent").replace("{name}", name));
        }}
      />
      <ViewOrderModal open={modal === "order"} entry={selected} onClose={() => setModal(null)} />
      <BookTableModal
        open={modal === "book"}
        table={selected?.table ?? null}
        query={slotQuery}
        onClose={() => setModal(null)}
        onConfirm={({ guestName, partySize }) => {
          if (!selected) return;
          addBooking(createBooking(selected.table.id, slotQuery.at, partySize, guestName));
          setModal(null);
          notify(t("floorPlan.booking.booked").replace("{number}", selected.table.number).replace("{name}", guestName));
        }}
      />

      <ConfirmModal
        open={modal === "discard"}
        onClose={() => setModal(null)}
        tone="danger"
        icon={<FilePen size={20} />}
        title={t("floorPlan.draft.discardTitle")}
        body={t("floorPlan.draft.discardBodyLive")}
        actions={[
          { label: t("floorPlan.common.cancel"), variant: "secondary", onClick: () => setModal(null) },
          {
            label: t("floorPlan.draft.discard"),
            variant: "danger",
            onClick: () => {
              discardDraft();
              setModal(null);
              notify(t("floorPlan.draft.discarded"), "info");
            },
          },
        ]}
      />
      <ConfirmModal
        open={modal === "editConflict"}
        onClose={() => setModal(null)}
        tone="warning"
        icon={<FilePen size={20} />}
        title={t("floorPlan.hub.replaceDraft.title")}
        body={t("floorPlan.hub.replaceDraft.body")}
        actions={[
          {
            label: t("floorPlan.hub.replaceDraft.discard"),
            variant: "secondary",
            onClick: () => {
              discardDraft();
              setModal(null);
              navigate(pendingEdit === "quick" ? QUICK_BOX_PATH : scratchPath("live"));
            },
          },
          {
            label: t("floorPlan.draft.continue"),
            onClick: () => {
              setModal(null);
              if (draft) navigate(draft.method === "quick" ? QUICK_BOX_PATH : SCRATCH_PATH);
            },
          },
        ]}
      />
      <ToastBanner toast={toast} />
    </PageShell>
  );
}
