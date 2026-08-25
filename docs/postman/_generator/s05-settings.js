"use strict";
const { R, F, LIST, PAGING, SEARCH, BRANCH, DATE_RANGE, T_OK, T_LIST, T_CREATED } = require("./lib");

// ============================================================
// 14 — Settings
// ============================================================
const settings = F(
  "14 · Settings",
  "Business profile, branches, devices, roles, tax profile and modules.\n\nCore Settings is module #1 for a reason — branches and roles are the keys everything else is scoped by.",
  [
    F("Business & legal entity", "", [
      R("Get business profile", "GET", "/api/v1/settings/business", {
        status: "planned",
        screen: "pages/settings/business",
        source: "mock-settings-business.ts — businessProfile",
        tests: T_OK,
        examples: [
          {
            name: "Success",
            body: {
              legalName: "شركة برجر هاوس التجارية", tradeName: "Burger House", entityType: "Company",
              crNumber: "1010123456", vatNumber: "310123456700003", nationalAddress: "RRRA2929, Riyadh 12345",
              phone: "+966112223344", email: "info@burgerhouse.sa", website: "https://burgerhouse.sa",
              logoUrl: "/assets/logo.svg", timezone: "Asia/Riyadh", calendar: "Gregorian",
              numberFormat: "1,234.56", weekStart: "Sunday", defaultLocale: "ar", currency: "SAR",
            },
          },
        ],
      }),
      R("Update business profile", "PUT", "/api/v1/settings/business", { status: "planned", body: { tradeName: "Burger House", entityType: "Company", crNumber: "1010123456", vatNumber: "310123456700003", timezone: "Asia/Riyadh", calendar: "Gregorian", numberFormat: "1,234.56", weekStart: "Sunday", defaultLocale: "ar" } }),
      R("Upload the logo", "POST", "/api/v1/settings/business/logo", { status: "planned", formdata: [{ key: "file", type: "file", src: [], desc: "SVG or PNG. Printed on receipts and tax invoices." }] }),
      R("List legal entities", "GET", "/api/v1/settings/legal-entities", { status: "planned", desc: "A group can hold several CRs; each branch belongs to one, and the CR/VAT on the invoice follows the branch." }),
      R("Create a legal entity", "POST", "/api/v1/settings/legal-entities", { status: "planned", body: { legalName: "شركة برجر هاوس للمطاعم", crNumber: "1010998877", vatNumber: "310998877600003", nationalAddress: "JJDA1122, Jeddah 23456" }, tests: T_CREATED }),
      R("Update a legal entity", "PATCH", "/api/v1/settings/legal-entities/:entityId", { status: "planned", body: { nationalAddress: "JJDA1122, Jeddah 23456" } }),
    ]),

    F("Branches & sections", "", [
      R("List branches", "GET", "/api/v1/settings/branches", {
        status: "planned",
        screen: "pages/settings/branches",
        source: "mock-settings-branches.ts — branches",
        query: [...PAGING, ...SEARCH, { key: "status", value: "Active,Inactive" }, { key: "type", value: "Dine-in,Cloud Kitchen,Drive-thru,Kiosk" }],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                {
                  id: "branch-riyadh-olaya", name: "Riyadh - Olaya", nameAr: "الرياض - العليا", type: "Dine-in", status: "Active",
                  city: "Riyadh", address: "Olaya Street, Riyadh", phone: "+966112223344", legalEntityId: "ent-01",
                  seats: 120, sectionsCount: 4, tablesCount: 28,
                  hours: { sun: { open: "12:00", close: "01:00", closed: false }, fri: { open: "13:30", close: "02:00", closed: false } },
                  geo: { lat: 24.6941, lng: 46.6857 },
                },
              ],
            },
          },
        ],
      }),
      R("Branch KPI strip", "GET", "/api/v1/settings/branches/stats", { status: "planned", source: "mock-settings-branches.ts — branchKpis" }),
      R("Get a branch", "GET", "/api/v1/settings/branches/:branchId", { status: "planned" }),
      R("Create a branch", "POST", "/api/v1/settings/branches", {
        status: "planned",
        body: { name: "Riyadh - Malqa", nameAr: "الرياض - الملقا", type: "Dine-in", city: "Riyadh", address: "Al Malqa, Riyadh", phone: "+966112229988", legalEntityId: "ent-01", seats: 90, geo: { lat: 24.8117, lng: 46.6191 }, hours: { sun: { open: "12:00", close: "01:00", closed: false } } },
        tests: T_CREATED,
      }),
      R("Update a branch", "PATCH", "/api/v1/settings/branches/:branchId", { status: "planned", body: { phone: "+966112229900", seats: 100 } }),
      R("Activate / deactivate a branch", "POST", "/api/v1/settings/branches/:branchId/status", { status: "planned", desc: "A deactivated branch stops accepting orders on every channel but keeps its history.", body: { status: "Inactive", reason: "renovation" } }),
      R("Set opening hours", "PUT", "/api/v1/settings/branches/:branchId/hours", { status: "planned", desc: "Per weekday, with a `closed` flag. Friday usually opens after Jumu'ah.", body: { sun: { open: "12:00", close: "01:00", closed: false }, fri: { open: "13:30", close: "02:00", closed: false }, sat: { open: "12:00", close: "01:00", closed: false } } }),
      R("List sections", "GET", "/api/v1/settings/branches/:branchId/sections", { status: "planned", desc: "Main Hall, Terrace, Family Section, Private Rooms — the same zones the floor plan uses." }),
      R("Create a section", "POST", "/api/v1/settings/branches/:branchId/sections", { status: "planned", body: { name: "Terrace", nameAr: "التراس", capacity: 40, smoking: true, familyOnly: false } }),
      R("Update a section", "PATCH", "/api/v1/settings/branches/:branchId/sections/:sectionId", { status: "planned", body: { capacity: 48 } }),
      R("Delete a section", "DELETE", "/api/v1/settings/branches/:branchId/sections/:sectionId", { status: "planned" }),
      R("List tables in a section", "GET", "/api/v1/settings/branches/:branchId/sections/:sectionId/tables", { status: "planned" }),
    ]),

    F("Devices & printers", "", [
      R("List devices", "GET", "/api/v1/settings/devices", {
        status: "planned",
        screen: "pages/settings/devices",
        source: "mock-settings-devices.ts — devices",
        query: [...LIST, { key: "type", value: "POS Terminal,Receipt Printer,Kitchen Printer,KDS Screen,Card Reader,Kiosk,Label Printer" }, { key: "status", value: "Online,Offline,Needs Attention" }],
        tests: T_LIST,
        examples: [
          { name: "Success", body: { data: [{ id: "dev-pos-olaya-01", name: "POS 1 — Olaya", type: "POS Terminal", status: "Online", branchId: "branch-riyadh-olaya", model: "Sunmi T2", serial: "SN-99231", ipAddress: "192.168.1.42", appVersion: "2.4.1", lastSeenAt: "2026-08-17T07:44:00Z", batteryPct: null }] } }],
        }),
      R("Device KPI strip", "GET", "/api/v1/settings/devices/stats", { status: "planned", source: "mock-settings-devices.ts — deviceKpis" }),
      R("Register a device", "POST", "/api/v1/settings/devices", { status: "planned", desc: "Returns a short pairing code typed into the device.", body: { name: "POS 2 — Olaya", type: "POS Terminal", branchId: "{{branchId}}", model: "Sunmi T2" }, examples: [{ name: "Created", code: 201, body: { id: "dev-pos-olaya-02", pairingCode: "4K2P-9N", expiresInSeconds: 600 } }] }),
      R("Update a device", "PATCH", "/api/v1/settings/devices/:deviceId", { status: "planned", body: { name: "POS 2 — Olaya (bar)", branchId: "{{branchId}}" } }),
      R("Unpair a device", "DELETE", "/api/v1/settings/devices/:deviceId", { status: "planned" }),
      R("Send a test print", "POST", "/api/v1/settings/devices/:deviceId/test-print", { status: "planned", body: { kind: "receipt" } }),
      R("Printer routing rules", "GET", "/api/v1/settings/devices/printer-routing", { status: "planned", desc: "Which menu categories print to which kitchen printer, and which printer handles customer receipts." }),
      R("Update printer routing", "PUT", "/api/v1/settings/devices/printer-routing", { status: "planned", body: { branchId: "{{branchId}}", rules: [{ printerId: "dev-printer-kitchen-01", categoryIds: ["cat-main", "cat-lunch"] }, { printerId: "dev-printer-bar-01", categoryIds: ["cat-drinks"] }] } }),
      R("Receipt template", "GET", "/api/v1/settings/devices/receipt-template", { status: "planned", desc: "Header, footer, logo toggle, VAT breakdown and the ZATCA QR block — bilingual." }),
      R("Update receipt template", "PUT", "/api/v1/settings/devices/receipt-template", { status: "planned", body: { showLogo: true, headerAr: "برجر هاوس", footerAr: "شكراً لزيارتكم", showZatcaQr: true, showVatBreakdown: true, paperWidthMm: 80 } }),
      R("Push a device command", "POST", "/api/v1/settings/devices/:deviceId/command", { status: "planned", desc: "Remote reboot, force menu refresh, or push an app update.", body: { command: "refresh_menu" } }),
    ]),

    F("Roles & permissions", "", [
      R("List roles", "GET", "/api/v1/settings/roles", {
        status: "planned",
        screen: "pages/settings/roles",
        source: "mock-settings-roles.ts — roles, permissionModules, permissionActions",
        desc: "System roles (owner, branch_manager, cashier, waiter, kitchen) plus any custom role. The matrix is module × action (View / Create / Edit / Delete / Approve).",
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "role-owner", name: "Owner", system: true, usersCount: 1, permissions: { Orders: { View: true, Create: true, Edit: true, Delete: true, Approve: true }, Finance: { View: true, Create: true, Edit: true, Delete: true, Approve: true } } },
                { id: "role-cashier", name: "Cashier", system: true, usersCount: 9, permissions: { Orders: { View: true, Create: true, Edit: true, Delete: false, Approve: false }, Finance: { View: false, Create: false, Edit: false, Delete: false, Approve: false } } },
              ],
            },
          },
        ],
      }),
      R("Permission matrix reference", "GET", "/api/v1/settings/permissions", { status: "planned", desc: "The full list of modules and actions the matrix is built from — so the UI never invents a permission the backend doesn't check." }),
      R("Create a custom role", "POST", "/api/v1/settings/roles", { status: "planned", body: { name: "Shift Supervisor", basedOn: "role-cashier", permissions: { Orders: { View: true, Create: true, Edit: true, Delete: true, Approve: true }, Inventory: { View: true, Create: false, Edit: false, Delete: false, Approve: false } } }, tests: T_CREATED }),
      R("Update role permissions", "PUT", "/api/v1/settings/roles/:roleId/permissions", { status: "planned", desc: "System roles are read-only — 403 on those.", body: { permissions: { Orders: { View: true, Create: true, Edit: true, Delete: false, Approve: true } } } }),
      R("Delete a role", "DELETE", "/api/v1/settings/roles/:roleId", { status: "planned", desc: "409 while users are still assigned to it." }),
      R("List console users", "GET", "/api/v1/settings/users", { status: "planned", query: [...LIST, { key: "roleId", value: "" }], desc: "Who can sign in, with their role and branch scope. Distinct from employees — a kitchen employee may have no login.", tests: T_LIST }),
      R("Invite a user", "POST", "/api/v1/settings/users/invite", { status: "planned", body: { email: "manager.jeddah@burgerhouse.sa", name: "Nawaf Al-Zahrani", roleId: "role-branch-manager", branchIds: ["branch-jeddah-corniche"] } }),
      R("Update a user's role / scope", "PATCH", "/api/v1/settings/users/:userId", { status: "planned", body: { roleId: "role-branch-manager", branchIds: ["branch-jeddah-corniche", "branch-dammam-corniche"] } }),
      R("Suspend a user", "POST", "/api/v1/settings/users/:userId/suspend", { status: "planned", body: { reason: "left_company" } }),
      R("Resend an invite", "POST", "/api/v1/settings/users/:userId/resend-invite", { status: "planned", body: {} }),
    ]),

    F("Tax profile (ZATCA)", "", [
      R("Get VAT profile", "GET", "/api/v1/settings/tax/vat-profile", {
        status: "planned",
        screen: "pages/settings/tax",
        source: "mock-settings-tax.ts — vatProfile",
        tests: T_OK,
        examples: [
          { name: "Success", body: { vatNumber: "310123456700003", registeredName: "شركة برجر هاوس التجارية", filingFrequency: "Monthly", registeredOn: "2021-01-01", complianceStatus: "Verified", pricesIncludeVat: true } },
        ],
      }),
      R("Update VAT profile", "PUT", "/api/v1/settings/tax/vat-profile", { status: "planned", body: { vatNumber: "310123456700003", filingFrequency: "Monthly", pricesIncludeVat: true } }),
      R("List tax rates", "GET", "/api/v1/settings/tax/rates", { status: "planned", source: "mock-settings-tax.ts — taxRates", desc: "Standard 15% · Zero Rated · Exempt · Reverse Charge. Each menu category maps to one." }),
      R("Create a tax rate", "POST", "/api/v1/settings/tax/rates", { status: "planned", body: { name: "Standard 15%", type: "Standard", ratePct: 15, isDefault: true } }),
      R("Update a tax rate", "PATCH", "/api/v1/settings/tax/rates/:rateId", { status: "planned", body: { isDefault: true } }),
      R("Invoice numbering & settings", "GET", "/api/v1/settings/tax/invoice-settings", { status: "planned", source: "mock-settings-tax.ts — invoiceSettings", desc: "Prefix, sequence, reset policy and which counterparty details are mandatory." }),
      R("Update invoice settings", "PUT", "/api/v1/settings/tax/invoice-settings", { status: "planned", body: { prefix: "INV-2026-", nextNumber: 8813, resetAnnually: true, requireBuyerVatForStandard: true } }),
      R("ZATCA integration status", "GET", "/api/v1/settings/tax/zatca/status", {
        status: "planned",
        source: "mock-settings-tax.ts — zatcaStatus",
        desc: "Environment (Production / Simulation), CSID validity, onboarding checklist progress. `zatcaCsidValidUntil` drives the renewal warning.",
        examples: [{ name: "Success", body: { environment: "Production", onboarded: true, csidSerial: "1-OCTOPUS|2-BH|3-88231", csidValidUntil: "2027-03-14", complianceStatus: "Verified", lastCheckedAt: "2026-08-17T03:00:00Z" } }],
      }),
      R("ZATCA onboarding checklist", "GET", "/api/v1/settings/tax/zatca/checklist", { status: "planned", source: "mock-settings-tax.ts — zatcaChecklist", desc: "CSR generated → compliance CSID issued → compliance checks passed → production CSID issued." }),
      R("Generate a CSR", "POST", "/api/v1/settings/tax/zatca/csr", { status: "planned", desc: "Step 1 of Phase 2 onboarding. The CSR carries the VAT number, CR, branch name and the device's common name.", body: { branchId: "{{branchId}}", commonName: "Burger House Olaya POS 1", environment: "Production" } }),
      R("Submit the OTP & request CSID", "POST", "/api/v1/settings/tax/zatca/csid", { status: "planned", desc: "The OTP comes from the merchant's Fatoora portal and is valid for one hour.", body: { otp: "123456", environment: "Production" } }),
      R("Renew the CSID", "POST", "/api/v1/settings/tax/zatca/csid/renew", { status: "planned", body: { otp: "123456" } }),
      R("Run compliance checks", "POST", "/api/v1/settings/tax/zatca/compliance-check", { status: "planned", desc: "Sends the six sample documents ZATCA requires before issuing a production CSID.", body: { environment: "Simulation" } }),
      R("Switch environment", "POST", "/api/v1/settings/tax/zatca/environment", { status: "planned", desc: "Simulation for testing, Production for real invoices. Switching invalidates the current CSID.", body: { environment: "Simulation" } }),
    ]),

    F("Modules & restaurant type", "", [
      R("Get enabled modules", "GET", "/api/v1/settings/modules", { status: "planned", screen: "pages/settings/modules", source: "mock-settings-modules.ts — moduleCards, packCards", desc: "Which of the 12 modules this business has on, and the pack it sits in. Drives sidebar visibility.", tests: T_OK }),
      R("Enable / disable a module", "POST", "/api/v1/settings/modules/:moduleId/toggle", { status: "planned", desc: "Disabling hides the sidebar group but keeps the data. Core Settings and ZATCA cannot be disabled.", body: { enabled: true } }),
      R("Change restaurant type", "PUT", "/api/v1/settings/business-type", { status: "planned", desc: "Changing type re-suggests modules but never removes one already in use.", body: { businessType: "fine_dining" } }),
    ]),

    F("Notifications & alerts", "", [
      R("Get alert rules", "GET", "/api/v1/settings/alerts", { status: "planned", desc: "Which events notify whom, on which channel — low stock, ZATCA rejection, failed payment, late order, over-limit house account." }),
      R("Update an alert rule", "PUT", "/api/v1/settings/alerts/:alertId", { status: "planned", body: { enabled: true, channels: ["whatsapp", "in_app"], recipients: ["role-owner"], threshold: { lateOrderMinutes: 45 } } }),
      R("Notification preferences", "GET", "/api/v1/settings/notifications/preferences", { status: "planned" }),
      R("Update notification preferences", "PUT", "/api/v1/settings/notifications/preferences", { status: "planned", body: { dailyDigest: true, digestAtLocalTime: "08:00", quietHours: { from: "23:00", to: "07:00" } } }),
    ]),

    F("Audit & data", "", [
      R("Audit log", "GET", "/api/v1/settings/audit-log", {
        status: "planned",
        query: [...PAGING, ...DATE_RANGE, { key: "actorId", value: "" }, { key: "action", value: "" }, { key: "resource", value: "order,invoice,employee" }],
        desc: "Every privileged action: voids, discounts, price changes, permission edits, payroll approvals. Retained for the audit period ZATCA requires.",
        tests: T_LIST,
        examples: [
          { name: "Success", body: { data: [{ id: "aud-99231", at: "2026-08-16T21:14:00Z", actor: "Nawaf Al-Zahrani", actorId: "usr-014", action: "order.line_voided", resource: "#OC-3388", before: { lines: 4 }, after: { lines: 3 }, reason: "wrong_item", ip: "94.56.1.22" }] } },
        ],
      }),
      R("Export the audit log", "POST", "/api/v1/settings/audit-log/export", { status: "planned", body: { format: "csv", dateFrom: "2026-08-01", dateTo: "2026-08-17" } }),
      R("Request a full data export", "POST", "/api/v1/settings/data/export", { status: "planned", desc: "Portability — everything the tenant owns as JSON + the invoice XMLs.", body: { scope: "all", format: "json" } }),
      R("Data retention policy", "GET", "/api/v1/settings/data/retention", { status: "planned", desc: "How long orders, customer PII and invoices are kept. Invoices are pinned to 6 years by Saudi law regardless of the setting." }),
      R("Update retention policy", "PUT", "/api/v1/settings/data/retention", { status: "planned", body: { orderYears: 3, customerPiiYears: 3, invoiceYears: 6 } }),
    ]),
  ]
);

