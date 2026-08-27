"use strict";
const { R, F, LIST, PAGING, SEARCH, BRANCH, DATE_RANGE, RANGE_PRESET, T_OK, T_LIST, T_CREATED } = require("./lib");

// ============================================================
// 11 — Finance
// ============================================================
const finance = F(
  "11 · Finance, Payments & ZATCA",
  "Transactions, tax invoices, settlements, accounting sync and house accounts.\n\n**ZATCA Phase 2 is the compliance backbone.** B2B (Standard) invoices need *clearance* — ZATCA signs them before they are valid. B2C (Simplified) invoices need *reporting* within 24 hours. Both carry a UUID, a hash chain (`previousInvoiceHash`), a cryptographic stamp and a TLV QR code.",
  [
    F("Payments & transactions", "", [
      R("List transactions", "GET", "/api/v1/finance/payments", {
        status: "planned",
        screen: "pages/finance/payments · pages/payments-log (stub)",
        source: "mock-finance.ts — transactionRows",
        query: [
          ...LIST,
          ...DATE_RANGE,
          { key: "status", value: "Captured,Authorized,Refunded,Partially Refunded,Failed,Chargeback" },
          { key: "method", value: "Mada,Apple Pay,STC Pay,Visa,Mastercard,Tabby,Tamara,Cash" },
          { key: "gateway", value: "Moyasar,Tap,HyperPay,PayTabs" },
        ],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                {
                  id: "pay-77412", order: "#OC-3391", method: "Mada", gateway: "Moyasar", amount: 186, fee: 3.91, net: 182.09,
                  status: "Captured", time: "2026-08-17T07:39:00Z", cardMask: "•••• 4417", threeDs: "Authenticated", linkedInvoice: "INV-2026-08812",
                  gatewayResponse: { reference: "moy_9f21c4b", authCode: "021884", rrn: "622914008812", processorMessage: "Approved" },
                },
              ],
              meta: { page: 1, pageSize: 25, total: 3482 },
            },
          },
        ],
      }),
      R("Payments KPI strip", "GET", "/api/v1/finance/payments/stats", { status: "planned", source: "mock-finance.ts — paymentStats", query: [...BRANCH, ...DATE_RANGE], desc: "Gross, fees, net, failure rate — plus the failed/chargeback count that drives the red badge." }),
      R("Get a transaction", "GET", "/api/v1/finance/payments/:paymentId", { status: "planned", desc: "Includes the raw gateway response — reference, auth code, RRN, processor message — which is what a merchant quotes when they call the gateway's support." }),
      R("Create a payment link", "POST", "/api/v1/finance/payment-links", {
        status: "planned",
        desc: "Short-lived hosted checkout sent over WhatsApp/SMS. Used for deposits, house-account settlement and phone orders.",
        body: { amountSar: 200, description: "Reservation deposit — 20 Aug", customerId: "{{customerId}}", channel: "whatsapp", expiresInMinutes: 60, reference: "rsv-1042" },
        examples: [{ name: "Created", code: 201, body: { id: "plink-3312", url: "https://pay.octopus.sa/l/3312", expiresAt: "2026-08-17T09:00:00Z", status: "pending" } }],
      }),
      R("Capture an authorization", "POST", "/api/v1/finance/payments/:paymentId/capture", { status: "planned", body: { amountSar: 186 } }),
      R("Void an authorization", "POST", "/api/v1/finance/payments/:paymentId/void", { status: "planned", body: { reason: "order_cancelled" } }),
      R("Refund a payment", "POST", "/api/v1/finance/payments/:paymentId/refund", {
        status: "planned",
        desc: "Partial refunds allowed. Issuing a credit note is the default because ZATCA requires one for any reduction of a reported invoice.",
        body: { amountSar: 42, reason: "quality_complaint", issueCreditNote: true },
      }),
      R("Retry a failed payment", "POST", "/api/v1/finance/payments/:paymentId/retry", { status: "planned", body: {} }),
      R("Dispute / chargeback detail", "GET", "/api/v1/finance/payments/:paymentId/dispute", { status: "planned", desc: "Reason code, evidence deadline and what has been submitted." }),
      R("Submit chargeback evidence", "POST", "/api/v1/finance/payments/:paymentId/dispute/evidence", { status: "planned", formdata: [{ key: "file", type: "file", src: [], desc: "Receipt, delivery proof, or signed POD." }, { key: "note", value: "Signed proof of delivery attached." }] }),
      R("Payment gateway configuration", "GET", "/api/v1/finance/gateways", { status: "planned", desc: "Which gateways are enabled, their fee rates, and which is the default per channel." }),
      R("Update gateway configuration", "PUT", "/api/v1/finance/gateways/:gatewayId", { status: "planned", body: { enabled: true, isDefault: true, publishableKey: "pk_live_...", secretKeyRef: "vault://moyasar/secret", methods: ["Mada", "Visa", "Apple Pay"] } }),
      R("Export transactions", "POST", "/api/v1/finance/payments/export", { status: "planned", body: { format: "xlsx", dateFrom: "2026-08-01", dateTo: "2026-08-17", gateway: null } }),
    ]),

    F("Tax invoices (ZATCA)", "", [
      R("List tax invoices", "GET", "/api/v1/finance/tax-invoices", {
        status: "planned",
        screen: "pages/finance/tax-invoices · pages/invoices (stub)",
        source: "mock-finance.ts — zatcaInvoiceRows",
        query: [
          ...LIST,
          ...DATE_RANGE,
          { key: "type", value: "Standard,Simplified,Credit Note" },
          { key: "zatcaStatus", value: "Cleared,Reported,Pending,Warning,Rejected" },
          { key: "requiredFlow", value: "clearance,reporting" },
        ],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                {
                  id: "INV-2026-08812", type: "Standard", buyer: "Al Majd Trading Co.", buyerVatNo: "310123456700003",
                  net: 8200, vat: 1230, total: 9430, zatcaStatus: "Cleared", requiredFlow: "clearance", hoursSinceIssued: 3,
                  uuid: "3cf1a2b8-7d44-4c11-9f0e-52a1c6d9b0a7", timestamp: "2026-08-17T04:12:00Z",
                  xmlHash: "NWZlNTU2...", previousInvoiceHash: "MGQxYzk4...",
                  cryptographicStamp: { signed: true, signedAt: "2026-08-17T04:12:03Z" },
                  zatcaMessage: "Invoice cleared successfully",
                },
              ],
              meta: { page: 1, pageSize: 25, total: 4821, rejectedCount: 3 },
            },
          },
        ],
      }),
      R("Invoice KPI strip", "GET", "/api/v1/finance/tax-invoices/stats", { status: "planned", source: "mock-finance.ts — invoiceStats", desc: "Issued, cleared, reported, pending and rejected counts plus total VAT." }),
      R("Get a tax invoice", "GET", "/api/v1/finance/tax-invoices/:invoiceId", { status: "planned", screen: "pages/invoice-detail (stub)", desc: "Full record including the signed XML reference and the ZATCA response payload." }),
      R("Issue a tax invoice", "POST", "/api/v1/finance/tax-invoices", {
        status: "planned",
        desc: "Standard (B2B) invoices require the buyer's VAT number and go through clearance. Simplified (B2C) are reported after the fact.",
        body: {
          type: "Standard", orderId: "{{orderId}}",
          buyer: { name: "Al Majd Trading Co.", vatNumber: "310123456700003", address: "King Fahd Rd, Riyadh", crNumber: "1010123456" },
          lines: [{ description: "Catering — set menu A", quantity: 40, unitPriceSar: 205, vatRate: 0.15 }],
          netSar: 8200, vatSar: 1230, totalSar: 9430, issuedAt: "2026-08-17T04:12:00Z",
        },
        tests: T_CREATED,
      }),
      R("Submit to ZATCA (clearance)", "POST", "/api/v1/finance/tax-invoices/:invoiceId/clear", { status: "planned", desc: "Synchronous call to the Fatoora clearance API. A rejected invoice cannot be given to the buyer.", body: {} }),
      R("Report to ZATCA (simplified)", "POST", "/api/v1/finance/tax-invoices/:invoiceId/report", { status: "planned", desc: "Must happen within 24 hours of issuance. The queue below shows what is at risk.", body: {} }),
      R("Retry rejected submissions", "POST", "/api/v1/finance/tax-invoices/retry-rejected", { status: "planned", desc: "Bulk retry after fixing the underlying data (usually a bad VAT number or a broken hash chain).", body: { invoiceIds: ["INV-2026-08790", "INV-2026-08801"] } }),
      R("Pending submission queue", "GET", "/api/v1/finance/tax-invoices/queue", { status: "planned", desc: "Everything not yet cleared/reported, oldest first, with hours remaining before the 24-hour deadline." }),
      R("Get the QR code", "GET", "/api/v1/finance/tax-invoices/:invoiceId/qr", { status: "planned", desc: "Base64 TLV payload — seller name, VAT number, timestamp, total, VAT total, XML hash, stamp — rendered on the printed receipt." }),
      R("Download the signed XML", "GET", "/api/v1/finance/tax-invoices/:invoiceId/xml", { status: "planned", desc: "UBL 2.1 XML with the cryptographic stamp. This is the legal artifact ZATCA can demand for 6 years." }),
      R("Download the PDF/A-3", "GET", "/api/v1/finance/tax-invoices/:invoiceId/pdf", { status: "planned", desc: "PDF/A-3 with the XML embedded, which is what B2B buyers expect." }),
      R("Issue a credit note", "POST", "/api/v1/finance/tax-invoices/:invoiceId/credit-note", { status: "planned", desc: "Links back through `creditNoteOf`. Required for any refund on a reported invoice.", body: { reason: "goods_returned", lines: [{ description: "Catering — set menu A", quantity: 4, unitPriceSar: 205, vatRate: 0.15 }] } }),
      R("Send an invoice to the buyer", "POST", "/api/v1/finance/tax-invoices/:invoiceId/send", { status: "planned", body: { channel: "email", to: "accounts@almajd.example" } }),
      R("Verify the hash chain", "GET", "/api/v1/finance/tax-invoices/chain-check", { status: "planned", query: [...DATE_RANGE, ...BRANCH], desc: "Walks `previousInvoiceHash` across the period. A break here is what makes ZATCA reject everything downstream." }),
    ]),

    F("Settlements & reconciliation", "", [
      R("List settlements", "GET", "/api/v1/finance/settlements", {
        status: "planned",
        screen: "pages/finance/settlements",
        source: "mock-finance.ts — settlementRows",
        query: [...LIST, ...DATE_RANGE, { key: "status", value: "Pending,Received,Reconciled,Discrepancy" }, { key: "gateway", value: "Moyasar,Tap,HyperPay,PayTabs" }],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "stl-0412", gateway: "Moyasar", periodFrom: "2026-08-10", periodTo: "2026-08-16", transactionsCount: 842, grossSar: 61240.5, feesSar: 1286.05, netSar: 59954.45, expectedSar: 59954.45, varianceSar: 0, status: "Reconciled", payoutDate: "2026-08-18", bankReference: "MOY-PAY-99231" },
              ],
            },
          },
        ],
      }),
      R("Settlement KPI strip", "GET", "/api/v1/finance/settlements/stats", { status: "planned", source: "mock-finance.ts — settlementStats" }),
      R("Get a settlement", "GET", "/api/v1/finance/settlements/:settlementId", { status: "planned", desc: "Includes the per-transaction lines so a variance can be traced to a single payment." }),
      R("Import a settlement file", "POST", "/api/v1/finance/settlements/import", { status: "planned", formdata: [{ key: "file", type: "file", src: [], desc: "The gateway's CSV/XLSX payout report." }, { key: "gateway", value: "Moyasar" }] }),
      R("Auto-reconcile", "POST", "/api/v1/finance/settlements/:settlementId/reconcile", { status: "planned", desc: "Matches settlement lines to recorded payments. Anything unmatched surfaces as a discrepancy.", body: { tolerance: 0.01 } }),
      R("List discrepancies", "GET", "/api/v1/finance/settlements/:settlementId/discrepancies", { status: "planned", desc: "Missing payouts, unexpected fees, duplicated captures." }),
      R("Resolve a discrepancy", "POST", "/api/v1/finance/settlements/:settlementId/discrepancies/:lineId/resolve", { status: "planned", body: { resolution: "gateway_fee_adjustment", note: "Confirmed with Moyasar support, ticket 88231" } }),
      R("Cash-up vs settlement", "GET", "/api/v1/finance/settlements/cash-position", { status: "planned", query: [...BRANCH, ...DATE_RANGE], desc: "Counted cash from POS till closes against banked cash — the other half of reconciliation." }),
    ]),

    F("Accounting sync", "", [
      R("List accounting providers", "GET", "/api/v1/finance/accounting/providers", {
        status: "planned",
        screen: "pages/finance/accounting",
        source: "mock-finance.ts — accountingProviders",
        desc: "Qoyod · Wafeq · Daftra. Only one is the active journal target at a time.",
        tests: T_LIST,
        examples: [{ name: "Success", body: { data: [{ id: "qoyod", name: "Qoyod", status: "Connected", isActive: true, lastSyncAt: "2026-08-17T03:00:00Z", pendingEntries: 4 }, { id: "wafeq", name: "Wafeq", status: "Not Connected", isActive: false }] } }] ,
      }),
      R("Connect a provider", "POST", "/api/v1/finance/accounting/providers/:providerId/connect", { status: "planned", body: { apiKey: "{{accountingApiKey}}", organizationId: "org-88213", syncMode: "daily_summary" } }),
      R("Disconnect a provider", "POST", "/api/v1/finance/accounting/providers/:providerId/disconnect", { status: "planned", body: {} }),
      R("Chart of accounts (from provider)", "GET", "/api/v1/finance/accounting/ledger-accounts", { status: "planned", source: "mock-finance.ts — ledgerAccountOptions", desc: "Pulled live from Qoyod/Wafeq so the mapping dropdowns show the merchant's real accounts." }),
      R("Category → ledger mappings", "GET", "/api/v1/finance/accounting/mappings", {
        status: "planned",
        source: "mock-finance.ts — accountMappingRows",
        desc: "Every revenue category, payment method, tax code and expense type must map to a ledger account before the journal can post. `unmappedCategoryCount` is the blocker badge.",
        tests: T_LIST,
        examples: [{ name: "Success", body: { data: [{ id: "map-01", category: "Food Sales", type: "revenue", ledgerAccount: "4100 · Food Revenue", status: "Mapped" }, { id: "map-07", category: "Tabby settlements", type: "payment", ledgerAccount: null, status: "Unmapped" }], meta: { unmapped: 1 } } }],
      }),
      R("Set a mapping", "PUT", "/api/v1/finance/accounting/mappings/:mappingId", { status: "planned", body: { ledgerAccount: "4100 · Food Revenue" } }),
      R("Push the sales journal", "POST", "/api/v1/finance/accounting/sync", {
        status: "planned",
        desc: "Posts the daily summary journal — revenue by category, VAT payable, payment clearing accounts, discounts and waste. Rejected while any mapping is missing.",
        body: { date: "2026-08-16", kinds: ["Sales Journal", "Payment", "Refund", "VAT"], dryRun: false },
        examples: [{ name: "Queued", code: 202, body: { jobId: "acc-sync-2201", entries: 5, status: "queued" } }],
      }),
      R("Sync log", "GET", "/api/v1/finance/accounting/sync-log", {
        status: "planned",
        source: "mock-finance.ts — syncLogRows",
        query: [...PAGING, ...DATE_RANGE, { key: "type", value: "Sales Journal,Payment,Refund,VAT" }, { key: "status", value: "Synced,Pending,Failed" }],
        tests: T_LIST,
      }),
      R("Retry a failed sync entry", "POST", "/api/v1/finance/accounting/sync-log/:entryId/retry", { status: "planned", body: {} }),
      R("VAT return figures", "GET", "/api/v1/finance/accounting/vat-return", { status: "planned", query: [{ key: "period", value: "2026-Q3", on: true }], desc: "Output VAT, input VAT and net payable for the filing period — the numbers typed into the ZATCA portal." }),
    ]),

    F("House accounts", "", [
      R("List house accounts", "GET", "/api/v1/finance/house-accounts", {
        status: "planned",
        screen: "pages/finance/house-accounts",
        source: "mock-finance.ts — houseAccountRows",
        query: [...LIST, { key: "status", value: "Active,On Hold,Over Limit,Closed" }, { key: "terms", value: "Net 15,Net 30,Net 60" }],
        desc: "Corporate clients who eat now and pay monthly — common for hospitals, ministries and nearby offices.",
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "ha-0021", companyName: "Al Majd Trading Co.", vatNumber: "310123456700003", contact: "Nasser Al-Otaibi", creditLimitSar: 50000, balanceSar: 18420, availableSar: 31580, terms: "Net 30", status: "Active", aging: { current: 12200, d30: 4100, d60: 2120, d90plus: 0 } },
              ],
            },
          },
        ],
      }),
      R("House account KPI strip", "GET", "/api/v1/finance/house-accounts/stats", { status: "planned", source: "mock-finance.ts — houseAccountStats", desc: "Total receivable, overdue, over-limit accounts, average days-to-pay." }),
      R("Create a house account", "POST", "/api/v1/finance/house-accounts", { status: "planned", body: { companyName: "Al Majd Trading Co.", vatNumber: "310123456700003", crNumber: "1010123456", contactName: "Nasser Al-Otaibi", contactPhone: "+966112223344", email: "accounts@almajd.example", creditLimitSar: 50000, terms: "Net 30", allowedBranchIds: ["branch-riyadh-olaya"] }, tests: T_CREATED }),
      R("Update a house account", "PATCH", "/api/v1/finance/house-accounts/:accountId", { status: "planned", body: { creditLimitSar: 75000, terms: "Net 60" } }),
      R("Charge to the account", "POST", "/api/v1/finance/house-accounts/:accountId/charges", { status: "planned", desc: "Rejected with 409 when the charge would exceed the credit limit.", body: { orderId: "{{orderId}}", amountSar: 1840, reference: "PO-88231", authorisedBy: "Nasser" } }),
      R("Record a payment", "POST", "/api/v1/finance/house-accounts/:accountId/payments", { status: "planned", body: { amountSar: 12200, method: "bank_transfer", reference: "SABB-99231", receivedOn: "2026-08-17" } }),
      R("Account statement", "GET", "/api/v1/finance/house-accounts/:accountId/statement", { status: "planned", query: DATE_RANGE, desc: "Opening balance, charges, payments, closing balance — the PDF emailed monthly." }),
      R("Send the statement", "POST", "/api/v1/finance/house-accounts/:accountId/statement/send", { status: "planned", body: { channel: "email", to: "accounts@almajd.example", period: "2026-08" } }),
      R("Aging report", "GET", "/api/v1/finance/house-accounts/aging", { status: "planned", desc: "Current / 30 / 60 / 90+ buckets across all accounts." }),
      R("Put an account on hold", "POST", "/api/v1/finance/house-accounts/:accountId/hold", { status: "planned", body: { reason: "overdue_90_days" } }),
      R("Close an account", "POST", "/api/v1/finance/house-accounts/:accountId/close", { status: "planned", body: { reason: "contract_ended" } }),
    ]),
  ]
);

