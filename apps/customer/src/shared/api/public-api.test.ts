import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in PublicApi that records what the storefront sends.
const seen: { url: string; host?: string; token?: string }[] = [];
const server = http.createServer((req, res) => {
  seen.push({ url: req.url ?? "", host: req.headers.host, token: req.headers["x-preview-token"] as string | undefined });
  if (req.url?.startsWith("/v1/public-site/preview") && req.headers["x-preview-token"] !== "plpv_good") {
    res.writeHead(404, { "content-type": "application/json" }).end('{"code":"publiclink.site.not-found"}');
    return;
  }
  res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ language: "ar", isPreview: req.url?.includes("/preview") }));
});

let cookie: string | null = null;
vi.mock("next/headers", () => ({
  cookies: () => ({ get: (name: string) => (name === "octo_preview" && cookie ? { value: cookie } : undefined) }),
}));

let api: typeof import("./public-api");

beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.PUBLIC_API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  api = await import("./public-api");
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));
beforeEach(() => {
  seen.length = 0;
  cookie = null;
});

describe("public-api preview plumbing", () => {
  it("reads the published shell by Host, and caches it", async () => {
    const a = await api.fetchShell("cache-test", "ar");
    const b = await api.fetchShell("cache-test", "ar");
    expect(a?.isPreview).toBe(false);
    expect(b).toEqual(a);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ url: "/v1/public-site?lang=ar", host: "cache-test.octopus.app", token: undefined });
  });

  it("with a preview cookie, reads the preview endpoints with X-Preview-Token and never caches", async () => {
    cookie = "plpv_good";
    const shell = await api.fetchShell("preview-test", "ar");
    await api.fetchShell("preview-test", "ar");
    await api.fetchPage("preview-test", "/about", "ar");
    expect(shell?.isPreview).toBe(true);
    expect(seen.map((s) => s.url)).toEqual([
      "/v1/public-site/preview?lang=ar",
      "/v1/public-site/preview?lang=ar",
      "/v1/public-site/preview/pages?path=%2Fabout&lang=ar",
    ]);
    expect(seen.every((s) => s.token === "plpv_good" && s.host === "preview-test.octopus.app")).toBe(true);
  });

  it("a preview read does not poison the published cache, nor the other way round", async () => {
    await api.fetchShell("mixed", "en"); // published, cached
    cookie = "plpv_good";
    const preview = await api.fetchShell("mixed", "en");
    expect(preview?.isPreview).toBe(true); // not the cached published answer
    cookie = null;
    const published = await api.fetchShell("mixed", "en");
    expect(published?.isPreview).toBe(false);
    expect(seen.map((s) => s.url)).toEqual(["/v1/public-site?lang=en", "/v1/public-site/preview?lang=en"]);
  });

  it("an unusable secret is a null shell (the storefront's 404)", async () => {
    cookie = "plpv_invalid";
    expect(await api.fetchShell("bad", "ar")).toBeNull();
    expect(api.isPreviewRequest()).toBe(true);
  });

  it("the site menu never receives the secret", async () => {
    cookie = "plpv_good";
    await api.fetchSiteMenu("menu-test", "key1", "ar").catch(() => null);
    expect(seen[0]).toMatchObject({ url: "/v1/public/site-menu/key1?lang=ar", token: undefined });
  });
});
