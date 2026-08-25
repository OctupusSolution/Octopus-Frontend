"use strict";

// ---------- Postman v2.1 builders ----------

const STATUS = {
  live: "🟢 **Live** — implemented in `apps/mock-api`.",
  planned: "🟡 **Planned** — no backend yet; the UI reads a typed mock file.",
  stub: "🔴 **Stub / not built** — the screen exists as an empty placeholder.",
};

// Path variables that exist as environment variables resolve to {{var}} so a chained
// request picks up whatever the previous one saved. Everything else gets a concrete
// sample id, because an unresolved {{placeholder}} in a URL is a silent 404.
const ENV_PATH_VARS = new Set([
  "orderId", "customerId", "employeeId", "reservationId", "invoiceId",
  "onboardingId", "exportJobId", "sessionId", "businessId", "branchId",
]);

const PATH_SAMPLES = {
  id: "OC-3392",
  businessId: "tenant-burger-house",
  branchId: "branch-riyadh-olaya",
  lineId: "ln-1",
  ticketId: "kds-3391",
  stationId: "station-grill",
  deviceId: "dev-pos-olaya-01",
  preorderId: "pre-0212",
  waitlistId: "wl-31",
  eventId: "evt-booking-0044",
  stepId: "step-deposit",
  gatewayId: "moyasar",
  tableId: "tbl-12",
  categoryId: "cat-main",
  itemId: "item-classic-chicken-burger",
  groupId: "grp-size",
  optionId: "opt-size-large",
  comboId: "combo-burger-meal",
  priceListId: "pl-hs",
  dayPartId: "dp-lunch",
  specialDayId: "sd-national-day",
  ingredientId: "ing-014",
  supplierId: "sup-tamimi",
  recipeId: "recipe-03",
  poId: "PO-2026-0148",
  countId: "cnt-0032",
  wasteId: "wst-0881",
  transferId: "trf-0114",
  batchId: "bat-0077",
  segmentId: "seg-vip",
  feedbackId: "fb-0421",
  methodId: "pm-0021",
  giftCardId: "gc-0031",
  planId: "coffee-club",
  subscriberId: "sub-0412",
  promotionId: "promo-018",
  campaignId: "camp-0021",
  zoneId: "zone-narjis",
  driverId: "drv-04",
  aggregatorId: "hungerstation",
  paymentId: "pay-77412",
  settlementId: "stl-0412",
  providerId: "qoyod",
  mappingId: "map-01",
  entryId: "sync-8812",
  accountId: "ha-0021",
  shiftId: "sh-2201",
  swapId: "swap-0021",
  recordId: "att-8812",
  leaveId: "lv-0132",
  periodId: "pay-2026-08",
  scheduleId: "sch-012",
  roleId: "role-cashier",
  userId: "usr-014",
  rateId: "tax-standard-15",
  entityId: "ent-01",
  sectionId: "sec-terrace",
  moduleId: "inventory",
  alertId: "alert-low-stock",
  integrationId: "moyasar",
  endpointId: "whk-0021",
  deliveryId: "whd-99231",
  templateId: "tpl_order_ready",
  messageId: "msg-99231",
  conversationId: "conv-0091",
  notificationId: "ntf-1",
  provider: "tabby",
  verticalId: "restaurants",
  giftCardEventId: "gce-01",
};

function pathVarValue(key) {
  if (ENV_PATH_VARS.has(key)) return `{{${key}}}`;
  return PATH_SAMPLES[key] || `sample-${key}`;
}

