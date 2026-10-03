import { describe, expect, it, vi } from "vitest";

vi.mock("@octopus/api-client", () => ({
  completeMediaUpload: vi.fn(),
  completeSiteMediaUpload: vi.fn(),
  getMediaAsset: vi.fn(async (_b: string, assetId: string) => ({ assetId, kind: "Image", deliveryUrl: `https://cdn.example/menu/${assetId}.png` })),
  getSiteMediaAsset: vi.fn(async (_b: string, assetId: string) => ({ assetId, kind: "Image", deliveryUrl: `https://cdn.example/site/${assetId}.png` })),
  requestMediaUpload: vi.fn(),
  requestSiteMediaUpload: vi.fn(),
}));

const { knownMedia, mediaUrl, rememberMedia } = await import("./media");

describe("knownMedia scoped to a library", () => {
  it("never resolves a Public Link (site) asset's URL for the menu library, while the site still sees it", async () => {
    const siteUrl = await mediaUrl("biz-1", { assetId: "site-logo", kind: "Image" }, "site");
    const picked = rememberMedia({ assetId: "site-picked", kind: "Image", deliveryUrl: "https://cdn.example/site/picked.png" });

    expect(knownMedia(siteUrl, "menu")).toBeNull();
    expect(knownMedia(picked.url, "menu")).toBeNull();
    // The Public Link sync's unscoped and site-scoped lookups keep working.
    expect(knownMedia(siteUrl)).toEqual({ assetId: "site-logo", kind: "Image" });
    expect(knownMedia(siteUrl, "site")).toEqual({ assetId: "site-logo", kind: "Image" });
    expect(knownMedia(picked.url, "site")).toEqual({ assetId: "site-picked", kind: "Image" });
  });

  it("resolves a menu asset's URL for the menu library", async () => {
    const menuUrl = await mediaUrl("biz-1", { assetId: "menu-logo", kind: "Image" }, "menu");
    expect(knownMedia(menuUrl, "menu")).toEqual({ assetId: "menu-logo", kind: "Image" });
    expect(knownMedia(menuUrl, "site")).toBeNull();
  });
});
