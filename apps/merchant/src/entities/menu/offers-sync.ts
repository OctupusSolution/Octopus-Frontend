// The menu's offers against the Menu API.
//
// An offer is a business-level resource (components, a pricing rule, a
// schedule, channels) that a menu shows through its one Offers section. The
// builder edits the offers as that section's entries; `pushOffers` makes the
// server match, and `pullOffers` reads them back.
//
// What the API has no field for stays local, keyed by offer id: whether the
// customer can change the basket, each item's own price inside the offer, and
// the VAT rate.
import {
  createOffer,
  createSection,
  deleteOffer,
  getOffer,
  listSections,
  placeSectionEntries,
  removePlacement,
  reorderPlacements,
  setOfferActive,
  updateOffer,
  type AvailabilityScheduleDto,
  type OfferPricingRuleDto,
  type OfferResponse,
} from "@octopus/api-client";
import { isLocalMedia, knownMedia, mediaUrl, uploadMedia } from "@/shared/api/media";
import type { Offer, Weekday } from "./menu";
import { WEEKDAYS } from "./menu";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isServerId = (id: string) => UUID.test(id);
const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const loc = (s: string) => ({ en: s, ar: s });
/** The API takes lowercase words joined by hyphens; the editor also allows underscores and capitals. */
const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const pick = (n: Record<string, string> | null | undefined) => (n ? n.en || n.ar || Object.values(n)[0] || "" : "");

// ---- channels ------------------------------------------------------------------
// Fulfilment: on-site / collection / delivery. Sales channels: public-link / qr /
// pos. The builder's six switches map onto those (kiosk is a point of sale,
// online ordering is the public link, the mobile app rides on the QR entry).
const FULFILMENT: [keyof Offer["channels"], string][] = [
  ["dineIn", "on-site"],
  ["takeaway", "collection"],
  ["delivery", "delivery"],
];
const SALES: [keyof Offer["channels"], string][] = [
  ["kiosk", "pos"],
  ["onlineOrdering", "public-link"],
  ["mobileApp", "qr"],
];

function selection(channels: Offer["channels"], map: [keyof Offer["channels"], string][]) {
  const codes = map.filter(([k]) => channels[k]).map(([, code]) => code);
  return { all: codes.length === map.length, codes: codes.length === map.length ? [] : codes };
}

function channelsFrom(offer: OfferResponse, local?: Offer["channels"]): Offer["channels"] {
  const on = (sel: { all: boolean; codes: string[] }, code: string) => sel.all || sel.codes.includes(code);
  const base = local ?? { dineIn: true, takeaway: true, delivery: true, kiosk: true, onlineOrdering: false, mobileApp: false };
  const out = { ...base };
  for (const [k, code] of FULFILMENT) out[k] = on(offer.fulfillmentModes, code);
  for (const [k, code] of SALES) out[k] = on(offer.salesChannels, code);
  return out;
}

// ---- schedule ------------------------------------------------------------------

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function scheduleOf(a: Offer["availability"]): AvailabilityScheduleDto | null {
  const w = a.window;
  const hasWindow = w && w.days[0] && w.days[1] && w.start && w.end;
  if (!hasWindow && !a.from && !a.to) return null;
  let windows: AvailabilityScheduleDto["windows"] = [];
  if (hasWindow) {
    const from = WEEKDAYS.indexOf(w.days[0] as Weekday);
    const to = WEEKDAYS.indexOf(w.days[1] as Weekday);
    const days: string[] = [];
    for (let i = from; ; i = (i + 1) % 7) {
      days.push(DAY_NAMES[i]);
      if (i === to) break;
    }
    windows = [{ days: days as never, start: w.start as string, end: w.end as string }];
  }
  return { presetCode: null, windows, dateFrom: a.from, dateTo: a.to };
}

function availabilityFrom(s: AvailabilityScheduleDto | null): Offer["availability"] {
  if (!s) return { from: null, to: null, window: null };
  const first = s.windows[0];
  const day = (name: string | undefined): Weekday | null => {
    const i = DAY_NAMES.indexOf(name ?? "");
    return i >= 0 ? WEEKDAYS[i] : null;
  };
  return {
    from: s.dateFrom,
    to: s.dateTo,
    window: first ? { days: [day(first.days[0]), day(first.days[first.days.length - 1])], start: first.start, end: first.end } : null,
  };
}