// ============================================================
// 15 — Integration Hub
// ============================================================
const integrations = F(
  "15 · Integration Hub",
  "Per-provider connection status, credentials, sync logs and webhooks.\n\nOCTOPUS's whole pitch is that the merchant keeps the tools they trust — Moyasar, Qoyod, Foodics, Jisr — and this hub is where those connections live.",
  [
    F("Connections", "", [
      R("List integrations", "GET", "/api/v1/integrations", {
        status: "planned",
        screen: "pages/settings/integrations · pages/integrations (stub)",
        source: "mock-settings.ts — integrations, integrationKpis",
        query: [{ key: "category", value: "payments,accounting,pos,hr,messaging,tax,delivery" }, { key: "status", value: "Connected,Error,Not Connected,Syncing" }],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "moyasar", name: "Moyasar", category: "payments", status: "Connected", environment: "Live", lastSyncAt: "2026-08-17T07:00:00Z", health: "ok" },
                { id: "qoyod", name: "Qoyod", category: "accounting", status: "Connected", environment: "Live", lastSyncAt: "2026-08-17T03:00:00Z", health: "ok" },
                { id: "foodics", name: "Foodics", category: "pos", status: "Error", environment: "Live", lastSyncAt: "2026-08-15T03:00:00Z", health: "error", error: "Token expired" },
                { id: "jisr", name: "Jisr", category: "hr", status: "Not Connected", environment: null, lastSyncAt: null, health: "unknown" },
              ],
              meta: { connected: 6, errors: 1, notConnected: 4 },
            },
          },
        ],
      }),
      R("Integration KPI strip", "GET", "/api/v1/integrations/stats", { status: "planned", source: "mock-settings.ts — integrationKpis" }),
      R("Get integration detail", "GET", "/api/v1/integrations/:integrationId", {
        status: "planned",
        screen: "pages/integration-detail (stub)",
        source: "mock-settings.ts — integrationDetails",
        desc: "Credentials (masked), scopes, sync schedule, field mappings and recent events.",
      }),
      R("Connect (API key)", "POST", "/api/v1/integrations/:integrationId/connect", {
        status: "planned",
        desc: "Secrets are written to the vault and only ever returned masked.",
        body: { environment: "Live", credentials: { apiKey: "{{integrationApiKey}}", secretKey: "{{integrationSecret}}", merchantId: "88231" }, syncSchedule: "hourly" },
      }),
      R("Connect (OAuth) · start", "POST", "/api/v1/integrations/:integrationId/oauth/start", { status: "planned", desc: "Returns the provider's consent URL plus the state token.", body: { redirectUri: "https://app.octopus.sa/settings/integrations/callback" }, examples: [{ name: "Success", body: { authorizeUrl: "https://accounts.qoyod.com/oauth/authorize?client_id=...&state=st_9f2c", state: "st_9f2c" } }] }),
      R("Connect (OAuth) · callback", "POST", "/api/v1/integrations/:integrationId/oauth/callback", { status: "planned", body: { code: "auth_code_from_provider", state: "st_9f2c" } }),
      R("Test the connection", "POST", "/api/v1/integrations/:integrationId/test", { status: "planned", desc: "Round-trips a harmless read against the provider and reports latency.", body: {}, examples: [{ name: "Success", body: { ok: true, latencyMs: 412, checkedAt: "2026-08-17T08:00:00Z", scopes: ["read:invoices", "write:journals"] } }] }),
      R("Rotate credentials", "POST", "/api/v1/integrations/:integrationId/rotate", { status: "planned", body: { credentials: { apiKey: "{{integrationApiKey}}" } } }),
      R("Disconnect", "POST", "/api/v1/integrations/:integrationId/disconnect", { status: "planned", desc: "Revokes tokens and stops all scheduled syncs. Historical data is kept.", body: { purgeCredentials: true } }),
      R("Update sync settings", "PUT", "/api/v1/integrations/:integrationId/settings", { status: "planned", body: { syncSchedule: "hourly", direction: "bidirectional", conflictPolicy: "octopus_wins", environment: "Live" } }),
      R("Field mappings", "GET", "/api/v1/integrations/:integrationId/mappings", { status: "planned", desc: "e.g. Foodics product ids ↔ OCTOPUS menu item ids. Unmapped entities are what break a sync." }),
      R("Update field mappings", "PUT", "/api/v1/integrations/:integrationId/mappings", { status: "planned", body: { mappings: [{ localId: "item-kabsa", remoteId: "fdc-prod-8821" }] } }),
      R("Trigger a manual sync", "POST", "/api/v1/integrations/:integrationId/sync", { status: "planned", body: { scope: "menu", direction: "push", since: "2026-08-16T00:00:00Z" }, examples: [{ name: "Queued", code: 202, body: { jobId: "isync-8812", status: "queued" } }] }),
    ]),

    F("Events & logs", "", [
      R("Integration event log", "GET", "/api/v1/integrations/:integrationId/events", {
        status: "planned",
        source: "mock-settings.ts — IntegrationEvent",
        query: [...PAGING, ...DATE_RANGE, { key: "kind", value: "sync,error,test,webhook" }],
        tests: T_LIST,
        examples: [
          { name: "Success", body: { data: [{ id: "evt-99231", kind: "error", at: "2026-08-15T03:00:12Z", summary: "Token expired", detail: "401 from Foodics /v5/products", retryable: true }] } },
        ],
      }),
      R("Retry a failed event", "POST", "/api/v1/integrations/:integrationId/events/:eventId/retry", { status: "planned", body: {} }),
      R("Raw request/response payload", "GET", "/api/v1/integrations/:integrationId/events/:eventId/payload", { status: "planned", desc: "Secrets redacted. This is what a merchant forwards to the provider's support." }),
    ]),

    F("Outbound webhooks", "", [
      R("List webhook endpoints", "GET", "/api/v1/webhooks/endpoints", { status: "planned", desc: "Merchant-owned URLs that OCTOPUS posts events to.", tests: T_LIST }),
      R("Create a webhook endpoint", "POST", "/api/v1/webhooks/endpoints", {
        status: "planned",
        body: { url: "https://merchant.example/hooks/octopus", events: ["order.created", "order.status_changed", "invoice.cleared", "payment.captured"], secret: "{{webhookSecret}}", active: true },
        tests: T_CREATED,
      }),
      R("Update a webhook endpoint", "PATCH", "/api/v1/webhooks/endpoints/:endpointId", { status: "planned", body: { events: ["order.created", "invoice.rejected"], active: true } }),
      R("Delete a webhook endpoint", "DELETE", "/api/v1/webhooks/endpoints/:endpointId", { status: "planned" }),
      R("Available event types", "GET", "/api/v1/webhooks/event-types", { status: "planned", desc: "The catalogue a merchant subscribes to." }),
      R("Delivery attempts", "GET", "/api/v1/webhooks/endpoints/:endpointId/deliveries", { status: "planned", query: [...PAGING, { key: "status", value: "delivered,failed" }], desc: "Status code, response time and the retry schedule per attempt." }),
      R("Redeliver an event", "POST", "/api/v1/webhooks/deliveries/:deliveryId/redeliver", { status: "planned", body: {} }),
      R("Send a test event", "POST", "/api/v1/webhooks/endpoints/:endpointId/test", { status: "planned", body: { event: "order.created" } }),
    ]),

    F("Inbound webhooks (providers → OCTOPUS)", "Endpoints the providers call. Listed so they can be replayed during development — do not add the `Authorization` header; each one authenticates with its own provider signature.", [
      R("Moyasar payment webhook", "POST", "/api/v1/webhooks/in/moyasar", {
        status: "planned",
        noAuth: true,
        headers: [{ key: "X-Moyasar-Signature", value: "{{moyasarSignature}}", desc: "HMAC of the raw body. Reject the request if it does not verify." }],
        body: { type: "payment_paid", data: { id: "moy_9f21c4b", status: "paid", amount: 18600, currency: "SAR", metadata: { orderId: "OC-3391" } } },
      }),
      R("Tabby / Tamara BNPL webhook", "POST", "/api/v1/webhooks/in/bnpl/:provider", { status: "planned", noAuth: true, body: { event: "order.authorized", order_id: "OC-3391", amount: "186.00", currency: "SAR" } }),
      R("HungerStation order webhook", "POST", "/api/v1/webhooks/in/aggregators/hungerstation", {
        status: "planned",
        noAuth: true,
        desc: "Creates a normal Order with `channel: aggregator`. The aggregator's own id is kept as `externalRef` for reconciliation.",
        body: { event: "order.placed", externalRef: "HS-99231", storeId: "HS-88213", customer: { name: "Faisal A.", phone: "+966501112233" }, items: [{ sku: "BRG-001", quantity: 1, priceSar: 180 }], totalSar: 180, placedAt: "2026-08-17T07:41:00Z" },
      }),
      R("Jahez order webhook", "POST", "/api/v1/webhooks/in/aggregators/jahez", { status: "planned", noAuth: true, body: { event: "order.placed", externalRef: "JZ-4412", items: [], totalSar: 96 } }),
      R("Foodics POS sync webhook", "POST", "/api/v1/webhooks/in/foodics", { status: "planned", noAuth: true, body: { event: "product.updated", data: { id: "fdc-prod-8821", name: "Chicken Kabsa", price: 98 } } }),
      R("WhatsApp Cloud API webhook", "POST", "/api/v1/webhooks/in/whatsapp", {
        status: "planned",
        noAuth: true,
        desc: "Inbound customer replies and message status callbacks. Meta also GETs this URL once with `hub.challenge` for verification.",
        body: { object: "whatsapp_business_account", entry: [{ id: "88231", changes: [{ field: "messages", value: { messages: [{ from: "966501112233", type: "text", text: { body: "وين طلبي؟" } }] } }] }] },
      }),
      R("ZATCA clearance callback", "POST", "/api/v1/webhooks/in/zatca", { status: "planned", noAuth: true, desc: "Asynchronous clearance results for invoices submitted in batch mode.", body: { invoiceUuid: "3cf1a2b8-7d44-4c11-9f0e-52a1c6d9b0a7", status: "CLEARED", warnings: [], clearedAt: "2026-08-17T04:12:03Z" } }),
    ]),
  ]
);

