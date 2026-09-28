import { describe, expect, it } from "vitest";
import { fromCanvas, fromMenuCanvas } from "@octopus/api-client";
import { MENU_CANVAS_CHANNEL } from "./menu-canvas-channel";
import { canvasOrigin } from "./canvas-origin";

describe("menu canvas channel", () => {
  it("points at /preview/menu and maps the canvas's messages", () => {
    expect(MENU_CANVAS_CHANNEL.path).toBe("/preview/menu");
    expect(MENU_CANVAS_CHANNEL.accept(fromMenuCanvas({ type: "select-section", sectionRef: "s2" }))).toEqual({ type: "select-section", id: "s2" });
    expect(MENU_CANVAS_CHANNEL.accept(fromMenuCanvas({ type: "ready" }))).toEqual({ type: "ready" });
    expect(MENU_CANVAS_CHANNEL.accept(fromCanvas({ type: "ready" }))).toBeNull();
  });

  it("uses the configured canvas origin, else the dev storefront in development", () => {
    expect(canvasOrigin({ VITE_STOREFRONT_CANVAS_ORIGIN: "https://menu.example/", DEV: false })).toBe("https://menu.example");
    expect(canvasOrigin({ DEV: true })).toBe("http://localhost:3000");
    expect(canvasOrigin({ DEV: false })).toBe("https://menu.octopus.sa");
  });
});
