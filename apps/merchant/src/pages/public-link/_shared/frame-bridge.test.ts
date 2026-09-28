import { describe, expect, it } from "vitest";
import { fromCanvas } from "@octopus/api-client";
import { acceptFromCanvas, canvasUrl, frameGeometry } from "./frame-bridge";
import { storefrontOrigin } from "./preview-url";

const frame = { name: "frame" };
const ready = fromCanvas({ type: "ready" });

describe("frame bridge", () => {
  it("points at the storefront's canvas route", () => {
    expect(canvasUrl("http://ocean.localhost:3000")).toBe("http://ocean.localhost:3000/preview/builder");
    expect(canvasUrl("https://ocean.octopus.app/")).toBe("https://ocean.octopus.app/preview/builder");
  });

  it("takes messages from its own frame at the storefront origin only", () => {
    expect(acceptFromCanvas({ origin: "https://ocean.octopus.app", source: frame, data: ready }, "https://ocean.octopus.app", frame)).toEqual(ready);
    expect(acceptFromCanvas({ origin: "https://evil.test", source: frame, data: ready }, "https://ocean.octopus.app", frame)).toBeNull();
    expect(acceptFromCanvas({ origin: "https://ocean.octopus.app", source: { name: "other" }, data: ready }, "https://ocean.octopus.app", frame)).toBeNull();
    expect(acceptFromCanvas({ origin: "https://ocean.octopus.app", source: frame, data: { ...ready, protocol: 2 } }, "https://ocean.octopus.app", frame)).toBeNull();
  });

  it("lays the page out at the device width and scales it into the card", () => {
    expect(frameGeometry(1280, 640, 600, Infinity)).toEqual({ drawnWidth: 640, scale: 0.5, frameHeight: 1200 });
    expect(frameGeometry(390, 640, 600, 300)).toEqual({ drawnWidth: 300, scale: 300 / 390, frameHeight: 780 });
    expect(frameGeometry(1280, 0, 600, Infinity)).toEqual({ drawnWidth: 0, scale: 0, frameHeight: 0 });
  });

  it("has no storefront to frame outside development before an address is claimed", () => {
    expect(storefrontOrigin({ host: null, slug: "", currentHostname: "app.octopus.app" })).toBeNull();
  });
});
