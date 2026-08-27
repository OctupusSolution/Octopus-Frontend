"use strict";
const { R, F, LIST, PAGING, SEARCH, BRANCH, DATE_RANGE, T_OK, T_LIST, T_CREATED } = require("./lib");

// ============================================================
// 04 — Orders & POS
// ============================================================
const orders = F(
  "04 · Orders & POS",
  "Live orders, history, pre-orders, the kitchen display, and the in-branch POS.\n\n**This is the only module with a working backend today.** `apps/mock-api` implements list / get / create / patch-status against an in-memory store, and both the customer storefront and the merchant console talk to it. Everything else in this folder is the contract the rest of the module will follow.",
  [
    F("Live orders", "", [
      R("List orders", "GET", "/api/orders", {
        status: "live",
        screen: "pages/orders-list",
        source: "apps/mock-api/src/store.ts",
        desc: "The real, working endpoint. Returns the full in-memory order array with no paging or filters — those are the planned v1 parameters below.",
        tests: `pm.test("200 OK", () => pm.response.to.have.status(200));
const b = pm.response.json();
pm.test("array of orders", () => pm.expect(b).to.be.an("array"));
if (Array.isArray(b) && b.length) pm.environment.set("orderId", b[0].id);`,
        examples: [
          {
            name: "Success",
            body: [
              {
                id: "OC-3392",
                tenantId: "tenant-burger-house",
                branchId: "branch-riyadh-olaya",
                channel: "delivery",
                status: "new",
                customerName: "Faisal A.",
                customerPhone: "+966501112233",
                deliveryAddress: "Al Narjis, Riyadh",
                tableNumber: null,
                lines: [
                  { lineId: "ln-1", menuItemId: "item-classic-chicken-burger", name: "برجر دجاج كلاسيك", unitPriceSar: 153, quantity: 1, modifiers: [{ groupId: "grp-size", optionId: "opt-size-large", label: "كبير", priceDeltaSar: 30 }], notes: "" },
                ],
                subtotalSar: 183,
                discountSar: 0,
                totalSar: 183,
                createdAt: "2026-08-17T07:41:00Z",
                updatedAt: "2026-08-17T07:41:00Z",
              },
            ],
          },
        ],
      }),
      R("List orders (v1, filtered)", "GET", "/api/v1/orders", {
        status: "planned",
        screen: "pages/orders-list",
        source: "mock-orders.ts — orderRows",
        query: [
          ...LIST,
          { key: "status", value: "New,Preparing", desc: "Comma-separated. New · Preparing · Ready · Out for Delivery · Completed · Cancelled." },
          { key: "channel", value: "Dine-in,Delivery", desc: "Dine-in · Takeaway · Delivery · Kiosk · Aggregator." },
          ...DATE_RANGE,
        ],
        desc: "The paged, filtered version the Live Orders table needs — status chips, channel filter, branch selector and search all map to query params.",
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "#OC-3391", branch: "Riyadh - Olaya", channel: "Dine-in", customer: "Table 12", items: 4, total: "SAR 186.00", status: "Preparing", minutesAgo: 2 },
                { id: "#OC-3390", branch: "Jeddah - Corniche", channel: "Delivery", customer: "Faisal A.", items: 2, total: "SAR 94.50", status: "Out for Delivery", minutesAgo: 6 },
              ],
              meta: { page: 1, pageSize: 25, total: 128 },
            },
          },
        ],
      }),
      R("Live-order KPI strip", "GET", "/api/v1/orders/stats", {
        status: "planned",
        source: "mock-orders.ts — orderStats",
        query: BRANCH,
        desc: "Active orders, average prep time, late orders, today's revenue — the four cards above the table.",
      }),
      R("Get order", "GET", "/api/orders/:id", {
        status: "live",
        screen: "pages/order-detail (stub — data exists, screen not built)",
        desc: "Working endpoint. Returns the canonical `Order` from `packages/api-client/src/contracts/order.ts`, or 404.",
        tests: `pm.test("200 or 404", () => pm.expect([200,404]).to.include(pm.response.code));`,
        examples: [{ name: "Not found", code: 404, body: { error: "Order OC-9999 not found" } }],
      }),
      R("Create order", "POST", "/api/orders", {
        status: "live",
        desc: "Working endpoint — this is how the customer storefront pushes an order into the merchant console. Body is `CreateOrderRequest` = `Order` minus `id`, `status`, `createdAt`, `updatedAt`. IDs are sequential `OC-####`.",
        body: {
          tenantId: "tenant-burger-house",
          branchId: "branch-riyadh-olaya",
          channel: "delivery",
          customerName: "Faisal A.",
          customerPhone: "+966501112233",
          deliveryAddress: "Al Narjis, Riyadh",
          tableNumber: null,
          lines: [
            {
              lineId: "ln-1",
              menuItemId: "item-classic-chicken-burger",
              name: "برجر دجاج كلاسيك",
              unitPriceSar: 153,
              quantity: 1,
              modifiers: [{ groupId: "grp-size", optionId: "opt-size-large", label: "كبير", priceDeltaSar: 30 }],
              notes: "بدون بصل",
            },
          ],
          subtotalSar: 183,
          discountSar: 0,
          totalSar: 183,
        },
        tests: `pm.test("201 Created", () => pm.response.to.have.status(201));
const b = pm.response.json();
if (b.id) pm.environment.set("orderId", b.id);
pm.test("status starts as new", () => pm.expect(b.status).to.eql("new"));`,
      }),
      R("Advance order status", "PATCH", "/api/orders/:id/status", {
        status: "live",
        desc:
          "Working endpoint. Valid transitions come from `STATUS_FLOW` in the order contract:\n\n- dine_in / takeaway / kiosk → `new` → `preparing` → `ready` → `completed`\n- delivery / aggregator → `new` → `preparing` → `out_for_delivery` → `completed`\n\n`cancelled` is reachable from any state and is deliberately outside the sequence.",
        body: { status: "preparing" },
        tests: `pm.test("200 OK", () => pm.response.to.have.status(200));`,
      }),
      R("Cancel order", "POST", "/api/v1/orders/:id/cancel", {
        status: "planned",
        desc: "Separate from the status patch because it requires a reason and may trigger a refund.",
        body: { reason: "customer_request", note: "Customer called to cancel", refund: true },
      }),
      R("Void a line", "POST", "/api/v1/orders/:id/lines/:lineId/void", {
        status: "planned",
        screen: "features/order/void-order (stub)",
        desc: "Manager-approved line void. Writes an audit entry — the reason is required for the compliance report.",
        body: { reason: "wrong_item", approvedBy: "{{userId}}" },
        roles: "`owner`, `branch_manager`",
      }),
      R("Apply discount", "POST", "/api/v1/orders/:id/discount", {
        status: "planned",
        body: { type: "percentage", value: 10, reason: "service_recovery", approvedBy: "{{userId}}" },
      }),
      R("Split bill", "POST", "/api/v1/orders/:id/split", {
        status: "planned",
        desc: "Dine-in only. Splits one check into N children by line or evenly.",
        body: { mode: "by_line", parts: [{ lineIds: ["ln-1", "ln-2"] }, { lineIds: ["ln-3"] }] },
      }),
      R("Merge orders", "POST", "/api/v1/orders/merge", { status: "planned", body: { targetOrderId: "{{orderId}}", sourceOrderIds: ["OC-3390"] } }),
      R("Reassign to another table", "POST", "/api/v1/orders/:id/table", { status: "planned", body: { tableId: "tbl-12" } }),
      R("Print / re-print receipt", "POST", "/api/v1/orders/:id/print", {
        status: "planned",
        desc: "Targets a device from Settings → Devices & Printers.",
        body: { deviceId: "dev-printer-olaya-01", copies: 1, kind: "customer_receipt" },
      }),
      R("Order audit trail", "GET", "/api/v1/orders/:id/timeline", {
        status: "planned",
        desc: "Every status change, void, discount and print with actor and timestamp — the right rail of the order detail screen.",
      }),
    ]),

    F("Order history", "", [
      R("List completed orders", "GET", "/api/v1/orders/history", {
        status: "planned",
        screen: "pages/order-history",
        source: "mock-order-history.ts",
        query: [
          ...LIST,
          ...DATE_RANGE,
          { key: "status", value: "Completed,Cancelled,Refunded" },
          { key: "paymentMethod", value: "Mada", desc: "Mada · Apple Pay · STC Pay · Visa · Cash." },
        ],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "#OC-3384", date: "2026-08-16", branch: "Riyadh - Olaya", channel: "Takeaway", customer: "Abdullah M.", items: 1, total: "SAR 35.00", paymentMethod: "Mada", status: "Completed" },
              ],
              meta: { page: 1, pageSize: 25, total: 4821 },
            },
          },
        ],
      }),
      R("History KPI strip", "GET", "/api/v1/orders/history/stats", { status: "planned", source: "mock-order-history.ts — orderHistoryStats", query: [...BRANCH, ...DATE_RANGE] }),
      R("Export history (CSV/Excel)", "POST", "/api/v1/orders/history/export", {
        status: "planned",
        body: { format: "xlsx", dateFrom: "2026-08-01", dateTo: "2026-08-17", branchId: null, columns: ["id", "date", "branch", "channel", "total", "paymentMethod", "status"] },
        examples: [{ name: "Queued", code: 202, body: { jobId: "exp-7782", status: "queued" } }],
      }),
      R("Refund an order", "POST", "/api/v1/orders/:id/refund", {
        status: "planned",
        desc: "Full or partial. Creates a payment refund **and** a ZATCA credit note — the two are linked by `creditNoteOf`.",
        body: { amountSar: 42.0, reason: "quality_complaint", issueCreditNote: true },
      }),
    ]),

    F("Pre-orders & scheduled", "", [
      R("List pre-orders", "GET", "/api/v1/preorders", {
        status: "planned",
        screen: "pages/preorders",
        source: "mock-preorders.ts",
        query: [...LIST, { key: "status", value: "Scheduled,Preparing,Ready,Collected,No-show" }, { key: "scheduledFor", value: "2026-08-18", desc: "ISO date of the collection slot." }],
        tests: T_LIST,
      }),
      R("Pre-order KPI strip", "GET", "/api/v1/preorders/stats", { status: "planned", source: "mock-preorders.ts — preOrderStats" }),
      R("Create a pre-order", "POST", "/api/v1/preorders", {
        status: "planned",
        body: { branchId: "{{branchId}}", customerId: "{{customerId}}", scheduledFor: "2026-08-18T13:30:00+03:00", channel: "Takeaway", lines: [{ menuItemId: "item-kabsa", quantity: 2, modifiers: [], notes: "" }], depositSar: 0 },
        tests: T_CREATED,
      }),
      R("Reschedule a pre-order", "PATCH", "/api/v1/preorders/:preorderId/schedule", { status: "planned", body: { scheduledFor: "2026-08-18T19:00:00+03:00" } }),
      R("Mark collected", "POST", "/api/v1/preorders/:preorderId/collect", { status: "planned", body: {} }),
      R("Mark no-show", "POST", "/api/v1/preorders/:preorderId/no-show", { status: "planned", body: { forfeitDeposit: true } }),
      R("Capacity per slot", "GET", "/api/v1/preorders/capacity", {
        status: "planned",
        query: [{ key: "date", value: "2026-08-18", on: true }, ...BRANCH],
        desc: "How many pre-orders the kitchen can still take per 30-minute slot — prevents the 1pm pile-up.",
      }),
    ]),

    F("Kitchen Display (KDS)", "", [
      R("KDS ticket board", "GET", "/api/v1/kds/tickets", {
        status: "planned",
        screen: "pages/kds/kds-page.tsx",
        query: [...BRANCH, { key: "station", value: "grill", desc: "Route tickets to one prep station: grill · fry · cold · barista · pass." }, { key: "status", value: "new,preparing" }],
        desc: "Tickets grouped by station with elapsed timers. The board polls this or subscribes to the SSE stream below.",
        tests: T_OK,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { ticketId: "kds-3391", orderId: "#OC-3391", channel: "Dine-in", table: "12", station: "grill", elapsedSeconds: 132, slaSeconds: 480, status: "preparing", lines: [{ name: "برجر لحم بقري", quantity: 2, modifiers: ["بدون بصل"], notes: "" }] },
              ],
            },
          },
        ],
      }),
      R("Bump a ticket", "POST", "/api/v1/kds/tickets/:ticketId/bump", { status: "planned", desc: "Marks the ticket done at this station and pushes it to the next one (or to `ready`).", body: {} }),
      R("Recall a bumped ticket", "POST", "/api/v1/kds/tickets/:ticketId/recall", { status: "planned", body: {} }),
      R("Bump a single line", "POST", "/api/v1/kds/tickets/:ticketId/lines/:lineId/bump", { status: "planned", body: {} }),
      R("Flag a ticket (rush / hold)", "POST", "/api/v1/kds/tickets/:ticketId/flag", { status: "planned", body: { flag: "rush" } }),
      R("Station list & routing rules", "GET", "/api/v1/kds/stations", { status: "planned", desc: "Which menu categories route to which station, per branch." }),
      R("Update station routing", "PUT", "/api/v1/kds/stations/:stationId/routing", { status: "planned", body: { categoryIds: ["cat-main", "cat-lunch"] } }),
      R("Prep-time performance", "GET", "/api/v1/kds/performance", { status: "planned", query: [...BRANCH, ...DATE_RANGE], desc: "Average and p90 prep time per station — feeds the KDS header and the margin report." }),
      R("Live ticket stream (SSE)", "GET", "/api/v1/kds/stream", {
        status: "planned",
        headers: [{ key: "Accept", value: "text/event-stream" }],
        query: [...BRANCH],
        desc: "Server-sent events: `ticket.created`, `ticket.updated`, `ticket.bumped`. Postman shows the raw stream; the app uses `EventSource`.\n\n`packages/realtime` is the (currently empty) package that will wrap this.",
      }),
    ]),

    F("POS (in-branch till)", "", [
      R("Open a till session", "POST", "/api/v1/pos/sessions", {
        status: "stub",
        screen: "pages/pos (empty stub)",
        desc: "Cashier opens the drawer with a counted float. Every POS order is attached to the open session.",
        body: { branchId: "{{branchId}}", deviceId: "dev-pos-olaya-01", openingFloatSar: 500 },
      }),
      R("Get current till session", "GET", "/api/v1/pos/sessions/current", { status: "stub", query: [{ key: "deviceId", value: "dev-pos-olaya-01", on: true }] }),
      R("Cash movement (paid in / paid out)", "POST", "/api/v1/pos/sessions/:sessionId/cash-movements", { status: "stub", body: { direction: "out", amountSar: 120, reason: "Supplier delivery — ice" } }),
      R("Close till (X/Z report)", "POST", "/api/v1/pos/sessions/:sessionId/close", {
        status: "stub",
        desc: "Counted cash vs expected; the difference is the drawer variance that shows up in Finance → Settlements.",
        body: { countedCashSar: 1840.5, note: "" },
        examples: [{ name: "Closed", body: { sessionId: "till-2201", expectedCashSar: 1855, countedCashSar: 1840.5, varianceSar: -14.5, ordersCount: 84, grossSar: 6320.75 } }],
      }),
      R("Quick-sale (POS order)", "POST", "/api/v1/pos/orders", {
        status: "stub",
        desc: "Same payload as a normal order plus the till session and a tender block, since POS takes payment inline.",
        body: { sessionId: "till-2201", channel: "Dine-in", tableId: "tbl-12", lines: [{ menuItemId: "item-beef-burger", quantity: 1, modifiers: [], notes: "" }], tender: [{ method: "Mada", amountSar: 168 }] },
      }),
      R("Park / retrieve a check", "POST", "/api/v1/pos/orders/:id/park", { status: "stub", body: { label: "Table 12 — waiting" } }),
      R("Open cash drawer", "POST", "/api/v1/pos/devices/:deviceId/drawer/open", { status: "stub", body: { reason: "manual" } }),
      R("Offline queue sync", "POST", "/api/v1/pos/sync", {
        status: "stub",
        desc: "Batch-uploads orders taken while the till was offline. Idempotent on `clientOrderId` so a retry never double-charges.",
        body: { deviceId: "dev-pos-olaya-01", orders: [{ clientOrderId: "local-8891", createdAt: "2026-08-17T06:55:00Z", lines: [], tender: [] }] },
      }),
    ]),

    F("Live updates", "", [
      R("Order stream (SSE)", "GET", "/api/v1/orders/stream", {
        status: "planned",
        headers: [{ key: "Accept", value: "text/event-stream" }],
        query: [...BRANCH],
        desc: "Pushes `order.created` / `order.status_changed` so Live Orders and KDS stop polling. Today `shared/api/live-orders.ts` polls `GET /api/orders` on an interval instead.",
      }),
      R("Realtime handshake (WebSocket ticket)", "POST", "/api/v1/realtime/ticket", {
        status: "planned",
        desc: "Short-lived ticket exchanged for a WS connection — browsers cannot set an Authorization header on a WebSocket.",
        body: { channels: ["orders", "kds", "dispatch"] },
        examples: [{ name: "Issued", body: { ticket: "wst_1f9c...", url: "wss://api.octopus.sa/realtime", expiresInSeconds: 60 } }],
      }),
    ]),
  ]
);

