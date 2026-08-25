"use strict";
const { R, F, LIST, PAGING, BRANCH, DATE_RANGE, RANGE_PRESET, T_OK, T_LIST, T_CREATED } = require("./lib");

// ============================================================
// 00 — Platform & Health
// ============================================================
const platform = F(
  "00 · Platform & Health",
  "Liveness, build metadata and the reference data every other screen depends on (branches, channels, enums).\n\nStart here to confirm the environment variables (`baseUrl`, `tenantId`) are pointing at a reachable API.",
  [
    R("Health check", "GET", "/api/health", {
      status: "live",
      noAuth: true,
      desc: "Implemented today by `apps/mock-api/src/server.ts`. Returns `{ ok: true }`.",
      tests: `pm.test("200 OK", () => pm.response.to.have.status(200));
pm.test("ok flag", () => pm.expect(pm.response.json().ok).to.eql(true));`,
      examples: [{ name: "Healthy", body: { ok: true } }],
    }),
    R("Build info", "GET", "/api/v1/meta/version", {
      status: "planned",
      noAuth: true,
      desc: "Backend version, git sha and deployed environment — shown in Settings → About.",
      tests: T_OK,
      examples: [
        { name: "Success", body: { version: "1.0.0", commit: "a1b2c3d", environment: "local", builtAt: "2026-08-17T06:00:00Z" } },
      ],
    }),
    R("Enum catalogue", "GET", "/api/v1/meta/enums", {
      status: "planned",
      desc:
        "Every closed enum the merchant console renders as a filter chip or badge — order statuses, channels, payment methods, gateways, ZATCA statuses, staff roles, leave types, waste reasons.\n\nExists so the front-end never hardcodes a status list that drifts from the backend.",
      source: "Derived from the union types across `apps/merchant/src/shared/api/mock-*.ts`",
      tests: T_OK,
      examples: [
        {
          name: "Success",
          body: {
            orderStatus: ["New", "Preparing", "Ready", "Out for Delivery", "Completed", "Cancelled"],
            orderChannel: ["Dine-in", "Takeaway", "Delivery", "Kiosk", "Aggregator"],
            paymentMethod: ["Mada", "Apple Pay", "STC Pay", "Visa", "Mastercard", "Tabby", "Tamara", "Cash"],
            paymentGateway: ["Moyasar", "Tap", "HyperPay", "PayTabs"],
            zatcaStatus: ["Cleared", "Reported", "Pending", "Warning", "Rejected"],
            staffRole: ["Owner", "Branch Manager", "Cashier", "Waiter", "Kitchen", "Driver"],
            wasteReason: ["Expired", "Spoiled", "Prep Error", "Customer Return", "Overproduction", "Damaged in Transit"],
          },
        },
      ],
    }),
    R("Reference · branches (lookup)", "GET", "/api/v1/meta/branches", {
      status: "planned",
      desc: "Lightweight `{id,name,city}` list used to populate every branch selector in the console. The full branch record lives under Settings → Branches.",
      tests: T_LIST,
      examples: [
        {
          name: "Success",
          body: {
            data: [
              { id: "branch-riyadh-olaya", name: "Riyadh - Olaya", city: "Riyadh" },
              { id: "branch-riyadh-narjis", name: "Riyadh - Narjis", city: "Riyadh" },
              { id: "branch-jeddah-corniche", name: "Jeddah - Corniche", city: "Jeddah" },
              { id: "branch-dammam-corniche", name: "Dammam - Corniche", city: "Dammam" },
            ],
          },
        },
      ],
    }),
    R("Reference · currencies & locales", "GET", "/api/v1/meta/locales", {
      status: "planned",
      desc: "Supported UI locales (`ar`, `en`), calendar kinds (Gregorian / Hijri), number formats and week-start options. Mirrors the choices on Settings → Business.",
      tests: T_OK,
      examples: [
        {
          name: "Success",
          body: {
            locales: ["ar", "en"],
            defaultLocale: "ar",
            currency: "SAR",
            calendars: ["Gregorian", "Hijri"],
            numberFormats: ["1,234.56", "1.234,56"],
            weekStarts: ["Sunday", "Saturday"],
            timezones: ["Asia/Riyadh", "Asia/Qatar", "Asia/Dubai", "Africa/Cairo", "Asia/Baghdad"],
          },
        },
      ],
    }),
    R("Feature flags", "GET", "/api/v1/meta/feature-flags", {
      status: "planned",
      desc: "Per-tenant flags that hide unfinished screens. The sidebar already gates groups on enabled modules; this is the finer-grained switch for individual features.",
      tests: T_OK,
      examples: [
        { name: "Success", body: { kds: true, kiosk: false, houseAccounts: true, subscriptions: true, rcsMessaging: false } },
      ],
    }),
  ]
);