// ============================================================
// 16 — Messaging
// ============================================================
const messaging = F(
  "16 · Messaging (shared service)",
  "WhatsApp, SMS and email as one send API. Module #11 is deliberately *not* a standalone screen — reservations, campaigns, feedback replies and alerts all call through here.\n\nSaudi context: WhatsApp is the primary channel; templates need Meta approval before they can be sent outside a 24-hour session window.",
  [
    R("List message templates", "GET", "/api/v1/messaging/templates", {
      status: "planned",
      query: [...PAGING, { key: "channel", value: "whatsapp,sms,email" }, { key: "status", value: "approved,pending,rejected" }],
      tests: T_LIST,
      examples: [
        { name: "Success", body: { data: [{ id: "tpl_reservation_reminder", name: "Reservation reminder", channel: "whatsapp", status: "approved", language: "ar", category: "utility", variables: ["name", "time", "branch"], bodyAr: "مرحباً {{1}}، نذكّرك بحجزك الساعة {{2}} في فرع {{3}}." }] } },
      ],
    }),
    R("Create a template", "POST", "/api/v1/messaging/templates", { status: "planned", desc: "WhatsApp templates go to Meta for approval and can be rejected — status starts `pending`.", body: { name: "Order ready", channel: "whatsapp", language: "ar", category: "utility", bodyAr: "طلبك {{1}} جاهز للاستلام من فرع {{2}}.", variables: ["orderId", "branch"] }, tests: T_CREATED }),
    R("Template approval status", "GET", "/api/v1/messaging/templates/:templateId", { status: "planned" }),
    R("Send a message", "POST", "/api/v1/messaging/send", {
      status: "planned",
      desc: "Blocked with 403 when the recipient has not consented on that channel, and with 422 inside quiet hours for marketing categories.",
      body: { to: "+966501234567", channel: "whatsapp", templateId: "tpl_order_ready", variables: { orderId: "#OC-3391", branch: "الرياض - العليا" }, customerId: "{{customerId}}", category: "utility" },
      examples: [
        { name: "Queued", code: 202, body: { messageId: "msg-99231", status: "queued", channel: "whatsapp", costSar: 0.25 } },
        { name: "No consent", code: 403, body: { error: { code: "consent_missing", message: "Customer has not opted in to WhatsApp marketing." } } },
      ],
    }),
    R("Send in bulk", "POST", "/api/v1/messaging/send-bulk", { status: "planned", desc: "What campaigns use internally. Rate-limited and consent-filtered per recipient.", body: { segmentId: "seg-vip", channel: "whatsapp", templateId: "tpl_ramadan_launch", variables: {}, scheduledFor: "2026-08-20T18:00:00+03:00" } }),
    R("Message log", "GET", "/api/v1/messaging/messages", { status: "planned", query: [...PAGING, ...DATE_RANGE, { key: "channel", value: "whatsapp,sms,email" }, { key: "status", value: "queued,sent,delivered,read,failed" }, { key: "customerId", value: "" }], tests: T_LIST }),
    R("Get a message", "GET", "/api/v1/messaging/messages/:messageId", { status: "planned", desc: "Delivery timeline and the provider's error code when it failed." }),
    R("Inbound conversations", "GET", "/api/v1/messaging/conversations", { status: "planned", query: [...PAGING, { key: "status", value: "open,closed" }], desc: "Customer replies grouped into threads — 'where is my order?' arrives here." }),
    R("Reply in a conversation", "POST", "/api/v1/messaging/conversations/:conversationId/reply", { status: "planned", desc: "Free-form text is allowed inside the 24-hour session window; outside it a template is required.", body: { text: "طلبك في الطريق، السائق يبعد ٧ دقائق." } }),
    R("Close a conversation", "POST", "/api/v1/messaging/conversations/:conversationId/close", { status: "planned", body: { resolution: "answered" } }),
    R("Messaging usage & cost", "GET", "/api/v1/messaging/usage", { status: "planned", query: DATE_RANGE, desc: "Messages by channel and category with the SAR cost — the number that decides whether a campaign is worth sending." }),
    R("Sender identities", "GET", "/api/v1/messaging/senders", { status: "planned", desc: "WhatsApp business number, SMS sender ID (alphanumeric registration is mandatory in KSA) and the verified email domain." }),
  ]
);

module.exports = { settings, integrations, messaging };
