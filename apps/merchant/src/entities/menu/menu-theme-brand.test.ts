import { describe, expect, it } from "vitest";
import { brandColorsToServer, themeTextToServer } from "./menu-sync";

const current = { primaryColor: "#000000", lightColor: null, accentColor: null, darkColor: null };
const brand = { colors: { primary: "#aabbcc", light: "#ffffff", accent: "bad", dark: "#111" }, logoUrl: null, heroUrl: null, heroText: "", heroSubtext: "" };

describe("menu brand to the server", () => {
  it("sends valid colours, keeps the server's for a malformed one, and keeps all when the brand is not loaded", () => {
    expect(brandColorsToServer(brand, current)).toEqual({ primaryColor: "#aabbcc", lightColor: "#ffffff", accentColor: null, darkColor: "#111" });
    expect(brandColorsToServer(undefined, current)).toEqual(current);
    expect(brandColorsToServer(null, current)).toEqual(current);
  });

  it("writes hero text into the builder's language and clears it when blank", () => {
    expect(themeTextToServer("Hello", "en", { ar: "أهلاً" })).toEqual({ ar: "أهلاً", en: "Hello" });
    expect(themeTextToServer("  ", "en", { en: "old", ar: "x" })).toEqual({ ar: "x" });
  });
});
