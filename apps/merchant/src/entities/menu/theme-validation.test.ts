import { describe, expect, it } from "vitest";
import { HERO_SUBTEXT_MAX, HERO_TEXT_MAX, isHexColor, normalizeHexColor, validateTheme } from "./theme-validation";

const COLORS = { primary: "#08589D", light: "#EEF4FF", accent: "#5B9BD5", dark: "#0B2545" };

describe("theme validation", () => {
  it("accepts four #RRGGBB colours and short hero copy", () => {
    expect(validateTheme({ colors: COLORS, heroText: "Welcome", heroSubtext: "" })).toEqual({});
  });

  it("recognises only six-digit hex with a hash", () => {
    expect(isHexColor("#08589d")).toBe(true);
    for (const value of ["08589D", "#0859", "#08589DFF", "#GGGGGG", "blue", ""]) expect(isHexColor(value)).toBe(false);
  });

  it("flags each colour that is not valid hex", () => {
    expect(validateTheme({ colors: { ...COLORS, light: "#EEF", dark: "navy" }, heroText: "", heroSubtext: "" })).toEqual({
      light: "menuTheme.validation.hexInvalid",
      dark: "menuTheme.validation.hexInvalid",
    });
  });

  it("normalises what was typed to the stored form, or null while incomplete", () => {
    expect(normalizeHexColor(" 08589d ")).toBe("#08589D");
    expect(normalizeHexColor("#0b2545")).toBe("#0B2545");
    expect(normalizeHexColor("#0b25")).toBeNull();
    expect(normalizeHexColor("")).toBeNull();
  });

  it("limits the hero text and subtext lengths", () => {
    const long = validateTheme({ colors: COLORS, heroText: "x".repeat(HERO_TEXT_MAX + 1), heroSubtext: "y".repeat(HERO_SUBTEXT_MAX + 1) });
    expect(long).toEqual({
      heroText: "menuTheme.validation.heroTextTooLong",
      heroSubtext: "menuTheme.validation.heroSubtextTooLong",
    });
    expect(validateTheme({ colors: COLORS, heroText: "x".repeat(HERO_TEXT_MAX), heroSubtext: "y".repeat(HERO_SUBTEXT_MAX) })).toEqual({});
  });
});
