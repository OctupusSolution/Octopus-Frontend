import { describe, expect, it } from "vitest";
import { toCanvas, type PublicSiteShell } from "@octopus/api-client";
import { acceptToCanvas, canvasLinkTarget } from "./canvas-messages";

const parent = { name: "parent" };
const allowed = ["https://app.octopus.app"];
const scroll = toCanvas({ type: "scroll-to", anchor: "menu" });

describe("acceptToCanvas", () => {
  it("takes a well-formed message from the parent window at an allowed origin", () => {
    expect(acceptToCanvas({ origin: "https://app.octopus.app", source: parent, data: scroll }, allowed, parent)).toEqual(scroll);
  });

  it("ignores another window, another origin, and malformed data", () => {
    expect(acceptToCanvas({ origin: "https://app.octopus.app", source: { name: "opener" }, data: scroll }, allowed, parent)).toBeNull();
    expect(acceptToCanvas({ origin: "https://evil.test", source: parent, data: scroll }, allowed, parent)).toBeNull();
    expect(acceptToCanvas({ origin: "https://app.octopus.app", source: parent, data: { ...scroll, protocol: 9 } }, allowed, parent)).toBeNull();
    const render = toCanvas({ type: "render", shell: {} as PublicSiteShell, page: null, pageLoading: false, menus: {}, highlightSectionId: null, selectable: false });
    expect(acceptToCanvas({ origin: "https://app.octopus.app", source: parent, data: render }, [], parent)).toBeNull();
    expect(acceptToCanvas({ origin: "https://app.octopus.app", source: parent, data: { ...render, selectable: undefined } }, allowed, parent)).toBeNull();
  });
});

describe("canvasLinkTarget", () => {
  const own = "https://ocean.octopus.app";
  it("turns a same-site link into its path and hash", () => {
    expect(canvasLinkTarget("/about", own)).toBe("/about");
    expect(canvasLinkTarget("/#menu", own)).toBe("/#menu");
    expect(canvasLinkTarget("#story", own)).toBe("#story");
    expect(canvasLinkTarget("https://ocean.octopus.app/contact?x=1#map", own)).toBe("/contact#map");
  });

  it("refuses anything that would leave the site", () => {
    expect(canvasLinkTarget("https://instagram.com/ocean", own)).toBeNull();
    expect(canvasLinkTarget("mailto:hi@ocean.test", own)).toBeNull();
    expect(canvasLinkTarget("tel:+966500000000", own)).toBeNull();
    expect(canvasLinkTarget("javascript:alert(1)", own)).toBeNull();
    expect(canvasLinkTarget("//evil.test/x", own)).toBeNull();
  });
});