// ============================================================
// 01 — Auth & Session
// ============================================================
const auth = F(
  "01 · Auth & Session",
  "Sign in, token lifecycle, and the session-scoped switches (active branch, locale).\n\n**Login writes `accessToken`, `refreshToken`, `tenantId` and `userId` into the environment** via the test script, so run *Login (password)* first and every other request in this collection authenticates automatically.",
  [
    F("Sign in", "", [
      R("Login (password)", "POST", "/api/v1/auth/login", {
        status: "planned",
        noAuth: true,
        screen: "pages/login",
        desc:
          "Primary sign-in for the merchant console. The response carries the user, their role, and the businesses (tenants) the account owns — the multi-business switcher reads that list.\n\nThe test script stores the tokens into the active environment.",
        body: { email: "owner@burgerhouse.sa", password: "{{password}}", remember: true },
        tests: `pm.test("200 OK", () => pm.response.to.have.status(200));
const b = pm.response.json();
if (b.accessToken)  pm.environment.set("accessToken", b.accessToken);
if (b.refreshToken) pm.environment.set("refreshToken", b.refreshToken);
if (b.user)         pm.environment.set("userId", b.user.id);
if (b.activeTenantId) pm.environment.set("tenantId", b.activeTenantId);
pm.test("token issued", () => pm.expect(b).to.have.property("accessToken"));`,
        examples: [
          {
            name: "Success",
            body: {
              accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo",
              refreshToken: "rt_9f2c4b1e8a",
              expiresIn: 3600,
              tokenType: "Bearer",
              user: { id: "usr-001", name: "Mohammed Al-Otaibi", email: "owner@burgerhouse.sa", role: "owner", locale: "ar", passwordSet: true },
              activeTenantId: "tenant-burger-house",
              businesses: [
                { id: "tenant-burger-house", businessName: "Burger House", vertical: "restaurants", businessType: "fast_casual" },
              ],
            },
          },
          { name: "Invalid credentials", code: 401, body: { error: { code: "invalid_credentials", message: "Email or password is incorrect." } } },
        ],
      }),
      R("Login (phone + OTP) · request code", "POST", "/api/v1/auth/otp/request", {
        status: "planned",
        noAuth: true,
        desc: "Sends a 6-digit code over SMS or WhatsApp (Twilio Verify / WhatsApp Cloud API). Saudi merchants sign in by phone more often than by email.",
        body: { phone: "+966501234567", channel: "whatsapp" },
        tests: T_OK,
        examples: [{ name: "Sent", body: { requestId: "otp-req-8812", channel: "whatsapp", expiresInSeconds: 300 } }],
      }),
      R("Login (phone + OTP) · verify code", "POST", "/api/v1/auth/otp/verify", {
        status: "planned",
        noAuth: true,
        desc: "Exchanges the OTP for a token pair. Same response shape as password login.",
        body: { requestId: "otp-req-8812", code: "123456" },
        tests: `pm.test("200 OK", () => pm.response.to.have.status(200));
const b = pm.response.json();
if (b.accessToken) pm.environment.set("accessToken", b.accessToken);`,
        examples: [{ name: "Verified", body: { accessToken: "eyJ...", refreshToken: "rt_...", expiresIn: 3600 } }],
      }),
      R("Refresh token", "POST", "/api/v1/auth/refresh", {
        status: "planned",
        noAuth: true,
        desc: "Rotates the access token. The refresh token is single-use — the response returns a new one.",
        body: { refreshToken: "{{refreshToken}}" },
        tests: `const b = pm.response.json();
if (b.accessToken)  pm.environment.set("accessToken", b.accessToken);
if (b.refreshToken) pm.environment.set("refreshToken", b.refreshToken);
pm.test("200 OK", () => pm.response.to.have.status(200));`,
        examples: [{ name: "Rotated", body: { accessToken: "eyJ...new", refreshToken: "rt_new", expiresIn: 3600 } }],
      }),
      R("Login (social — Google / Apple / Microsoft)", "POST", "/api/v1/auth/oauth/:provider", {
        status: "planned",
        noAuth: true,
        screen: "pages/login · pages/onboarding/steps/account-step.tsx",
        desc:
          "Exchanges a provider-issued authorization code for a token pair, same response shape as password login. Used by the social buttons on both the sign-in screen and the onboarding account step.\n\n`:provider` is one of `google`, `apple`, `microsoft`. A first-time social sign-in always has `passwordSet: false` on the returned user — no password exists to fall back on, so the shell still offers (never forces) setting one from Settings.",
        body: { code: "auth_code_from_provider_redirect", redirectUri: "https://app.octopus.sa/auth/callback" },
        tests: `pm.test("200 OK", () => pm.response.to.have.status(200));
const b = pm.response.json();
if (b.accessToken)  pm.environment.set("accessToken", b.accessToken);
if (b.refreshToken) pm.environment.set("refreshToken", b.refreshToken);
if (b.user)         pm.environment.set("userId", b.user.id);`,
        examples: [
          {
            name: "Success",
            body: {
              accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo",
              refreshToken: "rt_9f2c4b1e8a",
              expiresIn: 3600,
              tokenType: "Bearer",
              user: { id: "usr-001", name: "Mohammed Al-Otaibi", email: "owner@burgerhouse.sa", role: "owner", locale: "ar", passwordSet: false },
              activeTenantId: "tenant-burger-house",
              businesses: [
                { id: "tenant-burger-house", businessName: "Burger House", vertical: "restaurants", businessType: "fast_casual" },
              ],
            },
          },
          { name: "Provider token invalid", code: 401, body: { error: { code: "invalid_provider_token", message: "Could not verify the code with the provider." } } },
        ],
      }),
      R("Logout", "POST", "/api/v1/auth/logout", {
        status: "planned",
        desc: "Revokes the current refresh token. The console also clears `octopus.tenants` / `octopus.activeTenantId` from localStorage.",
        body: { refreshToken: "{{refreshToken}}" },
        tests: `pm.test("204 No Content", () => pm.response.to.have.status(204));
pm.environment.unset("accessToken");`,
      }),
    ]),

    F("Password & recovery", "", [
      R("Forgot password", "POST", "/api/v1/auth/password/forgot", {
        status: "planned",
        noAuth: true,
        desc: "Always returns 202 whether or not the address exists — no account enumeration.",
        body: { email: "owner@burgerhouse.sa" },
        examples: [{ name: "Accepted", code: 202, body: { accepted: true } }],
      }),
      R("Reset password", "POST", "/api/v1/auth/password/reset", {
        status: "planned",
        noAuth: true,
        body: { token: "prt_4f81c2", newPassword: "{{newPassword}}" },
        examples: [{ name: "Reset", body: { ok: true } }],
      }),
      R("Change password (signed in)", "POST", "/api/v1/auth/password/change", {
        status: "planned",
        desc: "Requires the current password. For an account that has none yet (skipped it at signup, or signed up via a social provider), use *Set password (first time)* instead — that one has nothing to verify against.",
        body: { currentPassword: "{{password}}", newPassword: "{{newPassword}}" },
      }),
      R("Set password (first time)", "POST", "/api/v1/auth/password/set", {
        status: "planned",
        screen: "pages/set-password",
        desc:
          "For an account with `passwordSet: false` — no current password to verify, so this is not the same request as *Change password*. Onboarding's account step made the password field optional; the shell shows this screen once, blocking, right after sign-in until it succeeds. Flips `passwordSet` to `true` on the user record.",
        body: { newPassword: "{{newPassword}}" },
        tests: T_OK,
        examples: [
          { name: "Set", body: { ok: true, passwordSet: true } },
          { name: "Too short", code: 422, body: { error: { code: "password_too_short", message: "Password must be at least 8 characters." } } },
        ],
      }),
      R("List active sessions", "GET", "/api/v1/auth/sessions", {
        status: "planned",
        desc: "Devices currently holding a valid refresh token — the merchant can sign a lost tablet out.",
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "sess-1", device: "Chrome · Windows", ip: "94.56.1.10", lastSeenAt: "2026-08-17T07:40:00Z", current: true },
                { id: "sess-2", device: "iPad · POS Olaya", ip: "94.56.1.22", lastSeenAt: "2026-08-16T21:10:00Z", current: false },
              ],
            },
          },
        ],
      }),
      R("Revoke a session", "DELETE", "/api/v1/auth/sessions/:sessionId", { status: "planned" }),
      R("Two-factor · enable", "POST", "/api/v1/auth/2fa/enable", {
        status: "planned",
        desc: "Returns the TOTP secret and an otpauth:// URI for the QR code.",
        body: { method: "totp" },
        examples: [{ name: "Enrolled", body: { secret: "JBSWY3DPEHPK3PXP", otpauthUri: "otpauth://totp/OCTOPUS:owner@burgerhouse.sa?secret=JBSWY3DPEHPK3PXP" } }],
      }),
      R("Two-factor · confirm", "POST", "/api/v1/auth/2fa/confirm", { status: "planned", body: { code: "123456" } }),
      R("Two-factor · disable", "POST", "/api/v1/auth/2fa/disable", { status: "planned", body: { code: "123456" } }),
    ]),

    F("Current session", "", [
      R("Who am I", "GET", "/api/v1/me", {
        status: "planned",
        desc: "User profile + effective permission matrix for the active tenant and branch. The sidebar and every action button gate on `permissions`.",
        tests: T_OK,
        examples: [
          {
            name: "Success",
            body: {
              id: "usr-001",
              name: "Mohammed Al-Otaibi",
              email: "owner@burgerhouse.sa",
              phone: "+966501234567",
              role: "owner",
              locale: "ar",
              avatarUrl: null,
              activeTenantId: "tenant-burger-house",
              activeBranchId: "branch-riyadh-olaya",
              permissions: { Orders: { View: true, Create: true, Edit: true, Delete: true, Approve: true } },
            },
          },
        ],
      }),
      R("Update my profile", "PATCH", "/api/v1/me", {
        status: "planned",
        body: { name: "Mohammed Al-Otaibi", phone: "+966501234567", avatarUrl: null },
      }),
      R("Switch active branch", "POST", "/api/v1/me/active-branch", {
        status: "stub",
        screen: "features/session/switch-branch (empty stub)",
        desc: "Persists the branch the console is scoped to. Until this ships, branch selection is client-side only.",
        body: { branchId: "{{branchId}}" },
      }),
      R("Switch UI locale", "POST", "/api/v1/me/locale", {
        status: "stub",
        screen: "features/session/switch-locale (empty stub)",
        desc: "Persists `ar` / `en`. Drives both the translation bundle and the document `dir` (RTL/LTR).",
        body: { locale: "ar" },
      }),
      R("My notifications", "GET", "/api/v1/me/notifications", {
        status: "planned",
        screen: "widgets/top-bar — bell icon",
        query: [...PAGING, { key: "unreadOnly", value: "true" }],
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "ntf-1", kind: "zatca_rejected", title: "3 invoices rejected by ZATCA", severity: "error", readAt: null, createdAt: "2026-08-17T06:12:00Z" },
                { id: "ntf-2", kind: "low_stock", title: "Chicken breast below par at Olaya", severity: "warning", readAt: null, createdAt: "2026-08-17T05:40:00Z" },
              ],
              meta: { unread: 2, total: 18 },
            },
          },
        ],
      }),
      R("Mark notification read", "POST", "/api/v1/me/notifications/:notificationId/read", { status: "planned" }),
      R("Mark all read", "POST", "/api/v1/me/notifications/read-all", { status: "planned" }),
    ]),
  ]
);

