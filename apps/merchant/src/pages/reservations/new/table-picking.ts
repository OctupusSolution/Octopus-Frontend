// Which tables a reservation can take, and which to suggest. Pure: the page
// hands it the floor plan, the bookings and the reservation, and renders what
// comes back. Availability itself is the floor plan's own `tableAvailability`,
// so a table offered here is exactly one the Floor Plan screen would book.
import {
  boundsOf,
  itemRect,
  tableAvailability,
  zoneForTable,
  type Availability,
  type Booking,
  type FloorPlanDoc,
  type FloorTable,
  type LiveStatus,
} from "@/entities/floor-plan";

export interface TableOption {
  table: FloorTable;
  availability: Availability;
  zoneId: string | null;
  zoneName: string | null;
}

/** Within this window of "now", a table's live state (occupied, being
 *  cleaned) matters to the booking; further out it's irrelevant. */
export const NEAR_TIME_MS = 2 * 60 * 60 * 1000;

/** The reservation's slot as an epoch, in the restaurant's local time. */
export function slotAt(date: string, minutes: number): number {
  return new Date(`${date}T00:00:00`).getTime() + minutes * 60_000;
}

/** Trims empty canvas past the drawing so "fit" fills the frame. Items keep
 *  their coordinates; only the far edges move in. */
export function croppedToContent(doc: FloorPlanDoc): FloorPlanDoc {
  const bounds = boundsOf([...doc.zones, ...doc.tables, ...doc.objects].map(itemRect));
  if (!bounds) return doc;
  const margin = 1;
  return {
    ...doc,
    width: Math.min(doc.width, Math.ceil(bounds.x + bounds.w + margin)),
    height: Math.min(doc.height, Math.ceil(bounds.y + bounds.h + margin)),
  };
}

export function tableOptions(
  doc: FloorPlanDoc,
  query: { at: number; partySize: number },
  bookings: readonly Booking[]
): TableOption[] {
  return doc.tables
    .filter((table) => table.visible)
    .map((table) => {
      const zone = zoneForTable(doc, table);
      return {
        table,
        availability: tableAvailability(table, query, bookings),
        zoneId: zone?.id ?? null,
        zoneName: zone?.name ?? null,
      };
    });
}

/** The colour a table is drawn in. `live` is passed only when the booking is
 *  close to now — see NEAR_TIME_MS. */
export function toneFor(option: TableOption, live: LiveStatus | null = null): LiveStatus {
  switch (option.availability) {
    case "blocked":
    case "notReservable":
      return "blocked";
    case "tooSmall":
    case "largePartyOnly":
      return "blocked";
    default:
      if (live === "occupied" || live === "cleaning") return live;
      return option.availability === "booked" ? "reserved" : "available";
  }
}

/** Why a table can't take this booking, as a label key suffix. */
export function unavailableReason(option: TableOption, tone: LiveStatus): string {
  if (tone === "occupied" || tone === "cleaning") return tone;
  return option.availability;
}

const byNumber = (a: TableOption, b: TableOption) =>
  a.table.number.localeCompare(b.table.number, undefined, { numeric: true });

/** Bookable tables, best first: in the guest's preferred area, then the
 *  snuggest fit (fewest empty seats), then by number. */
export function rankTables(
  options: readonly TableOption[],
  prefs: { partySize: number; preferredZoneId: string | null; excludeId?: string | null }
): TableOption[] {
  return options
    .filter((option) => option.availability === "available" && option.table.id !== prefs.excludeId)
    .sort((a, b) => {
      const zoneA = a.zoneId !== null && a.zoneId === prefs.preferredZoneId ? 0 : 1;
      const zoneB = b.zoneId !== null && b.zoneId === prefs.preferredZoneId ? 0 : 1;
      return zoneA - zoneB || a.table.seats - prefs.partySize - (b.table.seats - prefs.partySize) || byNumber(a, b);
    });
}