// ============================================================
// 05 — Reservations
// ============================================================
const reservations = F(
  "05 · Reservations & Bookings",
  "Calendar, floor plan, waitlist and private events. Deposits run through the Payments module, so a cancelled booking with a paid deposit produces a refund there.",
  [
    F("Reservations", "", [
      R("List reservations", "GET", "/api/v1/reservations", {
        status: "planned",
        screen: "pages/reservations",
        source: "mock-reservations.ts",
        query: [
          ...LIST,
          { key: "date", value: "2026-08-08", desc: "Single day — the calendar's day view." },
          ...DATE_RANGE,
          { key: "status", value: "Confirmed,Seated", desc: "Confirmed · Seated · Completed · No-show · Cancelled." },
          { key: "source", value: "Phone,Website,Walk-in,Mobile App,Aggregator" },
          { key: "zone", value: "Main Hall", desc: "Main Hall · Terrace · Family Section · Private Rooms." },
        ],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "rsv-1042", date: "2026-08-08", time: "20:30", partySize: 6, customerName: "Sara Al-Harbi", customerPhone: "+966555443322", branch: "Riyadh - Olaya", zone: "Main Hall", tableId: "tbl-12", status: "Confirmed", source: "Mobile App", depositSar: 200, notes: "Birthday — cake at 21:15" },
              ],
              meta: { page: 1, pageSize: 25, total: 37 },
            },
          },
        ],
      }),
      R("Calendar / timeline view", "GET", "/api/v1/reservations/calendar", {
        status: "planned",
        screen: "pages/reservations/calendar",
        query: [{ key: "date", value: "2026-08-08", on: true }, ...BRANCH, { key: "view", value: "timeline", desc: "`day` · `week` · `timeline`." }],
        desc: "Reservations bucketed into time slots with per-slot cover counts — the timeline lanes.",
      }),
      R("Availability search", "GET", "/api/v1/reservations/availability", {
        status: "planned",
        query: [
          { key: "date", value: "2026-08-20", on: true },
          { key: "partySize", value: "4", on: true },
          { key: "branchId", value: "{{branchId}}", on: true },
          { key: "zone", value: "Terrace" },
        ],
        desc: "Bookable slots given turn time, table inventory and blackout windows. What the customer storefront calls before offering times.",
        examples: [{ name: "Success", body: { date: "2026-08-20", slots: [{ time: "19:00", available: true, tablesLeft: 3 }, { time: "19:30", available: false, tablesLeft: 0 }, { time: "20:00", available: true, tablesLeft: 5 }] } }],
      }),
      R("Create a reservation", "POST", "/api/v1/reservations", {
        status: "planned",
        screen: "features/booking/create-booking (stub)",
        body: { branchId: "{{branchId}}", date: "2026-08-20", time: "20:00", partySize: 4, customerName: "Sara Al-Harbi", customerPhone: "+966555443322", zone: "Main Hall", source: "Phone", notes: "Window table if possible", depositSar: 200 },
        tests: `pm.test("201 Created", () => pm.response.to.have.status(201));
const b = pm.response.json();
if (b.id) pm.environment.set("reservationId", b.id);`,
      }),
      R("Get a reservation", "GET", "/api/v1/reservations/:reservationId", { status: "planned", screen: "pages/booking-detail (stub)" }),
      R("Update a reservation", "PATCH", "/api/v1/reservations/:reservationId", { status: "planned", body: { partySize: 6, time: "20:30", notes: "Birthday — cake at 21:15" } }),
      R("Assign a table", "POST", "/api/v1/reservations/:reservationId/table", { status: "planned", body: { tableId: "tbl-12" } }),
      R("Seat the party", "POST", "/api/v1/reservations/:reservationId/seat", { status: "planned", body: { tableId: "tbl-12", seatedAt: "2026-08-20T20:04:00+03:00" } }),
      R("Complete the visit", "POST", "/api/v1/reservations/:reservationId/complete", { status: "planned", body: {} }),
      R("Mark no-show", "POST", "/api/v1/reservations/:reservationId/no-show", { status: "planned", desc: "Optionally forfeits the deposit; that decision is auditable.", body: { forfeitDeposit: true } }),
      R("Cancel a reservation", "POST", "/api/v1/reservations/:reservationId/cancel", { status: "planned", body: { reason: "customer_request", refundDeposit: true } }),
      R("Take a deposit", "POST", "/api/v1/reservations/:reservationId/deposit", {
        status: "planned",
        desc: "Sends a payment link over WhatsApp/SMS or charges a saved card. Creates a Payment in the Finance module.",
        body: { amountSar: 200, method: "payment_link", channel: "whatsapp" },
      }),
      R("Refund a deposit", "POST", "/api/v1/reservations/:reservationId/deposit/refund", { status: "planned", body: { amountSar: 200, reason: "restaurant_cancelled" } }),
      R("Send a reminder", "POST", "/api/v1/reservations/:reservationId/remind", { status: "planned", body: { channel: "whatsapp", templateId: "tpl_reservation_reminder" } }),
      R("Reservation settings", "GET", "/api/v1/reservations/settings", {
        status: "planned",
        desc: "Turn times per zone, lead time, max party size, deposit rules, blackout dates.",
        examples: [{ name: "Success", body: { turnTimeMinutes: { "Main Hall": 90, Terrace: 105, "Family Section": 120, "Private Rooms": 180 }, minLeadTimeMinutes: 60, maxPartySize: 20, depositRequiredFrom: 8, blackoutDates: ["2026-09-23"] } }],
      }),
      R("Update reservation settings", "PUT", "/api/v1/reservations/settings", { status: "planned", body: { turnTimeMinutes: { "Main Hall": 90 }, minLeadTimeMinutes: 60, maxPartySize: 20, depositRequiredFrom: 8 } }),
    ]),

    F("Floor plan & tables", "", [
      R("Get the floor plan", "GET", "/api/v1/floor-plan", {
        status: "planned",
        screen: "pages/reservations/floor-plan",
        source: "mock-reservations.ts — floorTables, zones, zoneMetrics",
        query: [...BRANCH, { key: "zone", value: "Main Hall" }],
        tests: T_OK,
        examples: [
          {
            name: "Success",
            body: {
              zones: [{ name: "Main Hall", avgTurnTimeMin: 90 }, { name: "Terrace", avgTurnTimeMin: 105 }],
              tables: [
                { id: "tbl-12", label: "12", zone: "Main Hall", seats: 6, shape: "round", x: 240, y: 130, status: "Occupied", orderId: "#OC-3391", occupiedSinceMinutes: 42 },
                { id: "tbl-13", label: "13", zone: "Main Hall", seats: 4, shape: "rect", x: 320, y: 130, status: "Available", orderId: null, occupiedSinceMinutes: null },
              ],
            },
          },
        ],
      }),
      R("Update table status", "PATCH", "/api/v1/tables/:tableId/status", {
        status: "planned",
        desc: "Available · Occupied · Reserved · Needs Cleaning · Blocked.",
        body: { status: "Needs Cleaning" },
      }),
      R("Save floor-plan layout", "PUT", "/api/v1/floor-plan/layout", {
        status: "planned",
        desc: "Persists drag-and-drop coordinates from the plan editor.",
        body: { branchId: "{{branchId}}", tables: [{ id: "tbl-12", x: 240, y: 130, shape: "round", seats: 6, zone: "Main Hall" }] },
      }),
      R("Create a table", "POST", "/api/v1/tables", { status: "planned", body: { branchId: "{{branchId}}", label: "21", zone: "Terrace", seats: 4, shape: "rect", x: 80, y: 300 } }),
      R("Delete a table", "DELETE", "/api/v1/tables/:tableId", { status: "planned" }),
      R("Merge / split tables", "POST", "/api/v1/tables/merge", { status: "planned", desc: "Joins two tables into one seating unit for a large party.", body: { tableIds: ["tbl-12", "tbl-13"], label: "12+13" } }),
      R("Table turn metrics", "GET", "/api/v1/tables/metrics", { status: "planned", query: [...BRANCH, ...DATE_RANGE], desc: "Covers, turns per table and average dwell — the numbers behind the AI insight about turnover." }),
    ]),

    F("Waitlist", "", [
      R("List the waitlist", "GET", "/api/v1/waitlist", {
        status: "planned",
        screen: "pages/reservations/waitlist",
        source: "mock-reservations.ts — waitlistRows",
        query: [...BRANCH, { key: "status", value: "Waiting,Notified", desc: "Waiting · Notified · Seated · Left." }],
        tests: T_LIST,
        examples: [
          { name: "Success", body: { data: [{ id: "wl-31", name: "Khalid R.", phone: "+966533221100", partySize: 3, quotedWaitMin: 25, waitingSinceMin: 12, status: "Waiting", branch: "Riyadh - Olaya" }] } },
        ],
      }),
      R("Waitlist KPI strip", "GET", "/api/v1/waitlist/stats", { status: "planned", source: "mock-reservations.ts — waitlistStats" }),
      R("Add a party", "POST", "/api/v1/waitlist", { status: "planned", body: { branchId: "{{branchId}}", name: "Khalid R.", phone: "+966533221100", partySize: 3, quotedWaitMin: 25 } }),
      R("Notify the party (table ready)", "POST", "/api/v1/waitlist/:waitlistId/notify", { status: "planned", body: { channel: "sms", templateId: "tpl_table_ready" } }),
      R("Seat from the waitlist", "POST", "/api/v1/waitlist/:waitlistId/seat", { status: "planned", body: { tableId: "tbl-13" } }),
      R("Remove (left / no longer waiting)", "POST", "/api/v1/waitlist/:waitlistId/remove", { status: "planned", body: { reason: "left" } }),
      R("Quoted-wait estimator", "GET", "/api/v1/waitlist/quote", { status: "planned", query: [{ key: "partySize", value: "3", on: true }, ...BRANCH], desc: "Predicted wait from current occupancy and average turn time." }),
    ]),

    F("Private rooms & events", "", [
      R("List event bookings", "GET", "/api/v1/events", {
        status: "planned",
        screen: "pages/reservations/events",
        source: "mock-reservations.ts — eventBookings",
        query: [...PAGING, { key: "period", value: "Upcoming", desc: "Upcoming · This Month · Past." }, { key: "status", value: "Confirmed,Reminder Sent,Completed,Cancelled" }],
        tests: T_LIST,
      }),
      R("Event KPI strip", "GET", "/api/v1/events/stats", { status: "planned", source: "mock-reservations.ts — eventStats" }),
      R("Create an event booking", "POST", "/api/v1/events", {
        status: "planned",
        body: {
          branchId: "{{branchId}}",
          roomId: "room-majlis-1",
          title: "Al-Rashid family gathering",
          date: "2026-09-04",
          startTime: "19:00",
          endTime: "23:00",
          guests: 45,
          contactName: "Abdulaziz Al-Rashid",
          contactPhone: "+966544332211",
          packageId: "pkg-set-menu-a",
          depositSar: 2500,
          avRequirements: [{ item: "Projector", quantity: 1 }, { item: "Wireless mic", quantity: 2 }],
          notes: "Ladies section, separate entrance",
        },
        tests: T_CREATED,
      }),
      R("Get an event booking", "GET", "/api/v1/events/:eventId", { status: "planned" }),
      R("Update an event booking", "PATCH", "/api/v1/events/:eventId", { status: "planned", body: { guests: 50, endTime: "23:30" } }),
      R("Event timeline (planning steps)", "GET", "/api/v1/events/:eventId/timeline", { status: "planned", desc: "Deposit taken → menu confirmed → BEO sent → setup → service → settled." }),
      R("Advance a timeline step", "POST", "/api/v1/events/:eventId/timeline/:stepId/complete", { status: "planned", body: {} }),
      R("Send the BEO / proposal", "POST", "/api/v1/events/:eventId/send-proposal", { status: "planned", body: { channel: "email", to: "abdulaziz@example.com" } }),
      R("Cancel an event", "POST", "/api/v1/events/:eventId/cancel", { status: "planned", body: { reason: "customer_request", refundDepositSar: 1250 } }),
      R("List private rooms", "GET", "/api/v1/events/rooms", { status: "planned", query: BRANCH, desc: "Capacity, minimum spend and AV inventory per room." }),
      R("List event packages", "GET", "/api/v1/events/packages", { status: "planned", desc: "Set menus with a per-head price — chosen when the booking is created." }),
    ]),
  ]
);