// ============================================================
// 02 — Businesses & Onboarding
// ============================================================
const businesses = F(
  "02 · Businesses & Onboarding",
  "The 10-step signup wizard and the multi-business switcher.\n\nOne account can own several businesses; exactly one is active at a time and its `enabledModules` decide which sidebar groups render. See `docs/superpowers/specs/2026-08-17-multi-business-switcher-design.md`.",
  [
    F("Catalogue (wizard reference data)", "", [
      R("List verticals", "GET", "/api/v1/catalog/verticals", {
        status: "planned",
        screen: "widgets/business-wizard — VerticalStep",
        desc:
          "Restaurants is the only buildable vertical today, `available: true`. The other nine render locked with a lock badge and a small \"available now\" mark reserved for whichever unlocks next — shown honestly rather than hidden, so the multi-vertical roadmap is visible.\n\nEach entry's `image` is a filename inside `apps/assets/onboarding-Business`, resolved to a URL client-side.",
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "healthcare", nameEn: "Healthcare", nameAr: "الرعاية الصحية", image: "healthcare.png", available: false },
                { id: "retail", nameEn: "Retail", nameAr: "التجزئة", image: "retail.png", available: false },
                { id: "restaurants", nameEn: "Restaurants", nameAr: "مطاعم", image: "restaurant.png", available: true },
                { id: "professionalServices", nameEn: "Professional Service", nameAr: "خدمات مهنية", image: "professional-services.png", available: false },
                { id: "logistics", nameEn: "Logistics", nameAr: "الخدمات اللوجستية", image: "logistics.png", available: false },
                { id: "education", nameEn: "Education", nameAr: "التعليم", image: "education.png", available: false },
                { id: "fitness", nameEn: "Fitness", nameAr: "اللياقة البدنية", image: "fitness.png", available: false },
                { id: "realEstate", nameEn: "Real Estate", nameAr: "العقارات", image: "real-estate.png", available: false },
                { id: "technology", nameEn: "Technology", nameAr: "التقنية", image: "technology.png", available: false },
                { id: "other", nameEn: "Other", nameAr: "أخرى", image: "other.png", available: false },
              ],
            },
          },
        ],
      }),
      R("List business types for a vertical", "GET", "/api/v1/catalog/verticals/:verticalId/types", {
        status: "planned",
        screen: "widgets/business-wizard — TypeStep",
        desc: "e.g. fine dining, fast casual, cloud kitchen, coffee shop, food truck. The chosen type seeds the recommended module set.",
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { code: "fine_dining", nameEn: "Fine Dining", nameAr: "مطاعم فاخرة", recommendedModules: ["bookings", "orders", "inventory", "staff"] },
                { code: "fast_casual", nameEn: "Fast Casual", nameAr: "وجبات سريعة", recommendedModules: ["orders", "menu", "delivery"] },
                { code: "cloud_kitchen", nameEn: "Cloud Kitchen", nameAr: "مطبخ سحابي", recommendedModules: ["orders", "delivery", "inventory"] },
                { code: "coffee_shop", nameEn: "Coffee Shop", nameAr: "مقهى", recommendedModules: ["orders", "loyalty"] },
              ],
            },
          },
        ],
      }),
      R("Qualifying questions", "GET", "/api/v1/catalog/onboarding/questions", {
        status: "planned",
        screen: "widgets/business-wizard — QuestionsStep",
        query: [{ key: "vertical", value: "restaurants", on: true }, { key: "type", value: "fast_casual", on: true }],
        desc: "Branch count, monthly order volume, current POS, current accounting system, delivery aggregators used. Answers drive the module recommendation and the pricing pack.",
      }),
      R("Module catalogue", "GET", "/api/v1/catalog/modules", {
        status: "planned",
        screen: "pages/settings/modules · widgets/business-wizard — ModulesStep",
        source: "mock-settings-modules.ts",
        desc: "The 12 business modules with tier (`Included` / `Add-on` / `Enterprise`) and monthly price.",
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "core", nameEn: "Core Settings", tier: "Included", monthlySar: 0, locked: true },
                { id: "orders", nameEn: "Orders & POS", tier: "Included", monthlySar: 0 },
                { id: "bookings", nameEn: "Bookings & Reservations", tier: "Add-on", monthlySar: 149 },
                { id: "inventory", nameEn: "Inventory", tier: "Add-on", monthlySar: 199 },
                { id: "accounting", nameEn: "Accounting", tier: "Add-on", monthlySar: 179 },
                { id: "zatca", nameEn: "Tax Invoicing (ZATCA)", tier: "Included", monthlySar: 0, locked: true },
                { id: "loyalty", nameEn: "Loyalty & Marketing", tier: "Add-on", monthlySar: 129 },
                { id: "hr", nameEn: "HR / Staff", tier: "Add-on", monthlySar: 159 },
                { id: "integrations", nameEn: "Integration Hub", tier: "Enterprise", monthlySar: 249 },
              ],
            },
          },
        ],
      }),
      R("Pricing packs", "GET", "/api/v1/catalog/packs", {
        status: "planned",
        source: "mock-settings-modules.ts — packCards",
        desc: "Lite / Core / Growth bundles. Selecting a pack pre-checks its modules in the wizard.",
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { plan: "Lite", monthlySar: 299, modules: ["core", "orders", "zatca"] },
                { plan: "Core", monthlySar: 649, modules: ["core", "orders", "zatca", "inventory", "loyalty"] },
                { plan: "Growth", monthlySar: 1199, modules: ["core", "orders", "zatca", "inventory", "loyalty", "hr", "accounting", "integrations"] },
              ],
            },
          },
        ],
      }),
      R("Price a module selection", "POST", "/api/v1/catalog/quote", {
        status: "planned",
        desc: "Returns the live price breakdown shown at the bottom of the wizard — base, add-ons, per-branch multiplier, VAT, total.",
        body: { vertical: "restaurants", businessType: "fast_casual", branchCount: 4, modules: ["core", "orders", "zatca", "inventory", "loyalty"] },
        examples: [
          {
            name: "Success",
            body: { baseSar: 299, addOnsSar: 328, branchMultiplier: 1.6, subtotalSar: 1003.2, vatSar: 150.48, totalSar: 1153.68, currency: "SAR" },
          },
        ],
      }),
    ]),

    F("Onboarding wizard", "", [
      R("Start onboarding", "POST", "/api/v1/onboarding/sessions", {
        status: "planned",
        screen: "pages/onboarding",
        desc: "Creates a resumable draft so a merchant can close the tab at step 6 and come back.",
        body: { source: "web", locale: "ar" },
        tests: `const b = pm.response.json();
if (b.id) pm.environment.set("onboardingId", b.id);
pm.test("201 Created", () => pm.response.to.have.status(201));`,
        examples: [{ name: "Created", code: 201, body: { id: "onb-4410", step: "account", completedSteps: [], expiresAt: "2026-08-24T00:00:00Z" } }],
      }),
      R("Get onboarding draft", "GET", "/api/v1/onboarding/sessions/:onboardingId", { status: "planned" }),
      R("Save step · account", "PUT", "/api/v1/onboarding/sessions/:onboardingId/steps/account", {
        status: "planned",
        screen: "pages/onboarding/steps/account-step.tsx",
        desc:
          "`password` is optional — three social buttons (Google/Apple/Microsoft) sit above the form as an alternate path, and a merchant who fills the form by hand can still leave the password blank. Skipping it does not block account creation; it sets `passwordSet: false` on the resulting user, and the app shell blocks once (see *Set password (first time)*) on their first sign-in until they set one.",
        body: { businessName: "Burger House", email: "owner@burgerhouse.sa", phone: "+966501234567", password: "{{newPassword}}" },
      }),
      R("Save step · vertical", "PUT", "/api/v1/onboarding/sessions/:onboardingId/steps/vertical", {
        status: "planned",
        body: { vertical: "restaurants" },
      }),
      R("Save step · business type", "PUT", "/api/v1/onboarding/sessions/:onboardingId/steps/type", {
        status: "planned",
        body: { businessType: "fast_casual" },
      }),
      R("Save step · qualifying questions", "PUT", "/api/v1/onboarding/sessions/:onboardingId/steps/questions", {
        status: "planned",
        body: { branchCount: 4, monthlyOrders: "5k-20k", currentPos: "Foodics", currentAccounting: "Qoyod", aggregators: ["hungerstation", "jahez"] },
      }),
      R("Save step · goals", "PUT", "/api/v1/onboarding/sessions/:onboardingId/steps/goals", {
        status: "planned",
        screen: "pages/onboarding/steps/goals-step.tsx",
        body: { goals: ["reduce_waste", "zatca_compliance", "grow_delivery"] },
      }),
      R("Save step · team & workflows", "PUT", "/api/v1/onboarding/sessions/:onboardingId/steps/team", {
        status: "planned",
        screen: "pages/onboarding/steps/team-workflows-step.tsx",
        body: { teamSize: 24, roles: ["branch_manager", "cashier", "waiter", "kitchen"], approvalsRequired: true },
      }),
      R("Save step · modules", "PUT", "/api/v1/onboarding/sessions/:onboardingId/steps/modules", {
        status: "planned",
        body: { modules: ["core", "orders", "zatca", "inventory", "loyalty"], plan: "Core" },
      }),
      R("Save step · integrations", "PUT", "/api/v1/onboarding/sessions/:onboardingId/steps/integrations", {
        status: "planned",
        screen: "pages/onboarding/steps/integrations-step.tsx",
        body: { intendedIntegrations: ["moyasar", "qoyod", "foodics", "whatsapp"] },
      }),
      R("Save step · data & security", "PUT", "/api/v1/onboarding/sessions/:onboardingId/steps/data-security", {
        status: "planned",
        screen: "pages/onboarding/steps/data-security-step.tsx",
        body: { dataResidency: "ksa", acceptedDpa: true, retentionYears: 7 },
      }),
      R("Onboarding summary", "GET", "/api/v1/onboarding/sessions/:onboardingId/summary", {
        status: "planned",
        screen: "pages/onboarding/steps/summary-step.tsx",
        desc: "Everything the merchant chose plus the final price — the review screen before launch.",
      }),
      R("Launch (complete onboarding)", "POST", "/api/v1/onboarding/sessions/:onboardingId/launch", {
        status: "planned",
        screen: "pages/onboarding/steps/launch-step.tsx",
        desc: "Provisions the tenant, seeds branches/roles, and returns the created business. This is what `createBusiness()` calls in the provider.",
        body: { businessName: "Burger House", acceptTerms: true },
        examples: [
          {
            name: "Provisioned",
            code: 201,
            body: { id: "tenant-burger-house", businessName: "Burger House", vertical: "restaurants", businessType: "fast_casual", enabledModules: ["core", "orders", "zatca", "inventory", "loyalty"], branchCount: 4, createdAt: "2026-08-17T08:00:00Z" },
          },
        ],
      }),
    ]),

    F("My businesses (switcher)", "", [
      R("List my businesses", "GET", "/api/v1/businesses", {
        status: "planned",
        screen: "pages/settings/businesses",
        desc: "Backs the `/settings/businesses` card grid. `activeTenantId` marks which one the console is scoped to.",
        tests: T_LIST,
        examples: [
          {
            name: "Success",
            body: {
              data: [
                { id: "tenant-burger-house", businessName: "Burger House", vertical: "restaurants", businessType: "fast_casual", branchCount: 4, enabledModules: ["core", "orders", "zatca", "inventory", "loyalty"], createdAt: "2026-05-02T10:00:00Z" },
                { id: "tenant-olive-grill", businessName: "Olive Grill", vertical: "restaurants", businessType: "fine_dining", branchCount: 1, enabledModules: ["core", "orders", "zatca", "bookings"], createdAt: "2026-07-19T09:30:00Z" },
              ],
              meta: { activeTenantId: "tenant-burger-house" },
            },
          },
        ],
      }),
      R("Create another business", "POST", "/api/v1/businesses", {
        status: "planned",
        desc: "The short modal wizard on `/settings/businesses` — vertical, type, questions, modules. Appends and activates.",
        body: { businessName: "Olive Grill", vertical: "restaurants", businessType: "fine_dining", branchCount: 1, enabledModules: ["core", "orders", "zatca", "bookings"] },
        tests: T_CREATED,
      }),
      R("Get a business", "GET", "/api/v1/businesses/:businessId", { status: "planned" }),
      R("Switch active business", "POST", "/api/v1/businesses/:businessId/activate", {
        status: "planned",
        desc: "Sets `activeTenantId`. Per the design spec, only name/vertical/type/modules change on switch — per-business data partitioning is deferred.",
        body: {},
      }),
      R("Update enabled modules", "PATCH", "/api/v1/businesses/:businessId/modules", {
        status: "planned",
        screen: "pages/settings/modules",
        body: { enabledModules: ["core", "orders", "zatca", "inventory", "loyalty", "hr"] },
      }),
      R("Rename a business", "PATCH", "/api/v1/businesses/:businessId", {
        status: "stub",
        desc: "Explicitly out of scope in the current design spec — listed here so the contract is complete.",
        body: { businessName: "Burger House KSA" },
      }),
      R("Delete a business", "DELETE", "/api/v1/businesses/:businessId", {
        status: "stub",
        desc: "Out of scope in the current design spec. Would need a hard-delete confirmation and data export first.",
      }),
    ]),

    F("Subscription & billing", "", [
      R("Current subscription", "GET", "/api/v1/billing/subscription", {
        status: "planned",
        desc: "Plan, module add-ons, seat count, renewal date, and the price breakdown shown in Settings.",
        examples: [
          { name: "Success", body: { plan: "Core", status: "active", modules: ["inventory", "loyalty"], branchCount: 4, monthlySar: 1153.68, renewsAt: "2026-09-01", trialEndsAt: null } },
        ],
      }),
      R("Change plan", "POST", "/api/v1/billing/subscription/change", { status: "planned", body: { plan: "Growth" } }),
      R("List invoices (platform billing)", "GET", "/api/v1/billing/invoices", {
        status: "planned",
        desc: "OCTOPUS's own invoices to the merchant. Not to be confused with the merchant's ZATCA tax invoices under Finance.",
        query: PAGING,
      }),
      R("Download a billing invoice (PDF)", "GET", "/api/v1/billing/invoices/:invoiceId/pdf", { status: "planned" }),
      R("Payment method on file", "PUT", "/api/v1/billing/payment-method", {
        status: "planned",
        desc: "Tokenised through the gateway — raw PAN never reaches OCTOPUS.",
        body: { gatewayToken: "tok_moyasar_9f21c" },
      }),
    ]),
  ]
);

