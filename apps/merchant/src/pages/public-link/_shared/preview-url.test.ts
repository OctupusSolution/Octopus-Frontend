import { describe, expect, it } from "vitest";
import { storefrontOrigin, storefrontPreviewUrl } from "./preview-url";

const TOKEN = "plpv_abc-DEF_123";
const base = { host: "cookdoor.octopus.app", slug: "cookdoor", fallback: "https://cookdoor.octopus.app/preview#t=x" };

describe("preview link address", () => {
  it("points at the storefront's /_preview route on the site's host", () => {
    expect(storefrontPreviewUrl(TOKEN, { ...base, currentHostname: "merchant.octopus.app" })).toBe(`https://cookdoor.octopus.app/_preview?token=${TOKEN}`);
    expect(storefrontPreviewUrl(TOKEN, { ...base, currentHostname: "merchant.octopus.app", expiresAtUtc: "2026-10-01T10:00:00Z" })).toBe(
      `https://cookdoor.octopus.app/_preview?token=${TOKEN}&exp=2026-10-01T10%3A00%3A00Z`
    );
  });

  it("uses <slug>.localhost:3000 while developing locally", () => {
    expect(storefrontPreviewUrl(TOKEN, { ...base, currentHostname: "localhost" })).toBe(`http://cookdoor.localhost:3000/_preview?token=${TOKEN}`);
    expect(storefrontPreviewUrl(TOKEN, { ...base, slug: null, currentHostname: "localhost" })).toBe(`http://localhost:3000/_preview?token=${TOKEN}`);
  });

  it("falls back to the backend's address when no host is known", () => {
    expect(storefrontPreviewUrl(TOKEN, { ...base, host: null, currentHostname: "merchant.octopus.app" })).toBe(base.fallback);
  });

  it("has no storefront to frame outside development before an address is claimed", () => {
    expect(storefrontOrigin({ host: null, slug: "", currentHostname: "app.octopus.app" })).toBeNull();
  });
});
