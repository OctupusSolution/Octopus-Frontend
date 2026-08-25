"use strict";
const { R, F, LIST, PAGING, SEARCH, BRANCH, DATE_RANGE, T_OK, T_LIST, T_CREATED } = require("./lib");

// ============================================================
// 07 — Inventory
// ============================================================
const inventory = F(
  "07 · Inventory & Supply",
  "Ingredients, recipes, purchasing, counts, waste, transfers and production.\n\nInventory is the module that connects to margin: a recipe links menu items to ingredient cost, so a price change here moves the numbers in Reports → Costs & Margin.",
  [
    F("Ingredients & stock", "", [
      R("List ingredients", "GET", "/api/v1/inventory/ingredients", {
        status: "planned",
        screen: "pages/inventory/ingredients",
        source: "mock-inventory.ts — stockRows",
        query: [
          ...LIST,
          { key: "category", value: "Meat", desc: "Meat · Poultry · Dairy · Produce · Dry Goods · Beverages · Packaging." },
          { key: "status", value: "In Stock,Low Stock,Out of Stock" },
          { key: "supplier", value: "Almarai" },
        ],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "ing-014", nameEn: "Chicken breast", nameAr: "صدور دجاج", category: "Poultry", unit: "kg", onHand: 42.5, parLevel: 60, reorderPoint: 30, unitCostSar: 24.9, valueSar: 1058.25, status: "Low Stock", supplier: "Tamimi Markets", branchId: "branch-riyadh-olaya", lastCountedAt: "2026-08-14", expiresOn: "2026-08-21" },
              ],
              meta: { page: 1, pageSize: 25, total: 96 },
            },
          },
        ],
      }),
      R("Inventory KPI strip", "GET", "/api/v1/inventory/stats", { status: "planned", source: "mock-inventory.ts — ingredientKpis", query: BRANCH, desc: "Stock value, low-stock lines, expiring within 7 days, waste this month." }),
      R("Get an ingredient", "GET", "/api/v1/inventory/ingredients/:ingredientId", { status: "planned" }),
      R("Create an ingredient", "POST", "/api/v1/inventory/ingredients", {
        status: "planned",
        body: { nameEn: "Basmati rice", nameAr: "أرز بسمتي", category: "Dry Goods", unit: "kg", parLevel: 120, reorderPoint: 60, unitCostSar: 9.4, supplierId: "sup-tamimi", shelfLifeDays: 365, storage: "dry" },
        tests: T_CREATED,
      }),
      R("Update an ingredient", "PATCH", "/api/v1/inventory/ingredients/:ingredientId", { status: "planned", body: { parLevel: 80, reorderPoint: 40, unitCostSar: 25.4 } }),
      R("Delete an ingredient", "DELETE", "/api/v1/inventory/ingredients/:ingredientId", { status: "planned", desc: "409 while a recipe still references it." }),
      R("Manual stock adjustment", "POST", "/api/v1/inventory/ingredients/:ingredientId/adjust", {
        status: "planned",
        desc: "Every adjustment needs a reason — this is the audit trail auditors ask for.",
        body: { branchId: "{{branchId}}", delta: -3.5, reason: "spillage", note: "Dropped tray" },
      }),
      R("Stock ledger for an ingredient", "GET", "/api/v1/inventory/ingredients/:ingredientId/ledger", { status: "planned", query: [...PAGING, ...DATE_RANGE], desc: "Every movement: receipts, consumption from sales, waste, transfers, count corrections." }),
      R("List suppliers", "GET", "/api/v1/inventory/suppliers", { status: "planned", source: "mock-inventory.ts — SUPPLIERS", query: [...PAGING, ...SEARCH], tests: T_LIST }),
      R("Create a supplier", "POST", "/api/v1/inventory/suppliers", { status: "planned", body: { name: "Nadec", contactName: "Ahmed", phone: "+966112223344", email: "orders@nadec.example", vatNumber: "300123456700003", paymentTerms: "Net 30", leadTimeDays: 2 }, tests: T_CREATED }),
      R("Update a supplier", "PATCH", "/api/v1/inventory/suppliers/:supplierId", { status: "planned", body: { leadTimeDays: 3, paymentTerms: "Net 15" } }),
      R("Supplier price list", "GET", "/api/v1/inventory/suppliers/:supplierId/price-list", { status: "planned", desc: "Agreed unit prices — used to flag when a delivered invoice is above contract." }),
    ]),

    F("Recipes & costing", "", [
      R("List recipes", "GET", "/api/v1/inventory/recipes", {
        status: "planned",
        screen: "pages/inventory/recipes",
        source: "mock-inventory.ts — recipes",
        query: [...LIST, { key: "menuItemId", value: "item-kabsa" }],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "recipe-03", nameEn: "Chicken Kabsa", menuItemId: "item-kabsa", yieldPortions: 4, costPerPortionSar: 21.4, menuPriceSar: 98, marginPct: 78.2, lines: [{ ingredientId: "ing-014", nameEn: "Chicken breast", quantity: 1.2, unit: "kg", costSar: 29.88 }, { ingredientId: "ing-031", nameEn: "Basmati rice", quantity: 0.8, unit: "kg", costSar: 7.52 }] },
              ],
            },
          },
        ],
      }),
      R("Get a recipe", "GET", "/api/v1/inventory/recipes/:recipeId", { status: "planned" }),
      R("Create a recipe", "POST", "/api/v1/inventory/recipes", {
        status: "planned",
        body: { nameEn: "Spicy Chicken Burger", menuItemId: "item-spicy-chicken-burger", yieldPortions: 1, lines: [{ ingredientId: "ing-014", quantity: 0.18, unit: "kg" }, { ingredientId: "ing-052", quantity: 1, unit: "pcs" }], prepMinutes: 9, instructions: "" },
        tests: T_CREATED,
      }),
      R("Update a recipe", "PATCH", "/api/v1/inventory/recipes/:recipeId", { status: "planned", body: { yieldPortions: 2, lines: [{ ingredientId: "ing-014", quantity: 0.36, unit: "kg" }] } }),
      R("Delete a recipe", "DELETE", "/api/v1/inventory/recipes/:recipeId", { status: "planned" }),
      R("Recost everything", "POST", "/api/v1/inventory/recipes/recost", {
        status: "planned",
        desc: "Recalculates cost-per-portion and margin for every recipe from current ingredient prices. Run it after a supplier price rise.",
        body: { basis: "latest_purchase_price" },
        examples: [{ name: "Done", body: { recipesUpdated: 34, itemsBelowTargetMargin: 5, averageMarginPct: 71.8 } }],
      }),
      R("Theoretical vs actual usage", "GET", "/api/v1/inventory/recipes/variance", {
        status: "planned",
        query: [...BRANCH, ...DATE_RANGE],
        desc: "What recipes say should have been consumed against what the counts show was consumed. The gap is theft, over-portioning or unrecorded waste.",
      }),
    ]),

    F("Purchasing", "", [
      R("List purchase orders", "GET", "/api/v1/inventory/purchase-orders", {
        status: "planned",
        screen: "pages/inventory/purchasing",
        source: "mock-inventory.ts — purchaseOrders",
        query: [...LIST, { key: "status", value: "Draft,Sent,Partially Received,Received,Cancelled,Overdue" }, { key: "supplierId", value: "sup-tamimi" }, ...DATE_RANGE],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "PO-2026-0148", supplier: "Tamimi Markets", branch: "Riyadh - Olaya", status: "Sent", orderedOn: "2026-08-15", expectedOn: "2026-08-18", totalSar: 8420.5, linesCount: 12, receivedPct: 0 },
              ],
            },
          },
        ],
      }),
      R("Purchasing KPI strip", "GET", "/api/v1/inventory/purchase-orders/stats", { status: "planned", source: "mock-inventory.ts — purchasingKpis" }),
      R("Get a purchase order", "GET", "/api/v1/inventory/purchase-orders/:poId", { status: "planned", screen: "pages/purchase-orders (stub)" }),
      R("Create a purchase order", "POST", "/api/v1/inventory/purchase-orders", {
        status: "planned",
        body: { supplierId: "sup-tamimi", branchId: "{{branchId}}", expectedOn: "2026-08-20", lines: [{ ingredientId: "ing-014", quantity: 60, unit: "kg", unitCostSar: 24.9 }], note: "" },
        tests: T_CREATED,
      }),
      R("Suggested reorder", "GET", "/api/v1/inventory/purchase-orders/suggest", {
        status: "planned",
        query: [...BRANCH, { key: "supplierId", value: "sup-tamimi" }],
        desc: "Draft PO lines generated from par level minus on-hand minus already-ordered, factoring supplier lead time.",
      }),
      R("Update a draft PO", "PATCH", "/api/v1/inventory/purchase-orders/:poId", { status: "planned", body: { expectedOn: "2026-08-21", lines: [{ ingredientId: "ing-014", quantity: 80, unit: "kg", unitCostSar: 24.9 }] } }),
      R("Send PO to supplier", "POST", "/api/v1/inventory/purchase-orders/:poId/send", { status: "planned", body: { channel: "email", to: "orders@tamimi.example" } }),
      R("Receive a delivery (GRN)", "POST", "/api/v1/inventory/purchase-orders/:poId/receive", {
        status: "planned",
        desc: "Partial receipts allowed — the PO flips to `Partially Received` until every line is closed. Increments stock and writes ledger entries.",
        body: { receivedOn: "2026-08-18", lines: [{ ingredientId: "ing-014", quantityReceived: 55, unitCostSar: 25.2, batchNo: "B-2211", expiresOn: "2026-08-28" }], invoiceNumber: "TM-99812", note: "5 kg short" },
      }),
      R("Cancel a PO", "POST", "/api/v1/inventory/purchase-orders/:poId/cancel", { status: "planned", body: { reason: "supplier_out_of_stock" } }),
      R("Attach supplier invoice", "POST", "/api/v1/inventory/purchase-orders/:poId/attachments", { status: "planned", formdata: [{ key: "file", type: "file", src: [], desc: "PDF or photo of the delivery note." }] }),
    ]),

    F("Stock counts", "", [
      R("List stock counts", "GET", "/api/v1/inventory/counts", {
        status: "planned",
        screen: "pages/inventory/counts",
        source: "mock-inventory.ts — stockCounts",
        query: [...LIST, { key: "type", value: "Full,Spot,Cycle" }, { key: "status", value: "In Progress,Pending Review,Approved" }],
        tests: T_LIST,
      }),
      R("Counts KPI strip", "GET", "/api/v1/inventory/counts/stats", { status: "planned", source: "mock-inventory.ts — countsKpis" }),
      R("Start a count", "POST", "/api/v1/inventory/counts", { status: "planned", body: { branchId: "{{branchId}}", type: "Spot", scope: { categories: ["Poultry", "Meat"] }, countedBy: "{{userId}}" }, tests: T_CREATED }),
      R("Get a count sheet", "GET", "/api/v1/inventory/counts/:countId", { status: "planned", desc: "Expected quantity is hidden until entry is submitted — blind counting." }),
      R("Submit counted quantities", "POST", "/api/v1/inventory/counts/:countId/lines", { status: "planned", body: { lines: [{ ingredientId: "ing-014", countedQuantity: 39.5 }, { ingredientId: "ing-031", countedQuantity: 112 }] } }),
      R("Variance report", "GET", "/api/v1/inventory/counts/:countId/variance", {
        status: "planned",
        desc: "Counted vs expected, valued in SAR, sorted by cost impact.",
        examples: [{ name: "Success", body: { countId: "cnt-0032", totalVarianceSar: -742.6, lines: [{ ingredientId: "ing-014", expected: 42.5, counted: 39.5, variance: -3, varianceSar: -74.7, variancePct: -7.1 }] } }],
      }),
      R("Approve a count", "POST", "/api/v1/inventory/counts/:countId/approve", { status: "planned", desc: "Writes the corrections into the ledger. Manager-only.", body: { note: "Variance accepted — kitchen briefed" }, roles: "`owner`, `branch_manager`" }),
      R("Reject / reopen a count", "POST", "/api/v1/inventory/counts/:countId/reopen", { status: "planned", body: { reason: "recount_required" } }),
    ]),

    F("Waste", "", [
      R("List waste entries", "GET", "/api/v1/inventory/waste", {
        status: "planned",
        screen: "pages/inventory/waste",
        source: "mock-inventory.ts — wasteEntries",
        query: [...LIST, ...DATE_RANGE, { key: "reason", value: "Expired,Spoiled,Prep Error,Customer Return,Overproduction,Damaged in Transit" }],
        tests: T_LIST,
      }),
      R("Waste KPI strip", "GET", "/api/v1/inventory/waste/stats", { status: "planned", source: "mock-inventory.ts — wasteKpis, wasteByWeek", desc: "Total waste SAR, waste as % of sales, top wasted ingredient, weekly trend buckets." }),
      R("Log waste", "POST", "/api/v1/inventory/waste", {
        status: "planned",
        body: { branchId: "{{branchId}}", ingredientId: "ing-014", quantity: 2.4, unit: "kg", reason: "Expired", note: "Past use-by", loggedBy: "{{userId}}", photoUrl: null },
        tests: T_CREATED,
      }),
      R("Delete a waste entry", "DELETE", "/api/v1/inventory/waste/:wasteId", { status: "planned", desc: "Manager-only; reverses the stock movement." }),
      R("Waste by reason (chart)", "GET", "/api/v1/inventory/waste/by-reason", { status: "planned", query: [...BRANCH, ...DATE_RANGE] }),
    ]),

    F("Transfers", "", [
      R("List transfers", "GET", "/api/v1/inventory/transfers", {
        status: "planned",
        screen: "pages/inventory/transfers",
        source: "mock-inventory.ts — transfers",
        query: [...LIST, { key: "status", value: "Requested,Approved,In Transit,Received,Rejected" }, { key: "fromBranchId", value: "" }, { key: "toBranchId", value: "" }],
        tests: T_LIST,
      }),
      R("Transfers KPI strip", "GET", "/api/v1/inventory/transfers/stats", { status: "planned", source: "mock-inventory.ts — transfersKpis" }),
      R("Request a transfer", "POST", "/api/v1/inventory/transfers", {
        status: "planned",
        screen: "pages/stock-transfers (stub)",
        body: { fromBranchId: "branch-riyadh-narjis", toBranchId: "branch-riyadh-olaya", lines: [{ ingredientId: "ing-014", quantity: 10, unit: "kg" }], neededBy: "2026-08-18", note: "Cover the weekend rush" },
        tests: T_CREATED,
      }),
      R("Approve a transfer", "POST", "/api/v1/inventory/transfers/:transferId/approve", { status: "planned", body: {} }),
      R("Reject a transfer", "POST", "/api/v1/inventory/transfers/:transferId/reject", { status: "planned", body: { reason: "insufficient_stock" } }),
      R("Dispatch (mark in transit)", "POST", "/api/v1/inventory/transfers/:transferId/dispatch", { status: "planned", body: { driverName: "Yasser", vehicle: "Van 3", dispatchedAt: "2026-08-18T09:10:00+03:00" } }),
      R("Receive a transfer", "POST", "/api/v1/inventory/transfers/:transferId/receive", { status: "planned", desc: "Short receipts are recorded as damaged-in-transit waste against the sending branch.", body: { lines: [{ ingredientId: "ing-014", quantityReceived: 9.5 }], note: "0.5 kg damaged" } }),
    ]),

    F("Production", "", [
      R("List production batches", "GET", "/api/v1/inventory/production", {
        status: "planned",
        screen: "pages/inventory/production",
        source: "mock-inventory.ts — productionBatches",
        query: [...LIST, { key: "status", value: "Planned,In Progress,Completed,Failed" }],
        desc: "Central-kitchen prep: sauces, dough, marinades made in bulk and consumed by branches.",
        tests: T_LIST,
      }),
      R("Production KPI strip", "GET", "/api/v1/inventory/production/stats", { status: "planned", source: "mock-inventory.ts — productionKpis" }),
      R("Plan a batch", "POST", "/api/v1/inventory/production", { status: "planned", body: { recipeId: "recipe-12", branchId: "{{branchId}}", plannedYield: 40, unit: "L", scheduledFor: "2026-08-18T05:00:00+03:00" }, tests: T_CREATED }),
      R("Start a batch", "POST", "/api/v1/inventory/production/:batchId/start", { status: "planned", body: {} }),
      R("Complete a batch", "POST", "/api/v1/inventory/production/:batchId/complete", {
        status: "planned",
        desc: "Deducts consumed ingredients and adds the produced quantity as a new stock item. Actual yield below planned shows up as a production loss.",
        body: { actualYield: 37.5, consumed: [{ ingredientId: "ing-070", quantity: 12, unit: "kg" }], note: "" },
      }),
      R("Fail a batch", "POST", "/api/v1/inventory/production/:batchId/fail", { status: "planned", body: { reason: "temperature_deviation", wasteAll: true } }),
    ]),
  ]
);

