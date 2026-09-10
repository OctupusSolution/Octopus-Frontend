"use strict";
const fs = require("node:fs");
const path = require("node:path");

const { auth } = require("./s01-auth");
const { setup } = require("./s02-setup");
const { menu } = require("./s03-menu");
const { publicLink } = require("./s04-public-link");

const OUT_DIR = process.argv[2];
if (!OUT_DIR) {
  console.error("usage: node build.js <output-dir>");
  process.exit(1);
}

const COLLECTION_FILE = "OCTOPUS-Merchant-API.postman_collection.json";

const DESCRIPTION = `# OCTOPUS — Merchant API

The backend contract for four areas of the merchant console (\`apps/merchant\`):

| Folder | What it covers |
|---|---|
| **01 · Login & Account** | Sign in, create an account, verify it, forgot password, session |
| **02 · Setup** | The 7-step business setup wizard and its reference data |
| **03 · Menu** | Menu library, the 4-step menu builder, offers, publishing, media upload |
| **04 · Public Link** | The 7-step public storefront builder and publishing |

Every screen these requests serve is **already built** on typed mock data. Each request is the
contract that mock gets swapped for — so the request bodies and example responses below are the
shapes the front-end already renders.

## How to read a request

Each description has the same parts, in the same order:

1. **Status** — 🟡 *Planned* (screen built, API needed) or 🔴 *Deferred* (entry point only).
2. **What it does.**
3. **Rules the API must enforce** — the business rules the front-end already applies. The API
   must apply them too; the client cannot be trusted.
4. **Saves to environment** — which variable the request writes on success.
5. **Screen** / **Shape source** — where in \`apps/merchant\` it is used and where the type lives.

Every request carries **saved example responses**, including the error cases.

## Run it top to bottom

1. Select the **OCTOPUS · Local** environment.
2. **01 · Login & Account → 1.1 → Login.** Saves \`accessToken\`, \`refreshToken\`, \`userId\`,
   \`tenantId\`. Every other request authenticates from them.
3. Folders are numbered in the order a merchant meets them, and inside each folder the
   requests are in dependency order. *Create* requests save the new id
   (\`menuId\`, \`sectionId\`, \`itemId\`, …) so the requests after them just work.

## Conventions

- **Base path** \`/api/v1\`.
- **Auth** — collection-level \`Bearer {{accessToken}}\`. Sign-in, sign-up and password recovery
  override it to *no auth*.
- **Tenancy** — \`X-Tenant-Id: {{tenantId}}\` on every authenticated request. \`X-Branch-Id\` is
  present but disabled; tick it to scope a request to one branch.
- **Language** — \`Accept-Language: {{locale}}\` (\`ar\` | \`en\`) selects the language of
  server messages.
- **Lists** — \`{ "data": [...], "meta": { "page", "pageSize", "total" } }\`.
- **Errors** — always \`{ "error": { "code": "snake_case", "message": "...", "details": {...} } }\`.
  \`401\` not signed in · \`403\` not allowed · \`404\` not found · \`409\` state conflict ·
  \`422\` validation (per-field reasons in \`details\`) · \`429\` rate limited.
- **Money** — SAR, a JSON number, two decimals at most. VAT is 15% unless the item says
  otherwise. Totals are computed **by the server**; the client never sends a total.
- **Dates** — ISO-8601 UTC. Times of day are \`HH:mm\` in the menu's \`timezone\`.
- **Images & video** — upload first with *03 · Menu → 3.8 Media → Upload*, then send the
  returned \`url\` in the field that needs it.

## Source of truth

- Menu types: \`apps/merchant/src/entities/menu/*.ts\` (menu, draft, pricing, validation)
- Public link: \`apps/merchant/src/entities/site-draft/site-draft.ts\`
- Setup: \`apps/merchant/src/pages/onboarding/_shared/*\` and \`src/shared/catalog/*\`
- Login: \`apps/merchant/src/features/session/*\`
- Menu design spec: \`docs/superpowers/specs/2026-09-09-merchant-menu-design.md\``;

const collection = {
  info: {
    _postman_id: "3b6e2a4f-8d17-4c90-b5e1-7a2c9d4f1e63",
    name: "OCTOPUS · Merchant API (Login · Setup · Menu · Public Link)",
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
          "// Warn early instead of failing with an unresolved {{baseUrl}}.",
          "if (!pm.environment.name) {",
          '  console.warn("No environment selected. Pick \\"OCTOPUS · Local\\".");',
          "}",
          'const isAuthRoute = pm.request.url.toString().includes("/auth/");',
          'if (!isAuthRoute && !pm.environment.get("accessToken")) {',
          '  console.info("No accessToken yet. Run 01 · Login & Account → 1.1 → Login first.");',
          "}",
        ],
      },
    },
    {
      listen: "test",
      script: {
        type: "text/javascript",
        exec: [
          "// Applied to every request.",
          'pm.test("no server error", () => pm.expect(pm.response.code).to.be.below(500));',
          'pm.test("responds under 2s", () => pm.expect(pm.response.responseTime).to.be.below(2000));',
          "",
          "// Every error must use the standard envelope.",
          "if (pm.response.code >= 400 && pm.response.code !== 404) {",
          "  let body = null;",
          "  try { body = pm.response.json(); } catch (e) { /* not JSON */ }",
          '  pm.test("error envelope: { error: { code, message } }", () => {',
          "    pm.expect(body).to.have.nested.property(\"error.code\");",
          "    pm.expect(body).to.have.nested.property(\"error.message\");",
          "  });",
          "  if (body && body.error) console.warn(`${body.error.code}: ${body.error.message}`);",
          "}",
        ],
      },
    },
  ],
  variable: [
    { key: "baseUrl", value: "http://localhost:4000", type: "string", description: "API origin. Overridden by the selected environment." },
  ],
  item: [auth, setup, menu, publicLink],
};