// ============================================================
// 03 — Dashboard
// ============================================================
const dashboard = F(
  "03 · Dashboard",
  "Everything on the Overview screen. Each widget maps to one endpoint so a slow panel never blocks the rest of the page.\n\nAll endpoints take the same `range` + `branchId` pair — the two segmented controls at the top of the page.",
  [
    R("Overview (all widgets in one call)", "GET", "/api/v1/dashboard/overview", {
      status: "planned",
      screen: "pages/dashboard",
      source: "mock-dashboard.ts",
      query: [...RANGE_PRESET, ...BRANCH, { key: "compare", value: "previous_period", desc: "Adds delta vs the previous comparable period." }],
      desc: "Composite response for the first paint: KPI cards, channel series, quarterly revenue, contribution, AI insight, heatmap and branch distribution. Individual endpoints below exist for refreshing one card.",
      tests: T_OK,
    }),
    R("KPI cards", "GET", "/api/v1/dashboard/kpis", {
      status: "planned",
      source: "mock-dashboard.ts — kpiCards",
      query: [...RANGE_PRESET, ...BRANCH],
      desc: "Total revenue, orders, average basket, active customers — each with a delta and a sparkline series.",
      tests: T_OK,
      examples: [
        {
          name: "Success",
          body: {
            data: [
              { id: "revenue", label: "TOTAL REVENUE", value: "SAR 187.4K", deltaPct: 12.4, trend: "up", spark: [12, 18, 15, 22, 26, 24, 31] },
              { id: "orders", label: "ORDERS", value: "3,482", deltaPct: 8.1, trend: "up", spark: [40, 42, 39, 47, 51, 49, 55] },
              { id: "avg_basket", label: "AVG BASKET", value: "SAR 62.10", deltaPct: -1.8, trend: "down", spark: [64, 63, 62, 62, 61, 62, 62] },
              { id: "customers", label: "ACTIVE CUSTOMERS", value: "1,204", deltaPct: 4.6, trend: "up", spark: [900, 950, 1010, 1080, 1120, 1180, 1204] },
            ],
            meta: { range: "30d", lastUpdatedAt: "2026-08-17T07:30:00Z" },
          },
        },
      ],
    }),
    R("Revenue by channel (bar chart)", "GET", "/api/v1/dashboard/revenue-by-channel", {
      status: "planned",
      source: "mock-dashboard.ts — channelSeries, revenueByQuarter",
      query: [...RANGE_PRESET, ...BRANCH, { key: "granularity", value: "quarter", desc: "`day` `week` `month` `quarter`." }],
      tests: T_OK,
      examples: [
        {
          name: "Success",
          body: {
            series: [
              { id: "dine_in", label: "Dine-in", color: "#2ec9c0" },
              { id: "delivery", label: "Delivery", color: "#22c9d9" },
              { id: "takeaway", label: "Takeaway", color: "#5b8def" },
              { id: "aggregator", label: "Aggregator", color: "#8b7cf0" },
            ],
            buckets: [
              { label: "Q1", dine_in: 82, delivery: 61, takeaway: 34, aggregator: 21 },
              { label: "Q2", dine_in: 95, delivery: 74, takeaway: 38, aggregator: 29 },
              { label: "Q3", dine_in: 101, delivery: 88, takeaway: 41, aggregator: 33 },
            ],
            axis: { max: 200, ticks: [0, 40, 80, 120, 160, 200] },
          },
        },
      ],
    }),
    R("Order channel mix (donut)", "GET", "/api/v1/dashboard/channel-mix", {
      status: "planned",
      source: "mock-dashboard.ts — contribution",
      query: [...RANGE_PRESET, ...BRANCH],
      examples: [
        { name: "Success", body: { total: 3482, slices: [{ id: "dine_in", label: "Dine-in", value: 1420, pct: 40.8 }, { id: "delivery", label: "Delivery", value: 1105, pct: 31.7 }, { id: "takeaway", label: "Takeaway", value: 612, pct: 17.6 }, { id: "aggregator", label: "Aggregator", value: 345, pct: 9.9 }] } },
      ],
    }),
    R("AI insights panel", "GET", "/api/v1/dashboard/insights", {
      status: "planned",
      source: "mock-dashboard.ts — aiInsight, topOpportunity",
      query: [...RANGE_PRESET, ...BRANCH],
      desc: "Generated narrative + the single highest-value opportunity. Backed by an LLM summarisation job over the period's aggregates.",
      examples: [
        {
          name: "Success",
          body: {
            headline: "Delivery grew 18% while dine-in stayed flat",
            body: "Jeddah - Corniche drove most of the delivery lift after the HungerStation menu sync. Dine-in covers were unchanged despite a 6% rise in walk-ins, suggesting table turnover is the constraint.",
            opportunity: { title: "Raise Olaya table turnover", impactSar: 24800, confidence: 0.72, action: "Review the 8pm–10pm seating policy" },
            generatedAt: "2026-08-17T07:00:00Z",
          },
        },
      ],
    }),
    R("Performance heatmap", "GET", "/api/v1/dashboard/heatmap", {
      status: "planned",
      source: "mock-dashboard.ts — performanceHeatmap",
      query: [{ key: "metric", value: "revenue", desc: "`revenue` `orders` `margin`." }, ...BRANCH],
      desc: "Year-over-year grid (rows = metric, columns = 2022…2026).",
    }),
    R("Branch distribution", "GET", "/api/v1/dashboard/branch-distribution", {
      status: "planned",
      source: "mock-dashboard.ts — distributionColumns, channelDistributionColumns",
      query: [...RANGE_PRESET, { key: "groupBy", value: "branch", desc: "`branch` or `channel` — the segmented toggle on the card." }],
    }),
    R("Range & branch filter options", "GET", "/api/v1/dashboard/filters", {
      status: "planned",
      source: "mock-dashboard.ts — dashboardRangeOptions, dashboardBranchOptions",
      desc: "Populates the two segmented controls. Separate from `/meta/branches` because it also returns the range presets and the default selection.",
    }),
    R("Export dashboard (PDF)", "POST", "/api/v1/dashboard/export", {
      status: "planned",
      body: { format: "pdf", range: "30d", branchId: null, includeInsights: true },
      desc: "Async — returns a job id; poll `/api/v1/exports/:jobId`.",
      examples: [{ name: "Queued", code: 202, body: { jobId: "exp-7781", status: "queued" } }],
    }),
  ]
);

module.exports = { platform, auth, businesses, dashboard };
