import { describe, expect, it } from "vitest";
import {
  MENU_PREVIEW_PATH,
  fromMenuCanvas,
  isFromMenuCanvasMessage,
  isToMenuCanvasMessage,
  toMenuCanvas,
  type PublicMenuDocument,
} from "@octopus/api-client";

const document = { sections: [], items: {}, offers: {}, modifierGroups: {} } as unknown as PublicMenuDocument;

describe("menu preview protocol", () => {
  it("lives under the reserved preview segment", () => {
    expect(MENU_PREVIEW_PATH).toBe("/preview/menu");
  });

  it("recognises what it builds", () => {
    expect(isToMenuCanvasMessage(toMenuCanvas({ type: "render", document, mode: "order", selectable: true, highlightSectionRef: null }))).toBe(true);
    expect(isToMenuCanvasMessage(toMenuCanvas({ type: "scroll-to", anchor: "s0" }))).toBe(true);
    expect(isFromMenuCanvasMessage(fromMenuCanvas({ type: "ready" }))).toBe(true);
    expect(isFromMenuCanvasMessage(fromMenuCanvas({ type: "select-section", sectionRef: "s1" }))).toBe(true);
    expect(isFromMenuCanvasMessage(fromMenuCanvas({ type: "navigate", href: "/menu" }))).toBe(true);
  });

  it("ignores other versions, channels, the Public Link channels and bad shapes", () => {
    expect(isFromMenuCanvasMessage({ ...fromMenuCanvas({ type: "ready" }), protocol: 2 })).toBe(false);
    expect(isFromMenuCanvasMessage({ channel: "octopus-builder-canvas", protocol: 1, type: "ready" })).toBe(false);
    expect(isToMenuCanvasMessage({ ...toMenuCanvas({ type: "scroll-to", anchor: "a" }), channel: "octopus-builder" })).toBe(false);
    expect(isToMenuCanvasMessage({ channel: "octopus-menu-builder", protocol: 1, type: "render", document, mode: "sell", selectable: true, highlightSectionRef: null })).toBe(false);
    expect(isToMenuCanvasMessage({ channel: "octopus-menu-builder", protocol: 1, type: "render", document: null, mode: "view", selectable: true, highlightSectionRef: null })).toBe(false);
    expect(isFromMenuCanvasMessage({ ...fromMenuCanvas({ type: "select-section", sectionRef: "s0" }), sectionRef: 3 })).toBe(false);
  });
});
