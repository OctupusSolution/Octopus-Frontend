import { describe, expect, it } from "vitest";
import { encodeQr } from "./qr-encode";

const URL = "ocean-table.octopus.app";

describe("encodeQr", () => {
  it("returns a square version-4 matrix", () => {
    const matrix = encodeQr(URL);
    expect(matrix).toHaveLength(33);
    for (const row of matrix) expect(row).toHaveLength(33);
  });

  it("draws the three finder patterns", () => {
    const m = encodeQr(URL);
    for (const [r, c] of [[0, 0], [0, 26], [26, 0]] as const) {
      expect(m[r][c], `finder at ${r},${c}`).toBe(true);
      expect(m[r + 1][c + 1]).toBe(false);
      expect(m[r + 2][c + 2]).toBe(true);
    }
  });

  it("draws the timing patterns as alternating modules", () => {
    const m = encodeQr(URL);
    for (let i = 8; i < 25; i++) expect(m[6][i]).toBe(i % 2 === 0);
  });

  it("is deterministic", () => {
    expect(encodeQr(URL)).toEqual(encodeQr(URL));
  });

  it("produces a different matrix for a different url", () => {
    expect(encodeQr(URL)).not.toEqual(encodeQr("other.octopus.app"));
  });

  it("refuses input it cannot encode rather than emitting a corrupt symbol", () => {
    expect(() => encodeQr("x".repeat(200))).toThrow();
  });
});
