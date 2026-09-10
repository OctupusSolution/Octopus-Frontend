"use strict";
const { R, F, err, T_OK, T_CREATED, T_LIST } = require("./lib");

// The seven steps, in the order pages/onboarding/_shared/steps.tsx runs them.
const STEP_IDS = ["getStarted", "businessProfile", "services", "modules", "integrations", "payment", "goLive"];

const DRAFT = {
  id: "onb-4410",
  currentStep: "modules",
  completedSteps: ["getStarted", "businessProfile", "services"],
  entryPath: "scratch",
  vertical: "restaurants",
  businessType: "T3",
  answers: { branches: "few", delivery: "aggregators", reservations: "yes" },
  enabledModules: ["core", "orders", "payments", "tax", "reports", "delivery", "integrations", "bookings"],
  integrations: [],
  paymentMethod: null,
  paid: false,
  expiresAt: "2026-09-17T00:00:00Z",
};

const QUOTE = {
  currency: "SAR",
  period: "month",
  lines: [
    { id: "base", kind: "base", amountSar: 199 },
    { id: "bookings", kind: "module", amountSar: 89 },
    { id: "delivery", kind: "module", amountSar: 119 },
    { id: "integrations", kind: "module", amountSar: null },
    { id: "branches", kind: "branches", quantity: 2, amountSar: 298 },
    { id: "hungerstation", kind: "integration", amountSar: 200 },
  ],
  totalSar: 905,
  hasQuotedItems: true,
};

const step = (id) => `/api/v1/onboarding/sessions/:onboardingId/steps/${id}`;

