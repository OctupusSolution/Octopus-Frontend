// What a combo costs and what it saves.
//
// The Pricing & Saving tab shows two ledgers side by side and a savings figure,
// and every number in all three is derived here. The frame's 130 / 19.5 / 149.5
// against 100 / 15 / 115 is arithmetic over the offer's own entries, not a
// fixture — an offer whose parts change has to re-quote itself.

import type { Item, Menu, Offer } from "./menu";
import { OFFERS_SECTION_ID, updateOffer } from "./draft";

export interface OfferLine {
  name: string;
  price: number;
  qty: number;
}

/** Two decimal places at most, without float noise: 130 * 0.15 is
 *  19.500000000000004 before this, and the frame says 19.5. */
function round(value: number): number {
  return Number(value.toFixed(2));
}

/** Resolves each entry to the item it points at.
 *
 *  An entry whose item has been deleted is dropped rather than rendered as a
 *  blank row: the offer should quote what it can actually serve, and a line
 *  with no dish behind it would still be charged for. */
export function offerLines(menu: Menu, offer: Offer): OfferLine[] {
  const items = new Map<string, Item>();
  for (const section of menu.sections) {
    for (const entry of section.entries) {
      items.set(entry.id, entry as Item);
    }
  }

  return offer.entries.flatMap((entry) => {
    const item = items.get(entry.itemId);
    if (!item) return [];
    return [{ name: item.name, price: entry.price, qty: entry.qty }];
  });
}

export function individualTotals(
  menu: Menu,
  offer: Offer
): { subTotal: number; vat: number; total: number } {
  const subTotal = offerLines(menu, offer).reduce(
    (sum, line) => sum + line.price * line.qty,
    0
  );
  const vat = subTotal * offer.pricing.vatRate;
  return { subTotal: round(subTotal), vat: round(vat), total: round(subTotal + vat) };
}

/** The offer price the "Set a Discount" role derives: the VAT-exclusive
 *  individual subtotal less the discount, never below zero. Exclusive because
 *  offerPrice itself is exclusive — VAT is added on top of it in offerTotals. */
export function discountedPrice(
  subTotal: number,
  discount: Offer["pricing"]["discount"]
): number {
  if (!discount || discount.value <= 0) return round(subTotal);
  const off =
    discount.type === "percent"
      ? subTotal * (Math.min(discount.value, 100) / 100)
      : discount.value;
  return round(Math.max(0, subTotal - off));
}

/** Re-derives the offer price of a "Set a Discount" offer after any edit to
 *  it. offerPrice stays a stored field — the Next Step gate, the entry list
 *  and the storefront all read it — so under that role it has to be written
 *  back whenever the lines or the discount change, not only computed on the
 *  pricing tab. Any other role is left alone: there the merchant typed it. */
export function syncDiscountPrice(menu: Menu, offerId: string): Menu {
  const offer = menu.sections
    .find((s) => s.id === OFFERS_SECTION_ID)
    ?.entries.find((e) => e.id === offerId) as Offer | undefined;
  if (!offer || offer.pricing.role !== "discount") return menu;
  const offerPrice = discountedPrice(individualTotals(menu, offer).subTotal, offer.pricing.discount);
  if (offerPrice === offer.pricing.offerPrice) return menu;
  return updateOffer(menu, offerId, { pricing: { ...offer.pricing, offerPrice } });
}

export function offerTotals(offer: Offer): { price: number; vat: number; total: number } {
  const price = offer.pricing.offerPrice;
  const vat = price * offer.pricing.vatRate;
  return { price: round(price), vat: round(vat), total: round(price + vat) };
}

/** What the customer saves, and by what percentage.
 *
 *  Both figures compare the two VAT-INCLUSIVE totals. The frame shows
 *  "Customer Saves SAR 49.5" beside "Off 23%", and those cannot both be right:
 *  23% is (149.5 − 115) / 149.5, two inclusive totals, while 49.5 is
 *  149.5 − 100, an inclusive total against an exclusive price. On the
 *  percentage's own basis the money figure is 34.5, which is what this returns.
 *
 *  Settled by the product owner on 2026-09-10 (spec open question 6): both
 *  figures compare what the customer actually pays, VAT included, so the
 *  amount and the percentage always agree. The frame's SAR 49.5 is not a
 *  target to match. */
export function offerSavings(menu: Menu, offer: Offer): { amount: number; percent: number } {
  const parts = individualTotals(menu, offer).total;
  const combo = offerTotals(offer).total;

  // An offer that costs more than its parts saves nothing. Reporting a negative
  // saving would put a minus sign in a green "Customer Saves" panel.
  if (parts <= 0 || combo >= parts) return { amount: 0, percent: 0 };

  return { amount: round(parts - combo), percent: Math.round(((parts - combo) / parts) * 100) };
}