// ============================================================
// 08 — Customers / CRM
// ============================================================
const customers = F(
  "08 · Customers & CRM",
  "Customer profiles, segments and feedback. Segments are rule-driven, so a customer moves between VIP / Regular / At Risk / Churned automatically as their behaviour changes.",
  [
    F("Customer list & profile", "", [
      R("List customers", "GET", "/api/v1/customers", {
        status: "planned",
        screen: "pages/customers",
        source: "mock-customers.ts — customerRows",
        query: [
          ...LIST,
          { key: "segment", value: "VIP,Regular,New,At Risk,Churned" },
          { key: "loyaltyTier", value: "Bronze,Silver,Gold,Platinum" },
          { key: "minSpend", value: "1000" },
          { key: "lastVisitBefore", value: "2026-06-01", desc: "Find lapsed customers." },
        ],
        tests: `pm.test("200 OK", () => pm.response.to.have.status(200));
const b = pm.response.json();
if (b.data && b.data.length) pm.environment.set("customerId", b.data[0].id);`,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "cus-0142", name: "Sara Al-Harbi", phone: "+966555443322", email: "sara@example.com", segment: "VIP", visits: 38, totalSpent: "SAR 9,420.00", avgBasket: "SAR 247.90", loyaltyTier: "Gold", loyaltyPoints: 4820, lastVisit: "2026-08-14" },
              ],
              meta: { page: 1, pageSize: 25, total: 1204 },
            },
          },
        ],
      }),
      R("Customer KPI strip", "GET", "/api/v1/customers/stats", { status: "planned", source: "mock-customers.ts — customerStats", desc: "Total customers, new this month, repeat rate, average lifetime value." }),
      R("Get a customer", "GET", "/api/v1/customers/:customerId", {
        status: "planned",
        screen: "pages/customers/detail",
        desc: "Full profile: favourites, saved cards, notes, loyalty balance.",
        examples: [
          {
            name: "Success",
            body: {
              id: "cus-0142", name: "Sara Al-Harbi", phone: "+966555443322", email: "sara@example.com", segment: "VIP", loyaltyTier: "Gold", loyaltyPoints: 4820,
              visits: 38, totalSpent: "SAR 9,420.00", avgBasket: "SAR 247.90", lastVisit: "2026-08-14",
              favouriteItems: ["برجر لحم بقري", "كنافة نابلسية"],
              savedPaymentMethods: [{ method: "Mada", masked: "•••• 4417" }, { method: "Apple Pay", masked: "•••• 9902" }],
              notes: "Allergic to sesame. Prefers the terrace.",
              consent: { marketingWhatsapp: true, marketingSms: false, marketingEmail: true, updatedAt: "2026-05-02T11:00:00Z" },
            },
          },
        ],
      }),
      R("Create a customer", "POST", "/api/v1/customers", { status: "planned", body: { name: "Khalid Al-Dosari", phone: "+966533221100", email: "khalid@example.com", notes: "", consent: { marketingWhatsapp: true, marketingSms: false, marketingEmail: false } }, tests: T_CREATED }),
      R("Update a customer", "PATCH", "/api/v1/customers/:customerId", { status: "planned", body: { email: "sara.h@example.com", notes: "Allergic to sesame. Prefers the terrace." } }),
      R("Merge duplicate customers", "POST", "/api/v1/customers/merge", { status: "planned", desc: "Same person entered twice with two phone numbers — merges history, points and saved cards into the survivor.", body: { survivorId: "cus-0142", mergedIds: ["cus-0871"] } }),
      R("Visit history", "GET", "/api/v1/customers/:customerId/visits", { status: "planned", query: PAGING, desc: "Every order with branch, total and item count — the timeline on the profile.", tests: T_LIST }),
      R("Saved payment methods", "GET", "/api/v1/customers/:customerId/payment-methods", { status: "planned", desc: "Gateway tokens only — OCTOPUS never stores a PAN." }),
      R("Remove a saved card", "DELETE", "/api/v1/customers/:customerId/payment-methods/:methodId", { status: "planned" }),
      R("Add a note", "POST", "/api/v1/customers/:customerId/notes", { status: "planned", body: { text: "Celebrating anniversary in September", pinned: true } }),
      R("Update marketing consent", "PUT", "/api/v1/customers/:customerId/consent", {
        status: "planned",
        desc: "Opt-in is per channel and timestamped — required before any WhatsApp/SMS campaign can include this customer.",
        body: { marketingWhatsapp: true, marketingSms: false, marketingEmail: true, source: "in_store_signup" },
      }),
      R("Export customers (CSV)", "POST", "/api/v1/customers/export", { status: "planned", body: { format: "csv", segment: "VIP", columns: ["name", "phone", "totalSpent", "lastVisit"] } }),
      R("Delete customer data (GDPR/PDPL)", "DELETE", "/api/v1/customers/:customerId", { status: "planned", desc: "Right-to-erasure. Anonymises the profile but keeps the financial records ZATCA requires for 6 years." }),
    ]),

    F("Segments", "", [
      R("List segments", "GET", "/api/v1/customers/segments", {
        status: "planned",
        screen: "pages/customers/segments",
        source: "mock-customers.ts — customerSegments",
        tests: T_LIST,
        examples: [
          { name: "Success", body: { data: [{ id: "seg-vip", name: "VIP", memberCount: 184, rules: [{ field: "totalSpent", operator: ">=", value: 5000 }, { field: "visits", operator: ">=", value: 20 }], dynamic: true, updatedAt: "2026-08-17T03:00:00Z" }] } },
        ],
      }),
      R("Get a segment", "GET", "/api/v1/customers/segments/:segmentId", { status: "planned", screen: "pages/customers/segments/detail" }),
      R("Segment members", "GET", "/api/v1/customers/segments/:segmentId/members", { status: "planned", query: PAGING, tests: T_LIST }),
      R("Create a segment", "POST", "/api/v1/customers/segments", {
        status: "planned",
        desc: "Rule fields and operators come from `segmentRuleFields` / `segmentRuleOperators` — the builder UI only offers those.",
        body: { name: "Lapsed high spenders", dynamic: true, matchAll: true, rules: [{ field: "totalSpent", operator: ">=", value: 3000 }, { field: "daysSinceLastVisit", operator: ">=", value: 60 }] },
        tests: T_CREATED,
      }),
      R("Update a segment", "PATCH", "/api/v1/customers/segments/:segmentId", { status: "planned", body: { rules: [{ field: "totalSpent", operator: ">=", value: 4000 }] } }),
      R("Preview a segment (count before saving)", "POST", "/api/v1/customers/segments/preview", { status: "planned", body: { matchAll: true, rules: [{ field: "visits", operator: ">=", value: 10 }] }, examples: [{ name: "Success", body: { matchedCount: 412, sample: ["Sara Al-Harbi", "Faisal Al-Anazi"] } }] }),
      R("Recalculate a segment", "POST", "/api/v1/customers/segments/:segmentId/refresh", { status: "planned", body: {} }),
      R("Delete a segment", "DELETE", "/api/v1/customers/segments/:segmentId", { status: "planned" }),
    ]),

    F("Feedback & complaints", "", [
      R("List feedback", "GET", "/api/v1/customers/feedback", {
        status: "planned",
        screen: "pages/customers/feedback",
        source: "mock-customers.ts — feedbackRows",
        query: [
          ...LIST,
          { key: "status", value: "New,In Progress,Resolved,Escalated" },
          { key: "channel", value: "In-app,WhatsApp,Google,Aggregator" },
          { key: "category", value: "" },
          { key: "rating", value: "1,2", desc: "Filter to the angry ones." },
        ],
        tests: T_LIST,
      }),
      R("Feedback KPI strip", "GET", "/api/v1/customers/feedback/stats", { status: "planned", source: "mock-customers.ts — feedbackStats, ratingDistribution", desc: "Average rating, NPS, open complaints, resolution time, plus the 1–5 star distribution." }),
      R("Get a feedback item", "GET", "/api/v1/customers/feedback/:feedbackId", { status: "planned", screen: "pages/customers/feedback/detail" }),
      R("Assign feedback to a user", "POST", "/api/v1/customers/feedback/:feedbackId/assign", { status: "planned", body: { assigneeId: "{{userId}}" } }),
      R("Change feedback status", "PATCH", "/api/v1/customers/feedback/:feedbackId/status", { status: "planned", body: { status: "In Progress" } }),
      R("Add an internal note", "POST", "/api/v1/customers/feedback/:feedbackId/notes", { status: "planned", body: { text: "Called the customer — offering a replacement", internal: true } }),
      R("Reply to the customer", "POST", "/api/v1/customers/feedback/:feedbackId/reply", { status: "planned", desc: "Goes out on the channel the feedback arrived on.", body: { channel: "whatsapp", message: "نعتذر عن التجربة، تم إضافة رصيد 50 ريال لحسابك." } }),
      R("Issue a service-recovery voucher", "POST", "/api/v1/customers/feedback/:feedbackId/compensate", { status: "planned", body: { kind: "voucher", valueSar: 50, expiresInDays: 30 } }),
      R("Escalate", "POST", "/api/v1/customers/feedback/:feedbackId/escalate", { status: "planned", body: { to: "owner", reason: "repeat_complaint" } }),
    ]),
  ]
);

