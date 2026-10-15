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

/** The cart moved from the menu it was filled from to a newer one. Refs (i1, m1, option
 *  positions) are numbered per response and shift when the menu is republished, so each line is
 *  followed through its stable ids — the catalog entry and option ids of the old scan — to where
 *  those ids sit now. A line whose dish or option is gone is dropped; a changed price follows the
 *  menu and is reported. */
export function remapCart(
  lines: readonly OrderLine[],
  from: PlaceOrdering,
  menu: Menu,
  to: PlaceOrdering | null
): { keep: OrderLine[]; dropped: OrderLine[]; repriced: OrderLine[] } {
  if (!to) return { keep: [], dropped: [...lines], repriced: [] };
  const refByEntry = new Map(Object.entries(to.items).map(([ref, entry]) => [entry, ref]));
  const itemByRef = new Map<string, Menu["items"][number]>();
  for (const i of menu.items) if (!itemByRef.has(itemRefOf(i.id))) itemByRef.set(itemRefOf(i.id), i);
  const optionAt = new Map<string, { groupRef: string; index: number }>();
  for (const [groupRef, ids] of Object.entries(to.optionGroups)) ids.forEach((id, index) => optionAt.set(id, { groupRef, index }));

  const keep: OrderLine[] = [];
  const dropped: OrderLine[] = [];
  const repriced: OrderLine[] = [];
  for (const l of lines) {
    const entry = from.items[itemRefOf(l.menuItemId)];
    const ref = entry ? refByEntry.get(entry) : undefined;
    const item = ref ? itemByRef.get(ref) : undefined;
    if (!item) {
      dropped.push(l);
      continue;
    }
    const modifiers = l.modifiers.map((m) => {
      const id = optionIdOf(from, m.groupId, m.optionId);
      const at = id ? optionAt.get(id) : undefined;
      if (!at) return null;
      const optionId = `${at.groupRef}-${at.index}`;
      const now = item.modifierGroups.find((g) => g.id === at.groupRef)?.options.find((o) => o.id === optionId);
      return { ...m, groupId: at.groupRef, optionId, label: now?.label ?? m.label, priceDeltaSar: now?.priceDeltaSar ?? m.priceDeltaSar };
    });
    if (modifiers.some((m) => m === null)) {
      dropped.push(l);
      continue;
    }
    const next: OrderLine = { ...l, menuItemId: item.id, name: item.name, unitPriceSar: item.priceSar, modifiers: modifiers as OrderLine["modifiers"] };
    const changedPrice =
      item.priceSar !== l.unitPriceSar || next.modifiers.some((m, i) => m.priceDeltaSar !== l.modifiers[i].priceDeltaSar);
    if (changedPrice) repriced.push(next);
    keep.push(next);
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
