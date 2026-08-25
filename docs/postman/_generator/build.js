"use strict";
const fs = require("node:fs");
const path = require("node:path");

const { platform, auth, businesses, dashboard } = require("./s01-platform");
const { orders, reservations, menu } = require("./s02-ops");
const { inventory, customers, marketing, delivery } = require("./s03-growth");
const { finance, staff, reports } = require("./s04-back-office");
const { settings, integrations, messaging } = require("./s05-settings");

const OUT_DIR = process.argv[2];
if (!OUT_DIR) {
  console.error("usage: node build.js <output-dir>");
  process.exit(1);
}

const DESCRIPTION = `# OCTOPUS — Merchant Console API

Every endpoint behind the merchant portal (\`apps/merchant\`), organised the way the console
itself is organised: one top-level folder per sidebar group, sub-folders per screen.

## Status legend

Each request's description opens with its build status, because most of this API does not
exist yet:

| Badge | Meaning |
|---|---|
| 🟢 **Live** | Implemented in \`apps/mock-api\` and callable right now. |
| 🟡 **Planned** | The screen is built and reads a typed mock file; this is the contract that mock will be swapped for. |
| 🔴 **Stub** | The route/folder exists in the app but the screen is an empty placeholder. Endpoint shape is a proposal. |

Today only **04 · Orders & POS → Live orders** contains 🟢 requests
(\`/api/health\`, \`/api/orders\`, \`/api/orders/:id\`, \`POST /api/orders\`,
\`PATCH /api/orders/:id/status\`). Everything else documents the intended surface, derived
from the pages in \`apps/merchant/src/pages\` and the typed mocks in
\`apps/merchant/src/shared/api/mock-*.ts\`.

## Getting started

1. Pick the **OCTOPUS · Local** environment.
2. Run \`npm run dev --workspace=@octopus/mock-api\` — serves on \`http://localhost:4000\`.
3. Send **00 · Platform & Health → Health check**.
4. Send **01 · Auth & Session → Login (password)**. Its test script writes
   \`accessToken\`, \`refreshToken\`, \`tenantId\` and \`userId\` into the environment, and every
   other request inherits the bearer token from the collection.

## Conventions

- **Base path.** Live endpoints sit under \`/api\`. Everything planned is versioned:
  \`/api/v1/...\`.
- **Auth.** Collection-level Bearer \`{{accessToken}}\`. Inbound provider webhooks
  (15 · Integration Hub) override this to *no auth* — they authenticate with a provider
  signature header instead.
- **Tenancy.** \`X-Tenant-Id\` and \`X-Branch-Id\` are sent on every request from the
  collection-level headers. One account can own several businesses; the active one scopes
  every read.
- **List envelope.** \`{ "data": [...], "meta": { "page", "pageSize", "total" } }\`.
  Shared query params: \`page\`, \`pageSize\`, \`sort\` (\`-createdAt\` for descending), \`q\`,
  \`branchId\`, \`dateFrom\`, \`dateTo\`. Most are disabled by default — tick the ones you need.
- **Money.** Always SAR, always a number in \`*Sar\` fields. Display formatting
  (\`SAR 187.4K\`) is the front-end's job.
- **Dates.** ISO-8601. Saudi merchants read both Gregorian and Hijri, so responses carry
  the ISO value and the UI converts.
- **Errors.** \`{ "error": { "code": "snake_case", "message": "human readable" } }\`.
  \`422\` for validation, \`409\` for state conflicts (deleting a category still in use),
  \`403\` for permission and consent failures.
- **Async work.** Exports, syncs and bulk sends return \`202\` with a \`jobId\`; poll
  \`GET /api/v1/exports/:jobId\`.
- **Localisation.** \`Accept-Language: {{locale}}\` (\`ar\` | \`en\`) selects the language of
  server-rendered strings and error messages.

## Compliance notes worth reading before you touch Finance

ZATCA Phase 2 is not optional in Saudi Arabia. **Standard** (B2B) invoices need
*clearance* — ZATCA signs them before they are valid to give to a buyer. **Simplified**
(B2C) invoices need *reporting* within 24 hours. Both carry a UUID, a hash chain via
\`previousInvoiceHash\`, a cryptographic stamp and a TLV QR code. A break anywhere in the
chain rejects everything after it, which is why
\`GET /api/v1/finance/tax-invoices/chain-check\` exists.

## Source of truth

Routes: \`apps/merchant/src/app/routes/registry.tsx\`.
Data shapes: \`apps/merchant/src/shared/api/mock-*.ts\` and
\`packages/api-client/src/contracts/*.ts\`.
Each request names the screen it serves and the mock file it was derived from.`;