// ============================================================
// 09 — Marketing & Loyalty
// ============================================================
const marketing = F(
  "09 · Marketing & Loyalty",
  "Loyalty program, gift cards, subscriptions, promotions and campaigns.\n\nEvery outbound message routes through the shared Messaging service (folder 14) and is blocked for customers without channel consent.",
  [
    F("Overview", "", [
      R("Marketing KPI strip", "GET", "/api/v1/marketing/stats", { status: "planned", screen: "pages/marketing", source: "mock-marketing.ts — marketingStats", query: DATE_RANGE, tests: T_OK }),
    ]),

    F("Loyalty program", "", [
      R("Get loyalty configuration", "GET", "/api/v1/loyalty/program", {
        status: "planned",
        screen: "pages/marketing/loyalty",
        source: "mock-marketing.ts — loyaltyRulesDefault, loyaltyTiers",
        examples: [
          {
            name: "Success",
            body: {
              enabled: true,
              earnRate: { pointsPerSar: 1, roundTo: "floor" },
              redeemRate: { pointsPerSar: 100 },
              expiryMonths: 12,
              minRedeemPoints: 500,
              excludedChannels: ["Aggregator"],
              tiers: [
                { name: "Bronze", thresholdPoints: 0, multiplier: 1, perks: [] },
                { name: "Silver", thresholdPoints: 2000, multiplier: 1.25, perks: ["Free delivery"] },
                { name: "Gold", thresholdPoints: 5000, multiplier: 1.5, perks: ["Free delivery", "Priority seating"] },
                { name: "Platinum", thresholdPoints: 12000, multiplier: 2, perks: ["Free delivery", "Priority seating", "Birthday meal"] },
              ],
            },
          },
        ],
      }),
      R("Update loyalty rules", "PUT", "/api/v1/loyalty/program", { status: "planned", body: { enabled: true, earnRate: { pointsPerSar: 1, roundTo: "floor" }, redeemRate: { pointsPerSar: 100 }, expiryMonths: 12, minRedeemPoints: 500, excludedChannels: ["Aggregator"] } }),
      R("Update tiers", "PUT", "/api/v1/loyalty/tiers", { status: "planned", body: { tiers: [{ name: "Silver", thresholdPoints: 2500, multiplier: 1.25, perks: ["Free delivery"] }] } }),
      R("Loyalty KPI strip", "GET", "/api/v1/loyalty/stats", { status: "planned", source: "mock-marketing.ts — loyaltyKpis", desc: "Members, points issued, points redeemed, outstanding liability in SAR." }),
      R("Points issued/redeemed over time", "GET", "/api/v1/loyalty/points-history", { status: "planned", source: "mock-marketing.ts — loyaltyPointsHistory", query: DATE_RANGE }),
      R("Tier distribution", "GET", "/api/v1/loyalty/tier-distribution", { status: "planned", source: "mock-marketing.ts — loyaltyTierRows" }),
      R("Customer points balance", "GET", "/api/v1/loyalty/members/:customerId", { status: "planned", examples: [{ name: "Success", body: { customerId: "cus-0142", points: 4820, tier: "Gold", pointsToNextTier: 7180, expiringSoon: [{ points: 320, expiresOn: "2026-09-30" }] } }] }),
      R("Points ledger", "GET", "/api/v1/loyalty/members/:customerId/ledger", { status: "planned", query: PAGING }),
      R("Adjust points manually", "POST", "/api/v1/loyalty/members/:customerId/adjust", { status: "planned", desc: "Goodwill grants and corrections. Reason is mandatory and audited.", body: { points: 500, reason: "service_recovery", note: "Late delivery on 14 Aug" } }),
      R("Redeem points", "POST", "/api/v1/loyalty/members/:customerId/redeem", { status: "planned", body: { points: 1000, orderId: "{{orderId}}" } }),
    ]),

    F("Gift cards", "", [
      R("List gift cards", "GET", "/api/v1/gift-cards", {
        status: "planned",
        screen: "pages/marketing/gift-cards",
        source: "mock-marketing.ts — giftCards",
        query: [...LIST, { key: "status", value: "Active,Partially Used,Fully Used,Expired,Void" }],
        tests: T_LIST,
        examples: [
          { name: "Success", body: { data: [{ id: "gc-0031", code: "OCTO-4K2P-9NQ1", design: "Ocean", initialSar: 500, balanceSar: 235, status: "Partially Used", issuedTo: "Sara Al-Harbi", issuedOn: "2026-06-01", expiresOn: "2027-06-01" }] } },
        ],
      }),
      R("Gift card KPI strip", "GET", "/api/v1/gift-cards/stats", { status: "planned", source: "mock-marketing.ts — giftCardKpis", desc: "Cards sold, outstanding balance (a liability), redemption rate, breakage." }),
      R("Available designs", "GET", "/api/v1/gift-cards/designs", { status: "planned", source: "mock-marketing.ts — giftCardDesignSwatches", desc: "Ocean · Violet · Sunset · Emerald gradients." }),
      R("Issue a gift card", "POST", "/api/v1/gift-cards", {
        status: "planned",
        body: { amountSar: 500, design: "Ocean", recipientName: "Sara Al-Harbi", recipientPhone: "+966555443322", message: "كل عام وأنتِ بخير", deliverOn: "2026-09-01", channel: "whatsapp", expiresInMonths: 12 },
        tests: T_CREATED,
      }),
      R("Check a gift card balance", "GET", "/api/v1/gift-cards/lookup", { status: "planned", query: [{ key: "code", value: "OCTO-4K2P-9NQ1", on: true }], desc: "Used by the POS before applying the card as tender." }),
      R("Redeem against an order", "POST", "/api/v1/gift-cards/:giftCardId/redeem", { status: "planned", body: { orderId: "{{orderId}}", amountSar: 120 } }),
      R("Top up a gift card", "POST", "/api/v1/gift-cards/:giftCardId/top-up", { status: "planned", body: { amountSar: 200 } }),
      R("Void a gift card", "POST", "/api/v1/gift-cards/:giftCardId/void", { status: "planned", body: { reason: "fraud_suspected" } }),
      R("Gift card event history", "GET", "/api/v1/gift-cards/:giftCardId/events", { status: "planned", desc: "Issued → delivered → redeemed × N → expired." }),
    ]),

    F("Subscriptions & memberships", "", [
      R("List plans", "GET", "/api/v1/subscriptions/plans", {
        status: "planned",
        screen: "pages/marketing/subscriptions",
        source: "mock-marketing.ts — subscriptionPlans",
        examples: [
          { name: "Success", body: { data: [{ id: "coffee-club", nameEn: "Coffee Club", priceSar: 149, cycle: "Monthly", benefits: ["1 coffee/day", "10% off pastries"], activeSubscribers: 312 }, { id: "lunch-pass", nameEn: "Lunch Pass", priceSar: 399, cycle: "Monthly", benefits: ["20 lunches"], activeSubscribers: 96 }] } },
        ],
      }),
      R("Create a plan", "POST", "/api/v1/subscriptions/plans", { status: "planned", body: { nameEn: "VIP Dining", nameAr: "عضوية كبار الزوار", priceSar: 999, cycle: "Monthly", benefits: ["Priority booking", "15% off"], trialDays: 0, active: true }, tests: T_CREATED }),
      R("Update a plan", "PATCH", "/api/v1/subscriptions/plans/:planId", { status: "planned", body: { priceSar: 1099, active: true } }),
      R("List subscribers", "GET", "/api/v1/subscriptions/subscribers", {
        status: "planned",
        source: "mock-marketing.ts — subscribers",
        query: [...LIST, { key: "planId", value: "coffee-club" }, { key: "status", value: "Active,Past Due,Paused,Cancelled" }],
        tests: T_LIST,
      }),
      R("Subscription KPI strip", "GET", "/api/v1/subscriptions/stats", { status: "planned", source: "mock-marketing.ts — subscriptionKpis", desc: "MRR, active subscribers, churn rate, past-due count." }),
      R("Subscribe a customer", "POST", "/api/v1/subscriptions/subscribers", { status: "planned", body: { customerId: "{{customerId}}", planId: "coffee-club", startsOn: "2026-09-01", paymentMethodToken: "tok_moyasar_9f21c" }, tests: T_CREATED }),
      R("Pause a subscription", "POST", "/api/v1/subscriptions/subscribers/:subscriberId/pause", { status: "planned", body: { resumeOn: "2026-10-01" } }),
      R("Resume a subscription", "POST", "/api/v1/subscriptions/subscribers/:subscriberId/resume", { status: "planned", body: {} }),
      R("Cancel a subscription", "POST", "/api/v1/subscriptions/subscribers/:subscriberId/cancel", { status: "planned", body: { reason: "too_expensive", atPeriodEnd: true } }),
      R("Retry a failed charge", "POST", "/api/v1/subscriptions/subscribers/:subscriberId/retry-payment", { status: "planned", body: {} }),
      R("Benefit usage", "GET", "/api/v1/subscriptions/subscribers/:subscriberId/usage", { status: "planned", desc: "How many of this cycle's entitlements have been consumed — stops a Coffee Club member taking six a day." }),
    ]),

    F("Promotions & vouchers", "", [
      R("List promotions", "GET", "/api/v1/promotions", {
        status: "planned",
        screen: "pages/marketing/promotions",
        source: "mock-marketing.ts — promotions",
        query: [...LIST, { key: "status", value: "Active,Scheduled,Expired" }, { key: "type", value: "Percentage,Fixed Amount,BOGO,Free Delivery,Free Item" }, { key: "channel", value: "Dine-in,Delivery,Kiosk,Aggregators" }],
        tests: T_LIST,
        examples: [
          { name: "Success", body: { data: [{ id: "promo-018", nameEn: "Weekend 20% off", code: "WEEKEND20", type: "Percentage", value: 20, channels: ["Delivery", "Dine-in"], startsOn: "2026-08-15", endsOn: "2026-08-31", status: "Active", redemptions: 412, revenueSar: 38210, maxRedemptions: 1000, minBasketSar: 80 }] } },
        ],
      }),
      R("Promotion KPI strip", "GET", "/api/v1/promotions/stats", { status: "planned", source: "mock-marketing.ts — promotionKpis" }),
      R("Create a promotion", "POST", "/api/v1/promotions", {
        status: "planned",
        body: { nameEn: "Ramadan family bundle", nameAr: "عرض رمضان العائلي", code: "RAMADAN26", type: "Fixed Amount", value: 50, channels: ["Delivery", "Dine-in"], startsOn: "2027-02-08", endsOn: "2027-03-09", minBasketSar: 200, maxRedemptions: 5000, perCustomerLimit: 2, segmentId: null, itemIds: [], stackable: false },
        tests: T_CREATED,
      }),
      R("Update a promotion", "PATCH", "/api/v1/promotions/:promotionId", { status: "planned", body: { maxRedemptions: 8000, endsOn: "2027-03-12" } }),
      R("Pause / resume a promotion", "POST", "/api/v1/promotions/:promotionId/toggle", { status: "planned", body: { active: false } }),
      R("Delete a promotion", "DELETE", "/api/v1/promotions/:promotionId", { status: "planned" }),
      R("Validate a promo code", "POST", "/api/v1/promotions/validate", {
        status: "planned",
        desc: "What checkout calls — checks window, channel, basket minimum, per-customer limit and stacking rules in one round trip.",
        body: { code: "WEEKEND20", customerId: "{{customerId}}", channel: "Delivery", basketSar: 186, itemIds: ["item-beef-burger"] },
        examples: [
          { name: "Valid", body: { valid: true, discountSar: 37.2, promotionId: "promo-018" } },
          { name: "Rejected", code: 422, body: { valid: false, reason: "min_basket_not_met", minBasketSar: 80 } },
        ],
      }),
      R("Generate voucher codes", "POST", "/api/v1/promotions/:promotionId/vouchers", { status: "planned", desc: "Bulk single-use codes for a partner campaign.", body: { count: 500, prefix: "OCTO", expiresOn: "2026-12-31" } }),
      R("Redemption report", "GET", "/api/v1/promotions/:promotionId/redemptions", { status: "planned", query: PAGING, desc: "Who redeemed, when, and the incremental revenue vs the discount given." }),
    ]),

    F("Campaigns", "", [
      R("List campaigns", "GET", "/api/v1/campaigns", {
        status: "planned",
        screen: "pages/marketing/campaigns",
        source: "mock-marketing.ts — campaigns, campaignRows",
        query: [...LIST, { key: "status", value: "Active,Scheduled,Completed,Draft,Paused" }, { key: "channel", value: "WhatsApp,SMS,Email,Push" }],
        tests: T_LIST,
        examples: [
          { name: "Success", body: { data: [{ id: "camp-0021", name: "Win back lapsed VIPs", channel: "WhatsApp", status: "Active", segment: "Lapsed Customers", audience: 842, sent: 842, delivered: 831, opened: 612, clicked: 188, converted: 64, revenueSar: 18420, scheduledFor: "2026-08-12T18:00:00+03:00" }] } },
        ],
      }),
      R("Campaign KPI strip", "GET", "/api/v1/campaigns/stats", { status: "planned", source: "mock-marketing.ts — campaignKpis" }),
      R("Get a campaign", "GET", "/api/v1/campaigns/:campaignId", { status: "planned", screen: "pages/campaigns (stub)" }),
      R("Create a campaign", "POST", "/api/v1/campaigns", {
        status: "planned",
        desc: "WhatsApp campaigns must reference an approved Content template — free-form text outside the 24h session window is rejected by Meta.",
        body: { name: "Ramadan launch", channel: "WhatsApp", segment: "Gold & Platinum", templateId: "tpl_ramadan_launch", scheduledFor: "2027-02-07T18:00:00+03:00", promotionId: "promo-ramadan-26", variants: [] },
        tests: T_CREATED,
      }),
      R("Create an A/B test campaign", "POST", "/api/v1/campaigns/ab", {
        status: "planned",
        source: "mock-marketing.ts — AbVariant",
        body: { name: "Subject line test", channel: "Email", segment: "All Members", splitPct: 50, variants: [{ id: "A", templateId: "tpl_subject_a" }, { id: "B", templateId: "tpl_subject_b" }], winnerMetric: "converted", autoPromoteAfterHours: 6 },
      }),
      R("Estimate audience", "POST", "/api/v1/campaigns/estimate", {
        status: "planned",
        desc: "How many customers the segment reaches **after** consent filtering and channel reachability — always smaller than the raw segment count.",
        body: { segment: "Lapsed Customers", channel: "WhatsApp" },
        examples: [{ name: "Success", body: { segmentSize: 1204, reachable: 842, blocked: { noConsent: 289, invalidNumber: 73 }, estimatedCostSar: 210.5 } }],
      }),
      R("Send a test message", "POST", "/api/v1/campaigns/:campaignId/test", { status: "planned", body: { to: "+966501234567" } }),
      R("Schedule a campaign", "POST", "/api/v1/campaigns/:campaignId/schedule", { status: "planned", desc: "Rejected if the send time falls inside quiet hours for the target country.", body: { scheduledFor: "2026-08-20T18:00:00+03:00" } }),
      R("Send now", "POST", "/api/v1/campaigns/:campaignId/send", { status: "planned", body: {} }),
      R("Pause a campaign", "POST", "/api/v1/campaigns/:campaignId/pause", { status: "planned", body: {} }),
      R("Campaign performance", "GET", "/api/v1/campaigns/:campaignId/performance", { status: "planned", desc: "Delivery funnel plus attributed revenue and the per-variant split for A/B tests." }),
      R("Duplicate a campaign", "POST", "/api/v1/campaigns/:campaignId/duplicate", { status: "planned", body: { name: "Ramadan launch (copy)" } }),
    ]),
  ]
);