const setup = F(
  "02 · Setup",
  "The business setup wizard (`pages/onboarding`): **7 steps**, resumable, finishing in a provisioned business.\n\n| # | Step id | The merchant chooses |\n|---|---|---|\n| 1 | `getStarted` | How to start: `ai`, `template` or `scratch` |\n| 2 | `businessProfile` | Industry (vertical) |\n| 3 | `services` | Business type within it |\n| 4 | `modules` | Answers to qualifying questions + the modules to switch on |\n| 5 | `integrations` | Optional connectors |\n| 6 | `payment` | Payment method, then pays the monthly total |\n| 7 | `goLive` | Launches the business |\n\n**Run order:** 2.1 once for the reference data, then 2.2 top to bottom. *Start* saves `onboardingId`.",
  [
    F(
      "2.1 · Reference data",
      "Read-only lists the wizard renders. Cacheable — they change with a release, not per merchant.",
      [
        R("List industries (verticals)", "GET", "/api/v1/catalog/verticals", {
          status: "planned",
          screen: "widgets/business-wizard/vertical-step.tsx (step 2)",
          source: "src/shared/catalog/verticals.ts",
          desc: "All 12 industries. Only `restaurants` can be chosen today; the rest are shown locked so the roadmap is visible.",
          rules: ["Choosing a vertical with `available: false` in step 2 → `422 vertical_unavailable`."],
          tests: T_LIST,
          examples: [
            {
              name: "Success",
              body: {
                data: [
                  { id: "restaurants", nameEn: "Restaurants", nameAr: "مطاعم", available: true },
                  { id: "healthcare", nameEn: "Healthcare", nameAr: "الرعاية الصحية", available: false },
                  { id: "retail", nameEn: "Retail", nameAr: "التجزئة", available: false },
                  { id: "professionalServices", nameEn: "Professional Services", nameAr: "خدمات مهنية", available: false },
                  { id: "logistics", nameEn: "Logistics", nameAr: "الخدمات اللوجستية", available: false },
                  { id: "education", nameEn: "Education", nameAr: "التعليم", available: false },
                  { id: "fitness", nameEn: "Fitness", nameAr: "اللياقة البدنية", available: false },
                  { id: "realEstate", nameEn: "Real Estate", nameAr: "العقارات", available: false },
                  { id: "technology", nameEn: "Technology", nameAr: "التقنية", available: false },
                  { id: "petCare", nameEn: "Pet Care", nameAr: "رعاية الحيوانات", available: false },
                  { id: "kidsPlayArea", nameEn: "Kids Play Area", nameAr: "مناطق ألعاب الأطفال", available: false },
                  { id: "other", nameEn: "Other", nameAr: "أخرى", available: false },
                ],
                meta: { page: 1, pageSize: 12, total: 12 },
              },
            },
          ],
        }),
        R("List business types", "GET", "/api/v1/catalog/verticals/:verticalId/types", {
          status: "planned",
          screen: "widgets/business-wizard/type-step.tsx (step 3)",
          source: "src/shared/catalog/restaurant-types.ts",
          desc: "The 12 restaurant types, `T1`–`T12`. Each carries the modules it switches on by default.",
          tests: T_LIST,
          examples: [
            {
              name: "Success",
              body: {
                data: [
                  { code: "T1", serviceModel: "on-premise", nameEn: "Fine Dining", defaultModules: ["core", "orders", "payments", "tax", "reports", "bookings"] },
                  { code: "T2", serviceModel: "on-premise", nameEn: "Casual Dining", defaultModules: ["core", "orders", "payments", "tax", "reports", "bookings"] },
                  { code: "T3", serviceModel: "counter", nameEn: "Quick Service", defaultModules: ["core", "orders", "payments", "tax", "reports", "delivery"] },
                  { code: "T4", serviceModel: "counter", nameEn: "Café", defaultModules: ["core", "orders", "payments", "tax", "reports", "loyalty"] },
                  { code: "T6", serviceModel: "off-premise", nameEn: "Cloud Kitchen", defaultModules: ["core", "orders", "payments", "tax", "reports", "delivery", "inventory"] },
                ],
                meta: { page: 1, pageSize: 12, total: 12 },
              },
            },
          ],
        }),
        R("List qualifying questions", "GET", "/api/v1/catalog/onboarding/questions", {
          status: "planned",
          screen: "widgets/business-wizard/modules-step.tsx (step 4)",
          source: "src/shared/catalog/questions.ts",
          query: [{ key: "type", value: "T3", on: true, desc: "Business type code from step 3." }],
          desc: "Eight questions. Each answer option lists the modules it switches on (`enables`), and the `branches` answer also sets the branch count used for pricing.",
          tests: T_OK,
          examples: [
            {
              name: "Success",
              body: {
                data: [
                  { id: "branches", options: [{ id: "one", enables: [], branchCount: 1 }, { id: "few", enables: [], branchCount: 3 }, { id: "many", enables: [], branchCount: 8 }] },
                  { id: "delivery", options: [{ id: "own", enables: ["delivery"] }, { id: "aggregators", enables: ["delivery", "integrations"] }, { id: "both", enables: ["delivery", "integrations"] }, { id: "none", enables: [] }] },
                  { id: "reservations", options: [{ id: "yes", enables: ["bookings"] }, { id: "no", enables: [] }] },
                  { id: "inventory", options: [{ id: "yes", enables: ["inventory"] }, { id: "no", enables: [] }] },
                  { id: "staff", options: [{ id: "yes", enables: ["hr"] }, { id: "no", enables: [] }] },
                  { id: "loyalty", options: [{ id: "yes", enables: ["loyalty", "customers"] }, { id: "no", enables: [] }] },
                  { id: "accounting", options: [{ id: "yes", enables: ["accounting"] }, { id: "no", enables: [] }] },
                  { id: "messaging", options: [{ id: "yes", enables: ["messaging"] }, { id: "no", enables: [] }] },
                ],
              },
            },
          ],
        }),
        R("List modules", "GET", "/api/v1/catalog/modules", {
          status: "planned",
          screen: "widgets/business-wizard/modules-step.tsx (step 4)",
          source: "src/shared/catalog/modules.ts",
          desc: "Five modules are in the base plan and cannot be switched off. The rest are monthly add-ons; `integrations` is priced on request (`monthlySar: null`).",
          rules: [
            "Base modules (`core`, `orders`, `payments`, `tax`, `reports`) are always enabled; sending a module list without them → `422 base_module_required`.",
            "A module's dependencies are switched on with it, and switching a module off switches off anything that depends on it.",
          ],
          tests: T_LIST,
          examples: [
            {
              name: "Success",
              body: {
                data: [
                  { id: "core", inBase: true, monthlySar: 0 },
                  { id: "orders", inBase: true, monthlySar: 0 },
                  { id: "payments", inBase: true, monthlySar: 0 },
                  { id: "tax", inBase: true, monthlySar: 0 },
                  { id: "reports", inBase: true, monthlySar: 0 },
                  { id: "bookings", inBase: false, monthlySar: 89 },
                  { id: "delivery", inBase: false, monthlySar: 119 },
                  { id: "inventory", inBase: false, monthlySar: 99 },
                  { id: "customers", inBase: false, monthlySar: 69 },
                  { id: "loyalty", inBase: false, monthlySar: 79, dependsOn: ["customers"] },
                  { id: "hr", inBase: false, monthlySar: 129 },
                  { id: "accounting", inBase: false, monthlySar: 149 },
                  { id: "messaging", inBase: false, monthlySar: 49 },
                  { id: "integrations", inBase: false, monthlySar: null },
                ],
                meta: { basePlanSar: 199, pricePerExtraBranchSar: 149 },
              },
            },
          ],
        }),
        R("List integrations", "GET", "/api/v1/catalog/integrations", {
          status: "planned",
          screen: "pages/onboarding/steps/integrations-step.tsx (step 5)",
          source: "pages/onboarding/_shared/extras-catalog.ts",
          desc: "The connectors a merchant can pre-select. Every one is SAR 200 a month today; read the price from here, never hardcode it.",
          tests: T_LIST,
          examples: [
            {
              name: "Success",
              body: {
                data: [
                  { id: "hungerstation", name: "HungerStation", category: "delivery", monthlySar: 200 },
                  { id: "jahez", name: "Jahez", category: "delivery", monthlySar: 200 },
                  { id: "mrsool", name: "Mrsool", category: "delivery", monthlySar: 200 },
                  { id: "moyasar", name: "Moyasar", category: "payments", monthlySar: 200 },
                  { id: "tap", name: "Tap", category: "payments", monthlySar: 200 },
                  { id: "hyperpay", name: "HyperPay", category: "payments", monthlySar: 200 },
                  { id: "qoyod", name: "Qoyod", category: "accounting", monthlySar: 200 },
                  { id: "wafeq", name: "Wafeq", category: "accounting", monthlySar: 200 },
                  { id: "daftra", name: "Daftra", category: "accounting", monthlySar: 200 },
                  { id: "whatsapp", name: "WhatsApp Cloud API", category: "messaging", monthlySar: 200 },
                ],
                meta: { page: 1, pageSize: 10, total: 10 },
              },
            },
          ],
        }),
        R("List payment methods", "GET", "/api/v1/catalog/payment-methods", {
          status: "planned",
          screen: "pages/onboarding/steps/payment-step.tsx (step 6)",
          source: "pages/onboarding/_shared/payment-catalog.ts",
          tests: T_LIST,
          examples: [
            { name: "Success", body: { data: [{ id: "card" }, { id: "mada" }, { id: "applepay" }, { id: "stcpay" }], meta: { page: 1, pageSize: 4, total: 4 } } },
          ],
        }),
        R("Get a price quote", "POST", "/api/v1/catalog/quote", {
          status: "planned",
          screen: "pages/onboarding/_shared/price-bar.tsx (steps 4–6)",
          source: "src/shared/catalog/pricing.ts — computePrice",
          desc: "The live monthly price at the bottom of the wizard. The front-end sends choices; **the server computes the total**.",
          rules: [
            "`total = 199 base + each enabled add-on's monthly price + 149 × (branchCount − 1) + 200 × each integration`.",
            "Base modules add nothing. A module priced on request (`null`) is listed but **not** added to the total, and sets `hasQuotedItems: true`.",
            "Whole riyals — subscription prices carry no halalas.",
          ],
          body: { enabledModules: ["core", "orders", "payments", "tax", "reports", "bookings", "delivery", "integrations"], branchCount: 3, integrations: ["hungerstation"] },
          tests: T_OK,
          examples: [{ name: "Success", body: QUOTE }],
        }),
      ]
    ),

    F(
      "2.2 · Wizard steps",
      "One draft per setup, saved step by step so a merchant can close the tab and resume.",
      [
        R("Start setup", "POST", "/api/v1/onboarding/sessions", {
          status: "planned",
          screen: "pages/onboarding/steps/get-started-step.tsx (step 1)",
          desc: "Creates the resumable draft and records how the merchant chose to start.",
          rules: [
            "`entryPath` is `ai`, `template` or `scratch`.",
            "A signed-in merchant adding a second business uses the same flow without step 1 (`pages/settings/businesses/create.tsx`); send `entryPath: \"scratch\"`.",
            "Drafts expire after 7 days of inactivity.",
          ],
          body: { entryPath: "scratch", locale: "ar" },
          tests: T_CREATED,
          saves: { onboardingId: "id" },
          examples: [{ name: "Created", code: 201, body: { ...DRAFT, currentStep: "businessProfile", completedSteps: ["getStarted"], vertical: null, businessType: null, answers: {}, enabledModules: ["core", "orders", "payments", "tax", "reports"] } }],
        }),
        R("Get setup draft", "GET", "/api/v1/onboarding/sessions/:onboardingId", {
          status: "planned",
          desc: "Resumes the wizard on the step the merchant left.",
          tests: T_OK,
          examples: [{ name: "Success", body: DRAFT }, err("Expired", 404, "onboarding_not_found", "This setup has expired. Start again.")],
        }),
        R("Step 2 · Save industry", "PUT", step("businessProfile"), {
          status: "planned",
          screen: "widgets/business-wizard/vertical-step.tsx",
          rules: [
            "`vertical` must exist and be `available`.",
            "Changing the vertical clears `businessType` and `answers` — they belong to the old one.",
          ],
          body: { vertical: "restaurants" },
          tests: T_OK,
          examples: [{ name: "Saved", body: { ...DRAFT, currentStep: "services", businessType: null, answers: {} } }, err("Locked industry", 422, "vertical_unavailable", "This industry is not available yet.")],
        }),
        R("Step 3 · Save business type", "PUT", step("services"), {
          status: "planned",
          screen: "widgets/business-wizard/type-step.tsx",
          rules: [
            "`businessType` must be one of the vertical's codes (`T1`–`T12`).",
            "Changing the type **clears the answers** — a stale answer would silently keep a module on — and resets `enabledModules` to the type's defaults.",
          ],
          body: { businessType: "T3" },
          tests: T_OK,
          examples: [{ name: "Saved", body: { ...DRAFT, currentStep: "modules", answers: {} } }],
        }),
        R("Step 4 · Save answers & modules", "PUT", step("modules"), {
          status: "planned",
          screen: "widgets/business-wizard/modules-step.tsx",
          desc: "Answers and the module selection are saved together: answers switch modules on, and the merchant can then adjust the list by hand.",
          rules: [
            "Every answer must be a valid option of its question.",
            "`enabledModules` always contains the base modules and every dependency of what is selected (see *List modules*).",
            "The `branches` answer sets `branchCount` for pricing: `one` → 1, `few` → 3, `many` → 8.",
          ],
          body: { answers: { branches: "few", delivery: "aggregators", reservations: "yes" }, enabledModules: ["core", "orders", "payments", "tax", "reports", "bookings", "delivery", "integrations"] },
          tests: T_OK,
          examples: [
            { name: "Saved", body: { ...DRAFT, currentStep: "integrations", completedSteps: ["getStarted", "businessProfile", "services", "modules"], quote: QUOTE } },
            err("Base module removed", 422, "base_module_required", "Core modules cannot be switched off.", { missing: ["tax"] }),
          ],
        }),
        R("Step 5 · Save integrations", "PUT", step("integrations"), {
          status: "planned",
          screen: "pages/onboarding/steps/integrations-step.tsx",
          desc: "Optional — an empty list is valid and lets the merchant continue.",
          rules: ["Every id must exist in *List integrations*."],
          body: { integrations: ["hungerstation", "moyasar"] },
          tests: T_OK,
          examples: [{ name: "Saved", body: { ...DRAFT, currentStep: "payment", integrations: ["hungerstation", "moyasar"], quote: { ...QUOTE, totalSar: 1105 } } }],
        }),
        R("Step 6 · Pay", "POST", "/api/v1/onboarding/sessions/:onboardingId/payment", {
          status: "planned",
          screen: "pages/onboarding/steps/payment-step.tsx",
          desc: "Charges the first month. **Today the screen only simulates payment**; this is the real call it will make.\n\nThe amount is **not** sent — the server charges its own quote for the draft, so a tampered client cannot change the price.",
          rules: [
            "`paymentMethod` is `card`, `mada`, `applepay` or `stcpay`.",
            "Charge `quote.totalSar` computed server-side from the draft.",
            "Idempotent on `Idempotency-Key`: a retried request never charges twice.",
            "The wizard cannot continue to step 7 until this succeeds (`paid: true`).",
          ],
          body: { paymentMethod: "mada", returnUrl: "https://app.octopus.sa/onboarding/payment/return" },
          tests: T_OK,
          examples: [
            { name: "Paid", body: { paid: true, amountSar: 1105, currency: "SAR", paymentId: "pay-77412", paidAt: "2026-09-10T09:00:00Z" } },
            { name: "Needs 3-D Secure", code: 202, body: { paid: false, action: "redirect", redirectUrl: "https://secure.moyasar.com/3ds/…" } },
            err("Card declined", 422, "payment_declined", "The payment was declined by your bank."),
          ],
        }),
        R("Step 7 · Go live", "POST", "/api/v1/onboarding/sessions/:onboardingId/launch", {
          status: "planned",
          screen: "pages/onboarding/steps/go-live-step.tsx",
          desc: "Provisions the business from the draft and returns it. The console then signs in to it and opens the dashboard.",
          rules: [
            "Only allowed when `paid: true` → otherwise `409 payment_required`.",
            "Creates the tenant with `enabledModules`, seeds `branchCount` branches and the owner role.",
            "The draft is closed; launching twice returns the business already created.",
          ],
          body: {},
          tests: T_CREATED,
          saves: { tenantId: "id" },
          examples: [
            { name: "Business created", code: 201, body: { id: "tenant-ocean-view", businessName: "Ocean View Restaurant", vertical: "restaurants", businessType: "T3", enabledModules: DRAFT.enabledModules, branchCount: 3, createdAt: "2026-09-10T09:01:00Z" } },
            err("Not paid", 409, "payment_required", "Complete payment before going live."),
          ],
        }),
      ]
    ),
  ]
);

module.exports = { setup, STEP_IDS };
