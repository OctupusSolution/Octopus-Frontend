import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { type LucideIcon, Armchair, CircleDashed, Clock, Lightbulb, MapPinned, Star, UsersRound, UserX } from "lucide-react";
import { boundsOf, itemRect, zoneForTable, type FloorItem, type FloorPlanDoc, type FloorTable, type LiveStatus } from "@/entities/floor-plan";
import { estimatedSeatingMinutes, fullName, isActive, waitedMinutes, type WaitlistEntry } from "@/entities/waitlist-entry";
import { PlanViewport, TABLE_TONES, type ItemKind } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";
import { Dropdown, MenuItem } from "@/pages/reservations/floor-plan/_shared/dropdown";
import { areaLabel } from "@/pages/reservations/floor-plan/_shared/labels";
import { useLiveTables } from "@/pages/reservations/floor-plan/_shared/use-floor-plan";
import { FLOOR_PLAN_BUILDER_PATH } from "@/pages/reservations/floor-plan/_shared/paths";
import { SOURCE_KEY, fill } from "../_shared/labels";
import { WAITLIST_PATH } from "../_shared/paths";
import { useSeatingFloor, useWaitlist } from "../_shared/use-waitlist";
import { describeWaitlistError } from "../_shared/waitlist-api";

const TABLES_ONLY: ReadonlySet<ItemKind> = new Set(["table"]);
const NO_ZONE = "all";

/** Legend chips in the frame's colour order, labelled by what the canvas paints. */
const LEGEND: readonly LiveStatus[] = ["cleaning", "available", "reserved", "occupied"];

function fits(table: FloorTable, partySize: number): boolean {
  if (table.seats < partySize) return false;
  return !table.largePartyOnly || partySize >= Math.ceil(table.seats / 2);
}

function minimumCapacity(table: FloorTable): number {
  return table.largePartyOnly ? Math.ceil(table.seats / 2) : 1;
}

/** No turn-time history exists yet; bigger tables sit longer. */
function turnTimeMinutes(table: FloorTable): number {
  return 29 + table.seats * 4;
}

/** Trims empty canvas past the drawing so "fit" fills the frame. The origin
 *  stays put: every item keeps its coordinates. */
function croppedToContent(doc: FloorPlanDoc): FloorPlanDoc {
  const bounds = boundsOf([...doc.zones, ...doc.tables, ...doc.objects].map(itemRect));
  if (!bounds) return doc;
  const margin = 1;
  return { ...doc, width: Math.min(doc.width, Math.ceil(bounds.x + bounds.w + margin)), height: Math.min(doc.height, Math.ceil(bounds.y + bounds.h + margin)) };
}