// ---- pricing -------------------------------------------------------------------

export function ruleOf(o: Offer, currency: string): OfferPricingRuleDto {
  const money = (amount: number) => ({ amount, currency });
  const p = o.pricing;
  if (p.role === "discount" && p.discount) {
    return p.discount.type === "percent"
      ? { kind: "DiscountPercent", fixedPrice: null, discountPercent: p.discount.value, discountAmount: null, dynamicBasePrice: null }
      : { kind: "DiscountAmount", fixedPrice: null, discountPercent: null, discountAmount: money(p.discount.value), dynamicBasePrice: null };
  }
  if (p.role === "dynamic") {
    return { kind: "Dynamic", fixedPrice: null, discountPercent: null, discountAmount: null, dynamicBasePrice: money(p.offerPrice) };
  }
  return { kind: "Fixed", fixedPrice: money(p.offerPrice), discountPercent: null, discountAmount: null, dynamicBasePrice: null };
}

function pricingFrom(res: OfferResponse, local?: Offer["pricing"]): Offer["pricing"] {
  const r = res.pricingRule;
  const base = local ?? { role: "fixed" as const, offerPrice: 0, discount: null, vatRate: 0.15, excludeFromPromotions: false };
  const common = { vatRate: base.vatRate, excludeFromPromotions: res.excludeFromPromotions };
  switch (r.kind) {
    case "DiscountPercent":
      return { ...common, role: "discount", offerPrice: res.computed?.price.amount ?? base.offerPrice, discount: { type: "percent", value: r.discountPercent ?? 0 } };
    case "DiscountAmount":
      return { ...common, role: "discount", offerPrice: res.computed?.price.amount ?? base.offerPrice, discount: { type: "amount", value: r.discountAmount?.amount ?? 0 } };
    case "Dynamic":
      return { ...common, role: "dynamic", offerPrice: r.dynamicBasePrice?.amount ?? base.offerPrice, discount: base.discount };
    default:
      return { ...common, role: "fixed", offerPrice: r.fixedPrice?.amount ?? base.offerPrice, discount: base.discount };
  }
}

// ---- read ----------------------------------------------------------------------

export async function toOffer(businessId: string, res: OfferResponse, local?: Offer): Promise<Offer> {
  return {
    id: res.id,
    name: pick(res.name),
    slug: res.slug,
    image: (await mediaUrl(businessId, res.image)) ?? local?.image ?? null,
    status: res.isActive ? "active" : "inactive",
    badge: pick(res.badge) || null,
    showSavingBadge: res.showSavingBadge,
    entries: res.components.map((c) => {
      const prev = local?.entries.find((e) => e.itemId === c.catalogItemId);
      return { itemId: c.catalogItemId, qty: c.quantity, price: prev?.price ?? 0 };
    }),
    customerCanChange: local?.customerCanChange ?? false,
    pricing: pricingFrom(res, local?.pricing),
    availability: availabilityFrom(res.schedule),
    channels: channelsFrom(res, local?.channels),
  };
}

/** The offers this menu's Offers section holds, in order. */
export async function pullOffers(businessId: string, menuId: string, local: readonly Offer[]): Promise<Offer[]> {
  const sections = await listSections(businessId, menuId, true);
  const row = sections.data.find((s) => s.kind.toLowerCase() === "offers");
  if (!row) return [];
  const full = await placeSectionEntries(businessId, menuId, row.id, { entries: [], expectedVersion: null });
  const ids = [...full.placements]
    .sort((a, b) => a.position - b.position)
    .filter((p) => p.targetKind.toLowerCase() === "offer")
    .map((p) => p.targetId);
  const byId = new Map(local.map((o) => [o.id, o]));
  return Promise.all(ids.map(async (id) => toOffer(businessId, await getOffer(businessId, id), byId.get(id))));
}

// ---- write ---------------------------------------------------------------------

async function offersSectionId(businessId: string, menuId: string): Promise<string> {
  const sections = await listSections(businessId, menuId, true);
  const existing = sections.data.find((s) => s.kind.toLowerCase() === "offers");
  if (existing) return existing.id;
  return (await createSection(businessId, menuId, { businessId, menuId, kind: "Offers", name: loc("Offers") }, key())).id;
}

/** Makes the server's offers (and their placement in the menu) match `next`.
 *  `itemIds` swaps the builder's local item ids for the server's. Returns the
 *  offers with their server ids, plus the local -> server id pairs. */
