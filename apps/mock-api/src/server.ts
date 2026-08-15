import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { CreateOrderRequest, OrderStatus } from "@octopus/api-client";
import { addOrder, getOrder, listOrders, setOrderStatus } from "./store";

const PORT = 4000;
const ALLOWED_ORIGINS = new Set(["http://localhost:3000", "http://localhost:5173"]);

function applyCors(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? (JSON.parse(raw) as T) : ({} as T));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const segments = url.pathname.split("/").filter(Boolean);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/orders") {
      sendJson(res, 200, listOrders());
      return;
    }

    if (req.method === "GET" && segments[0] === "api" && segments[1] === "orders" && segments.length === 3) {
      const order = getOrder(segments[2]);
      if (!order) {
        sendJson(res, 404, { error: `Order ${segments[2]} not found` });
        return;
      }
      sendJson(res, 200, order);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/orders") {
      const payload = await readJsonBody<CreateOrderRequest>(req);
      const order = addOrder(payload);
      sendJson(res, 201, order);
      return;
    }

    if (
      req.method === "PATCH" &&
      segments[0] === "api" &&
      segments[1] === "orders" &&
      segments.length === 4 &&
      segments[3] === "status"
    ) {
      const { status } = await readJsonBody<{ status: OrderStatus }>(req);
      const order = setOrderStatus(segments[2], status);
      if (!order) {
        sendJson(res, 404, { error: `Order ${segments[2]} not found` });
        return;
      }
      sendJson(res, 200, order);
      return;
    }

    sendJson(res, 404, { error: `Route not found: ${req.method} ${url.pathname}` });
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : "Unknown error" });
  }
});

server.listen(PORT, () => {
  console.log(`mock-api listening on http://localhost:${PORT}`);
});
