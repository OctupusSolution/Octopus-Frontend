import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in PublicApi for the place-code scan and order calls.
const seen: { method: string; url: string; headers: http.IncomingHttpHeaders; body: string }[] = [];
let scanStatus = 200;
const server = http.createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on("data", (c: Buffer) => chunks.push(c));
  req.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");
    seen.push({ method: req.method ?? "", url: req.url ?? "", headers: req.headers, body });
    if (req.method === "POST") {
      res.writeHead(409, { "content-type": "application/json" }).end(JSON.stringify({ errorCode: "order.intake.basis-changed", echo: body }));
      return;
    }
    res.writeHead(scanStatus, { "content-type": "application/json" }).end(scanStatus === 200 ? JSON.stringify({ status: "open" }) : "{}");
  });
});

vi.mock("next/headers", () => ({ cookies: () => ({ get: () => undefined }) }));

let api: typeof import("./public-api");

beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.PUBLIC_API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  api = await import("./public-api");
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));
beforeEach(() => {
  seen.length = 0;
  scanStatus = 200;
});

describe("fetchPlaceScan", () => {
  it("reads the scan with a known language and never caches it", async () => {
    const a = await api.fetchPlaceScan("K1", "ar-SA");
    await api.fetchPlaceScan("K1", "ar-SA");
    expect(a).toEqual({ kind: "ok", scan: { status: "open" } });
    expect(seen.map((s) => `${s.method} ${s.url}`)).toEqual([
      "GET /v1/public/place-codes/K1?lang=ar",
      "GET /v1/public/place-codes/K1?lang=ar",
    ]);
  });
  it("tells a wrong code from a failure", async () => {
    scanStatus = 404;
    expect(await api.fetchPlaceScan("K2")).toEqual({ kind: "notFound" });
    scanStatus = 500;
    expect(await api.fetchPlaceScan("K2")).toEqual({ kind: "error" });
  });
});

describe("postPlaceOrder", () => {
  it("posts the body with the idempotency key and returns the backend's answer as is", async () => {
    const res = await api.postPlaceOrder("K1", { basis: "b", lines: [] }, "idem-1");
    expect(seen).toHaveLength(1);
    expect(seen[0].method).toBe("POST");
    expect(seen[0].url).toBe("/v1/public/place-codes/K1/orders");
    expect(seen[0].headers["idempotency-key"]).toBe("idem-1");
    expect(seen[0].headers["content-type"]).toBe("application/json");
    expect(JSON.parse(seen[0].body)).toEqual({ basis: "b", lines: [] });
    expect(res.status).toBe(409);
    expect(JSON.parse(res.body).errorCode).toBe("order.intake.basis-changed");
  });
});
