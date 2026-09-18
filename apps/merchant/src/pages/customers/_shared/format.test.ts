import { describe, expect, it } from "vitest";
import { formatDate, formatReservationDateTime, formatSar, formatSarWhole } from "./format";

describe("format", () => {
  it("prints day-first short dates with a 3-letter month", () => {
    expect(formatDate("2026-05-15", "en")).toBe("15 May 2026");
    expect(formatDate("2022-09-16", "en")).toBe("16 Sep 2022");
  });

  it("prints reservation date and time compactly", () => {
    expect(formatReservationDateTime("2026-05-10T19:30:00", "en")).toBe("Sun, 10 May 2026 - 7:30PM");
    expect(formatReservationDateTime("2026-05-10T00:05:00", "en")).toBe("Sun, 10 May 2026 - 12:05AM");
  });

  it("uses whole grouped riyals for aggregates and two decimals for transactions", () => {
    expect(formatSarWhole(12500)).toBe("SAR 12,500");
    expect(formatSarWhole(59.6)).toBe("SAR 60");
    expect(formatSar(186)).toBe("SAR 186.00");
  });
});