export async function pushOffers(
  businessId: string,
  menuId: string,
  prev: readonly Offer[],
  next: readonly Offer[],
  itemIds: Record<string, string>,
  currency: string
): Promise<{ offers: Offer[]; ids: Record<string, string> }> {
  const ids: Record<string, string> = {};
  const before = new Map(prev.map((o) => [o.id, o]));
  const out: Offer[] = [];

  for (const o of next) {
    const components = o.entries.map((e) => ({ catalogItemId: itemIds[e.itemId] ?? e.itemId, quantity: e.qty }));
    // An offer whose items are not on the server yet, or that has none, cannot be created.
    if (components.length === 0 || !components.every((c) => isServerId(c.catalogItemId))) {
      out.push(o);
      continue;
    }
    const rule = ruleOf(o, currency);
    const old = before.get(o.id);
    let sid = isServerId(o.id) ? o.id : null;
    let version: number | null = null;
    if (!sid) {
      const created = await createOffer(businessId, { businessId, name: loc(o.name), slug: toSlug(o.slug || o.name) || null, components, pricingRule: rule }, key());
      sid = created.id;
      version = created.version;
      ids[o.id] = sid;
    } else if (old && JSON.stringify(old) === JSON.stringify(o)) {
      out.push(o);
      continue;
    }

    // Everything the editor sets goes in one update; a picked photo uploads first.
    let image: string | null = o.image;
    let ref = knownMedia(o.image);
    if (isLocalMedia(o.image)) {
      const up = await uploadMedia(businessId, o.image, "OfferImage", `${o.name || "offer"}.jpg`);
      ref = up.ref;
      image = up.url;
    }
    const updated = await updateOffer(businessId, sid, {
      name: loc(o.name),
      badge: o.badge ? loc(o.badge) : null,
      image: ref,
      showSavingBadge: o.showSavingBadge,
      slug: toSlug(o.slug || o.name),
      components,
      pricingRule: rule,
      excludeFromPromotions: o.pricing.excludeFromPromotions,
      schedule: scheduleOf(o.availability),
      salesChannels: selection(o.channels, SALES),
      fulfillmentModes: selection(o.channels, FULFILMENT),
      expectedVersion: version,
    });
    let status = o.status;
    if (updated.isActive !== (o.status === "active")) {
      // The API refuses to switch an incomplete offer on (no price yet, say).
      // That is not a failure of the save: the offer stays off until it is complete.
      try {
        await setOfferActive(businessId, sid, { active: o.status === "active", expectedVersion: null });
      } catch {
        status = updated.isActive ? "active" : "inactive";
      }
    }
    out.push({ ...o, id: sid, image, status });
  }

  // Placements in the menu's Offers section, matching the order above.
  const wanted = out.filter((o) => isServerId(o.id));
  const removed = prev.filter((o) => isServerId(o.id) && !next.some((n) => n.id === o.id));
  if (wanted.length > 0 || removed.length > 0) {
    const sectionId = await offersSectionId(businessId, menuId);
    let full = await placeSectionEntries(businessId, menuId, sectionId, { entries: [], expectedVersion: null });
    const have = new Set(full.placements.map((p) => p.targetId));
    for (const p of full.placements) {
      if (p.targetKind.toLowerCase() === "offer" && !wanted.some((o) => o.id === p.targetId)) {
        full = await removePlacement(businessId, menuId, sectionId, p.id);
      }
    }
    const add = wanted.filter((o) => !have.has(o.id));
    if (add.length) {
      full = await placeSectionEntries(businessId, menuId, sectionId, {
        entries: add.map((o) => ({ targetKind: "Offer", targetId: o.id })),
        expectedVersion: null,
      });
    }
    const byTarget = new Map(full.placements.map((p) => [p.targetId, p.id]));
    const ordered = wanted.map((o) => byTarget.get(o.id)).filter((x): x is string => Boolean(x));
    const current = [...full.placements].sort((a, b) => a.position - b.position).map((p) => p.id);
    if (ordered.length > 1 && ordered.join() !== current.join()) {
      await reorderPlacements(businessId, menuId, sectionId, { orderedPlacementIds: ordered, expectedVersion: null });
    }
    for (const o of removed) await deleteOffer(businessId, o.id, { removeFromSections: true });
  }
  return { offers: out, ids };
}
