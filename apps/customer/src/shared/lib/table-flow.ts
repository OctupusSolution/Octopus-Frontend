import type { OrderLine } from "@octopus/api-client";
import { computeOrderTotals, computePromoDiscountSar, type OrderTotals } from "./pricing";
import { computeCartPricing } from "./storefront";

// The dine-in flow a table's QR code opens: scan, browse, order and pay from the
// phone. It has its own mobile chrome (the table bar instead of the site header),
// so middleware marks its requests and the root layout leaves the site chrome off.
export const TABLE_FLOW_HEADER = "x-octo-table-flow";

export const isTableFlowPath = (pathname: string): boolean =>
  pathname === "/table" || pathname.startsWith("/table/");

export const TABLE_ROUTES = {
  scan: "/table/scan",
  welcome: "/table/welcome",
  home: "/table",
  menu: "/table/menu",
  cart: "/table/cart",
  pay: "/table/pay",
  paySummary: "/table/pay/summary",
  payOptions: "/table/pay/options",
  splitEqual: "/table/pay/split/equal",
  splitItems: "/table/pay/split/items",
  splitCustom: "/table/pay/split/custom",
  splitReview: "/table/pay/split/review",
  thanks: "/table/thanks",
  order: "/table/order",
  orders: "/table/orders",
  invoice: "/table/invoice",
} as const;

/** Where each way of sharing the bill is set up. Paying in full needs no set-up. */
export const SPLIT_ROUTES = {
  equal: TABLE_ROUTES.splitEqual,
  items: TABLE_ROUTES.splitItems,
  custom: TABLE_ROUTES.splitCustom,
} as const;

export const tableItemHref = (itemId: string): string => `${TABLE_ROUTES.menu}/${itemId}`;

// The pickup flow: the same phone screens without a table — order ahead, pay
// online, collect from a branch — plus booking a table and its waitlist.
export const isPickupFlowPath = (pathname: string): boolean =>
  pathname === "/pickup" || pathname.startsWith("/pickup/");

/** Every route that draws the phone chrome instead of the site header and footer. */
export const isMobileFlowPath = (pathname: string): boolean =>
  isTableFlowPath(pathname) || isPickupFlowPath(pathname);

export const PICKUP_ROUTES = {
  home: "/pickup",
  categories: "/pickup/categories",
  menu: "/pickup/menu",
  offers: "/pickup/offers",
  bestSellers: "/pickup/best-sellers",
  cart: "/pickup/cart",
  pay: "/pickup/pay",
  payOptions: "/pickup/pay/options",
  order: "/pickup/order",
  invoice: "/pickup/invoice",
  booking: "/pickup/booking",
  bookingPay: "/pickup/booking/pay",
} as const;

/** What the screens the two flows share need to know about the flow they are in. */
export interface MobileFlow {
  mode: "table" | "pickup";
  home: string;
  /** A category's listing. */
  menu: string;
  /** Where "view the menu" lands: the listing at a table, the categories for pickup. */
  menuIndex: string;
  bestSellers: string;
  offers: string;
  cart: string;
  /** Where the cart's "continue to payment" goes. */
  checkout: string;
  /** The cart button's label when it is not "continue to pay" (a scanned code sends the order). */
  checkoutLabelKey?: string;
  booking: string;
}

export const MOBILE_FLOWS: Record<MobileFlow["mode"], MobileFlow> = {
  table: {
    mode: "table",
    home: TABLE_ROUTES.home,
    menu: TABLE_ROUTES.menu,
    menuIndex: TABLE_ROUTES.menu,
    bestSellers: `${TABLE_ROUTES.menu}?best=1`,
    offers: `${TABLE_ROUTES.home}#offers`,
    cart: TABLE_ROUTES.cart,
    checkout: TABLE_ROUTES.pay,
    booking: PICKUP_ROUTES.booking,
  },
  pickup: {
    mode: "pickup",
    home: PICKUP_ROUTES.home,
    menu: PICKUP_ROUTES.menu,
    menuIndex: PICKUP_ROUTES.categories,
    bestSellers: PICKUP_ROUTES.bestSellers,
    offers: PICKUP_ROUTES.offers,
    cart: PICKUP_ROUTES.cart,
    checkout: PICKUP_ROUTES.pay,
    booking: PICKUP_ROUTES.booking,
  },
};

export const flowItemHref = (flow: MobileFlow, itemId: string): string => `${flow.menu}/${itemId}`;

/** A scanned place code's own screens (`/p/{key}`): no payment, the cart sends the order. */
export const PLACE_ROUTES = (key: string) => {
  const base = `/p/${encodeURIComponent(key)}`;
  return {
    welcome: base,
    menu: `${base}/menu`,
    cart: `${base}/cart`,
    send: `${base}/send`,
    order: `${base}/order`,
    orders: `${base}/orders`,
  };
};

/** The table flow's shared screens, aimed at a scanned code. It is a table (the top card shows
 *  the table number), every link stays under the code, and checkout is the send screen. */
export function placeFlow(key: string): MobileFlow {
  const r = PLACE_ROUTES(key);
  return {
    mode: "table",
    home: r.menu,
    menu: r.menu,
    menuIndex: r.menu,
    bestSellers: `${r.menu}?best=1`,
    offers: r.menu,
    cart: r.cart,
    checkout: r.send,
    checkoutLabelKey: "store.place.send",
    booking: r.menu,
  };
}

/** The table a scanned code names. A table QR carries a link (…?table=12); a
 *  bare number is accepted too, so a code printed before links existed still works. */
export function tableFromQr(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const named = url.searchParams.get("table") ?? url.searchParams.get("t");
    if (named) return named;
  } catch {
    // Not a link: fall through to the bare-number form.
  }
  return /^[A-Za-z]?\d{1,4}$/.test(value) ? value.replace(/^[A-Za-z]/, "") : null;
}

export interface TableBill extends OrderTotals {
  discountSar: number;
  /** What the customer actually pays: the total less the promo discount. */
  payableSar: number;
}

export function computeTableBill(
  lines: readonly OrderLine[],
  tipSar: number,
  promoCode: string | null,
): TableBill {
  const pricing = computeCartPricing(lines);
  const totals = computeOrderTotals(pricing, tipSar);
  const discountSar = promoCode ? computePromoDiscountSar(pricing.totalSar, promoCode) : 0;
  return { ...totals, discountSar, payableSar: Math.max(0, totals.totalSar - discountSar) };
}