// ============================================================
// 10 — Delivery
// ============================================================
const delivery = F(
  "10 · Delivery & Dispatch",
  "Zones, the dispatch board, own drivers, and the aggregator channels (HungerStation, Jahez, Keeta, ToYou).\n\nAggregator orders arrive through the Integration Hub webhooks in folder 14 and land in the same Orders module.",
  [
    F("Zones", "", [
      R("List delivery zones", "GET", "/api/v1/delivery/zones", {
        status: "planned",
        screen: "pages/delivery/zones",
        source: "mock-delivery.ts — deliveryZones",
        query: [...BRANCH, { key: "city", value: "Riyadh", desc: "Riyadh · Jeddah · Dammam · Khobar." }],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "zone-narjis", name: "Al Narjis", city: "Riyadh", branchId: "branch-riyadh-narjis", polygon: [[46.63, 24.83], [46.66, 24.83], [46.66, 24.86], [46.63, 24.86]], active: true, minOrderSar: 30, avgDeliveryMin: 28, feeBands: [{ upToSar: 50, feeSar: 15 }, { upToSar: 150, feeSar: 10 }, { upToSar: null, feeSar: 0 }], blackoutWindows: [{ day: "fri", from: "11:30", to: "13:00", reason: "Jumu'ah" }] },
              ],
              meta: { uncoveredRequests: 34 },
            },
          },
        ],
      }),
      R("Create a zone", "POST", "/api/v1/delivery/zones", {
        status: "planned",
        body: { name: "Al Malqa", city: "Riyadh", branchId: "{{branchId}}", polygon: [[46.6, 24.8], [46.64, 24.8], [46.64, 24.84], [46.6, 24.84]], minOrderSar: 30, feeBands: [{ upToSar: 50, feeSar: 15 }, { upToSar: null, feeSar: 10 }], active: true },
        tests: T_CREATED,
      }),
      R("Update a zone", "PATCH", "/api/v1/delivery/zones/:zoneId", { status: "planned", body: { minOrderSar: 40, active: true } }),
      R("Delete a zone", "DELETE", "/api/v1/delivery/zones/:zoneId", { status: "planned" }),
      R("Set blackout windows", "PUT", "/api/v1/delivery/zones/:zoneId/blackouts", { status: "planned", desc: "Prayer times and peak-hour closures — delivery is refused inside these windows.", body: { windows: [{ day: "fri", from: "11:30", to: "13:00", reason: "Jumu'ah" }] } }),
      R("Check coverage for an address", "GET", "/api/v1/delivery/coverage", {
        status: "planned",
        query: [{ key: "lat", value: "24.8412", on: true }, { key: "lng", value: "46.6421", on: true }, { key: "basketSar", value: "120" }],
        desc: "Storefront calls this before checkout. Returns the serving branch, the fee for this basket size, and the ETA.",
        examples: [
          { name: "Covered", body: { covered: true, zoneId: "zone-narjis", branchId: "branch-riyadh-narjis", feeSar: 10, minOrderSar: 30, etaMinutes: 32 } },
          { name: "Not covered", body: { covered: false, nearestZoneKm: 4.2, waitlistAccepted: true } },
        ],
      }),
      R("Uncovered address requests", "GET", "/api/v1/delivery/uncovered-requests", { status: "planned", query: PAGING, desc: "Where customers tried to order and couldn't — the expansion backlog." }),
    ]),

    F("Dispatch board", "", [
      R("Dispatch board", "GET", "/api/v1/delivery/dispatch", {
        status: "planned",
        screen: "pages/delivery/dispatch",
        source: "mock-delivery.ts — dispatchOrders, dispatchStageOrder",
        query: [...BRANCH, { key: "stage", value: "Unassigned,Assigned,Picked Up,On the Way,Delivered" }],
        desc: "Kanban columns in `dispatchStageOrder`. Each card carries the order, the assigned driver and an SLA countdown.",
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              columns: [
                { stage: "Unassigned", orders: [{ id: "#OC-3390", customer: "Faisal A.", zone: "Al Narjis", totalSar: 94.5, placedMinutesAgo: 6, slaMinutes: 45, driverId: null, address: "Al Narjis, Riyadh" }] },
                { stage: "On the Way", orders: [{ id: "#OC-3387", customer: "Mona K.", zone: "Al Olaya", totalSar: 214, placedMinutesAgo: 22, slaMinutes: 45, driverId: "drv-04", etaMinutes: 9 }] },
              ],
            },
          },
        ],
      }),
      R("Assign a driver", "POST", "/api/v1/delivery/dispatch/:orderId/assign", { status: "planned", body: { driverId: "drv-04" } }),
      R("Auto-assign", "POST", "/api/v1/delivery/dispatch/auto-assign", { status: "planned", desc: "Assigns every unassigned order by proximity, current load and zone.", body: { branchId: "{{branchId}}" } }),
      R("Unassign", "POST", "/api/v1/delivery/dispatch/:orderId/unassign", { status: "planned", body: { reason: "driver_unavailable" } }),
      R("Advance delivery stage", "PATCH", "/api/v1/delivery/dispatch/:orderId/stage", { status: "planned", body: { stage: "Picked Up" } }),
      R("Batch orders to one driver", "POST", "/api/v1/delivery/dispatch/batch", { status: "planned", desc: "Stacks nearby drops into a single run.", body: { driverId: "drv-04", orderIds: ["#OC-3390", "#OC-3389"] } }),
      R("Live driver locations", "GET", "/api/v1/delivery/dispatch/tracking", { status: "planned", query: BRANCH, desc: "Latest GPS ping per active driver, for the map overlay." }),
      R("Proof of delivery", "POST", "/api/v1/delivery/dispatch/:orderId/pod", { status: "planned", formdata: [{ key: "photo", type: "file", src: [] }, { key: "receivedBy", value: "Faisal" }, { key: "note", value: "" }] }),
      R("Report a delivery failure", "POST", "/api/v1/delivery/dispatch/:orderId/fail", { status: "planned", body: { reason: "customer_unreachable", attempts: 3, returnToBranch: true } }),
    ]),

    F("Drivers", "", [
      R("List drivers", "GET", "/api/v1/delivery/drivers", {
        status: "planned",
        screen: "pages/delivery/drivers",
        source: "mock-delivery.ts — drivers",
        query: [...LIST, { key: "status", value: "Online,On Delivery,Break,Offline" }, { key: "vehicle", value: "Motorcycle,Car" }],
        tests: T_LIST,
        examples: [
          { name: "Success", body: { data: [{ id: "drv-04", name: "Yasser Al-Qahtani", phone: "+966566778899", vehicle: "Motorcycle", plate: "ABC 1234", status: "On Delivery", branchId: "branch-riyadh-olaya", activeOrders: 2, deliveriesToday: 14, avgDeliveryMin: 26, ratingAvg: 4.8, iqamaExpiresOn: "2027-02-11" }] } },
        ],
      }),
      R("Create a driver", "POST", "/api/v1/delivery/drivers", { status: "planned", body: { name: "Yasser Al-Qahtani", phone: "+966566778899", vehicle: "Motorcycle", plate: "ABC 1234", branchId: "{{branchId}}", employeeId: null, iqamaExpiresOn: "2027-02-11" }, tests: T_CREATED }),
      R("Update a driver", "PATCH", "/api/v1/delivery/drivers/:driverId", { status: "planned", body: { vehicle: "Car", plate: "XYZ 9988" } }),
      R("Set driver status", "PATCH", "/api/v1/delivery/drivers/:driverId/status", { status: "planned", body: { status: "Break" } }),
      R("Driver shift start / end", "POST", "/api/v1/delivery/drivers/:driverId/shift", { status: "planned", body: { action: "start", branchId: "{{branchId}}" } }),
      R("Driver performance", "GET", "/api/v1/delivery/drivers/:driverId/performance", { status: "planned", query: DATE_RANGE, desc: "Deliveries, average time, late rate, customer rating, distance." }),
      R("Driver earnings & tips", "GET", "/api/v1/delivery/drivers/:driverId/earnings", { status: "planned", query: DATE_RANGE, desc: "Feeds the payroll inputs in the Staff module." }),
    ]),

    F("Aggregator channels", "", [
      R("List aggregator connections", "GET", "/api/v1/delivery/aggregators", {
        status: "planned",
        screen: "pages/delivery/aggregators",
        source: "mock-delivery.ts — aggregatorPartners",
        desc: "HungerStation · Jahez · Keeta · ToYou · own app. Each carries a connection status, commission rate and menu-sync state.",
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "hungerstation", name: "HungerStation", status: "Connected", commissionPct: 18, menuSync: "Synced", lastSyncAt: "2026-08-17T04:00:00Z", ordersToday: 62, revenueTodaySar: 4820, storeOpen: true },
                { id: "jahez", name: "Jahez", status: "Error", commissionPct: 20, menuSync: "Out of Sync", lastSyncAt: "2026-08-15T04:00:00Z", ordersToday: 0, revenueTodaySar: 0, storeOpen: false, error: "Menu rejected: 3 items missing images" },
              ],
            },
          },
        ],
      }),
      R("Connect an aggregator", "POST", "/api/v1/delivery/aggregators/:aggregatorId/connect", { status: "planned", body: { storeId: "HS-88213", apiKey: "{{aggregatorApiKey}}", commissionPct: 18, priceListId: "pl-hs" } }),
      R("Disconnect", "POST", "/api/v1/delivery/aggregators/:aggregatorId/disconnect", { status: "planned", body: {} }),
      R("Push menu to aggregator", "POST", "/api/v1/delivery/aggregators/:aggregatorId/sync-menu", {
        status: "planned",
        desc: "Publishes the mapped price list and current 86 board. Returns a job id — sync is asynchronous on the partner side.",
        body: { branchId: "{{branchId}}", priceListId: "pl-hs", includeUnavailable: false },
        examples: [{ name: "Queued", code: 202, body: { jobId: "sync-4412", status: "queued" } }],
      }),
      R("Menu sync status / errors", "GET", "/api/v1/delivery/aggregators/:aggregatorId/sync-status", { status: "planned", desc: "Per-item rejection reasons — usually a missing photo or an unmapped category." }),
      R("Open / close the store", "POST", "/api/v1/delivery/aggregators/:aggregatorId/store-status", { status: "planned", desc: "Emergency close when the kitchen is overwhelmed — stops new aggregator orders without disconnecting.", body: { branchId: "{{branchId}}", open: false, reason: "kitchen_overloaded", reopenAt: "2026-08-17T15:00:00+03:00" } }),
      R("Aggregator reconciliation", "GET", "/api/v1/delivery/aggregators/:aggregatorId/reconciliation", { status: "planned", query: DATE_RANGE, desc: "Partner-reported orders and payouts against what OCTOPUS recorded. The gap is the dispute list." }),
      R("Commission & payout report", "GET", "/api/v1/delivery/aggregators/payouts", { status: "planned", query: [...DATE_RANGE, ...PAGING] }),
    ]),
  ]
);

module.exports = { inventory, customers, marketing, delivery };
