import { describe, expect, it } from "vitest";
import {
  BUILDER_PREVIEW_PATH,
  BUILDER_PREVIEW_PROTOCOL,
  fromCanvas,
  isFromCanvasMessage,
  isToCanvasMessage,
  toCanvas,
  type PublicSiteShell,
} from "@octopus/api-client";

const shell = { language: "ar" } as unknown as PublicSiteShell;

describe("builder preview protocol", () => {
  it("lives under the reserved preview segment", () => {
    expect(BUILDER_PREVIEW_PATH).toBe("/preview/builder");
    expect(BUILDER_PREVIEW_PROTOCOL).toBe(1);
  });

  it("recognises the messages it builds", () => {
    expect(isToCanvasMessage(toCanvas({ type: "render", shell, page: null, pageLoading: false, menus: {}, highlightSectionId: null, selectable: false }))).toBe(true);
    expect(isToCanvasMessage(toCanvas({ type: "scroll-to", anchor: "menu" }))).toBe(true);
    expect(isFromCanvasMessage(fromCanvas({ type: "ready" }))).toBe(true);
    expect(isFromCanvasMessage(fromCanvas({ type: "navigate", href: "/about" }))).toBe(true);
    expect(isFromCanvasMessage(fromCanvas({ type: "language", language: "en" }))).toBe(true);
    expect(isFromCanvasMessage(fromCanvas({ type: "select-section", sectionId: "s1" }))).toBe(true);
  });

  it("ignores another protocol version, another channel, and malformed bodies", () => {
    expect(isFromCanvasMessage({ ...fromCanvas({ type: "ready" }), protocol: 2 })).toBe(false);
    expect(isFromCanvasMessage({ ...fromCanvas({ type: "ready" }), channel: "octopus-builder" })).toBe(false);
    expect(isFromCanvasMessage({ ...fromCanvas({ type: "navigate", href: "/" }), href: 42 })).toBe(false);
    expect(isToCanvasMessage({ ...toCanvas({ type: "scroll-to", anchor: "a" }), channel: "octopus-builder-canvas" })).toBe(false);
    expect(isToCanvasMessage({ channel: "octopus-builder", protocol: 1, type: "render", shell, page: null, menus: null })).toBe(false);
    expect(isToCanvasMessage({ ...toCanvas({ type: "render", shell, page: null, pageLoading: false, menus: {}, highlightSectionId: null, selectable: false }), selectable: undefined })).toBe(false);
    expect(isToCanvasMessage("render")).toBe(false);
    expect(isToCanvasMessage(null)).toBe(false);
  });
});
