"use strict";

// ---------- Postman v2.1 builders ----------
//
// Same builders as the previous collection, so anyone who knew that one reads
// this one. Two additions for the backend handoff:
//   - `rules`  — the business rules the front-end already enforces, which the
//                API must enforce too (it is the only thing that can be trusted).
//   - `saves`  — which environment variable a request writes, so a chain of
//                requests runs top to bottom with no copy-pasting of ids.

const STATUS = {
  planned: "🟡 **Planned** — the screen is built and runs on a typed mock. This request is the contract that mock gets swapped for.",
  stub: "🔴 **Deferred** — the entry point exists in the UI, the feature behind it is not built yet. Shape is a proposal.",
};

// Path variables that live in the environment resolve to {{var}}, so a request
// uses whatever the previous request in the chain saved. Everything else gets a
// concrete sample, because an unresolved {{placeholder}} in a URL is a silent 404.
const ENV_PATH_VARS = new Set([
  "onboardingId", "menuId", "sectionId", "itemId", "groupId", "optionId",
  "offerId", "mediaId", "branchId", "testerId", "simulationId",
]);

const PATH_SAMPLES = {
  provider: "google",
  verticalId: "restaurants",
  stepId: "modules",
  sectionKey: "testimonials",
  jobId: "job-import-0012",
};

function pathVarValue(key) {
  if (ENV_PATH_VARS.has(key)) return `{{${key}}}`;
  return PATH_SAMPLES[key] || `sample-${key}`;
}

function parseUrl(path, query) {
  const clean = path.replace(/^\//, "");
  const segments = clean.split("/");
  const variable = segments
    .filter((s) => s.startsWith(":"))
    .map((s) => ({
      key: s.slice(1),
      value: pathVarValue(s.slice(1)),
      description: `Path parameter — ${s.slice(1)}`,
    }));

  const q = (query || []).map((p) => ({
    key: p.key,
    value: p.value === undefined ? "" : String(p.value),
    description: p.desc || "",
    disabled: p.on ? false : true,
  }));

  const rawQuery = q.filter((p) => !p.disabled).map((p) => `${p.key}=${p.value}`).join("&");
  return {
    raw: `{{baseUrl}}/${clean}${rawQuery ? "?" + rawQuery : ""}`,
    host: ["{{baseUrl}}"],
    path: segments,
    query: q,
    variable,
  };
}

/**
 * R(name, method, path, opts)
 * opts: { status, desc, screen, source, rules, saves, query, body, formdata,
 *         tests, examples, noAuth }
 */
function R(name, method, path, opts = {}) {
  const req = {
    method,
    header: [],
    url: parseUrl(path, opts.query),
    description: buildDesc(opts),
  };

  if (opts.noAuth) req.auth = { type: "noauth" };

  if (opts.body !== undefined) {
    req.header.push({ key: "Content-Type", value: "application/json", type: "text" });
    req.body = {
      mode: "raw",
      raw: JSON.stringify(opts.body, null, 2),
      options: { raw: { language: "json" } },
    };
  }

  if (opts.formdata) {
    req.body = {
      mode: "formdata",
      formdata: opts.formdata.map((f) => ({
        key: f.key,
        type: f.type || "text",
        value: f.value,
        src: f.src,
        description: f.desc || "",
      })),
    };
  }

  const item = { name, request: req, response: [] };

  const tests = [opts.tests, opts.saves ? saveScript(opts.saves) : null].filter(Boolean).join("\n");
  if (tests) {
    item.event = [{ listen: "test", script: { type: "text/javascript", exec: tests.split("\n") } }];
  }

  if (opts.examples) {
    item.response = opts.examples.map((ex) => exampleResponse(ex.name, ex.code || 200, ex.body, req));
  }

  return item;
}

/** saves: { envVar: "json.path.to.value" } — written only on a 2xx. */
function saveScript(saves) {
  const lines = ["if (pm.response.code < 300) {", "  const b = pm.response.json();"];
  for (const [envVar, jsonPath] of Object.entries(saves)) {
    const expr = "b" + jsonPath.split(".").map((k) => `?.[${JSON.stringify(k)}]`).join("");
    lines.push(`  if (${expr} !== undefined) pm.environment.set(${JSON.stringify(envVar)}, ${expr});`);
  }
  lines.push("}");
  return lines.join("\n");
}

function buildDesc(opts) {
  const parts = [];
  if (opts.status) parts.push(STATUS[opts.status] || opts.status);
  if (opts.desc) parts.push(opts.desc);
  if (opts.rules && opts.rules.length) {
    parts.push("**Rules the API must enforce**\n\n" + opts.rules.map((r) => `- ${r}`).join("\n"));
  }
  if (opts.saves) {
    parts.push("**Saves to environment:** " + Object.keys(opts.saves).map((k) => `\`${k}\``).join(", "));
  }
  if (opts.screen) parts.push(`**Screen:** \`${opts.screen}\``);
  if (opts.source) parts.push(`**Shape source:** \`${opts.source}\``);
  return parts.join("\n\n");
}

const CODE_TEXT = {
  200: "OK", 201: "Created", 202: "Accepted", 204: "No Content", 400: "Bad Request",
  401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 409: "Conflict",
  413: "Payload Too Large", 415: "Unsupported Media Type", 422: "Unprocessable Entity",
  429: "Too Many Requests",
};

function exampleResponse(name, code, body, originalRequest) {
  return {
    name,
    originalRequest: JSON.parse(JSON.stringify(originalRequest)),
    status: CODE_TEXT[code] || "OK",
    code,
    _postman_previewlanguage: "json",
    header: [{ key: "Content-Type", value: "application/json" }],
    cookie: [],
    body: body === undefined ? "" : JSON.stringify(body, null, 2),
  };
}

/** Folder */
function F(name, desc, items) {
  return { name, description: desc, item: items };
}

/** The standard error envelope, as an example. */
function err(name, code, errorCode, message, details) {
  const error = { code: errorCode, message };
  if (details) error.details = details;
  return { name, code, body: { error } };
}

// ---------- shared query-param sets ----------

const PAGING = [
  { key: "page", value: "1", desc: "1-based page number." },
  { key: "pageSize", value: "25", desc: "Rows per page (max 200)." },
];

// ---------- common test snippets ----------

const T_OK = `pm.test("200 OK", () => pm.response.to.have.status(200));`;
const T_CREATED = `pm.test("201 Created", () => pm.response.to.have.status(201));`;
const T_ACCEPTED = `pm.test("202 Accepted", () => pm.response.to.have.status(202));`;
const T_NO_CONTENT = `pm.test("204 No Content", () => pm.response.to.have.status(204));`;
const T_LIST = `pm.test("200 OK", () => pm.response.to.have.status(200));
const list = pm.response.json();
pm.test("list envelope: data[] + meta", () => {
  pm.expect(list.data).to.be.an("array");
  pm.expect(list).to.have.property("meta");
});`;

module.exports = {
  R, F, err, STATUS, PAGING,
  T_OK, T_CREATED, T_ACCEPTED, T_NO_CONTENT, T_LIST,
};
