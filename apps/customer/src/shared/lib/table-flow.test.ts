import { describe, expect, it } from "vitest";
import { MOBILE_FLOWS, PLACE_ROUTES, flowItemHref, placeFlow } from "./table-flow";

describe("placeFlow", () => {
  it("keeps every screen of a scanned code under /p/{key}, and checks out to the send screen", () => {
    const flow = placeFlow("K1");
    expect(flow.mode).toBe("table");
    expect(flow.menu).toBe("/p/K1/menu");
    expect(flow.menuIndex).toBe("/p/K1/menu");
    expect(flow.cart).toBe("/p/K1/cart");
    expect(flow.checkout).toBe("/p/K1/send");
    expect(flowItemHref(flow, "cat-1-i1")).toBe("/p/K1/menu/cat-1-i1");
    const { mode: _mode, checkoutLabelKey: _label, ...routes } = flow;
    expect(Object.values(routes).every((v) => v.startsWith("/p/K1"))).toBe(true);
  });

  it("escapes the key", () => {
    expect(placeFlow("a b/c").menu).toBe("/p/a%20b%2Fc/menu");
    expect(PLACE_ROUTES("a b").send).toBe("/p/a%20b/send");
  });

  it("names the place-only screens", () => {
    expect(PLACE_ROUTES("K")).toEqual({
      welcome: "/p/K",
      menu: "/p/K/menu",
      cart: "/p/K/cart",
      send: "/p/K/send",
      order: "/p/K/order",
      orders: "/p/K/orders",
    });
  });

  it("leaves the table flow as it was", () => {
    expect(MOBILE_FLOWS.table.checkout).toBe("/table/pay");
    expect(MOBILE_FLOWS.table.checkoutLabelKey).toBeUndefined();
  });

  it("labels the cart's button as sending the order, never as paying", () => {
    expect(placeFlow("K").checkoutLabelKey).toBe("store.place.send");
  });
});
