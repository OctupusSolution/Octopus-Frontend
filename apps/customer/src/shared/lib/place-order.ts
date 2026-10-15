// A scanned place code's ordering: what the menu may sell, how a cart becomes
// the backend's order lines, and how a cart survives a menu update. Pure.
//
// The scan's `ordering.items` is keyed by the menu's item refs (i1, i2…) and
// `ordering.optionGroups[groupRef]` lists option ids in the order the group's
// options appear (backend PublicPlaceMenuResponse). menuFromDocument names an
// item `cat-{n}-{ref}` and a public option `{groupRef}-{index}`, which is what
// this module reads back.
import type { OrderLine, PublicMenuDocument } from "@octopus/api-client";
import type { Menu } from "@/shared/api/menu-document";

export interface PlaceOrdering {
  basis: string;
  items: Record<string, string>;
  optionGroups: Record<string, string[]>;
}

export interface PlaceScan {
  status: "open" | "unavailable";
  reason?: "place" | "menu" | null;
  place?: { number: string; name: string | null; zone: string | null } | null;
  menu?: PublicMenuDocument | null;
  ordering?: PlaceOrdering | null;
}

export interface ScanOrderLine {
  entryId: string;
  quantity: number;
  optionIds?: string[];
  note?: string;
}

export interface ScanOrderConfirmation {
  reference: string;
  currency: string;
  lines: { name: string; quantity: number; lineTotal: number }[];
  netTotal: number;
  taxTotal: number;
  grandTotal: number;
}

export function itemRefOf(menuItemId: string): string {
  const m = /^cat-\d+-(.+)$/.exec(menuItemId);
  return m ? m[1] : menuItemId;
}

export function optionIdOf(ordering: PlaceOrdering, groupRef: string, optionId: string): string | null {
  const m = /-(\d+)$/.exec(optionId);
  const list = ordering.optionGroups[groupRef];
  if (!m || !list) return null;
  return list[Number(m[1])] ?? null;
}

/** Items the order cannot carry read as sold out; with ordering off, all of them do. */
export function orderableMenu(menu: Menu, ordering: PlaceOrdering | null): Menu {
  return {
    ...menu,
    items: menu.items.map((i) => (ordering && ordering.items[itemRefOf(i.id)] ? i : { ...i, inStock: false })),
  };
}

/** Cart lines as the backend's order lines; `unknown` names the lines that cannot be sent. */
export function toScanLines(
  lines: readonly OrderLine[],
  ordering: PlaceOrdering
): { lines: ScanOrderLine[]; unknown: string[] } {
  const out: ScanOrderLine[] = [];
  const unknown: string[] = [];
  for (const l of lines) {
    const entryId = ordering.items[itemRefOf(l.menuItemId)];
    const optionIds = l.modifiers.map((m) => optionIdOf(ordering, m.groupId, m.optionId));
    if (!entryId || optionIds.some((o) => o === null)) {
      unknown.push(l.lineId);
      continue;
    }
    const note = l.notes.trim();
    out.push({
      entryId,
      quantity: l.quantity,
      ...(optionIds.length ? { optionIds: optionIds as string[] } : {}),
      ...(note ? { note } : {}),
    });
  }
  return { lines: out, unknown };
}

/** The cart against a newer menu: lines that can no longer be sent go, changed prices follow the menu. */
export function reconcileCart(
  lines: readonly OrderLine[],
  menu: Menu,
  ordering: PlaceOrdering | null
): { keep: OrderLine[]; dropped: OrderLine[]; repriced: OrderLine[] } {
  const keep: OrderLine[] = [];
  const dropped: OrderLine[] = [];
  const repriced: OrderLine[] = [];
  const byId = new Map(menu.items.map((i) => [i.id, i]));
  for (const l of lines) {
    const item = byId.get(l.menuItemId);
    const sendable = ordering ? toScanLines([l], ordering).unknown.length === 0 : false;
    if (!item || !sendable) {
      dropped.push(l);
      continue;
    }
    if (item.priceSar !== l.unitPriceSar) {
      const next = { ...l, unitPriceSar: item.priceSar };
      repriced.push(next);
      keep.push(next);
    } else {
      keep.push(l);
    }
  }
  return { keep, dropped, repriced };
}

export function cartSignature(lines: readonly OrderLine[]): string {
  return JSON.stringify(lines.map((l) => [l.menuItemId, l.quantity, l.notes.trim(), l.modifiers.map((m) => m.optionId)]));
}

/** One key per cart content: a retry of the same cart replays, a changed cart is a new order. */
export function idempotencyKeyFor(
  signature: string,
  previous: { signature: string; key: string } | null,
  newKey: () => string
): { signature: string; key: string } {
  return previous && previous.signature === signature ? previous : { signature, key: newKey() };
}

export type PlaceProblem =
  | "notFound"
  | "closed"
  | "basisChanged"
  | "tooManyPending"
  | "rateLimited"
  | "invalid"
  | "network"
  | "generic";

export function placeProblemOf(status: number, errorCode: string | undefined): PlaceProblem {
  if (status === 0) return "network";
  if (errorCode === "order.intake.basis-changed") return "basisChanged";
  if (errorCode === "order.intake.unavailable" || errorCode === "order.intake.not-found") return "closed";
  if (errorCode === "order.intake.too-many-pending") return "tooManyPending";
  if (status === 429) return "rateLimited";
  if (status === 422) return "invalid";
  if (status === 404) return "notFound";
  return "generic";
}

export const PLACE_PROBLEM_KEY: Record<PlaceProblem, string> = {
  notFound: "store.place.error.notFound",
  closed: "store.place.error.closed",
  basisChanged: "store.place.error.basisChanged",
  tooManyPending: "store.place.error.tooManyPending",
  rateLimited: "store.place.error.rateLimited",
  invalid: "store.place.error.invalid",
  network: "store.place.error.network",
  generic: "store.place.error.generic",
};
