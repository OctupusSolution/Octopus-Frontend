// What the offer editor refuses, per field. Pure, so the five tabs only decide
// *when* to show a message (after a blur, or once Next was attempted) and the
// footer's Next Step is gated on exactly the list the tabs print.
import type { Offer } from "./menu";

export type OfferField =
  | "name"
  | "slug"
  | "image"
  | "entries"
  | "offerPrice"
  | "discount"
  | "from"
  | "to"
  | "dayFrom"
  | "dayTo"
  | "timeFrom"
  | "timeTo"
  | "channels";

export type OfferTab = "info" | "items" | "pricing" | "availability" | "channels";

/** i18n keys of the messages to show, per field. */
export type OfferErrors = Partial<Record<OfferField, string>>;

export interface OfferValidationContext {
  /** Slugs of the menu's other offers — every offer but the one being edited. */
  otherSlugs?: readonly string[];
  /** The VAT-exclusive total of the offer's items bought one by one
   *  (pricing.ts individualTotals().subTotal). Omit to skip the comparisons. */
  itemsSubTotal?: number | null;
}

export const OFFER_NAME_MAX = 80;
export const OFFER_SLUG_MAX = 80;

const SLUG = /^[A-Za-z0-9_-]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** The shape the API stores: lowercase words joined by hyphens. Two slugs that
 *  differ only in case, or in `_` against `-`, are the same slug to it. */
export function normalizeOfferSlug(slug: string): string {
  return slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const OFFER_FIELD_TAB: Record<OfferField, OfferTab> = {
  name: "info",
  slug: "info",
  image: "info",
  entries: "items",
  offerPrice: "pricing",
  discount: "pricing",
  from: "availability",
  to: "availability",
  dayFrom: "availability",
  dayTo: "availability",
  timeFrom: "availability",
  timeTo: "availability",
  channels: "channels",
};

const TAB_ORDER: OfferTab[] = ["info", "items", "pricing", "availability", "channels"];

export function validateOffer(offer: Offer, context: OfferValidationContext = {}): OfferErrors {
  const errors: OfferErrors = {};
  const { otherSlugs = [], itemsSubTotal = null } = context;

  const name = offer.name.trim();
  if (name === "") errors.name = "menuOffer.validation.nameRequired";
  else if (name.length > OFFER_NAME_MAX) errors.name = "menuOffer.validation.nameTooLong";

  const slug = offer.slug.trim();
  if (slug === "") errors.slug = "menuOffer.validation.slugRequired";
  else if (!SLUG.test(slug)) errors.slug = "menuOffer.validation.slugFormat";
  else if (slug.length > OFFER_SLUG_MAX) errors.slug = "menuOffer.validation.slugTooLong";
  else if (otherSlugs.some((other) => normalizeOfferSlug(other) === normalizeOfferSlug(slug)))
    errors.slug = "menuOffer.validation.slugTaken";

  if (!offer.image) errors.image = "menuOffer.validation.imageRequired";

  if (offer.entries.length === 0) errors.entries = "menuOffer.validation.itemsRequired";
  else if (offer.entries.some((entry) => !Number.isInteger(entry.qty) || entry.qty < 1))
    errors.entries = "menuOffer.validation.qtyMin";

  const { pricing } = offer;
  const total = itemsSubTotal !== null && itemsSubTotal > 0 ? itemsSubTotal : null;
  if (pricing.role === "discount") {
    const value = pricing.discount?.value ?? 0;
    if (!Number.isFinite(value) || value < 0) errors.discount = "menuOffer.validation.discountRequired";
    else if (pricing.discount?.type === "percent" && value > 100) errors.discount = "menuOffer.validation.discountPercentRange";
    else if (pricing.discount?.type === "amount" && total !== null && value > total)
      errors.discount = "menuOffer.validation.discountAboveTotal";
  }
  if (!Number.isFinite(pricing.offerPrice) || pricing.offerPrice <= 0) errors.offerPrice = "menuOffer.validation.priceRequired";
  else if (pricing.role === "fixed" && total !== null && pricing.offerPrice > total)
    errors.offerPrice = "menuOffer.validation.priceAboveTotal";

  const { from, to, window } = offer.availability;
  if (from !== null && !DATE.test(from)) errors.from = "menuOffer.validation.dateInvalid";
  if (to !== null && !DATE.test(to)) errors.to = "menuOffer.validation.dateInvalid";
  // ISO dates are zero-padded, so the strings order the same way the days do.
  else if (from !== null && to !== null && !errors.from && to < from) errors.to = "menuOffer.validation.toBeforeFrom";

  // The inner window is one same-day span within a run of weekdays. The run
  // may wrap the week (Fri → Mon), so any two chosen days are a valid range.
  if (window !== null) {
    if (window.days[0] === null) errors.dayFrom = "menuOffer.validation.dayRequired";
    if (window.days[1] === null) errors.dayTo = "menuOffer.validation.dayRequired";
    const startOk = window.start !== null && TIME.test(window.start);
    const endOk = window.end !== null && TIME.test(window.end);
    if (!startOk) errors.timeFrom = "menuOffer.validation.timeRequired";
    if (!endOk) errors.timeTo = "menuOffer.validation.timeRequired";
    else if (startOk && (window.end as string) <= (window.start as string)) errors.timeTo = "menuOffer.validation.timeToAfterFrom";
  }

  if (!Object.values(offer.channels).some(Boolean)) errors.channels = "menuOffer.validation.channelRequired";

  return errors;
}

/** The tabs still missing something, in tab order — what Next Step is gated on. */
export function offerIncompleteTabs(offer: Offer, context: OfferValidationContext = {}): OfferTab[] {
  const failing = new Set(
    (Object.keys(validateOffer(offer, context)) as OfferField[]).map((field) => OFFER_FIELD_TAB[field])
  );
  return TAB_ORDER.filter((tab) => failing.has(tab));
}

export function isOfferComplete(offer: Offer, context: OfferValidationContext = {}): boolean {
  return Object.keys(validateOffer(offer, context)).length === 0;
}