const collection = {
  info: {
    _postman_id: "0c70bd5e-4a11-4f3d-9b6e-0c7a2f5e8d10",
    name: "OCTOPUS · Merchant Console API",
    description: DESCRIPTION,
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
  },
  auth: {
    type: "bearer",
    bearer: [{ key: "token", value: "{{accessToken}}", type: "string" }],
  },
  event: [
    {
      listen: "prerequest",
      script: {
        type: "text/javascript",
        exec: [
          "// Collection-level pre-request:",
          "// warn early when the environment has not been selected.",
          'if (!pm.environment.name) {',
          '  console.warn("No environment selected — {{baseUrl}} will not resolve. Pick \\"OCTOPUS · Local\\".");',
          "}",
          'if (!pm.environment.get("accessToken") && !pm.request.url.toString().includes("/auth/")) {',
          '  console.info("No accessToken yet — run 01 · Auth & Session → Login (password) first.");',
          "}",
          "pm.variables.set(\"requestStartedAt\", Date.now());",
        ],
      },
    },
    {
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          "// Collection-level tests applied to every request.",
          'pm.test("no server error", () => pm.expect(pm.response.code).to.be.below(500));',
          'pm.test("responds under 2s", () => pm.expect(pm.response.responseTime).to.be.below(2000));',
          "",
          "// Surface the standard error envelope in the console when something fails.",
          "if (pm.response.code >= 400) {",
          "  try {",
          "    const body = pm.response.json();",
          "    if (body && body.error) console.warn(`${body.error.code}: ${body.error.message}`);",
          "  } catch (e) { /* non-JSON error body */ }",
          "}",
        ],
      },
    },
  ],
  variable: [
    { key: "baseUrl", value: "http://localhost:4000", type: "string", description: "API origin. Local mock-api serves on :4000." },
    { key: "locale", value: "ar", type: "string", description: "`ar` or `en` — sent as Accept-Language." },
    { key: "tenantId", value: "tenant-burger-house", type: "string" },
    { key: "branchId", value: "branch-riyadh-olaya", type: "string" },
    { key: "orderId", value: "OC-3392", type: "string" },
    { key: "customerId", value: "cus-0142", type: "string" },
    { key: "employeeId", value: "emp-014", type: "string" },
    { key: "reservationId", value: "rsv-1042", type: "string" },
    { key: "invoiceId", value: "INV-2026-08812", type: "string" },
  ],
  item: [platform, auth, businesses, dashboard, orders, reservations, menu, inventory, customers, marketing, delivery, finance, staff, reports, settings, integrations, messaging],
};

// Collection-level headers cannot be declared once in v2.1, so stamp the tenancy
// headers onto every request that authenticates.
function stampHeaders(items) {
  for (const item of items) {
    if (item.item) {
      stampHeaders(item.item);
      continue;
    }
    const req = item.request;
    const isNoAuth = req.auth && req.auth.type === "noauth";
    const has = (k) => req.header.some((h) => h.key.toLowerCase() === k);
    if (!isNoAuth) {
      if (!has("x-tenant-id")) req.header.unshift({ key: "X-Tenant-Id", value: "{{tenantId}}", type: "text", description: "Active business. One account may own several." });
      if (!has("x-branch-id")) req.header.unshift({ key: "X-Branch-Id", value: "{{branchId}}", type: "text", description: "Scopes the request to one branch. Omit for tenant-wide reads.", disabled: true });
    }
    if (!has("accept-language")) req.header.push({ key: "Accept-Language", value: "{{locale}}", type: "text" });
    if (!has("accept")) req.header.push({ key: "Accept", value: "application/json", type: "text" });
    // keep the stamped headers out of the saved example's originalRequest copies
    (item.response || []).forEach((ex) => { ex.originalRequest = JSON.parse(JSON.stringify(req)); });
  }
}
stampHeaders(collection.item);