// ============================================================
// 06 — Menu
// ============================================================
const menu = F(
  "06 · Menu & Catalogue",
  "Categories, items, modifiers, combos, channel pricing, day-part schedules and the 86 board.\n\nThe customer storefront reads the same catalogue through `packages/api-client/src/contracts/menu.ts` — keep the shapes aligned.",
  [
    F("Categories & items", "", [
      R("List categories", "GET", "/api/v1/menu/categories", {
        status: "planned",
        screen: "pages/menu",
        source: "mock-menu.ts — menuCategories, menuCategoryCounts",
        query: [{ key: "withCounts", value: "true", on: true }],
        tests: T_LIST,
        examples: [
          { name: "Success", body: { data: [{ id: "cat-main", nameEn: "Main Dishes", nameAr: "الأطباق الرئيسية", imageUrl: "/images/categories/main.jpg", sortOrder: 1, itemCount: 5, active: true }] } },
        ],
      }),
      R("Create a category", "POST", "/api/v1/menu/categories", { status: "planned", body: { nameEn: "Grills", nameAr: "المشاوي", imageUrl: null, sortOrder: 6, active: true }, tests: T_CREATED }),
      R("Update a category", "PATCH", "/api/v1/menu/categories/:categoryId", { status: "planned", body: { nameAr: "المشاوي والمقبلات", active: true } }),
      R("Reorder categories", "PUT", "/api/v1/menu/categories/order", { status: "planned", body: { order: ["cat-main", "cat-breakfast", "cat-lunch", "cat-desserts", "cat-drinks"] } }),
      R("Delete a category", "DELETE", "/api/v1/menu/categories/:categoryId", { status: "planned", desc: "Rejected with 409 while items still reference it." }),
      R("List menu items", "GET", "/api/v1/menu/items", {
        status: "planned",
        screen: "pages/menu/items",
        source: "mock-menu.ts — menuItems",
        query: [
          ...LIST,
          { key: "categoryId", value: "cat-main" },
          { key: "status", value: "Available,86'd,Scheduled,Draft" },
          { key: "channel", value: "Delivery", desc: "Dine-in · Delivery · Takeaway · Kiosk · Aggregator." },
        ],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "item-classic-chicken-burger", categoryId: "cat-main", nameEn: "Classic Chicken Burger", nameAr: "برجر دجاج كلاسيك", descriptionAr: "قطعة دجاج مقرمشة مع خس وطماطم.", priceSar: 153, costSar: 41.2, marginPct: 73.1, imageUrl: "/images/menu/burger-01.jpg", status: "Available", channels: ["Dine-in", "Delivery", "Takeaway"], modifierGroupIds: ["grp-size", "grp-bread", "grp-extras"], calories: 640, prepMinutes: 8, sku: "BRG-001" },
              ],
              meta: { page: 1, pageSize: 25, total: 18 },
            },
          },
        ],
      }),
      R("Menu KPI strip", "GET", "/api/v1/menu/stats", { status: "planned", source: "mock-menu.ts — menuStats", desc: "Total items, 86'd count, average margin, items missing a photo." }),
      R("Get a menu item", "GET", "/api/v1/menu/items/:itemId", { status: "planned" }),
      R("Create a menu item", "POST", "/api/v1/menu/items", {
        status: "planned",
        body: { categoryId: "cat-main", nameEn: "Spicy Chicken Burger", nameAr: "برجر دجاج حار", descriptionAr: "برجر دجاج بصلصة حارة.", priceSar: 165, imageUrl: null, status: "Draft", channels: ["Dine-in", "Delivery", "Takeaway"], modifierGroupIds: ["grp-size", "grp-bread"], calories: 690, prepMinutes: 9, sku: "BRG-004", recipeId: null },
        tests: T_CREATED,
      }),
      R("Update a menu item", "PATCH", "/api/v1/menu/items/:itemId", { status: "planned", body: { priceSar: 172, status: "Available" } }),
      R("Duplicate a menu item", "POST", "/api/v1/menu/items/:itemId/duplicate", { status: "planned", body: { nameEn: "Spicy Chicken Burger (Large)" } }),
      R("Delete a menu item", "DELETE", "/api/v1/menu/items/:itemId", { status: "planned" }),
      R("Bulk update items", "POST", "/api/v1/menu/items/bulk", {
        status: "planned",
        desc: "Multi-select in the items table → raise prices, change channel availability, or move category in one call.",
        body: { itemIds: ["item-kabsa", "item-mandi"], patch: { status: "Available", channels: ["Dine-in", "Delivery"] } },
      }),
      R("Upload an item photo", "POST", "/api/v1/menu/items/:itemId/image", {
        status: "planned",
        formdata: [{ key: "file", type: "file", src: [] , desc: "JPEG/PNG, max 4 MB, min 1200×800." }],
      }),
      R("Import menu (CSV)", "POST", "/api/v1/menu/import", { status: "planned", formdata: [{ key: "file", type: "file", src: [] }, { key: "mode", value: "upsert", desc: "`upsert` or `replace`." }] }),
      R("Export menu (CSV)", "GET", "/api/v1/menu/export", { status: "planned", query: [{ key: "format", value: "csv", on: true }] }),
    ]),

    F("Modifiers", "", [
      R("List modifier groups", "GET", "/api/v1/menu/modifier-groups", {
        status: "planned",
        screen: "pages/menu/modifiers",
        source: "mock-menu.ts — modifierGroups",
        query: [...PAGING, ...SEARCH],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "grp-size", labelEn: "Size", labelAr: "الحجم", selectionRule: "Single choice", required: true, minSelect: 1, maxSelect: 1, usedByItems: 12, options: [{ id: "opt-size-small", labelAr: "صغير", priceDeltaSar: 0 }, { id: "opt-size-large", labelAr: "كبير", priceDeltaSar: 30 }] },
              ],
            },
          },
        ],
      }),
      R("Create a modifier group", "POST", "/api/v1/menu/modifier-groups", {
        status: "planned",
        body: { labelEn: "Sauce", labelAr: "الصلصة", selectionRule: "Multiple choice", required: false, minSelect: 0, maxSelect: 3, options: [{ labelEn: "Garlic", labelAr: "ثوم", priceDeltaSar: 3 }, { labelEn: "Hot", labelAr: "حار", priceDeltaSar: 3 }] },
        tests: T_CREATED,
      }),
      R("Update a modifier group", "PATCH", "/api/v1/menu/modifier-groups/:groupId", { status: "planned", body: { required: true, minSelect: 1 } }),
      R("Delete a modifier group", "DELETE", "/api/v1/menu/modifier-groups/:groupId", { status: "planned" }),
      R("Add an option", "POST", "/api/v1/menu/modifier-groups/:groupId/options", { status: "planned", body: { labelEn: "Extra cheese", labelAr: "جبنة إضافية", priceDeltaSar: 12, available: true } }),
      R("Update an option", "PATCH", "/api/v1/menu/modifier-groups/:groupId/options/:optionId", { status: "planned", body: { priceDeltaSar: 14 } }),
      R("Delete an option", "DELETE", "/api/v1/menu/modifier-groups/:groupId/options/:optionId", { status: "planned" }),
      R("Attach group to items", "POST", "/api/v1/menu/modifier-groups/:groupId/attach", { status: "planned", body: { itemIds: ["item-beef-burger", "item-classic-chicken-burger"] } }),
    ]),

    F("Combos", "", [
      R("List combos", "GET", "/api/v1/menu/combos", {
        status: "planned",
        screen: "pages/menu/combos",
        source: "mock-menu.ts — combos, comboStats",
        query: [...PAGING, ...SEARCH, { key: "status", value: "Active,Inactive,Draft" }],
        tests: T_LIST,
      }),
      R("Combo KPI strip", "GET", "/api/v1/menu/combos/stats", { status: "planned", source: "mock-menu.ts — comboStats" }),
      R("Create a combo", "POST", "/api/v1/menu/combos", {
        status: "planned",
        desc: "`savingsSar` is derived: sum of component prices minus the combo price. The API returns it; do not send it.",
        body: { nameEn: "Burger Meal", nameAr: "وجبة برجر", priceSar: 189, status: "Draft", components: [{ slotLabelEn: "Main", choices: ["item-beef-burger", "item-classic-chicken-burger"], required: true }, { slotLabelEn: "Drink", choices: ["item-soft-drink", "item-fresh-juice"], required: true }] },
        tests: T_CREATED,
      }),
      R("Update a combo", "PATCH", "/api/v1/menu/combos/:comboId", { status: "planned", body: { priceSar: 179, status: "Active" } }),
      R("Delete a combo", "DELETE", "/api/v1/menu/combos/:comboId", { status: "planned" }),
    ]),

    F("Price lists & channels", "", [
      R("List price lists", "GET", "/api/v1/menu/price-lists", {
        status: "planned",
        screen: "pages/menu/pricing",
        source: "mock-menu.ts — priceLists, priceChannels, branchPriceFactor",
        desc: "Channels: dineIn · takeaway · delivery · kiosk · hungerstation · jahez. Aggregator lists usually carry an uplift to absorb commission.",
        tests: T_LIST,
        examples: [
          { name: "Success", body: { data: [{ id: "pl-base", name: "Base", channel: "dineIn", upliftPct: 0, effectiveFrom: "2026-01-01", effectiveTo: null, itemCount: 18 }, { id: "pl-hs", name: "HungerStation", channel: "hungerstation", upliftPct: 18, effectiveFrom: "2026-03-01", effectiveTo: null, itemCount: 18 }] } },
        ],
      }),
      R("Get price list entries", "GET", "/api/v1/menu/price-lists/:priceListId/items", { status: "planned", query: [...PAGING, ...SEARCH] }),
      R("Create a price list", "POST", "/api/v1/menu/price-lists", { status: "planned", body: { name: "Jahez", channel: "jahez", upliftPct: 20, effectiveFrom: "2026-09-01", effectiveTo: null }, tests: T_CREATED }),
      R("Set an item price on a list", "PUT", "/api/v1/menu/price-lists/:priceListId/items/:itemId", { status: "planned", body: { priceSar: 180 } }),
      R("Bulk reprice", "POST", "/api/v1/menu/price-lists/:priceListId/bulk-reprice", {
        status: "planned",
        desc: "Percentage or fixed change across a category — the operation behind the 'apply uplift' button.",
        body: { scope: { categoryId: "cat-main" }, change: { type: "percentage", value: 5 }, roundTo: 0.5 },
      }),
      R("Branch price factors", "GET", "/api/v1/menu/price-lists/branch-factors", { status: "planned", desc: "Per-branch multiplier (an airport branch prices above a suburban one)." }),
      R("Update branch price factor", "PUT", "/api/v1/menu/price-lists/branch-factors/:branchId", { status: "planned", body: { factor: 1.15 } }),
      R("Effective price for an item", "GET", "/api/v1/menu/items/:itemId/effective-price", {
        status: "planned",
        query: [{ key: "channel", value: "delivery", on: true }, { key: "branchId", value: "{{branchId}}", on: true }, { key: "at", value: "2026-08-17T20:00:00+03:00" }],
        desc: "Resolves base price → price list → branch factor → active promotion → day-part rule. The single source of truth for what the customer is charged.",
      }),
    ]),

    F("Schedules & day parts", "", [
      R("List day parts", "GET", "/api/v1/menu/day-parts", {
        status: "planned",
        screen: "pages/menu/schedules",
        source: "mock-menu.ts — dayParts",
        desc: "Breakfast / lunch / dinner / late night windows that gate item visibility.",
        tests: T_LIST,
      }),
      R("Create a day part", "POST", "/api/v1/menu/day-parts", { status: "planned", body: { nameEn: "Late Night", nameAr: "وجبة متأخرة", startTime: "23:00", endTime: "03:00", days: ["thu", "fri", "sat"], categoryIds: ["cat-main", "cat-drinks"] } }),
      R("Update a day part", "PATCH", "/api/v1/menu/day-parts/:dayPartId", { status: "planned", body: { endTime: "04:00" } }),
      R("Delete a day part", "DELETE", "/api/v1/menu/day-parts/:dayPartId", { status: "planned" }),
      R("Get the Ramadan profile", "GET", "/api/v1/menu/ramadan-profile", {
        status: "planned",
        source: "mock-menu.ts — ramadanProfile",
        desc: "Iftar/suhoor service windows, the Ramadan-only menu set and the auto-activation date range (Hijri-aware).",
        examples: [{ name: "Success", body: { enabled: true, hijriYear: 1448, startsOn: "2027-02-08", endsOn: "2027-03-09", iftar: { start: "18:05", end: "21:00" }, suhoor: { start: "21:30", end: "03:30" }, menuCategoryIds: ["cat-main", "cat-desserts"], dineInClosedDuringFasting: true } }],
      }),
      R("Update the Ramadan profile", "PUT", "/api/v1/menu/ramadan-profile", { status: "planned", body: { enabled: true, iftar: { start: "18:05", end: "21:00" }, suhoor: { start: "21:30", end: "03:30" }, menuCategoryIds: ["cat-main", "cat-desserts"] } }),
      R("List special days", "GET", "/api/v1/menu/special-days", { status: "planned", source: "mock-menu.ts — specialDays", desc: "National Day, Eid, Founding Day — override normal hours and menus." }),
      R("Create a special day", "POST", "/api/v1/menu/special-days", { status: "planned", body: { nameEn: "Saudi National Day", nameAr: "اليوم الوطني", date: "2026-09-23", menuCategoryIds: ["cat-main"], hours: { open: "12:00", close: "02:00" } } }),
      R("Delete a special day", "DELETE", "/api/v1/menu/special-days/:specialDayId", { status: "planned" }),
    ]),

    F("Availability (86 board)", "", [
      R("Get the 86 board", "GET", "/api/v1/menu/availability", {
        status: "planned",
        screen: "pages/menu/availability",
        source: "mock-menu.ts — availabilityBoard",
        query: [...BRANCH, { key: "status", value: "Available,Low Stock,86'd" }],
        desc: "Per-branch item availability with the reason an item was 86'd and who did it.",
        tests: T_LIST,
        examples: [
          { name: "Success", body: { data: [{ itemId: "item-grilled-fish", nameEn: "Grilled Fish", branchId: "branch-riyadh-olaya", status: "86'd", reason: "Out of stock", since: "2026-08-17T05:20:00Z", by: "Fahad (Kitchen)", autoRestoreAt: "2026-08-18T06:00:00Z" }] } },
        ],
      }),
      R("86 an item", "POST", "/api/v1/menu/availability/:itemId/86", {
        status: "planned",
        desc: "Reasons: Out of stock · Quality issue · Supplier delay · Prep time. Propagates to every connected aggregator so the customer can't order it.",
        body: { branchId: "{{branchId}}", reason: "Out of stock", autoRestoreAt: "2026-08-18T06:00:00Z", notifyAggregators: true },
      }),
      R("Restore an item", "POST", "/api/v1/menu/availability/:itemId/restore", { status: "planned", body: { branchId: "{{branchId}}" } }),
      R("Bulk 86 / restore", "POST", "/api/v1/menu/availability/bulk", { status: "planned", body: { branchId: "{{branchId}}", itemIds: ["item-grilled-fish", "item-mandi"], action: "86", reason: "Supplier delay" } }),
      R("Set low-stock threshold", "PUT", "/api/v1/menu/availability/:itemId/threshold", { status: "planned", desc: "When the linked recipe's ingredients fall below this, the board flips the item to Low Stock automatically.", body: { branchId: "{{branchId}}", lowStockAtPortions: 10 } }),
    ]),
  ]
);

module.exports = { orders, reservations, menu };
