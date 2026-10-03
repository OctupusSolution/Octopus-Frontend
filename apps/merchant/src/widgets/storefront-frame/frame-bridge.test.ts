import { describe, expect, it } from "vitest";
import { acceptFromCanvas, canvasUrl, frameGeometry } from "./frame-bridge";

const frame = { name: "frame" };

describe("frame bridge", () => {
  it("points at the canvas's route", () => {
    expect(canvasUrl("http://ocean.localhost:3000", "/preview/builder")).toBe("http://ocean.localhost:3000/preview/builder");
    expect(canvasUrl("https://ocean.octopus.app/", "/preview/builder")).toBe("https://ocean.octopus.app/preview/builder");
  });

  it("takes messages from its own frame at the canvas origin only", () => {
    const accept = (data: unknown) => (data === "ready" ? ({ type: "ready" } as const) : null);
    expect(acceptFromCanvas({ origin: "https://ocean.octopus.app", source: frame, data: "ready" }, "https://ocean.octopus.app", frame, accept)).toEqual({ type: "ready" });
    expect(acceptFromCanvas({ origin: "https://evil.test", source: frame, data: "ready" }, "https://ocean.octopus.app", frame, accept)).toBeNull();
    expect(acceptFromCanvas({ origin: "https://ocean.octopus.app", source: { name: "other" }, data: "ready" }, "https://ocean.octopus.app", frame, accept)).toBeNull();
    expect(acceptFromCanvas({ origin: "https://ocean.octopus.app", source: frame, data: "nope" }, "https://ocean.octopus.app", frame, accept)).toBeNull();
  });

  it("maps a channel's own message into the frame's events", () => {
    const accept = (data: unknown) => (data === "hello" ? ({ type: "select-section", id: "s2" } as const) : null);
    expect(acceptFromCanvas({ origin: "o", source: frame, data: "hello" }, "o", frame, accept)).toEqual({ type: "select-section", id: "s2" });
    expect(acceptFromCanvas({ origin: "o", source: frame, data: "nope" }, "o", frame, accept)).toBeNull();
  });

  it("lays the page out at the device width and scales it into the card", () => {
    expect(frameGeometry(1280, 640, 600, Infinity)).toEqual({ drawnWidth: 640, scale: 0.5, frameHeight: 1200 });
    expect(frameGeometry(390, 640, 600, 300)).toEqual({ drawnWidth: 300, scale: 300 / 390, frameHeight: 780 });
    expect(frameGeometry(1280, 0, 600, Infinity)).toEqual({ drawnWidth: 0, scale: 0, frameHeight: 0 });
  });
});