// ============================================================
// 12 — Staff / HR
// ============================================================
const staff = F(
  "12 · Staff & HR",
  "Employees, scheduling, attendance, leave, tips and payroll inputs.\n\nOCTOPUS does not run payroll — it produces the inputs (hours, overtime, tips, deductions) that Jisr or ZenHR consume. Saudi specifics matter here: iqama expiry, GOSI, and the Saudization ratio.",
  [
    F("Employees", "", [
      R("List employees", "GET", "/api/v1/staff/employees", {
        status: "planned",
        screen: "pages/staff/employees · pages/employees (stub)",
        source: "mock-staff.ts — employeeRows",
        query: [...LIST, { key: "role", value: "Owner,Branch Manager,Cashier,Waiter,Kitchen,Driver" }, { key: "status", value: "On Shift,Off Duty,On Leave,Absent" }, { key: "contractType", value: "Full-time,Part-time,Seasonal" }],
        tests: `pm.test("200 OK", () => pm.response.to.have.status(200));
const b = pm.response.json();
if (b.data && b.data.length) pm.environment.set("employeeId", b.data[0].id);`,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "emp-014", name: "Fahad Al-Ghamdi", role: "Kitchen", branch: "Riyadh - Olaya", status: "On Shift", contractType: "Full-time", phone: "+966501234567", hiredOn: "2024-03-11", nationality: "SA", iqamaExpiresOn: null, baseSalarySar: 4200 },
              ],
              meta: { page: 1, pageSize: 25, total: 24 },
            },
          },
        ],
      }),
      R("Staff KPI strip", "GET", "/api/v1/staff/stats", { status: "planned", source: "mock-staff.ts — staffStats", desc: "Headcount, on shift now, on leave, Saudization ratio, expiring iqamas." }),
      R("Get an employee", "GET", "/api/v1/staff/employees/:employeeId", { status: "planned", desc: "Profile, documents, contract, pay rate, emergency contact and linked console user." }),
      R("Create an employee", "POST", "/api/v1/staff/employees", {
        status: "planned",
        body: { name: "Fahad Al-Ghamdi", nameAr: "فهد الغامدي", role: "Kitchen", branchId: "{{branchId}}", phone: "+966501234567", email: "fahad@burgerhouse.sa", contractType: "Full-time", hiredOn: "2026-09-01", nationality: "SA", nationalId: "1098765432", iqamaExpiresOn: null, baseSalarySar: 4200, housingAllowanceSar: 700, bankIban: "SA0380000000608010167519", gosiRegistered: true },
        tests: T_CREATED,
      }),
      R("Update an employee", "PATCH", "/api/v1/staff/employees/:employeeId", { status: "planned", body: { role: "Branch Manager", baseSalarySar: 6500 } }),
      R("Deactivate / terminate", "POST", "/api/v1/staff/employees/:employeeId/terminate", { status: "planned", body: { lastWorkingDay: "2026-09-30", reason: "resignation", finalSettlementSar: 8420 } }),
      R("Invite as a console user", "POST", "/api/v1/staff/employees/:employeeId/invite", { status: "planned", desc: "Sends a sign-in invite and assigns a role from Settings → Roles & Permissions.", body: { roleId: "role-branch-manager", email: "fahad@burgerhouse.sa" } }),
      R("Upload a document", "POST", "/api/v1/staff/employees/:employeeId/documents", { status: "planned", formdata: [{ key: "file", type: "file", src: [] }, { key: "kind", value: "iqama", desc: "iqama · passport · contract · health_card · certificate" }, { key: "expiresOn", value: "2027-02-11" }] }),
      R("Expiring documents", "GET", "/api/v1/staff/documents/expiring", { status: "planned", query: [{ key: "withinDays", value: "60", on: true }], desc: "Iqama and health-card expiry is a legal exposure — this is the reminder feed." }),
    ]),

    F("Schedule & shifts", "", [
      R("Get the schedule", "GET", "/api/v1/staff/schedule", {
        status: "planned",
        screen: "pages/staff/schedule · pages/shifts (stub)",
        source: "mock-staff.ts — scheduleShifts",
        query: [{ key: "weekOf", value: "2026-08-09", on: true }, ...BRANCH, { key: "employeeId", value: "" }],
        desc: "Week grid of shifts. Morning / Evening / Night have fixed windows in `SHIFT_TYPE_TIME`.",
        tests: T_OK,
        examples: [
          {
            name: "Success",
            body: {
              weekOf: "2026-08-09",
              shifts: [{ id: "sh-2201", employeeId: "emp-014", employeeName: "Fahad Al-Ghamdi", date: "2026-08-10", type: "Morning", start: "07:00", end: "15:00", hours: 8, branchId: "branch-riyadh-olaya", published: true }],
              warnings: [{ kind: "understaffed", date: "2026-08-14", staffed: 4, required: 6 }, { kind: "overtime_risk", employeeId: "emp-021", weeklyHours: 51, max: 48 }],
            },
          },
        ],
      }),
      R("Create a shift", "POST", "/api/v1/staff/shifts", { status: "planned", body: { employeeId: "{{employeeId}}", date: "2026-08-18", type: "Evening", branchId: "{{branchId}}", note: "" }, tests: T_CREATED }),
      R("Update a shift", "PATCH", "/api/v1/staff/shifts/:shiftId", { status: "planned", body: { type: "Night", employeeId: "{{employeeId}}" } }),
      R("Delete a shift", "DELETE", "/api/v1/staff/shifts/:shiftId", { status: "planned" }),
      R("Publish the week", "POST", "/api/v1/staff/schedule/publish", { status: "planned", desc: "Notifies every affected employee over WhatsApp. Blocked while a day is below `REQUIRED_MIN_STAFF_PER_DAY`.", body: { weekOf: "2026-08-16", branchId: "{{branchId}}", notify: true } }),
      R("Copy last week", "POST", "/api/v1/staff/schedule/copy", { status: "planned", body: { fromWeekOf: "2026-08-09", toWeekOf: "2026-08-16", branchId: "{{branchId}}" } }),
      R("Auto-generate a schedule", "POST", "/api/v1/staff/schedule/generate", { status: "planned", desc: "Fills the week from forecast covers, availability and the 48-hour weekly cap.", body: { weekOf: "2026-08-23", branchId: "{{branchId}}", respectMaxWeeklyHours: true } }),
      R("Coverage warnings", "GET", "/api/v1/staff/schedule/warnings", { status: "planned", query: [{ key: "weekOf", value: "2026-08-16", on: true }, ...BRANCH], desc: "Understaffed days and employees projected past 48 hours." }),
      R("Request a shift swap", "POST", "/api/v1/staff/shifts/:shiftId/swap-request", { status: "planned", body: { withEmployeeId: "emp-021", reason: "family_commitment" } }),
      R("Approve a swap", "POST", "/api/v1/staff/shifts/swaps/:swapId/approve", { status: "planned", body: {}, roles: "`owner`, `branch_manager`" }),
      R("Employee availability", "GET", "/api/v1/staff/employees/:employeeId/availability", { status: "planned" }),
      R("Set employee availability", "PUT", "/api/v1/staff/employees/:employeeId/availability", { status: "planned", body: { weekly: { sun: ["07:00-15:00"], mon: ["07:00-15:00"], tue: [], wed: ["15:00-23:00"], thu: ["15:00-23:00"], fri: [], sat: ["07:00-15:00"] } } }),
    ]),

    F("Attendance", "", [
      R("Attendance records", "GET", "/api/v1/staff/attendance", {
        status: "planned",
        screen: "pages/staff/attendance",
        source: "mock-staff.ts — attendanceRecords",
        query: [...LIST, ...DATE_RANGE, { key: "status", value: "Present,Late,Absent,On Leave,Holiday" }],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "att-8812", employeeId: "emp-014", employeeName: "Fahad Al-Ghamdi", date: "2026-08-16", status: "Late", scheduledStart: "07:00", punches: [{ kind: "in", at: "07:14" }, { kind: "out", at: "15:03" }], workedHours: 7.8, lateMinutes: 14, overtimeHours: 0, branch: "Riyadh - Olaya" },
              ],
            },
          },
        ],
      }),
      R("Attendance KPI strip", "GET", "/api/v1/staff/attendance/stats", { status: "planned", source: "mock-staff.ts — attendanceStats", desc: "Attendance rate, late count, absent count, total overtime hours." }),
      R("Clock in / out", "POST", "/api/v1/staff/attendance/punch", {
        status: "planned",
        desc: "From a POS tablet or the staff app. `geo` and `deviceId` exist to stop buddy-punching.",
        body: { employeeId: "{{employeeId}}", kind: "in", at: "2026-08-17T07:02:00+03:00", deviceId: "dev-pos-olaya-01", geo: { lat: 24.6941, lng: 46.6857 }, method: "pin" },
      }),
      R("Correct a punch", "POST", "/api/v1/staff/attendance/:recordId/correct", {
        status: "planned",
        desc: "Reasons come from `correctionReasons`. Manager-only and fully audited — this is the line that moves someone's pay.",
        body: { punches: [{ kind: "in", at: "07:00" }, { kind: "out", at: "15:03" }], reason: "Forgot to clock in", approvedBy: "{{userId}}" },
        roles: "`owner`, `branch_manager`",
      }),
      R("Approve overtime", "POST", "/api/v1/staff/attendance/:recordId/approve-overtime", { status: "planned", body: { hours: 1.5, note: "Covered a late delivery run" } }),
      R("Timesheet for a period", "GET", "/api/v1/staff/attendance/timesheet", { status: "planned", query: [...DATE_RANGE, ...BRANCH, { key: "employeeId", value: "" }], desc: "Aggregated hours per employee — the bridge into payroll." }),
      R("Export attendance", "POST", "/api/v1/staff/attendance/export", { status: "planned", body: { format: "xlsx", dateFrom: "2026-08-01", dateTo: "2026-08-16" } }),
    ]),

    F("Leave", "", [
      R("List leave requests", "GET", "/api/v1/staff/leave", {
        status: "planned",
        screen: "pages/leave (stub) — data lives in mock-staff.ts",
        source: "mock-staff.ts — leaveRequestRows",
        query: [...LIST, { key: "type", value: "Annual,Sick,Unpaid,Emergency" }, { key: "status", value: "Pending,Approved,Rejected" }],
        tests: T_LIST,
      }),
      R("Request leave", "POST", "/api/v1/staff/leave", { status: "planned", body: { employeeId: "{{employeeId}}", type: "Annual", from: "2026-09-10", to: "2026-09-20", reason: "Family trip", attachmentUrl: null }, tests: T_CREATED }),
      R("Approve leave", "POST", "/api/v1/staff/leave/:leaveId/approve", { status: "planned", desc: "Rejected if approving would drop a scheduled day below minimum staffing.", body: { note: "" }, roles: "`owner`, `branch_manager`" }),
      R("Reject leave", "POST", "/api/v1/staff/leave/:leaveId/reject", { status: "planned", body: { reason: "peak_season" } }),
      R("Cancel a leave request", "POST", "/api/v1/staff/leave/:leaveId/cancel", { status: "planned", body: {} }),
      R("Leave balances", "GET", "/api/v1/staff/leave/balances", { status: "planned", query: [{ key: "employeeId", value: "" }], desc: "Saudi labour law gives 21 days annual rising to 30 after five years — the accrual is tracked here." }),
      R("Public holidays calendar", "GET", "/api/v1/staff/leave/holidays", { status: "planned", query: [{ key: "year", value: "2026", on: true }], desc: "Eid Al-Fitr, Eid Al-Adha, National Day, Founding Day — Hijri-derived dates shift each year." }),
    ]),

    F("Tips", "", [
      R("List tip records", "GET", "/api/v1/staff/tips", {
        status: "planned",
        screen: "pages/staff/tips",
        source: "mock-staff.ts — tipRecords",
        query: [...LIST, ...DATE_RANGE, { key: "status", value: "Pending,Distributed,Paid Out" }],
        tests: T_LIST,
      }),
      R("Tips KPI strip", "GET", "/api/v1/staff/tips/stats", { status: "planned", source: "mock-staff.ts — tipsStats" }),
      R("Get tip pool rules", "GET", "/api/v1/staff/tips/rules", {
        status: "planned",
        source: "mock-staff.ts — defaultTipSplitRules",
        desc: "Method (Individual / Pooled by branch / Pooled by shift) and the percentage split across Waiters, Kitchen, Runners and Hosts.",
        examples: [{ name: "Success", body: { method: "Pooled by shift", split: [{ role: "Waiters", pct: 55 }, { role: "Kitchen", pct: 25 }, { role: "Runners", pct: 12 }, { role: "Hosts", pct: 8 }] } }],
      }),
      R("Update tip pool rules", "PUT", "/api/v1/staff/tips/rules", { status: "planned", body: { method: "Pooled by shift", split: [{ role: "Waiters", pct: 55 }, { role: "Kitchen", pct: 25 }, { role: "Runners", pct: 12 }, { role: "Hosts", pct: 8 }] } }),
      R("Run a tip distribution", "POST", "/api/v1/staff/tips/distribute", { status: "planned", desc: "Applies the rules to the period's collected tips and produces a per-employee amount.", body: { periodFrom: "2026-08-10", periodTo: "2026-08-16", branchId: "{{branchId}}" } }),
      R("Mark tips paid out", "POST", "/api/v1/staff/tips/payout", { status: "planned", body: { tipRecordIds: ["tip-8812", "tip-8813"], method: "with_salary", paidOn: "2026-08-25" } }),
    ]),

    F("Payroll inputs", "", [
      R("List payroll periods", "GET", "/api/v1/staff/payroll/periods", {
        status: "planned",
        screen: "pages/staff/payroll",
        source: "mock-staff.ts — payrollPeriods",
        desc: "Draft → Approved → Exported → Locked. A locked period cannot be edited even by an owner.",
        tests: T_LIST,
      }),
      R("Payroll rows for a period", "GET", "/api/v1/staff/payroll/periods/:periodId/rows", {
        status: "planned",
        source: "mock-staff.ts — payrollRowsByPeriod",
        query: PAGING,
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { employeeId: "emp-014", name: "Fahad Al-Ghamdi", baseSar: 4200, housingSar: 700, overtimeHours: 6, overtimeSar: 315, tipsSar: 410, deductionsSar: 120, gosiEmployeeSar: 420, netSar: 5085, absentDays: 0, lateMinutes: 42 },
              ],
              meta: { totalNetSar: 118420, employees: 24 },
            },
          },
        ],
      }),
      R("Recalculate a period", "POST", "/api/v1/staff/payroll/periods/:periodId/recalculate", { status: "planned", desc: "Pulls fresh timesheet, tips and deduction data.", body: {} }),
      R("Add an adjustment", "POST", "/api/v1/staff/payroll/periods/:periodId/adjustments", { status: "planned", body: { employeeId: "{{employeeId}}", kind: "bonus", amountSar: 500, reason: "Employee of the month" } }),
      R("Approve a period", "POST", "/api/v1/staff/payroll/periods/:periodId/approve", { status: "planned", body: { note: "" }, roles: "`owner`" }),
      R("Export to Jisr / ZenHR", "POST", "/api/v1/staff/payroll/periods/:periodId/export", { status: "planned", desc: "Pushes the inputs to the HR provider or downloads the WPS-compatible file.", body: { target: "jisr", format: "api" } }),
      R("Lock a period", "POST", "/api/v1/staff/payroll/periods/:periodId/lock", { status: "planned", body: {} }),
      R("Payroll audit trail", "GET", "/api/v1/staff/payroll/periods/:periodId/audit", { status: "planned", source: "mock-staff.ts — PayrollAuditEntry", desc: "Every recalculation, adjustment and approval with actor and timestamp." }),
    ]),
  ]
);

