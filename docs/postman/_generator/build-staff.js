"use strict";
const fs = require("node:fs");
const path = require("node:path");

const { staff } = require("./s05-staff");

const OUT_DIR = process.argv[2];
if (!OUT_DIR) {
  console.error("usage: node build-staff.js <output-dir>");
  process.exit(1);
}

const COLLECTION_FILE = "OCTOPUS-Staff-API.postman_collection.json";

const DESCRIPTION = `# OCTOPUS — Staff API

A standalone collection for the Staff module of the merchant console (\`apps/merchant/src/pages/staff\`):
team members, leave requests, the weekly schedule, and roles & permissions.

**Status:** 🔴 *Deferred* — this module has no backend yet. Every screen it serves renders
\`apps/merchant/src/shared/api/mock-staff.ts\`. The requests below are the **proposed** contract
(shapes lifted straight from that mock), not a confirmed one — treat this as a draft for the API
team to review, not a spec to build blind against.

## How to read a request

1. **Status** — 🔴 *Deferred*: the screen is built, the API isn't. Shape is a proposal.
2. **What it does.**
3. **Rules the API must enforce** — the business rules the front-end already applies.
4. **Saves to environment** — which variable the request writes on success.
5. **Screen** / **Shape source** — where in \`apps/merchant\` it is used and where the type lives.

## Run it top to bottom

1. Select the **OCTOPUS · Staff (Local)** environment.
2. This collection reuses \`accessToken\` / \`tenantId\` from the main Merchant API environment —
   run **Login** in that collection first, or paste a valid token into this environment.
3. Folders are numbered in the order a manager meets them. *Create* requests save the new id
   (\`staffMemberId\`, \`leaveRequestId\`, \`shiftId\`, \`roleId\`) so the requests after them just work.

## Conventions

Same as the main Merchant API collection:

- **Base path** \`/api/v1\`.
- **Auth** — collection-level \`Bearer {{accessToken}}\`.
- **Tenancy** — \`X-Tenant-Id: {{tenantId}}\` on every request. \`X-Branch-Id\` is present but disabled.
- **Language** — \`Accept-Language: {{locale}}\` (\`ar\` | \`en\`).
- **Lists** — \`{ "data": [...], "meta": { "page", "pageSize", "total" } }\`.
- **Errors** — always \`{ "error": { "code": "snake_case", "message": "...", "details": {...} } }\`.
  \`401\` not signed in · \`403\` not allowed · \`404\` not found · \`409\` state conflict ·
  \`422\` validation (per-field reasons in \`details\`) · \`429\` rate limited.
- **Dates** — ISO-8601. Shift/leave dates are \`YYYY-MM-DD\`; times of day are \`HH:mm\`.

## Source of truth

- Staff types & mock data: \`apps/merchant/src/shared/api/mock-staff.ts\`
- Screens: \`apps/merchant/src/pages/staff/**\``;

const collection = {
  info: {
    _postman_id: "5f2b7e1a-9c34-4a10-8e6d-1b7f3a9c4d02",
    name: "OCTOPUS · Staff API",
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
          '  console.warn("No environment selected. Pick \\"OCTOPUS · Staff (Local)\\".");',
          "}",
          'if (!pm.environment.get("accessToken")) {',
          '  console.info("No accessToken set. Run Login in the Merchant API collection, or paste a token into this environment.");',
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
  item: [staff],
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

const ENV_VARS = [
  ["baseUrl", "http://localhost:4000"],
  ["locale", "ar"],
  ["accessToken", "", "secret"],
  ["tenantId", "tenant-ocean-view"],
  ["branchId", "branch-jeddah-corniche"],
  ["staffMemberId", ""],
  ["leaveRequestId", ""],
  ["shiftId", ""],
  ["roleId", ""],
  ["shiftRoleId", ""],
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

const localEnv = env("OCTOPUS · Staff (Local)", "6a3c8f22-1d45-4b67-9f10-2c8e4a5b6d73", ENV_VARS);
const stagingEnv = env(
  "OCTOPUS · Staff (Staging)",
  "7b4d9a33-2e56-4c78-a021-3d9f5b6c7e84",
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
write("OCTOPUS-Staff-Local.postman_environment.json", localEnv);
write("OCTOPUS-Staff-Staging.postman_environment.json", stagingEnv);

// ---- summary ----
let folders = 0, requests = 0, deferred = 0, withExamples = 0;
const counts = [];
function walk(items, depth) {
  for (const it of items) {
    if (it.item) {
      folders++;
      const row = [depth, it.name, 0];
      counts.push(row);
      const before = requests;
      walk(it.item, depth + 1);
      row[2] = requests - before;
    } else {
      requests++;
      const d = it.request.description || "";
      if (d.startsWith("🔴")) deferred++;
      if (it.response && it.response.length) withExamples++;
    }
  }
}
walk(collection.item, 0);
console.log(`folders: ${folders}  requests: ${requests}  (deferred ${deferred})  with examples: ${withExamples}`);
counts.forEach(([depth, n, c]) => console.log(`${"  ".repeat(depth + 1)}${String(c).padStart(3)}  ${n}`));