function parseUrl(path, query) {
  // path like "/api/v1/orders/:id/status"
  const clean = path.replace(/^\//, "");
  const segments = clean.split("/");
  const variable = segments
    .filter((s) => s.startsWith(":"))
    .map((s) => ({
      key: s.slice(1),
      value: pathVarValue(s.slice(1)),
      description: `Path parameter — ${s.slice(1)}`,
    }));

  const q = (query || []).map((p) =>
    typeof p === "string"
      ? { key: p, value: "", description: "", disabled: true }
      : {
          key: p.key,
          value: p.value === undefined ? "" : String(p.value),
          description: p.desc || "",
          disabled: p.on ? false : true,
        }
  );

  const rawQuery = q.filter((p) => !p.disabled).map((p) => `${p.key}=${p.value}`).join("&");
  const raw = `{{baseUrl}}/${clean}${rawQuery ? "?" + rawQuery : ""}`;

  return {
    raw,
    host: ["{{baseUrl}}"],
    path: segments,
    query: q,
    variable,
  };
}

/**
 * R(name, method, path, opts)
 * opts: { desc, status, query, body, headers, formdata, tests, prerequest, examples, noAuth }
 */
function R(name, method, path, opts = {}) {
  const req = {
    method,
    header: [],
    url: parseUrl(path, opts.query),
    description: buildDesc(opts),
  };

  if (opts.noAuth) req.auth = { type: "noauth" };

  (opts.headers || []).forEach((h) =>
    req.header.push({ key: h.key, value: h.value, type: "text", description: h.desc || "" })
  );

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

  const events = [];
  if (opts.prerequest) {
    events.push({
      listen: "prerequest",
      script: { type: "text/javascript", exec: asLines(opts.prerequest) },
    });
  }
  if (opts.tests) {
    events.push({
      listen: "test",
      script: { type: "text/javascript", exec: asLines(opts.tests) },
    });
  }
  if (events.length) item.event = events;

  if (opts.examples) {
    item.response = opts.examples.map((ex) =>
      exampleResponse(ex.name, ex.code || 200, ex.body, req)
    );
  }

  return item;
}

function asLines(s) {
  return Array.isArray(s) ? s : s.split("\n");
}

function buildDesc(opts) {
  const parts = [];
  if (opts.status) parts.push(STATUS[opts.status] || opts.status);
  if (opts.desc) parts.push(opts.desc);
  if (opts.screen) parts.push(`**Screen:** \`${opts.screen}\``);
  if (opts.source) parts.push(`**Mock source:** \`${opts.source}\``);
  if (opts.roles) parts.push(`**Roles:** ${opts.roles}`);
  return parts.join("\n\n");
}

function exampleResponse(name, code, body, originalRequest) {
  const codeText =
    { 200: "OK", 201: "Created", 202: "Accepted", 204: "No Content", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 409: "Conflict", 422: "Unprocessable Entity" }[code] || "OK";
  return {
    name,
    originalRequest: JSON.parse(JSON.stringify(originalRequest)),
    status: codeText,
    code,
    _postman_previewlanguage: "json",
    header: [{ key: "Content-Type", value: "application/json" }],
    cookie: [],
    body: JSON.stringify(body, null, 2),
  };
}

/** Folder */
function F(name, desc, items) {
  return { name, description: desc, item: items };
}

// ---------- shared query-param sets ----------

const PAGING = [
  { key: "page", value: "1", desc: "1-based page number." },
  { key: "pageSize", value: "25", desc: "Rows per page (max 200)." },
  { key: "sort", value: "-createdAt", desc: "Field name; prefix with `-` for descending." },
];

const SEARCH = [{ key: "q", value: "", desc: "Free-text search (name, id, phone)." }];

const BRANCH = [
  { key: "branchId", value: "{{branchId}}", desc: "Filter to a single branch. Omit for all branches the role can see." },
];

const DATE_RANGE = [
  { key: "dateFrom", value: "2026-08-01", desc: "ISO date, inclusive." },
  { key: "dateTo", value: "2026-08-17", desc: "ISO date, inclusive." },
];

const RANGE_PRESET = [
  { key: "range", value: "30d", desc: "One of `today` `7d` `30d` `quarter` `year`. Overrides dateFrom/dateTo." },
];

const LIST = [...PAGING, ...SEARCH, ...BRANCH];

// ---------- common test snippets ----------

const T_OK = `pm.test("200 OK", () => pm.response.to.have.status(200));
pm.test("JSON body", () => pm.response.to.be.json);`;

const T_LIST = `pm.test("200 OK", () => pm.response.to.have.status(200));
const b = pm.response.json();
pm.test("envelope has data[] + meta", () => {
  pm.expect(b).to.have.property("data");
  pm.expect(b.data).to.be.an("array");
});`;

const T_CREATED = `pm.test("201 Created", () => pm.response.to.have.status(201));`;

module.exports = { R, F, STATUS, PAGING, SEARCH, BRANCH, DATE_RANGE, RANGE_PRESET, LIST, T_OK, T_LIST, T_CREATED, exampleResponse };