// v2.1 has no collection-level headers, so stamp them onto each request.
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
      if (!has("x-branch-id")) req.header.unshift({ key: "X-Branch-Id", value: "{{branchId}}", type: "text", description: "Scope to one branch. Disabled = all branches the role can see.", disabled: true });
      if (!has("x-tenant-id")) req.header.unshift({ key: "X-Tenant-Id", value: "{{tenantId}}", type: "text", description: "Active business. One account may own several." });
    }
    if (!has("accept-language")) req.header.push({ key: "Accept-Language", value: "{{locale}}", type: "text" });
    if (!has("accept")) req.header.push({ key: "Accept", value: "application/json", type: "text" });
    (item.response || []).forEach((ex) => { ex.originalRequest = JSON.parse(JSON.stringify(req)); });
  }
}
stampHeaders(collection.item);

// Every environment variable any request reads or writes. Kept in one list so
// the two environments cannot drift apart.
const ENV_VARS = [
  // [key, localValue, type]
  ["baseUrl", "http://localhost:4000"],
  ["locale", "ar"],
  ["accessToken", "", "secret"],
  ["refreshToken", "", "secret"],
  ["password", "demo1234", "secret"],
  ["newPassword", "demo5678", "secret"],
  ["verificationId", ""],
  ["resetRequestId", ""],
  ["resetToken", "", "secret"],
  ["userId", ""],
  ["tenantId", "tenant-ocean-view"],
  ["branchId", "branch-jeddah-corniche"],
  ["onboardingId", ""],
  ["menuId", ""],
  ["sectionId", ""],
  ["itemId", ""],
  ["groupId", ""],
  ["optionId", ""],
  ["offerId", ""],
  ["mediaId", ""],
  ["mediaUrl", ""],
  ["simulationId", ""],
  ["testerId", ""],
];

function env(name, id, values) {
  return {
    id,
    name,
    values: values.map(([key, value, type]) => ({ key, value, type: type || "default", enabled: true })),
    _postman_variable_scope: "environment",
    _postman_exported_using: "generated",
  };
}

const localEnv = env("OCTOPUS · Local", "8f1c2a10-4b3d-4c22-9a77-1e2b3c4d5e60", ENV_VARS);
const stagingEnv = env(
  "OCTOPUS · Staging",
  "9a2d3b21-5c4e-4d33-8b88-2f3c4d5e6f71",
  ENV_VARS.map(([key, , type]) => [key, key === "baseUrl" ? "https://api.staging.octopus.sa" : key === "locale" ? "ar" : "", type])
);

// ---- consistency check: every {{var}} used must exist in the environment ----
const known = new Set(ENV_VARS.map(([k]) => k));
const used = new Set();
JSON.stringify(collection).replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_, v) => used.add(v));
const missing = [...used].filter((v) => !known.has(v));
if (missing.length) {
  console.error("Variables used but not defined in the environments:", missing.join(", "));
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const write = (file, obj) => fs.writeFileSync(path.join(OUT_DIR, file), JSON.stringify(obj, null, 2) + "\n", "utf8");
write(COLLECTION_FILE, collection);
write("OCTOPUS-Local.postman_environment.json", localEnv);
write("OCTOPUS-Staging.postman_environment.json", stagingEnv);

// ---- summary ----
let folders = 0, requests = 0, planned = 0, deferred = 0, withExamples = 0;
const counts = [];
function walk(items, depth) {
  for (const it of items) {
    if (it.item) {
      folders++;
      // Reserve the row before descending, so a folder prints above its
      // sub-folders rather than after them.
      const row = [depth, it.name, 0];
      counts.push(row);
      const before = requests;
      walk(it.item, depth + 1);
      row[2] = requests - before;
    } else {
      requests++;
      const d = it.request.description || "";
      if (d.startsWith("🟡")) planned++;
      else if (d.startsWith("🔴")) deferred++;
      if (it.response && it.response.length) withExamples++;
    }
  }
}
walk(collection.item, 0);
console.log(`folders: ${folders}  requests: ${requests}  (planned ${planned} / deferred ${deferred})  with examples: ${withExamples}`);
counts
  .sort((a, b) => 0)
  .forEach(([depth, n, c]) => console.log(`${"  ".repeat(depth + 1)}${String(c).padStart(3)}  ${n}`));