// ============================================================
// 13 — Reports
// ============================================================
const reports = F(
  "13 · Reports & Analytics",
  "Sales, margin, channels, customers, compliance and scheduled delivery.\n\nEvery report takes the same `range` / `dateFrom` / `dateTo` / `branchId` contract and every one supports an async export.",
  [
    F("Sales", "", [
      R("Sales report", "GET", "/api/v1/reports/sales", {
        status: "planned",
        screen: "pages/reports/sales",
        source: "mock-reports.ts — salesKpiBase, salesTrend, salesByBranch, dailySales",
        query: [...RANGE_PRESET, ...DATE_RANGE, ...BRANCH, { key: "compare", value: "previous_period" }],
        tests: T_OK,
        examples: [
          {
            name: "Success",
            body: {
              kpis: { grossSar: 1842000, netSar: 1601739, orders: 28412, avgBasketSar: 64.8, deltaPct: 9.2 },
              trend: { series: [{ id: "gross", label: "Gross" }, { id: "net", label: "Net" }], points: [{ label: "W1", gross: 312, net: 271 }, { label: "W2", gross: 348, net: 302 }], axis: { max: 400, ticks: [0, 80, 160, 240, 320, 400] } },
              byBranch: [{ branch: "Riyadh - Olaya", revenueSar: 682000, pct: 37 }],
              dayParts: { breakfast: 8, lunch: 34, dinner: 46, lateNight: 12 },
            },
          },
        ],
      }),
      R("Daily sales breakdown", "GET", "/api/v1/reports/sales/daily", { status: "planned", source: "mock-reports.ts — dailySales", query: [...DATE_RANGE, ...BRANCH, ...PAGING], tests: T_LIST }),
      R("Sales by day part", "GET", "/api/v1/reports/sales/day-parts", { status: "planned", source: "mock-reports.ts — salesDayParts", query: [...RANGE_PRESET, ...BRANCH] }),
      R("Sales by branch", "GET", "/api/v1/reports/sales/by-branch", { status: "planned", source: "mock-reports.ts — salesByBranch", query: RANGE_PRESET }),
      R("Top selling items", "GET", "/api/v1/reports/sales/top-items", { status: "planned", query: [...RANGE_PRESET, ...BRANCH, { key: "limit", value: "20", on: true }, { key: "metric", value: "revenue", desc: "`revenue` · `quantity` · `margin`." }] }),
      R("Hourly heatmap", "GET", "/api/v1/reports/sales/hourly", { status: "planned", query: [...RANGE_PRESET, ...BRANCH], desc: "Day-of-week × hour grid — what staffing decisions are built on." }),
    ]),

    F("Costs & margin", "", [
      R("Margin report", "GET", "/api/v1/reports/margin", {
        status: "planned",
        screen: "pages/reports/margin",
        source: "mock-reports.ts — marginKpiBase, marginTrend, costStructure, marginByItem",
        query: [...RANGE_PRESET, ...DATE_RANGE, ...BRANCH],
        tests: T_OK,
        examples: [
          {
            name: "Success",
            body: {
              kpis: { grossMarginPct: 68.4, foodCostPct: 31.6, labourCostPct: 22.1, primeCostPct: 53.7 },
              trend: { points: [{ label: "W1", revenue: 312, cogs: 98, margin: 214 }], axis: { max: 400, ticks: [0, 100, 200, 300, 400] } },
              costStructure: { food: 31.6, labour: 22.1, rent: 9.4, utilities: 3.8, other: 5.2 },
              byItem: [{ itemId: "item-kabsa", nameEn: "Chicken Kabsa", revenueSar: 184000, costSar: 40200, marginPct: 78.2, unitsSold: 1878 }],
            },
          },
        ],
      }),
      R("Margin by item", "GET", "/api/v1/reports/margin/by-item", { status: "planned", source: "mock-reports.ts — marginByItem", query: [...RANGE_PRESET, ...PAGING, { key: "belowTargetOnly", value: "true" }] }),
      R("Cost structure", "GET", "/api/v1/reports/margin/cost-structure", { status: "planned", source: "mock-reports.ts — costStructure", query: [...RANGE_PRESET, ...BRANCH] }),
      R("Menu engineering matrix", "GET", "/api/v1/reports/margin/menu-engineering", { status: "planned", desc: "Stars / plough-horses / puzzles / dogs — popularity against margin. Drives the 'raise this price' recommendation.", query: [...RANGE_PRESET, ...BRANCH] }),
    ]),

    F("Channels", "", [
      R("Channel performance", "GET", "/api/v1/reports/channels", {
        status: "planned",
        screen: "pages/reports/channels",
        source: "mock-reports.ts — channelPerformance, channelMix, channelBranchRevenue",
        query: [...RANGE_PRESET, ...DATE_RANGE, ...BRANCH],
        tests: T_OK,
        examples: [
          { name: "Success", body: { channels: [{ channel: "Delivery", orders: 9840, revenueSar: 612000, avgBasketSar: 62.2, commissionSar: 91800, netSar: 520200, deltaPct: 18.2 }], mix: { dineIn: 40.8, delivery: 31.7, takeaway: 17.6, aggregator: 9.9 } } }],
        }),
      R("Channel × branch matrix", "GET", "/api/v1/reports/channels/matrix", { status: "planned", source: "mock-reports.ts — channelBranchRevenue", query: RANGE_PRESET }),
      R("Aggregator commission impact", "GET", "/api/v1/reports/channels/commission", { status: "planned", query: [...RANGE_PRESET], desc: "What each aggregator actually costs after commission — the number that justifies pushing the own app." }),
    ]),

    F("Customers", "", [
      R("Customer analytics", "GET", "/api/v1/reports/customers", {
        status: "planned",
        screen: "pages/reports/customers",
        source: "mock-reports.ts — customerKpiBase, newVsReturning, cohortRetention, rfmSegments, topCustomers",
        query: [...RANGE_PRESET, ...DATE_RANGE, ...BRANCH],
        tests: T_OK,
        examples: [
          { name: "Success", body: { kpis: { total: 12840, newThisPeriod: 1204, repeatRatePct: 42.8, avgLifetimeValueSar: 1840 }, newVsReturning: [{ label: "Jan", newCount: 820, returningCount: 1140 }], axis: { max: 1400, ticks: [0, 350, 700, 1050, 1400] } } }],
      }),
      R("Cohort retention", "GET", "/api/v1/reports/customers/cohorts", { status: "planned", source: "mock-reports.ts — cohortRetention, cohortMonths", desc: "M0–M6 retention grid by signup month." }),
      R("RFM segmentation", "GET", "/api/v1/reports/customers/rfm", { status: "planned", source: "mock-reports.ts — rfmSegments", desc: "Recency / frequency / monetary buckets with member counts." }),
      R("Top customers", "GET", "/api/v1/reports/customers/top", { status: "planned", source: "mock-reports.ts — topCustomers", query: [...RANGE_PRESET, { key: "limit", value: "25", on: true }] }),
      R("New vs returning", "GET", "/api/v1/reports/customers/new-vs-returning", { status: "planned", source: "mock-reports.ts — newVsReturning", query: RANGE_PRESET }),
    ]),

    F("Compliance", "", [
      R("Compliance report", "GET", "/api/v1/reports/compliance", {
        status: "planned",
        screen: "pages/reports/compliance",
        source: "mock-reports.ts — complianceKpiBase, submissionSummary, vatSummary, invoiceExceptions",
        query: [...RANGE_PRESET, ...DATE_RANGE, ...BRANCH],
        desc: "The ZATCA health check: submission success rate, VAT totals and the exception list a merchant must clear before filing.",
        tests: T_OK,
        examples: [
          {
            name: "Success",
            body: {
              kpis: { submitted: 4821, cleared: 4790, rejected: 3, warnings: 28, successRatePct: 99.4 },
              submissionsByDay: [{ date: "2026-08-16", submitted: 312, cleared: 310, rejected: 0, warnings: 2 }],
              vat: { rows: [{ category: "Standard rated 15%", netSar: 2920000, vatSar: 300000, totalSar: 3220000 }], total: { net: 2920000, vat: 300000, total: 3220000 } },
              exceptions: [{ invoiceId: "INV-2026-08790", status: "rejected", message: "Buyer VAT number failed checksum", occurredAt: "2026-08-15T11:02:00Z" }],
            },
          },
        ],
      }),
      R("VAT summary", "GET", "/api/v1/reports/compliance/vat", { status: "planned", source: "mock-reports.ts — vatSummary, vatDonut", query: [{ key: "period", value: "2026-Q3", on: true }] }),
      R("Invoice exceptions", "GET", "/api/v1/reports/compliance/exceptions", { status: "planned", source: "mock-reports.ts — invoiceExceptions", query: [...PAGING, { key: "status", value: "rejected,warning" }], tests: T_LIST }),
      R("Submission summary by day", "GET", "/api/v1/reports/compliance/submissions", { status: "planned", source: "mock-reports.ts — submissionSummary", query: DATE_RANGE }),
      R("Audit-ready export", "POST", "/api/v1/reports/compliance/audit-pack", { status: "planned", desc: "Zips the signed XMLs, the VAT summary and the hash-chain proof for a ZATCA audit.", body: { period: "2026-Q3", includeXml: true, includePdf: true } }),
    ]),

    F("Scheduled reports", "", [
      R("List scheduled reports", "GET", "/api/v1/reports/scheduled", {
        status: "planned",
        screen: "pages/reports/scheduled",
        source: "mock-reports.ts — scheduledReports",
        query: [...PAGING, { key: "status", value: "Active,Paused,Failed" }],
        tests: T_LIST,
        examples: [
          { name: "Success", body: { data: [{ id: "sch-012", name: "Weekly sales — owners", reportType: "Sales", frequency: "Weekly", format: "PDF", channel: "Email", recipients: ["owner@burgerhouse.sa"], nextRunAt: "2026-08-23T06:00:00+03:00", lastRunAt: "2026-08-16T06:00:00+03:00", status: "Active" }] } },
        ],
      }),
      R("Create a scheduled report", "POST", "/api/v1/reports/scheduled", {
        status: "planned",
        body: { name: "Daily margin — Olaya", reportType: "Margin", frequency: "Daily", format: "Excel", channel: "WhatsApp", recipients: ["+966501234567"], branchId: "{{branchId}}", runAtLocalTime: "06:00", timezone: "Asia/Riyadh" },
        tests: T_CREATED,
      }),
      R("Update a scheduled report", "PATCH", "/api/v1/reports/scheduled/:scheduleId", { status: "planned", body: { frequency: "Weekly", recipients: ["owner@burgerhouse.sa", "finance@burgerhouse.sa"] } }),
      R("Pause / resume", "POST", "/api/v1/reports/scheduled/:scheduleId/toggle", { status: "planned", body: { active: false } }),
      R("Run now", "POST", "/api/v1/reports/scheduled/:scheduleId/run", { status: "planned", body: {} }),
      R("Delivery history", "GET", "/api/v1/reports/scheduled/:scheduleId/runs", { status: "planned", query: PAGING, desc: "Each run with its status and the delivered file — a failed WhatsApp send shows here." }),
      R("Delete a scheduled report", "DELETE", "/api/v1/reports/scheduled/:scheduleId", { status: "planned" }),
    ]),

    F("Exports", "", [
      R("Request an export", "POST", "/api/v1/exports", {
        status: "planned",
        desc: "Generic async export used by every table in the console. Poll the job, then download.",
        body: { resource: "orders", format: "xlsx", filters: { dateFrom: "2026-08-01", dateTo: "2026-08-17", branchId: null }, columns: [] },
        tests: `const b = pm.response.json();
if (b.jobId) pm.environment.set("exportJobId", b.jobId);
pm.test("202 Accepted", () => pm.response.to.have.status(202));`,
        examples: [{ name: "Queued", code: 202, body: { jobId: "exp-7781", status: "queued", pollAfterSeconds: 2 } }],
      }),
      R("Export job status", "GET", "/api/v1/exports/:exportJobId", { status: "planned", examples: [{ name: "Ready", body: { jobId: "exp-7781", status: "ready", rows: 4821, downloadUrl: "https://files.octopus.sa/exports/exp-7781.xlsx", expiresAt: "2026-08-18T08:00:00Z" } }] }),
      R("Download an export", "GET", "/api/v1/exports/:exportJobId/download", { status: "planned", desc: "Redirects (302) to a signed, short-lived file URL." }),
      R("List recent exports", "GET", "/api/v1/exports", { status: "planned", query: PAGING }),
    ]),
  ]
);

module.exports = { finance, staff, reports };
