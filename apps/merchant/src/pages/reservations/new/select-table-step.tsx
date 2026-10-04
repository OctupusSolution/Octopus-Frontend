// Step 2 of adding a reservation: pick the table on the real floor plan.
// Tables are coloured by whether they can take THIS booking — its date, time
// and party size — using the floor plan's own availability rules and the
// bookings it already holds, so the choice here is one Floor Plan agrees with.
import { useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import { itemRect, sampleLayout, type FloorPlanDoc, type FloorTable, type LiveStatus } from "@/entities/floor-plan";
import { PlanSvg, PlanViewport, TABLE_TONES, type ItemKind } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { areaLabel } from "@/pages/reservations/floor-plan/_shared/labels";
import { useBookings, useFloorPlan, useLiveTables } from "@/pages/reservations/floor-plan/_shared/use-floor-plan";
import { clock12, formatDisplayDate, guestsText, hoursMinutesParts } from "../_shared/model";
import type { DraftState } from "../_shared/reservation-form";
import {
  BORDER_200,
  BORDER_300,
  SURFACE_BRAND_LIGHT,
  SURFACE_INFO,
  SURFACE_RED_LIGHT,
  SURFACE_WHITE,
  TEXT_BRAND,
  TEXT_BRAND_DEEP,
  TEXT_ERROR,
  TEXT_PRIMARY,
  TEXT_SEC_GRAY,
  TEXT_SECONDARY,
} from "../_shared/theme";
import {
  croppedToContent,
  NEAR_TIME_MS,
  rankTables,
  slotAt,
  tableOptions,
  toneFor,
  unavailableReason,
  type TableOption,
} from "./table-picking";

const TABLES_ONLY: ReadonlySet<ItemKind> = new Set(["table"]);
const ALL_AREAS = "all";
/** The legend the frame draws, in its order. */
const LEGEND: readonly LiveStatus[] = ["reserved", "available", "cleaning", "occupied"];

const TOOLBAR_CONTROL = "h-10 rounded-[8px] border text-[14px] font-medium leading-[14px] transition-colors";
const TOOLBAR_IDLE = `${BORDER_200} ${SURFACE_WHITE} ${TEXT_SECONDARY} hover:bg-[var(--octo-hover)]`;
const PANEL_TITLE = `text-[14px] font-semibold leading-[14px] ${TEXT_PRIMARY}`;
const META_TEXT = `text-[12px] font-medium leading-3 ${TEXT_SECONDARY}`;

/** Everything both the step and the page's footer need to know about tables
 *  for this draft. Called by the page so its Create button and this step agree. */
export function useTablePicking(draft: DraftState) {
  const { published } = useFloorPlan();
  const doc = useMemo(() => croppedToContent(published?.doc ?? sampleLayout()), [published]);
  const { bookings } = useBookings();
  const live = useLiveTables(doc);

  const at = slotAt(draft.date, draft.time);
  const nearNow = Math.abs(at - live.now) <= NEAR_TIME_MS;

  const options = useMemo(
    () => tableOptions(doc, { at, partySize: draft.partySize }, bookings),
    [doc, at, draft.partySize, bookings]
  );
  const byId = useMemo(() => new Map(options.map((option) => [option.table.id, option])), [options]);
  const preferredZoneId = doc.zones.find((zone) => zone.name === draft.area)?.id ?? null;

  const toneOf = (option: TableOption): LiveStatus =>
    toneFor(option, nearNow ? (live.byId.get(option.table.id)?.state.status ?? null) : null);
  const selectable = (option: TableOption) => toneOf(option) === "available";

  const ranked = (excludeId: string | null = null) =>
    rankTables(options.filter(selectable), { partySize: draft.partySize, preferredZoneId, excludeId });

  /** The guest's preferred table if it's free, else the best-ranked one. */
  const best = (preferredNumber: string): TableOption | null =>
    options.find((option) => option.table.number === preferredNumber && selectable(option)) ?? ranked()[0] ?? null;

  return { doc, options, byId, at, preferredZoneId, toneOf, selectable, ranked, best };
}

export type TablePicking = ReturnType<typeof useTablePicking>;

export function SelectTableStep({
  picking,
  draft,
  selectedId,
  onSelect,
  onEditDetails,
}: {
  picking: TablePicking;
  draft: DraftState;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onEditDetails: () => void;
}) {
  const { t, locale } = useI18n();
  // Opens on the whole floor, as the frame does. Dimming everything outside
  // the guest's preferred area from the start hid most of the options.
  const [zoneId, setZoneId] = useState<string>(ALL_AREAS);
  const [fitsOnly, setFitsOnly] = useState(false);
  // Bumped by "Fit View": remounting the viewport re-fits it and resets scroll.
  const [viewKey, setViewKey] = useState(0);

  const selected = selectedId ? (picking.byId.get(selectedId) ?? null) : null;
  const alternatives = picking.ranked(selectedId).slice(0, 3);

  // Picking a table outside the area being viewed switches to its area, so
  // the selection never lands somewhere dimmed.
  function pick(id: string | null) {
    const option = id ? picking.byId.get(id) : null;
    if (option && zoneId !== ALL_AREAS && option.zoneId !== zoneId) setZoneId(option.zoneId ?? ALL_AREAS);
    onSelect(id);
  }

  const dimmedIds = useMemo(() => {
    const dimmed = new Set<string>();
    for (const option of picking.options) {
      const outside = zoneId !== ALL_AREAS && option.zoneId !== zoneId;
      if (outside || (fitsOnly && !picking.selectable(option))) dimmed.add(option.table.id);
    }
    if (zoneId !== ALL_AREAS) for (const zone of picking.doc.zones) if (zone.id !== zoneId) dimmed.add(zone.id);
    return dimmed;
    // picking.selectable is recreated each render; options captures its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneId, fitsOnly, picking.options, picking.doc]);

  const selectedIds = useMemo(() => new Set(selectedId ? [selectedId] : []), [selectedId]);

  const { h, m } = hoursMinutesParts(draft.durationMinutes);
  const durationText = m === 0 ? t("reservations.table.hoursShort").replace("{h}", String(h)) : t("reservations.cancel.hoursMinutes").replace("{h}", String(h)).replace("{m}", String(m));

  return (
    <div>
      {/* Toolbar: area, filter, fit, legend */}
      <div className={`flex flex-wrap items-center gap-2 rounded-[12px] border ${BORDER_200} bg-[#fbfafc] px-4 py-1 [[data-theme=dark]_&]:bg-[var(--octo-hover)]`}>
        {picking.doc.zones.length > 0 && (
          <span className="relative inline-flex">
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              aria-label={t("reservations.form.areaPreference")}
              className={clsx(TOOLBAR_CONTROL, TOOLBAR_IDLE, "cursor-pointer appearance-none pe-12 ps-4 outline-none focus:border-[#0d6efd]")}
            >
              <option value={ALL_AREAS}>{t("reservations.list.filter.allAreas")}</option>
              {picking.doc.zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
            <ShellIcon name="form-arrow-down.svg" className="pointer-events-none absolute end-4 top-2 text-[#687280]" />
          </span>
        )}
        <ToolbarButton active={fitsOnly} onClick={() => setFitsOnly((v) => !v)} title={t("reservations.table.filterOn")}>
          <ShellIcon name="filter.svg" className={fitsOnly ? undefined : TEXT_SEC_GRAY} />
          {t("reservations.table.filter")}
        </ToolbarButton>
        <ToolbarButton onClick={() => setViewKey((k) => k + 1)}>
          <ShellIcon name="rsv-add-fit-view.svg" className={TEXT_SEC_GRAY} />
          {t("reservations.table.fitView")}
        </ToolbarButton>
        {/* The chips take the canvas's own tones, so the legend always names
            the colours the tables are actually drawn in. */}
        {LEGEND.map((status) => (
          <span
            key={status}
            className="inline-flex h-10 items-center gap-1 whitespace-nowrap rounded-[4px] p-2 text-[14px] font-medium leading-[14px]"
            style={{ color: TABLE_TONES[status].dot, backgroundColor: `color-mix(in srgb, ${TABLE_TONES[status].dot} 10%, var(--octo-card))` }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TABLE_TONES[status].dot }} />
            {t(`reservations.table.legend.${status}`)}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_261px]">
        <div className="min-w-0">
          {/* The frame's box takes the floor's own proportions, so "fit" fills it
              edge to edge instead of leaving empty bands either side. */}
          <div
            className="relative w-full min-h-[320px] overflow-hidden bg-white"
            style={{ aspectRatio: String(picking.doc.width) + " / " + String(picking.doc.height) }}
          >
            <PlanViewport
              key={viewKey}
              doc={picking.doc}
              zoom={{ mode: "fit" }}
              className="h-full w-full"
              toneFor={(table: FloorTable) => {
                const option = picking.byId.get(table.id);
                return option ? picking.toneOf(option) : "blocked";
              }}
              showGrid
              showSeats
              showBackground={false}
              selectedIds={selectedIds}
              dimmedIds={dimmedIds}
              interactive={TABLES_ONLY}
              onItemPointerDown={(_event, item) => {
                if (item.kind === "table") pick(item.id);
              }}
            />
          </div>

          <div className={`mt-4 w-fit max-w-full rounded-[24px] ${SURFACE_WHITE} p-4 shadow-[0px_0px_12px_0px_rgba(0,0,0,0.12)]`}>
            <div className="flex flex-wrap items-stretch gap-3">
              <p className={`flex min-h-12 items-center gap-1 rounded-[8px] ${SURFACE_INFO} px-3 py-2 text-[14px] font-medium leading-[1.3] ${TEXT_BRAND_DEEP}`}>
                <ShellIcon name="rsv-add-bulb.svg" />
                {t("reservations.table.tip")}
              </p>
              <button
                type="button"
                onClick={() => pick(picking.best(draft.table)?.table.id ?? null)}
                className="inline-flex min-h-12 items-center gap-1 whitespace-nowrap rounded-[8px] border border-[#abcdff] px-2 py-1 text-[16px] font-medium leading-4 text-[#0058da] transition-colors hover:bg-[var(--octo-hover)] [[data-theme=dark]_&]:text-[var(--octo-accent)]"
              >
                <ShellIcon name="rsv-add-sparkle.svg" />
                {t("reservations.table.autoSuggest")}
              </button>
              <button
                type="button"
                onClick={() => pick(null)}
                disabled={!selectedId}
                className={`inline-flex min-h-12 items-center whitespace-nowrap rounded-[8px] ${SURFACE_RED_LIGHT} px-2 py-1 text-[16px] font-medium leading-4 ${TEXT_ERROR} transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50`}
              >
                {t("reservations.table.clear")}
              </button>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <div className={`flex flex-col gap-3 rounded-[8px] border ${BORDER_300} px-2 py-3`}>
            <h3 className={PANEL_TITLE}>{t("reservations.table.newReservation")}</h3>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-[12px] font-medium leading-3 ${TEXT_PRIMARY}`}>{t("reservations.form.tab.details")}</span>
              <button
                type="button"
                onClick={onEditDetails}
                className={`inline-flex h-8 items-center gap-1 rounded-[4px] ${SURFACE_BRAND_LIGHT} px-2 py-1 text-[14px] font-medium leading-[14px] ${TEXT_PRIMARY} transition-opacity hover:opacity-80`}
              >
                <ShellIcon name="crm-detail-edit.svg" />
                {t("reservations.list.row.edit")}
              </button>
            </div>
            <dl className="flex flex-col gap-4">
              <SummaryRow icon="crm-detail-calendar-16.svg" label={t("reservations.table.date")} value={formatDisplayDate(draft.date, locale)} />
              <SummaryRow icon="rsv-add-time-16.svg" label={t("reservations.table.time")} value={clock12(draft.time)} ltr />
              <SummaryRow icon="rsv-add-people-16.svg" label={t("reservations.table.partySize")} value={guestsText(t, draft.partySize)} />
              <SummaryRow icon="rsv-add-timer-16.svg" label={t("reservations.table.duration")} value={durationText} />
              <SummaryRow icon="rsv-add-party.svg" iconSize={14.33} label={t("reservations.table.occasion")} value={draft.tags[0] ?? "—"} />
            </dl>
          </div>

          <div className={`flex flex-col gap-3 rounded-[12px] border-[3px] border-[#0d6efd] ${SURFACE_BRAND_LIGHT} px-2 py-3`}>
            <div className={`flex items-center border-b ${BORDER_300} pb-1`}>
              <h3 className={PANEL_TITLE}>{t("reservations.table.selected")}</h3>
            </div>
            {selected ? (
              <SelectedTable option={selected} tone={picking.toneOf(selected)} />
            ) : (
              <p className={clsx(META_TEXT, "py-5 text-center")}>{t("reservations.table.pick")}</p>
            )}
            <button
              type="button"
              onClick={() => pick(null)}
              disabled={!selected}
              className={`flex h-8 w-full items-center justify-center rounded-[4px] border border-[#0d6efd] px-2 py-1 text-[14px] font-medium leading-[14px] ${TEXT_BRAND} transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {t("reservations.table.change")}
            </button>
          </div>

          <div className={`flex flex-col gap-2 rounded-[12px] border ${BORDER_300} p-2`}>
            <h3 className={PANEL_TITLE}>{t("reservations.table.alternatives")}</h3>
            {alternatives.length === 0 ? (
              <p className={META_TEXT}>{t("reservations.table.noAlternatives")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {alternatives.map((option) => (
                  <li key={option.table.id} className={`flex flex-col gap-1 rounded-[4px] ${SURFACE_BRAND_LIGHT} p-1`}>
                    <div className="flex items-center gap-1">
                      <MiniTable table={option.table} tone="available" size={49} />
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className={clsx(META_TEXT, "flex items-center gap-1")}>
                          <MetaIcon name="ord-table.svg" size={14.33} />
                          <span>
                            <span className={`font-bold ${TEXT_PRIMARY}`}>{option.table.number}</span>,{" "}
                            {t("reservations.table.tableFor").replace("{n}", String(option.table.seats))}
                          </span>
                        </p>
                        <p className={clsx(META_TEXT, "flex items-center gap-1")}>
                          <MetaIcon name="staff-location.svg" />
                          <span className="truncate">{[option.zoneName, areaLabel(option.table.area, t)].filter(Boolean).join(", ")}</span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => pick(option.table.id)}
                      className={`flex h-8 w-full items-center justify-center gap-1 rounded-[4px] border border-[#0d6efd] px-2 py-1 text-[12px] font-semibold leading-3 ${TEXT_BRAND} transition-opacity hover:opacity-80`}
                    >
                      <ShellIcon name="rsv-add-edit-16.svg" size={16} />
                      {t("reservations.table.select")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <div className={`mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-2 rounded-[24px] border ${BORDER_300} ${SURFACE_WHITE} px-4 py-3 shadow-[0px_0px_4px_0px_rgba(0,0,0,0.08)]`}>
        <Hint icon="rsv-add-hint-click.svg" text={t("reservations.table.hint.click")} />
        <Hint icon="rsv-add-hint-party.svg" text={t("reservations.table.hint.party")} />
        <Hint icon="rsv-add-hint-time.svg" text={t("reservations.table.hint.time")} />
        <Hint icon="rsv-add-hint-notes.svg" text={t("reservations.table.hint.notes")} />
      </div>
    </div>
  );
}

function ToolbarButton({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={clsx(
        TOOLBAR_CONTROL,
        "inline-flex items-center gap-2 whitespace-nowrap px-4 py-2",
        active ? "border-[#0d6efd] bg-[#0d6efd] text-white" : TOOLBAR_IDLE
      )}
    >
      {children}
    </button>
  );
}

/** A 16px meta icon. A few of the frame's exports are cropped tighter than
 *  their 16px slot, so the glyph keeps its own size inside the slot. */
function MetaIcon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <span className="grid h-4 w-4 shrink-0 place-items-center">
      <ShellIcon name={name} size={size} />
    </span>
  );
}

function SummaryRow({ icon, iconSize, label, value, ltr }: { icon: string; iconSize?: number; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className={clsx(META_TEXT, "flex items-center gap-1")}>
        <MetaIcon name={icon} size={iconSize} />
        {label}
      </dt>
      <dd className={`text-end text-[14px] font-medium leading-[14px] ${TEXT_PRIMARY}`} dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

function Hint({ icon, text }: { icon: string; text: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-[16px] font-semibold leading-4 ${TEXT_PRIMARY}`}>
      <ShellIcon name={icon} />
      {text}
    </span>
  );
}

function SelectedTable({ option, tone }: { option: TableOption; tone: LiveStatus }) {
  const { t } = useI18n();
  const available = tone === "available";
  const colors = TABLE_TONES[tone];
  const status = available ? t("reservations.table.status.available") : t(`reservations.table.status.${unavailableReason(option, tone)}`);

  return (
    <div>
      <div className="flex items-start gap-3">
        <MiniTable table={option.table} tone={tone} size={69} />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <span
            className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-[12px] font-medium leading-3"
            style={{ color: colors.text, backgroundColor: `color-mix(in srgb, ${colors.dot} 14%, var(--octo-card))` }}
          >
            <span className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: colors.dot }} />
            {status}
          </span>
          <p className={clsx(META_TEXT, "flex items-center gap-1")}>
            <MetaIcon name="crm-detail-calendar-16.svg" />
            {option.table.number}
          </p>
          <p className={clsx(META_TEXT, "flex items-center gap-1")}>
            <MetaIcon name="rsv-add-time-16.svg" />
            {t("reservations.table.tableFor").replace("{n}", String(option.table.seats))}
          </p>
          {option.zoneName && (
            <p className={clsx(META_TEXT, "flex items-center gap-1")}>
              <MetaIcon name="rsv-add-people-16.svg" />
              {option.zoneName}
            </p>
          )}
          <p className={clsx(META_TEXT, "flex items-center gap-1")}>
            <MetaIcon name="rsv-add-timer-16.svg" />
            {areaLabel(option.table.area, t)}
          </p>
        </div>
      </div>
      {!available && (
        <p className={clsx(META_TEXT, `mt-3 rounded-[4px] ${SURFACE_WHITE} px-2 py-2 leading-[1.3]`)}>
          {t("reservations.table.needsTable")}
        </p>
      )}
    </div>
  );
}

/** One table drawn on its own, in the same glyph the floor plan uses. */
function MiniTable({ table, tone, size = 48 }: { table: FloorTable; tone: LiveStatus; size?: number }) {
  const rect = itemRect(table);
  const span = Math.max(rect.w, rect.h) + 1;
  const doc: FloorPlanDoc = {
    name: "",
    width: span,
    height: span,
    zones: [],
    objects: [],
    background: null,
    tables: [{ ...table, visible: true, x: table.x - rect.x + (span - rect.w) / 2, y: table.y - rect.y + (span - rect.h) / 2 }],
  };
  return (
    <span className="shrink-0" style={{ width: size, height: size }}>
      <PlanSvg doc={doc} scale={size / span} toneFor={() => tone} showSeats showBackground={false} transparentPaper />
    </span>
  );
}