function env(name, id, values) {
  return {
    id,
    name,
    values: values.map((v) => ({ key: v[0], value: v[1], type: v[2] || "default", enabled: true })),
    _postman_variable_scope: "environment",
    _postman_exported_using: "handwritten",
  };
}

const localEnv = env("OCTOPUS · Local", "8f1c2a10-4b3d-4c22-9a77-1e2b3c4d5e60", [
  ["baseUrl", "http://localhost:4000"],
  ["locale", "ar"],
  ["accessToken", "", "secret"],
  ["refreshToken", "", "secret"],
  ["password", "demo1234", "secret"],
  ["newPassword", "demo5678", "secret"],
  ["userId", "usr-001"],
  ["tenantId", "tenant-burger-house"],
  ["branchId", "branch-riyadh-olaya"],
  ["orderId", "OC-3392"],
  ["customerId", "cus-0142"],
  ["employeeId", "emp-014"],
  ["reservationId", "rsv-1042"],
  ["invoiceId", "INV-2026-08812"],
  ["onboardingId", ""],
  ["exportJobId", ""],
  ["sessionId", ""],
  ["integrationApiKey", "", "secret"],
  ["integrationSecret", "", "secret"],
  ["accountingApiKey", "", "secret"],
  ["aggregatorApiKey", "", "secret"],
  ["webhookSecret", "", "secret"],
  ["moyasarSignature", "", "secret"],
]);

const stagingEnv = env("OCTOPUS · Staging", "9a2d3b21-5c4e-4d33-8b88-2f3c4d5e6f71", [
  ["baseUrl", "https://api.staging.octopus.sa"],
  ["locale", "ar"],
  ["accessToken", "", "secret"],
  ["refreshToken", "", "secret"],
  ["password", "", "secret"],
  ["newPassword", "", "secret"],
  ["userId", ""],
  ["tenantId", ""],
  ["branchId", ""],
  ["orderId", ""],
  ["customerId", ""],
  ["employeeId", ""],
  ["reservationId", ""],
  ["invoiceId", ""],
  ["onboardingId", ""],
  ["exportJobId", ""],
  ["sessionId", ""],
  ["integrationApiKey", "", "secret"],
  ["integrationSecret", "", "secret"],
  ["accountingApiKey", "", "secret"],
  ["aggregatorApiKey", "", "secret"],
  ["webhookSecret", "", "secret"],
  ["moyasarSignature", "", "secret"],
]);

fs.mkdirSync(OUT_DIR, { recursive: true });
const write = (file, obj) => fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(obj, null, 2) + "\n", "utf8");

write("OCTOPUS-Merchant-API.postman_collection.json", collection);
write("OCTOPUS-Local.postman_environment.json", localEnv);
write("OCTOPUS-Staging.postman_environment.json", stagingEnv);

// ---- summary ----
let folders = 0, requests = 0, live = 0, planned = 0, stub = 0;
const counts = [];
function walk(items, depth, label) {
  for (const it of items) {
    if (it.item) {
      folders++;
      const before = requests;
      walk(it.item, depth + 1, it.name);
      if (depth === 0) counts.push([it.name, requests - before]);
    } else {
      requests++;
      const d = it.request.description || "";
      if (d.startsWith("🟢")) live++;
      else if (d.startsWith("🟡")) planned++;
      else if (d.startsWith("🔴")) stub++;
    }
  }
}
walk(collection.item, 0, "");
console.log(`folders: ${folders}  requests: ${requests}  (live ${live} / planned ${planned} / stub ${stub})`);
counts.forEach(([n, c]) => console.log(`  ${String(c).padStart(4)}  ${n}`));