function initialsOf(entry: WaitlistEntry): string {
  const last = entry.lastName.replace(/^(al|el)[-\s]/i, "");
  return `${entry.firstName[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function tableTitle(number: string): string {
  return number.replace(/^T-?/i, "");
}

export function SeatGuestPage() {
  const { entryId = "" } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const waitlist = useWaitlist();
  const entry = waitlist.entries.find((e) => e.id === entryId) ?? null;

  if (!entry || !isActive(entry)) {
    return (
      <div className="px-4 pb-10 pt-5 sm:px-8 sm:pt-8">
        <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-6 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--octo-track)] text-[var(--octo-text-muted)]">
            <UserX size={22} />
          </span>
          <h1 className="mt-3 text-[17px] font-semibold text-[var(--octo-text-primary)]">{t(entry ? "waitlist.seat.notWaitingTitle" : "waitlist.seat.notFoundTitle")}</h1>
          <p className="mt-1 text-[13.5px] text-[var(--octo-text-muted)]">{t("waitlist.seat.notFoundBody")}</p>
          <button type="button" onClick={() => navigate(WAITLIST_PATH)} className="mt-5 h-10 rounded-[10px] bg-[#0D6EFD] px-5 text-[14px] font-semibold text-white hover:opacity-90">
            {t("waitlist.seat.back")}
          </button>
        </div>
      </div>
    );
  }

  return <SeatGuest entry={entry} entries={waitlist.entries} onSeat={waitlist.seat} />;
}

/** Blocks seating until a real, published floor plan exists — the sample
 *  layout is only a builder preview, not a real room to seat guests in. */
function NoFloorPlanNotice() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <div className="px-4 pb-10 pt-5 sm:px-8 sm:pt-8">
      <div className="mx-auto mt-16 flex max-w-md flex-col items-center rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-6 py-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-warning/10 text-warning">
          <MapPinned size={22} />
        </span>
        <h1 className="mt-3 text-[17px] font-semibold text-[var(--octo-text-primary)]">{t("waitlist.seat.noFloorPlanTitle")}</h1>
        <p className="mt-1 text-[13.5px] text-[var(--octo-text-muted)]">{t("waitlist.seat.noFloorPlanBody")}</p>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={() => navigate(WAITLIST_PATH)} className="h-10 rounded-[10px] bg-[var(--octo-track)] px-5 text-[14px] font-semibold text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]">
            {t("waitlist.seat.back")}
          </button>
          <button type="button" onClick={() => navigate(FLOOR_PLAN_BUILDER_PATH)} className="h-10 rounded-[10px] bg-[#0D6EFD] px-5 text-[14px] font-semibold text-white hover:opacity-90">
            {t("reservations.new.buildFloorPlan")}
          </button>
        </div>
      </div>
    </div>
  );
}

function SeatGuest({ entry, entries, onSeat }: { entry: WaitlistEntry; entries: readonly WaitlistEntry[]; onSeat: (id: string, table: string, area: string, resourceId?: string | null) => Promise<void> }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { doc: floor, isSample } = useSeatingFloor();
  const doc = useMemo(() => croppedToContent(floor), [floor]);
  const live = useLiveTables(doc);
  const boxLayout = doc.zones.length === 0 && doc.objects.length === 0;

  const preferredZone = doc.zones.find((z) => z.name === entry.areaPreference);
  const [zoneId, setZoneId] = useState<string>(preferredZone?.id ?? NO_ZONE);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const zoneOf = (table: FloorTable) => zoneForTable(doc, table);
  const inZone = (table: FloorTable) => zoneId === NO_ZONE || zoneOf(table)?.id === zoneId;
  const selectable = (table: FloorTable) => live.byId.get(table.id)?.state.status === "available" && fits(table, entry.partySize);

  // Open on the table a host would most likely pick: the guest's preferred
  // table if it is free, else the snuggest free fit in the chosen area.
  useEffect(() => {
    if (selectedId || live.entries.length === 0) return;
    const candidates = live.entries.map((e) => e.table).filter((table) => selectable(table));
    const preferred = candidates.find((table) => table.number === entry.tablePreference);
    const inArea = candidates.filter(inZone);
    const pool = inArea.length > 0 ? inArea : candidates;
    const best = preferred ?? [...pool].sort((a, b) => a.seats - b.seats || a.number.localeCompare(b.number, undefined, { numeric: true }))[0];
    if (best) {
      setSelectedId(best.id);
      if (preferred && !inZone(preferred)) setZoneId(zoneOf(preferred)?.id ?? NO_ZONE);
    }
    // Runs once, when the live floor has loaded.
  }, [live.entries.length]);

  const toneFor = (table: FloorTable): LiveStatus => {
    const status = live.byId.get(table.id)?.state.status ?? (table.blocked ? "blocked" : "available");
    return status === "available" && !fits(table, entry.partySize) ? "blocked" : status;
  };

  const dimmedIds = useMemo(() => {
    const dimmed = new Set<string>();
    if (zoneId === NO_ZONE) return dimmed;
    for (const e of live.entries) if (zoneForTable(doc, e.table)?.id !== zoneId) dimmed.add(e.table.id);
    for (const zone of doc.zones) if (zone.id !== zoneId) dimmed.add(zone.id);
    return dimmed;
  }, [zoneId, live.entries, doc]);

  const selected = selectedId ? live.byId.get(selectedId) ?? null : null;
  const selectedIds = useMemo(() => new Set(selectedId ? [selectedId] : []), [selectedId]);
  const waited = waitedMinutes(entry, live.now);
  const est = estimatedSeatingMinutes(entries, entry, live.now) ?? 0;
  const name = fullName(entry);
  const initials = initialsOf(entry);

  const [seatError, setSeatError] = useState<string | null>(null);

  if (isSample) return <NoFloorPlanNotice />;

  function confirm() {
    if (!selected || !selectable(selected.table)) return;
    const table = selected.table;
    const area = zoneOf(table)?.name ?? areaLabel(table.area, t);
    setSeatError(null);
    // The API seats the party and marks the table occupied on the floor plan
    // itself, so the table is not also set by hand.
    onSeat(entry.id, table.number, area, table.id).then(
      () => navigate(WAITLIST_PATH, { state: { toast: fill(t("waitlist.toast.seated"), { name, table: table.number }) } }),
      (err) => setSeatError(describeWaitlistError(err))
    );
  }

  const zoneLabel = zoneId === NO_ZONE ? t("waitlist.seat.allAreas") : doc.zones.find((z) => z.id === zoneId)?.name ?? t("waitlist.seat.allAreas");

  return (
    <div className="px-4 pb-10 pt-5 sm:px-8 sm:pt-8">
      {seatError && (
        <div role="alert" className="mb-3 rounded-[10px] bg-error/10 px-4 py-2.5 text-[13px] text-error">
          {seatError}
        </div>
      )}
      <h1 className="text-[24px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[26px]">{t("waitlist.seat.title")}</h1>
      <p className="mt-1.5 text-[14px] text-[var(--octo-text-secondary)] sm:text-[15px]">{t("waitlist.subtitle")}</p>

      <div className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--octo-border-input)] bg-[var(--octo-card)] sm:grid-cols-3 xl:grid-cols-[1.75fr_1.35fr_1.2fr_1.05fr_0.75fr_0.8fr]">
        <Cell className="col-span-2 sm:col-span-1">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#0D6EFD] text-[14px] font-semibold text-white">{initials}</span>
          <div className="min-w-0">
            <p className="truncate text-[15px] text-[var(--octo-text-primary)]">{name}</p>
            <p dir="ltr" className="text-[13px] text-[var(--octo-text-secondary)] rtl:text-end">{entry.phone}</p>
          </div>
        </Cell>
        <Cell value={String(entry.partySize)} label={t("waitlist.seat.guests")} />
        <Cell>
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--octo-tone-danger-bg)] text-[#E0561B]">
            <Clock size={16} strokeWidth={1.6} />
          </span>
          <div>
            <p className={clsx("text-[15px]", waited > entry.quotedMin ? "text-[#E0341B]" : "text-[var(--octo-text-primary)]")}>
              {waited} {t("waitlist.min")}
            </p>
            <p className="text-[13px] text-[var(--octo-text-secondary)]">{t("waitlist.seat.waitingTime")}</p>
          </div>
        </Cell>
        <Cell value={`${est} ${t("waitlist.min")}`} valueClass="text-[#009A39] [[data-theme=dark]_&]:text-[var(--octo-tone-success-text)]" label={t("waitlist.seat.estimated")} />
        <Cell value={entry.areaPreference || "—"} label={t("waitlist.seat.area")} />
        <Cell value={t(SOURCE_KEY[entry.source])} label={t("waitlist.seat.source")} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-soft-bg)] px-4 py-2">
        {doc.zones.length > 0 && (
          <Dropdown label={<span className="text-[var(--octo-text-secondary)]">{zoneLabel}</span>} align="start" buttonClassName="h-11 min-w-[142px] rounded-lg !text-[15px]">
            {(close) => (
              <>
                <MenuItem label={t("waitlist.seat.allAreas")} selected={zoneId === NO_ZONE} onClick={() => { setZoneId(NO_ZONE); close(); }} />
                {doc.zones.map((zone) => (
                  <MenuItem key={zone.id} label={zone.name} selected={zoneId === zone.id} onClick={() => { setZoneId(zone.id); close(); }} />
                ))}
              </>
            )}
          </Dropdown>
        )}
        {LEGEND.map((status) => (
          <span
            key={status}
            className="inline-flex h-11 items-center gap-1.5 rounded-md px-2.5 text-[15px] font-medium"
            style={{ color: TABLE_TONES[status].dot, backgroundColor: `color-mix(in srgb, ${TABLE_TONES[status].dot} 8%, var(--octo-card))` }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TABLE_TONES[status].dot }} />
            {t(`waitlist.seat.legend.${status}`)}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_252px]">
        <div className="relative overflow-hidden border border-[var(--octo-border-card)] bg-white">
          <PlanViewport
            doc={doc}
            zoom={{ mode: "fit" }}
            className="h-[320px] sm:h-[clamp(420px,62vh,660px)]"
            toneFor={toneFor}
            boxTables={boxLayout}
            showGrid
            showSeats={!boxLayout}
            showBackground={false}
            selectedIds={selectedIds}
            dimmedIds={dimmedIds}
            interactive={TABLES_ONLY}
            onItemPointerDown={(_event: ReactPointerEvent<SVGGElement>, item: FloorItem) => setSelectedId(item.id)}
          />
          {live.entries.length === 0 && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <span className="rounded-full bg-[#111827]/80 px-4 py-2 text-[13px] font-medium text-white">{t("waitlist.seat.noTables")}</span>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3">
          {selected ? (
            <TablePanel table={selected.table} status={toneFor(selected.table)} liveStatus={selected.state.status} areaName={zoneOf(selected.table)?.name ?? areaLabel(selected.table.area, t)} partySize={entry.partySize} />
          ) : (
            <div className="rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-4 py-8 text-center text-[13.5px] text-[var(--octo-text-muted)]">
              <Armchair size={26} className="mx-auto mb-2 text-[var(--octo-text-faint)]" />
              {t("waitlist.seat.pickTable")}
            </div>
          )}
          <button
            type="button"
            onClick={confirm}
            disabled={!selected || !selectable(selected.table)}
            className="h-12 rounded-lg bg-[#0D6EFD] text-[17px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {t("waitlist.seat.confirm")}
          </button>
          <button
            type="button"
            onClick={() => navigate(WAITLIST_PATH)}
            className="h-12 rounded-lg bg-[#E2E8F0] text-[17px] font-semibold text-[#64748B] transition-colors hover:bg-[#CBD5E1] [[data-theme=dark]_&]:bg-[var(--octo-track)] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]"
          >
            {t("waitlist.form.cancel")}
          </button>
        </aside>
      </div>

      <p className="mt-4 flex items-center gap-2 rounded-xl bg-[color-mix(in_srgb,#0D6EFD_5%,var(--octo-card))] px-4 py-4 text-[14.5px] text-[#0B4FC0] [[data-theme=dark]_&]:text-[var(--octo-tone-info-text)]">
        <Lightbulb size={22} strokeWidth={1.5} className="shrink-0" />
        {t("waitlist.seat.tip")}
      </p>
    </div>
  );
}

function Cell({ children, value, label, valueClass, className }: { children?: ReactNode; value?: string; label?: string; valueClass?: string; className?: string }) {
  return (
    <div className={clsx("flex min-w-0 items-center gap-2 border-b border-e border-[var(--octo-border-input)] px-3 py-2 xl:border-b-0 xl:last:border-e-0", className)}>
      {children ?? (
        <div className="min-w-0">
          <p className={clsx("truncate text-[15px] text-[var(--octo-text-primary)]", valueClass)}>{value}</p>
          <p className="truncate text-[13px] text-[var(--octo-text-secondary)]">{label}</p>
        </div>
      )}
    </div>
  );
}

function TablePanel({ table, status, liveStatus, areaName, partySize }: { table: FloorTable; status: LiveStatus; liveStatus: LiveStatus; areaName: string; partySize: number }) {
  const { t } = useI18n();
  const tone = TABLE_TONES[status];
  const tooSmall = liveStatus === "available" && status === "blocked";
  const statusText = tooSmall ? t("waitlist.seat.tooSmall") : t(`waitlist.seat.status.${status}`);
  const feature = table.note.trim() || t(`floorPlan.smoking.${table.smoking}`);
  const seats = (n: number) => fill(t(n === 1 ? "waitlist.seat.seatOne" : "waitlist.seat.seatMany"), { n });

  const rows: { icon: LucideIcon; label: string; value: string; valueClass?: string }[] = [
    { icon: UsersRound, label: t("waitlist.seat.capacity"), value: seats(table.seats) },
    { icon: UsersRound, label: t("waitlist.seat.minCapacity"), value: seats(minimumCapacity(table)) },
    { icon: Armchair, label: t("waitlist.seat.area"), value: areaName },
    { icon: Star, label: t("waitlist.seat.feature"), value: feature },
    { icon: Clock, label: t("waitlist.seat.turnTime"), value: `${turnTimeMinutes(table)} ${t("waitlist.min")}` },
    { icon: CircleDashed, label: t("waitlist.seat.status"), value: statusText, valueClass: "font-medium" },
  ];

  return (
    <div className="rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 pb-3 pt-3">
      <h2 className="text-[26px] font-semibold leading-tight" style={{ color: status === "available" ? "#009A39" : tone.stroke }}>
        {fill(t("waitlist.seat.tableTitle"), { n: tableTitle(table.number) })}
      </h2>
      <p className="mt-0.5 text-[15px] font-medium text-[var(--octo-text-primary)]">
        {seats(table.seats)} - {areaName}
      </p>
      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px]" style={{ color: tone.dot, backgroundColor: `color-mix(in srgb, ${tone.dot} 14%, var(--octo-card))` }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone.dot }} />
        {statusText}
      </span>
      <dl className="mt-3 flex flex-col gap-2 border-t border-[var(--octo-border-card)] pt-3">
        {rows.map(({ icon: Icon, label, value, valueClass }) => (
          <div key={label} className="flex items-center justify-between gap-2 text-[13.5px]">
            <dt className="flex items-center gap-1.5 text-[var(--octo-text-secondary)]">
              <Icon size={15} strokeWidth={1.5} />
              {label}:
            </dt>
            <dd className={clsx("text-end text-[var(--octo-text-primary)]", valueClass)} style={valueClass ? { color: status === "available" ? "#009A39" : tone.text } : undefined}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {status !== "available" && (
        <p className="mt-3 rounded-md bg-[var(--octo-track)] px-2.5 py-2 text-[12px] text-[var(--octo-text-secondary)]">
          {tooSmall ? fill(t("waitlist.seat.tooSmallHint"), { n: partySize }) : t("waitlist.seat.unavailableHint")}
        </p>
      )}
    </div>
  );
}
