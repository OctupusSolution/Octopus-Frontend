// Step 2 of adding a reservation: pick the table on the real floor plan.
// Tables are coloured by whether they can take THIS booking — its date, time
// and party size — using the floor plan's own availability rules and the
// bookings it already holds, so the choice here is one Floor Plan agrees with.
import { useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  CalendarDays,
  Clock,
  FileText,
  Lightbulb,
  MapPin,
  MousePointerClick,
  PartyPopper,
  Scan,
  SlidersHorizontal,
  Sparkles,
  SquarePen,
  Timer,
  Users,
  UsersRound,
  Utensils,
} from "lucide-react";
import { itemRect, sampleLayout, type FloorPlanDoc, type FloorTable, type LiveStatus } from "@/entities/floor-plan";
import { PlanSvg, PlanViewport, TABLE_TONES, type ItemKind } from "@/widgets/floor-plan-canvas";
import { Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { areaLabel } from "@/pages/reservations/floor-plan/_shared/labels";
import { useBookings, useFloorPlan, useLiveTables } from "@/pages/reservations/floor-plan/_shared/use-floor-plan";
import { clock12, formatDisplayDate, guestsText, hoursMinutesParts } from "../_shared/model";
import type { DraftState } from "../_shared/reservation-form";
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
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)] px-3 py-2">
        {picking.doc.zones.length > 0 && (
          <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className="!w-auto !py-[7px]" aria-label={t("reservations.form.areaPreference")}>
            <option value={ALL_AREAS}>{t("reservations.list.filter.allAreas")}</option>
            {picking.doc.zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </Select>
        )}
        <ToolbarButton active={fitsOnly} onClick={() => setFitsOnly((v) => !v)} title={t("reservations.table.filterOn")}>
          <SlidersHorizontal size={14} />
          {t("reservations.table.filter")}
        </ToolbarButton>
        <ToolbarButton onClick={() => setViewKey((k) => k + 1)}>
          <Scan size={14} />
          {t("reservations.table.fitView")}
        </ToolbarButton>
        {LEGEND.map((status) => (
          <span
            key={status}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-[7px] text-[12.5px] font-medium"
            style={{ color: TABLE_TONES[status].dot, backgroundColor: `color-mix(in srgb, ${TABLE_TONES[status].dot} 10%, var(--octo-card))` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TABLE_TONES[status].dot }} />
            {t(`reservations.table.legend.${status}`)}
          </span>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          {/* The frame's box takes the floor's own proportions, so "fit" fills it
              edge to edge instead of leaving empty bands either side. */}
          <div
            className="relative w-full min-h-[320px] overflow-hidden rounded-xl border border-[var(--octo-border-card)] bg-white"
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

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-2">
            <p className="flex min-w-[240px] flex-1 items-center gap-2 rounded-[9px] bg-[var(--octo-tone-info-bg)] px-3 py-2.5 text-[12.5px] text-[var(--octo-tone-info-text)]">
              <Lightbulb size={16} className="shrink-0" />
              {t("reservations.table.tip")}
            </p>
            <button
              type="button"
              onClick={() => pick(picking.best(draft.table)?.table.id ?? null)}
              className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-tone-info-border)] bg-[var(--octo-card)] px-3 py-2.5 text-[12.5px] font-medium text-[var(--octo-tone-info-text)] transition-colors hover:bg-[var(--octo-tone-info-bg)]"
            >
              <Sparkles size={15} />
              {t("reservations.table.autoSuggest")}
            </button>
            <button
              type="button"
              onClick={() => pick(null)}
              disabled={!selectedId}
              className="rounded-[9px] bg-[var(--octo-tone-danger-bg)] px-3 py-2.5 text-[12.5px] font-medium text-[var(--octo-tone-danger-text)] transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("reservations.table.clear")}
            </button>
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <Card>
            <h3 className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{t("reservations.table.newReservation")}</h3>
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[12px] text-[var(--octo-text-secondary)]">{t("reservations.form.tab.details")}</span>
              <button
                type="button"
                onClick={onEditDetails}
                className="inline-flex items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5 py-1 text-[12px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
              >
                <SquarePen size={13} />
                {t("reservations.list.row.edit")}
              </button>
            </div>
            <dl className="mt-3 space-y-2">
              <SummaryRow icon={<CalendarDays size={14} />} label={t("reservations.table.date")} value={formatDisplayDate(draft.date, locale)} />
              <SummaryRow icon={<Clock size={14} />} label={t("reservations.table.time")} value={clock12(draft.time)} ltr />
              <SummaryRow icon={<Users size={14} />} label={t("reservations.table.partySize")} value={guestsText(t, draft.partySize)} />
              <SummaryRow icon={<Timer size={14} />} label={t("reservations.table.duration")} value={durationText} />
              <SummaryRow icon={<PartyPopper size={14} />} label={t("reservations.table.occasion")} value={draft.tags[0] ?? "—"} />
            </dl>
          </Card>

          <div className="rounded-xl border-2 border-[#0D6EFD] bg-[var(--octo-card)] p-4">
            <h3 className="border-b border-[var(--octo-divider)] pb-2 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
              {t("reservations.table.selected")}
            </h3>
            {selected ? (
              <SelectedTable option={selected} tone={picking.toneOf(selected)} />
            ) : (
              <p className="py-5 text-center text-[12.5px] text-[var(--octo-text-muted)]">{t("reservations.table.pick")}</p>
            )}
            <button
              type="button"
              onClick={() => pick(null)}
              disabled={!selected}
              className="mt-3 w-full rounded-[9px] border border-[#0D6EFD] py-2 text-[13px] font-medium text-[#0D6EFD] transition-colors hover:bg-[#0D6EFD]/5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("reservations.table.change")}
            </button>
          </div>

          <Card>
            <h3 className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{t("reservations.table.alternatives")}</h3>
            {alternatives.length === 0 ? (
              <p className="mt-3 text-[12.5px] text-[var(--octo-text-muted)]">{t("reservations.table.noAlternatives")}</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {alternatives.map((option) => (
                  <li key={option.table.id} className="rounded-[10px] bg-[var(--octo-hover)] p-2.5">
                    <div className="flex items-center gap-2.5">
                      <MiniTable table={option.table} tone="available" />
                      <div className="min-w-0 text-[12px]">
                        <p className="flex items-center gap-1.5 text-[var(--octo-text-primary)]">
                          <Utensils size={13} className="shrink-0 text-[var(--octo-text-muted)]" />
                          <span className="font-semibold">{option.table.number}</span>,
                          <span className="text-[var(--octo-text-secondary)]">{t("reservations.table.tableFor").replace("{n}", String(option.table.seats))}</span>
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[var(--octo-text-secondary)]">
                          <MapPin size={13} className="shrink-0 text-[var(--octo-text-muted)]" />
                          {[option.zoneName, areaLabel(option.table.area, t)].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => pick(option.table.id)}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[9px] border border-[#0D6EFD] bg-[var(--octo-card)] py-1.5 text-[12.5px] font-medium text-[#0D6EFD] transition-colors hover:bg-[#0D6EFD]/5"
                    >
                      <SquarePen size={13} />
                      {t("reservations.table.select")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </aside>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3 text-[13px] text-[var(--octo-text-primary)]">
        <Hint icon={<MousePointerClick size={16} />} text={t("reservations.table.hint.click")} />
        <Hint icon={<UsersRound size={16} />} text={t("reservations.table.hint.party")} />
        <Hint icon={<Clock size={16} />} text={t("reservations.table.hint.time")} />
        <Hint icon={<FileText size={16} />} text={t("reservations.table.hint.notes")} />
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
        "inline-flex items-center gap-1.5 rounded-[9px] border px-3 py-[7px] text-[12.5px] transition-colors",
        active
          ? "border-[#0D6EFD] bg-[#0D6EFD] text-white"
          : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
      )}
    >
      {children}
    </button>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">{children}</div>;
}

function SummaryRow({ icon, label, value, ltr }: { icon: ReactNode; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[12.5px]">
      <dt className="flex items-center gap-1.5 text-[var(--octo-text-secondary)]">
        <span className="text-[var(--octo-text-muted)]">{icon}</span>
        {label}
      </dt>
      <dd className="text-end font-medium text-[var(--octo-text-primary)]" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

function Hint({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-[var(--octo-text-secondary)]">{icon}</span>
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
    <div className="mt-3">
      <div className="flex items-start gap-3">
        <MiniTable table={option.table} tone={tone} size={64} />
        <div className="min-w-0 flex-1 space-y-1.5 text-[12.5px]">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium"
            style={{ color: colors.text, backgroundColor: `color-mix(in srgb, ${colors.dot} 14%, var(--octo-card))` }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.dot }} />
            {status}
          </span>
          <p className="flex items-center gap-1.5 text-[var(--octo-text-primary)]">
            <Utensils size={13} className="text-[var(--octo-text-muted)]" />
            <span className="font-semibold">{option.table.number}</span>
          </p>
          <p className="flex items-center gap-1.5 text-[var(--octo-text-secondary)]">
            <Users size={13} className="text-[var(--octo-text-muted)]" />
            {t("reservations.table.tableFor").replace("{n}", String(option.table.seats))}
          </p>
          {option.zoneName && (
            <p className="flex items-center gap-1.5 text-[var(--octo-text-secondary)]">
              <MapPin size={13} className="text-[var(--octo-text-muted)]" />
              {option.zoneName}
            </p>
          )}
          <p className="flex items-center gap-1.5 text-[var(--octo-text-secondary)]">
            <Timer size={13} className="text-[var(--octo-text-muted)]" />
            {areaLabel(option.table.area, t)}
          </p>
        </div>
      </div>
      {!available && (
        <p className="mt-2.5 rounded-md bg-[var(--octo-track)] px-2.5 py-2 text-[12px] text-[var(--octo-text-secondary)]">
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
