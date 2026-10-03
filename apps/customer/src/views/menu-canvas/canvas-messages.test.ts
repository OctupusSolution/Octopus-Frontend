import { describe, expect, it } from "vitest";
import { toCanvas, toMenuCanvas } from "@octopus/api-client";
import { acceptToMenuCanvas } from "./canvas-messages";

const parent = { name: "parent" };
const allowed = ["https://app.octopus.app"];
const scroll = toMenuCanvas({ type: "scroll-to", anchor: "s1" });

describe("acceptToMenuCanvas", () => {
  it("takes a menu message from the parent at an allowed origin", () => {
    expect(acceptToMenuCanvas({ origin: "https://app.octopus.app", source: parent, data: scroll }, allowed, parent)).toEqual(scroll);
  });
  it("ignores other windows, origins and the Public Link channel", () => {
    expect(acceptToMenuCanvas({ origin: "https://app.octopus.app", source: {}, data: scroll }, allowed, parent)).toBeNull();
    expect(acceptToMenuCanvas({ origin: "https://evil.test", source: parent, data: scroll }, allowed, parent)).toBeNull();
    expect(acceptToMenuCanvas({ origin: "https://app.octopus.app", source: parent, data: toCanvas({ type: "scroll-to", anchor: "x" }) }, allowed, parent)).toBeNull();
  });
});
