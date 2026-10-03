// The "create a business" wizard, driven by the backend's own catalog and its
// BusinessSetup resource (see use-business-setup.ts) — not by the local
// twelve-type / fourteen-module catalog in shared/catalog, which is a different
// taxonomy from what the platform can actually provision (FRONTEND_INTEGRATION_
// GAPS.md 2.2). Drawn as the Setup frames' seven stops:
//
//   get started -> business profile -> services -> modules -> integrations
//     -> payment -> go live
//
// "Get started" is the welcome page and writes nothing. "Business profile" is
// the business type plus its name (the backend needs both before a variant can
// be priced, and the frames have no stop of their own for the name). "Go live"
// is the payment step's success dialog rather than a screen.
//
// Each step's Continue saves that step to the server (PUT .../business-type,
// etc.), so what the merchant sees on the payment step — quote included — is
// what the backend will actually charge. Paying starts checkout, settles it
// (dev: the Fake gateway) and then waits for the Worker to provision the
// tenant, which is asynchronous: the setup only becomes `Completed`, and gains
// its businessId, once the provisioning saga has run.
//
// Also: entry resumes an unfinished setup (GET /v1/business-setups?status=open)
// with a "welcome back" banner; the merchant can cancel the setup and start
// over (POST .../cancel, after a confirm); the modules and integrations steps
// show a live, debounced price (POST /v1/onboarding/quote-previews) for the
// unsaved selection; and stepping back from a checkout in progress returns the
// setup to Draft (POST .../checkout/cancel) so it can be edited again.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import { History, Loader2, Lock, Puzzle, Scissors, Store, TriangleAlert, UtensilsCrossed, X } from "lucide-react";
import {
  ApiError,
  type AddOnSelection,
  type BusinessSetupResponse,
  type LocalizedText,
  type SetupIssueResponse,
  type VariantOfferingsResponse,
} from "@octopus/api-client";
import { Button, Input, Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import {
  HERO_URL, PAYMENT_SPINNER_URL, PAYMENT_STAMP_URL,
  integrationLogo, setupIcon, typeIcon, verticalIcon,
} from "@/pages/onboarding/_shared/assets";
import { insightsFor } from "@/pages/onboarding/_shared/ai-insights";
import { PAYMENT_METHODS } from "@/pages/onboarding/_shared/payment-catalog";
import { GetStartedHero } from "@/pages/onboarding/steps/get-started-step";
import {
  describeError,
  useBusinessSetup,
  useBusinessTypes,
  useBusinessVariants,
  useQuotePreview,
  useVariantOfferings,
  type BusinessSetupApi,
  type Loadable,
  type QuotePreviewState,
} from "./use-business-setup";
import { issueCopyKey, useSetupCopy } from "./copy";

// `tall` reserves the frames' 124px heading block; `bodyGap` and `footerGap` are
// the frames' own distances from heading to body and from body to Back/Continue.
const STEPS = [
  { id: "welcome", labelKey: "onboarding.rail.getStarted", titleKey: "", subtitleKey: "", tall: false, bodyGap: "", footerGap: "" },
  { id: "profile", labelKey: "onboarding.rail.businessProfile", titleKey: "onboarding.businessProfile.title", subtitleKey: "onboarding.businessProfile.subtitle", tall: false, bodyGap: "mt-6", footerGap: "mt-8" },
  { id: "variant", labelKey: "onboarding.rail.services", titleKey: "onboarding.services.title", subtitleKey: "onboarding.services.subtitle", tall: false, bodyGap: "mt-12", footerGap: "mt-6" },
  { id: "modules", labelKey: "onboarding.rail.modules", titleKey: "onboarding.modules.title", subtitleKey: "onboarding.modules.subtitle", tall: false, bodyGap: "mt-5 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col", footerGap: "mt-5" },
  { id: "addons", labelKey: "onboarding.rail.integrations", titleKey: "onboarding.integrations.title", subtitleKey: "onboarding.integrations.optional", tall: true, bodyGap: "mt-8", footerGap: "mt-6" },
  { id: "payment", labelKey: "onboarding.rail.payment", titleKey: "onboarding.payment.title", subtitleKey: "onboarding.payment.subtitle", tall: true, bodyGap: "mt-12", footerGap: "" },
] as const;

// The rail's last stop has no screen of its own: it lights up once the setup is
// Completed, behind the success dialog.
const RAIL_KEYS: readonly string[] = [...STEPS.map((s) => s.labelKey), "onboarding.rail.goLive"];

const PROFILE = 1;
const MODULES = 3;
const LAST = STEPS.length - 1;
const NAME_MAX = 100;
const PROVISIONING_TIMEOUT_MS = 120_000;
const POLL_MS = 2_000;

// Artwork is keyed by the backend's codes. A code with no entry falls back to a
// flat glyph, so a newly seeded type or provider still renders.
const TYPE_IMAGES: Record<string, string> = {
  restaurant: "restaurant.png",
  retail: "retail.png",
  healthcare: "healthcare.png",
  education: "education.png",
  fitness: "fitness.png",
  logistics: "logistics.png",
  technology: "technology.png",
  hospitality: "restaurant.png",
  "professional-services": "professional-services.png",
  "real-estate": "real-estate.png",
  "pet-care": "pet-care.png",
  "kids-play-area": "kids-play-area.png",
  other: "other.png",
};

const VARIANT_IMAGES: Record<string, string> = {
  "fine-dining": "fine-dining.png",
  "quick-service": "quick-service.png",
  casual: "casual.png",
  cafe: "cafe.png",
  patisserie: "patisserie.png",
  "cloud-kitchen": "cloud-kitchen.png",
  "food-truck": "food-truck.png",
  "food-court": "food-court.png",
  catering: "catering.png",
  traditional: "traditional.png",
  "hotel-beach": "hotel-beach.png",
  "home-based": "home-based.png",
};

/** A file in apps/assets/Setup/icons, drawn at the size it was exported at —
 *  the frames' icons are artwork, so nothing here resizes or recolours them. */
function SetupIcon({ name, className }: { name: string; className?: string }) {
  return <img src={setupIcon(name)} alt="" className={clsx("block shrink-0", className)} />;
}

const MODULE_ICONS: Record<string, string> = {
  reservation: "module-calendar-add.svg",
  staff: "module-people.svg",
  "floor-plan": "module-table-round.svg",
  order: "module-document-text.svg",
  "online-ordering": "module-box.svg",
  loyalty: "module-ticket.svg",
  crm: "module-crm.svg",
  "public-link": "module-link-chain.svg",
};

const CATEGORY_ICONS: Record<string, string> = {
  "delivery-apps": "category-truck.svg",
  payments: "category-money.svg",
  accounting: "category-calculator.svg",
  messaging: "category-message.svg",
};

// Keyed by the local catalog's module ids (the AI Insights rows), not by the
// backend's module codes above.
const INSIGHT_ICONS: Record<string, string> = {
  core: "insight-home.svg",
  orders: "insight-category.svg",
  payments: "insight-moneys.svg",
  reports: "insight-status-up.svg",
  bookings: "insight-calendar-add.svg",
  customers: "insight-profile-2user.svg",
  hr: "insight-people.svg",
  integrations: "insight-radar.svg",
};

const PAYMENT_ICONS: Record<string, string> = {
  card: "pay-visa.svg",
  mada: "pay-mada.svg",
  applepay: "pay-apple.svg",
  stcpay: "pay-stc.svg",
};

const PROVIDERS: Record<string, { logo: string; descKey: string }> = {
  hungerstation: { logo: "hunger-station.png", descKey: "onboarding.integrations.item.hungerstation.desc" },
  jahez: { logo: "jahez.png", descKey: "onboarding.integrations.item.jahez.desc" },
  mrsool: { logo: "mrsool.png", descKey: "onboarding.integrations.item.mrsool.desc" },
  moyasar: { logo: "moyasar.png", descKey: "onboarding.integrations.item.moyasar.desc" },
  tap: { logo: "tap.png", descKey: "onboarding.integrations.item.tap.desc" },
  hyperpay: { logo: "hyper-pay.png", descKey: "onboarding.integrations.item.hyperpay.desc" },
  qoyod: { logo: "qoyod.png", descKey: "onboarding.integrations.item.qoyod.desc" },
  wafeq: { logo: "wafeq.png", descKey: "onboarding.integrations.item.wafeq.desc" },
  daftra: { logo: "daftra.png", descKey: "onboarding.integrations.item.daftra.desc" },
  whatsapp: { logo: "whatsapp.png", descKey: "onboarding.integrations.item.whatsapp.desc" },
};

const PANEL_GRADIENT = "bg-[linear-gradient(180deg,#d0e3ff_0%,#eff5ff_50%,#eff4fc_100%)]";
const FOOTER_BUTTON = "h-12 justify-center !rounded-lg !text-[18px] !font-bold !leading-[18px]";
const BACK_BUTTON = "!border-0 !bg-[#f1f5f9] !text-[#58606c] hover:!bg-[#e8edf3]";

// ---- small helpers ------------------------------------------------------------

function pick(text: LocalizedText | null | undefined, locale: string): string {
  if (!text) return "";
  return (locale === "ar" ? text.ar || text.en : text.en || text.ar) ?? "";
}

/** Money on the wire is an integer in the currency's minor unit (halalas). */
function formatMinor(amountMinor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    style: "currency",
    currency,
    numberingSystem: "latn",
  }).format(amountMinor / 100);
}

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function TypeIcon({ code, size = 22 }: { code: string; size?: number }) {
  if (code === "restaurant") return <UtensilsCrossed size={size} />;
  if (code === "salon") return <Scissors size={size} />;
  return <Store size={size} />;
}

/** Loading / error frame shared by every step that reads the catalog. */
function CatalogGate<T>({ source, children }: { source: Loadable<T>; children: (data: T) => ReactNode }) {
  const { t } = useI18n();
  if (source.error) {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-[13.5px] text-[#DC2626]">
        <span>{t("setup.error.load")}</span>
        <button type="button" onClick={source.reload} className="font-semibold underline underline-offset-2">
          {t("setup.retry")}
        </button>
      </div>
    );
  }
  if (source.loading || !source.data) {
    return (
      <p className="flex items-center gap-2 text-[14px] text-[var(--octo-text-muted)]">
        <Loader2 size={16} className="animate-spin" />
        {t("setup.loading")}
      </p>
    );
  }
  return <>{children(source.data)}</>;
}

/** Issues carry a code, not a message — render the known ones in words. */
function IssueText({ issue }: { issue: SetupIssueResponse }) {
  const copy = useSetupCopy();
  const key = issueCopyKey(issue.code);
  const item = issue.providerCode ?? issue.itemCode;
  if (!key) return <>{item ? `${issue.code} (${item})` : issue.code}</>;
  return <>{copy(key).replace("{item}", item ? ` (${item})` : "")}</>;
}

const cardState = (active: boolean) =>
  active
    ? "border-[#0d6efd] bg-[#ebf3ff] shadow-[inset_0_0_0_1px_#0d6efd]"
    : "border-[#cbd5e1] hover:border-[#0d6efd]/50";

// ---- rail --------------------------------------------------------------------------

/** The frames' numbered rail: every stop keeps its number (no tick), the ones
 *  behind are filled, the current one is ringed. The stops are spaced by their
 *  labels rather than evenly, so the track behind them is measured: it runs
 *  from the first dot to the last and is filled up to the current one. */
function SetupRail({ step, labelKeys }: { step: number; labelKeys: readonly string[] }) {
  const { t, locale } = useI18n();
  const listRef = useRef<HTMLOListElement>(null);
  const [track, setTrack] = useState<{ start: number; width: number; fill: number } | null>(null);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const dots = list.querySelectorAll<HTMLElement>("[data-dot]");
      if (dots.length === 0) return;
      const box = list.getBoundingClientRect();
      const centre = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        return rect.left + rect.width / 2 - box.left;
      };
      const first = centre(dots[0]);
      const last = centre(dots[dots.length - 1]);
      const current = centre(dots[Math.min(Math.max(step, 1), dots.length) - 1]);
      setTrack({ start: Math.min(first, last), width: Math.abs(last - first), fill: Math.abs(current - first) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    list.querySelectorAll("li").forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [step, labelKeys, locale]);

  return (
    <ol ref={listRef} className="relative flex w-full max-w-[1148px] items-start justify-between">
      {track && (
        <li
          aria-hidden
          className="absolute top-[10px] h-1 overflow-hidden rounded-full bg-[#f1f5f9]"
          style={{ left: track.start, width: track.width }}
        >
          <span
            className="absolute inset-y-0 start-0 block rounded-full bg-[#0d6efd] transition-[width] duration-500"
            style={{ width: track.fill }}
          />
        </li>
      )}
      {labelKeys.map((labelKey, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <li
            key={labelKey}
            className={clsx("relative flex flex-col items-center gap-2", i === 0 && "md:min-w-[93px]")}
            aria-current={active ? "step" : undefined}
          >
            <span
              data-dot
              className={clsx(
                "grid h-6 w-6 place-items-center rounded-full text-[12px] font-semibold leading-[12px] transition-colors duration-300",
                done && (i === 0 ? "bg-[linear-gradient(135deg,#0d6efd_0%,#6c4dff_100%)] text-white" : "bg-[#0d6efd] text-white"),
                active && "border border-[#0d6efd] bg-[#f1f5f9] text-[#0058da]",
                !done && !active && "bg-[#f1f5f9] text-[#58606c]"
              )}
            >
              {n}
            </span>
            <span
              className={clsx(
                "hidden whitespace-nowrap text-center text-[14px] leading-[14px] md:block",
                done || active ? "text-[#0058da]" : "text-[#58606c]"
              )}
            >
              {t(labelKey)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---- steps ------------------------------------------------------------------------

function ProfileStep({
  name,
  onName,
  selected,
  onSelect,
}: {
  name: string;
  onName: (value: string) => void;
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const { t, locale } = useI18n();
  const types = useBusinessTypes();
  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-[520px]">
        <Input
          label={t("setup.name.label")}
          placeholder={t("setup.name.placeholder")}
          value={name}
          maxLength={NAME_MAX}
          onChange={(e) => onName(e.target.value)}
        />
        <p className="mt-2 text-[12px] text-[#58606c]">{t("setup.name.hint")}</p>
      </div>

      <CatalogGate source={types}>
        {(items) => (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((type) => {
              const image = TYPE_IMAGES[type.code];
              return (
                <button
                  key={type.code}
                  type="button"
                  onClick={() => onSelect(type.code)}
                  aria-pressed={selected === type.code}
                  className={clsx(
                    "flex flex-col items-center gap-3 rounded-[12px] border p-3 text-center transition-colors",
                    cardState(selected === type.code)
                  )}
                >
                  {image ? (
                    <img src={verticalIcon(image)} alt="" width={117} height={117} className="h-[117px] w-[117px] object-contain" />
                  ) : (
                    <span className="grid h-[117px] w-[117px] place-items-center rounded-[16px] bg-[#f1f5f9] text-[#0d6efd]">
                      <TypeIcon code={type.code} size={48} />
                    </span>
                  )}
                  <span className="text-[16px] font-semibold leading-[16px] text-[#0f172a]">{pick(type.name, locale)}</span>
                </button>
              );
            })}
          </div>
        )}
      </CatalogGate>
    </div>
  );
}

/** The AI Insights panel beside the business profile. The setup has no variant
 *  yet at this point, so there is no offering to read: the rows are the local
 *  catalog's always-on modules, not what the backend will price. */
function InsightsPanel() {
  const { t } = useI18n();
  const rows = insightsFor("restaurants", null);
  return (
    <section className={clsx("flex h-full flex-col gap-4 rounded-[20px] px-3 py-6", PANEL_GRADIENT)}>
      <h3 className="flex items-center gap-2 text-[16px] font-semibold leading-[16px] text-[#16161d]">
        <SetupIcon name="ai-sparkle.svg" />
        {t("onboarding.aside.insights.title")}
      </h3>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-[20px] font-semibold leading-[1.4] text-[#0f172a]">
            {t("onboarding.aside.insights.lead")}
            <br />
            <span className="text-[#0058da]">{t("onboarding.aside.insights.leadBrand")}</span>{" "}
            {t("onboarding.aside.insights.leadTail")}
          </p>
          <p className="text-[14px] font-medium leading-[1.4] text-[#58606c]">{t("onboarding.aside.insights.note")}</p>
        </div>

        <ul className="flex flex-col gap-3">
          {rows.map((row) => {
            const icon = INSIGHT_ICONS[row.id];
            return (
              <li key={row.id} className="flex items-center justify-between gap-2 rounded-[8px] bg-white px-2 py-3">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] bg-[#f1f5f9] text-[#0d6efd]">
                    {icon ? <SetupIcon name={icon} /> : <CatalogIcon name={row.icon} size={20} />}
                  </span>
                  <span className="flex min-w-0 flex-col gap-2">
                    <span className="text-[14px] font-semibold leading-[14px] text-[#0f172a]">{t(row.nameKey)}</span>
                    <span className="text-[12px] leading-[12px] text-[#58606c]">{t(row.descKey)}</span>
                  </span>
                </span>
                <SetupIcon name="done-filled.svg" />
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function VariantStep({
  typeCode,
  selected,
  onSelect,
}: {
  typeCode: string;
  selected: string | null;
  onSelect: (code: string) => void;
}) {
  const { locale } = useI18n();
  const variants = useBusinessVariants(typeCode);
  return (
    <CatalogGate source={variants}>
      {(items) => (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((variant) => {
            const image = VARIANT_IMAGES[variant.code];
            return (
              <button
                key={variant.code}
                type="button"
                onClick={() => onSelect(variant.code)}
                aria-pressed={selected === variant.code}
                className={clsx(
                  "flex flex-col items-start gap-2 rounded-[12px] border p-3 text-start transition-colors",
                  cardState(selected === variant.code)
                )}
              >
                <span className="flex w-full flex-col items-start gap-3">
                  {image ? (
                    <img src={typeIcon(image)} alt="" width={48} height={48} className="h-12 w-12 object-contain" />
                  ) : (
                    <span className="grid h-12 w-12 place-items-center rounded-[8px] bg-[#f1f5f9] text-[#0d6efd]">
                      <TypeIcon code={typeCode} />
                    </span>
                  )}
                  <span className="flex w-full flex-col gap-2">
                    <span className="text-[20px] font-semibold leading-[20px] text-[#0f172a]">{pick(variant.name, locale)}</span>
                    {variant.description && (
                      <span className="text-[12px] leading-[1.5] text-[#58606c]">{pick(variant.description, locale)}</span>
                    )}
                  </span>
                </span>
                {variant.fitHint && (
                  <span className="mt-auto flex w-full items-start gap-1 rounded-[8px] bg-[#f5f9ff] px-1 py-2">
                    <SetupIcon name="checkmark-done-circle.svg" />
                    <span className="min-w-0 flex-1 text-[12px] font-semibold leading-[1.5] text-[#0058da]">
                      {pick(variant.fitHint, locale)}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </CatalogGate>
  );
}

/** Enabling a module pulls in what it requires; disabling one drops whatever
 *  required it — same rule the old wizard applied to its local catalog, now
 *  driven by the offering's own `requiredModuleCodes`. */
function toggleModule(offerings: VariantOfferingsResponse, selected: string[], code: string, on: boolean): string[] {
  const byCode = new Map(offerings.modules.map((m) => [m.moduleCode, m]));
  const next = new Set(selected);
  if (on) {
    const add = (c: string) => {
      const m = byCode.get(c);
      if (!m || m.inclusion === "Mandatory" || next.has(c)) return;
      next.add(c);
      m.requiredModuleCodes.forEach(add);
    };
    add(code);
  } else {
    const drop = (c: string) => {
      if (!next.delete(c)) return;
      offerings.modules.filter((m) => m.requiredModuleCodes.includes(c)).forEach((m) => drop(m.moduleCode));
    };
    drop(code);
  }
  return [...next];
}

const SUMMARY_BENEFITS = [
  "onboarding.aside.summary.roleDashboards",
  "onboarding.aside.summary.realtime",
  "onboarding.aside.summary.automations",
  "onboarding.aside.summary.mobile",
];

function SummaryPanel({ count }: { count: number }) {
  const { t } = useI18n();
  return (
    <section className={clsx("flex h-full flex-col gap-3 rounded-[20px] px-3 py-4", PANEL_GRADIENT)}>
      <h3 className="flex items-center gap-2 text-[16px] font-semibold leading-[16px] text-[#16161d]">
        <SetupIcon name="ai-sparkle.svg" />
        {t("onboarding.aside.summary.title")}
      </h3>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <p className="text-[18px] font-semibold leading-[1.4] text-[#0f172a]">
          {t("onboarding.aside.summary.lead")}
          <br />
          {t("onboarding.aside.summary.count").replace("{n}", String(count))}
        </p>

        {/* The one flexible part: it takes whatever height the rest leaves. */}
        <img src={HERO_URL} alt="" className="min-h-0 w-full flex-1 object-contain" />

        <p className="rounded-[8px] bg-white px-2 py-1 text-[12px] font-semibold leading-[1.4] text-[#004bb9]">
          {t("onboarding.aside.summary.note")}
        </p>

        {/* Dropped on short screens so the picture keeps a readable size. */}
        <div className="flex flex-col gap-2 rounded-[8px] bg-white px-2 py-3 lg:[@media(max-height:960px)]:hidden">
          <p className="text-[14px] font-semibold leading-[14px] text-[#0f172a]">{t("onboarding.aside.summary.youGet")}</p>
          <ul className="flex flex-col gap-2">
            {SUMMARY_BENEFITS.map((key) => (
              <li key={key} className="flex items-center gap-1 text-[12px] leading-[12px] text-[#0f172a]">
                <SetupIcon name="done-outlined-16.svg" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FilterTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "rounded-[8px] px-3 py-1 text-[16px] font-medium leading-[16px] transition-colors",
        active ? "bg-[#0d6efd] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]" : "text-[#687280] hover:text-[#0f172a]"
      )}
    >
      {children}
    </button>
  );
}

function ModulesStep({
  variantCode,
  selected,
  onChange,
}: {
  variantCode: string;
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const { t, locale } = useI18n();
  const offerings = useVariantOfferings(variantCode);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "selected">("all");
  return (
    <CatalogGate source={offerings}>
      {(data) => {
        const isOn = (m: VariantOfferingsResponse["modules"][number]) => m.inclusion === "Mandatory" || selected.includes(m.moduleCode);
        const needle = query.trim().toLowerCase();
        const all = [...data.modules].sort((a, b) => a.sortOrder - b.sortOrder);
        // The count is of everything switched on, independent of the search
        // query — it must not shrink just because a query narrows the grid.
        const onCount = all.filter(isOn).length;
        const shown = all.filter(
          (m) => (!needle || pick(m.name, locale).toLowerCase().includes(needle)) && (filter === "all" || isOn(m))
        );
        return (
          // On a desktop the whole step fits one screen: this column takes the
          // height the wizard leaves it, and only the card grid would scroll
          // (inside itself, with no scrollbar drawn) if the catalog ever outgrew it.
          <div className="flex flex-col gap-5 lg:min-h-0 lg:flex-1">
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-[12px] border border-[#e2e8f0] bg-white px-4 py-2 focus-within:border-[#0d6efd]">
                <SetupIcon name="search.svg" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("onboarding.modules.search")}
                  aria-label={t("onboarding.modules.search")}
                  className="min-w-0 flex-1 bg-transparent text-[14px] font-medium leading-[24px] text-[#0f172a] placeholder:text-[#687280] focus:outline-none"
                />
              </label>
              <div className="flex items-center gap-2 rounded-[12px] bg-[#f5f9ff] px-3 py-2">
                <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
                  {t("onboarding.modules.all")}
                </FilterTab>
                <FilterTab active={filter === "selected"} onClick={() => setFilter("selected")}>
                  {t("onboarding.modules.selected").replace("{n}", String(onCount))}
                </FilterTab>
              </div>
            </div>

            <div className="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_282px] lg:grid-rows-[minmax(0,1fr)]">
              <div className="grid content-start gap-2.5 sm:grid-cols-2 min-[1200px]:grid-cols-3 lg:min-h-0 lg:overflow-y-auto lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
                {shown.map((module) => {
                  const mandatory = module.inclusion === "Mandatory";
                  const on = isOn(module);
                  const priced = module.pricingMode === "Priced" && module.amountMinor !== null;
                  const icon = MODULE_ICONS[module.moduleCode];
                  const description = pick(module.description, locale);
                  return (
                    <article key={module.moduleCode} className="flex flex-col gap-2 rounded-[12px] border border-[#cbd5e1] p-2.5">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#f1f5f9] text-[#0d6efd]">
                          {icon ? <SetupIcon name={icon} /> : <Puzzle size={26} strokeWidth={1.5} />}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <h3 className="truncate text-[16px] font-semibold leading-[20px] text-[#0f172a]">{pick(module.name, locale)}</h3>
                          {!mandatory && priced && (
                            <p className="text-[12px] font-semibold leading-[16px] text-[#0058da]">
                              {formatMinor(module.amountMinor as number, data.currency, locale)}
                              <span className="ms-1 font-normal text-[#58606c]">{t("pricing.perMonth")}</span>
                            </p>
                          )}
                        </div>
                        {/* A mandatory module is part of the plan: its switch is
                            locked on, and says so. */}
                        {mandatory && <Lock size={14} className="shrink-0 text-[#58606c]" aria-hidden />}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={pick(module.name, locale)}
                          disabled={mandatory}
                          title={mandatory ? t("onboarding.baseSection") : undefined}
                          onClick={() => onChange(toggleModule(data, selected, module.moduleCode, !on))}
                          className={clsx(
                            "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                            on ? "bg-[#0d6efd]" : "bg-[#cbd5e1]",
                            mandatory ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                          )}
                        >
                          <span
                            className={clsx(
                              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.1)] transition-all",
                              on ? "start-[18px]" : "start-0.5"
                            )}
                          />
                        </button>
                      </div>

                      {description && (
                        <p title={description} className="line-clamp-2 text-[12px] leading-[1.5] text-[#58606c]">
                          {description}
                        </p>
                      )}
                      {module.requiredModuleCodes.length > 0 && (
                        <p className="truncate text-[12px] leading-[1.5] text-[#58606c]">
                          {t("setup.modules.requires").replace(
                            "{names}",
                            module.requiredModuleCodes
                              .map((c) => pick(data.modules.find((m) => m.moduleCode === c)?.name, locale) || c)
                              .join(", ")
                          )}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
              <aside className="min-w-0 lg:min-h-0">
                <SummaryPanel count={onCount} />
              </aside>
            </div>
          </div>
        );
      }}
    </CatalogGate>
  );
}

const addOnKey = (a: AddOnSelection) => `${a.categoryCode}:${a.providerCode}`;

/** A provider's mark, or its initial on a tint when there is no artwork for
 *  the code (or the file fails to load). Wide marks sit at the top of the box,
 *  the way the frames place them. */
function ProviderLogo({ code, name, size }: { code: string; name: string; size: number }) {
  const [failed, setFailed] = useState(false);
  const logo = PROVIDERS[code]?.logo;
  const box = { width: size, height: size };
  if (logo && !failed) {
    return (
      <span style={box} className="block shrink-0 overflow-hidden">
        <img src={integrationLogo(logo)} alt="" className="block h-full w-full object-contain object-top" onError={() => setFailed(true)} />
      </span>
    );
  }
  return (
    <span style={box} className="grid shrink-0 place-items-center rounded-[8px] bg-[#0d6efd]/10 text-[15px] font-bold text-[#0d6efd]">
      {name.charAt(0)}
    </span>
  );
}

function AddOnsStep({
  variantCode,
  effectiveModules,
  selected,
  onChange,
}: {
  variantCode: string;
  effectiveModules: Set<string>;
  selected: AddOnSelection[];
  onChange: (next: AddOnSelection[]) => void;
}) {
  const { t, locale } = useI18n();
  const offerings = useVariantOfferings(variantCode);
  return (
    <CatalogGate source={offerings}>
      {(data) => {
        const categories = data.integrationCategories.filter((c) => c.addOns.length > 0);
        if (categories.length === 0) {
          return <p className="rounded-[12px] bg-[#f1f5f9] px-4 py-3 text-[14px] text-[#58606c]">{t("setup.addons.none")}</p>;
        }
        return (
          <div className="flex flex-col gap-10">
            {[...categories].sort((a, b) => a.sortOrder - b.sortOrder).map((category) => {
              const icon = CATEGORY_ICONS[category.categoryCode];
              return (
                <section key={category.categoryCode} className="flex flex-col gap-6">
                  <h3 className="flex items-center gap-1.5 text-[18px] font-semibold leading-[18px] text-[#0f172a]">
                    {icon ? <SetupIcon name={icon} /> : <Puzzle size={24} strokeWidth={1.5} />}
                    {pick(category.name, locale)}
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[...category.addOns].sort((a, b) => a.sortOrder - b.sortOrder).map((addOn) => {
                      const selection = { categoryCode: category.categoryCode, providerCode: addOn.providerCode };
                      const on = selected.some((s) => addOnKey(s) === addOnKey(selection));
                      const blocked = addOn.requiredModuleCode !== null && !effectiveModules.has(addOn.requiredModuleCode);
                      const name = pick(addOn.name, locale);
                      const descKey = PROVIDERS[addOn.providerCode]?.descKey;
                      const description = pick(addOn.description, locale) || (descKey ? t(descKey) : "");
                      return (
                        <label
                          key={addOn.providerCode}
                          className={clsx(
                            "flex items-start gap-3 rounded-[12px] border p-3 text-start transition-colors focus-within:ring-2 focus-within:ring-[#0d6efd]/25",
                            blocked ? "cursor-not-allowed opacity-55" : "cursor-pointer",
                            on ? "border-[#0d6efd] bg-[#f1f5f9]" : "border-[#cbd5e1] hover:border-[#0d6efd]/50"
                          )}
                        >
                          <ProviderLogo code={addOn.providerCode} name={name} size={56} />
                          <span className="flex min-w-0 flex-1 flex-col gap-2">
                            <span className="flex flex-col gap-1">
                              <span className="text-[16px] font-medium leading-[16px] text-[#0f172a]">{name}</span>
                              {description && <span className="text-[12px] leading-[1.5] text-[#58606c]">{description}</span>}
                              {blocked && (
                                <span className="text-[12px] leading-[1.5] text-[#58606c]">
                                  {t("setup.addons.requiresModule").replace("{code}", addOn.requiredModuleCode as string)}
                                </span>
                              )}
                            </span>
                            <span className="whitespace-nowrap text-[20px] font-semibold leading-[20px] text-[#0058da]">
                              {addOn.pricingMode === "Priced" && addOn.amountMinor !== null ? (
                                <>
                                  {formatMinor(addOn.amountMinor, data.currency, locale)}
                                  <span className="text-[10.32px] font-normal leading-[16px]">{t("pricing.perMonth")}</span>
                                </>
                              ) : (
                                t("setup.modules.included")
                              )}
                            </span>
                          </span>
                          <input
                            type="checkbox"
                            checked={on}
                            disabled={blocked}
                            onChange={(e) =>
                              onChange(
                                e.target.checked
                                  ? [...selected, selection]
                                  : selected.filter((s) => addOnKey(s) !== addOnKey(selection))
                              )
                            }
                            className="sr-only"
                            aria-label={name}
                          />
                          <SetupIcon name={on ? "checkbox-checked.svg" : "checkbox-default.svg"} />
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        );
      }}
    </CatalogGate>
  );
}

const PLAN_INCLUDES = [
  "onboarding.payment.includesDashboard",
  "onboarding.payment.includesModules",
  "onboarding.payment.includesPublicLink",
];

/** The blue rounded tile the plan and total cards are badged with. */
function CardBadge({ children }: { children: ReactNode }) {
  return <span className="grid h-[68px] w-[68px] shrink-0 place-items-center rounded-[12px] bg-[#0d6efd]">{children}</span>;
}

type PaymentPhase = "idle" | "paying" | "provisioning" | "done";

function PaymentStep({
  api,
  variantCode,
  onBack,
  onFinish,
  finishLabelKey,
}: {
  api: BusinessSetupApi;
  variantCode: string;
  onBack: () => void;
  onFinish: (businessId: string) => void;
  finishLabelKey: string;
}) {
  const { t, locale } = useI18n();
  const copy = useSetupCopy();
  const setup = api.setup as BusinessSetupResponse;
  const offerings = useVariantOfferings(variantCode);
  const [steppingBack, setSteppingBack] = useState(false);
  const variants = useBusinessVariants(setup.businessTypeCode);
  const [phase, setPhase] = useState<PaymentPhase>(setup.status === "Completed" ? "done" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(setup.provisioning?.businessId ?? null);

  // Display names for the quote's item codes: the plan is the variant, the
  // rest are modules and add-on providers from the offering.
  const names = useMemo(() => {
    const map = new Map<string, LocalizedText>();
    variants.data?.forEach((v) => map.set(v.code, v.name));
    offerings.data?.modules.forEach((m) => map.set(m.moduleCode, m.name));
    offerings.data?.integrationCategories.forEach((c) => c.addOns.forEach((a) => map.set(a.providerCode, a.name)));
    return map;
  }, [variants.data, offerings.data]);

  async function pay() {
    setError(null);
    setPhase("paying");
    try {
      // Both calls are safe to repeat (checkout is idempotent while awaiting
      // payment), so a merchant who reloads mid-way simply re-enters here.
      let current = api.setup as BusinessSetupResponse;
      if (current.status === "Draft") current = await api.startCheckout();
      if (current.status === "AwaitingPayment" && !current.allowedActions.includes("Checkout")) {
        // Verified at the provider but not applied yet: confirm applies it.
        if (current.allowedActions.includes("ConfirmPayment")) current = await api.confirmPayment();
      } else if (current.status === "AwaitingPayment") {
        const payment = current.payment;
        if (payment?.redirectUrl) {
          window.location.assign(payment.redirectUrl);
          return;
        }
        // Only the dev Fake gateway can be settled from here; a real provider's
        // client SDK / return route is not built yet (Moyasar is untested
        // backend-side), so say so instead of pretending to pay.
        if (payment?.clientParameters?.provider !== "fake") throw new Error("payment.provider-unsupported");
        current = await api.confirmPayment();
      }
      setPhase("provisioning");
      const deadline = Date.now() + PROVISIONING_TIMEOUT_MS;
      while (current.status !== "Completed") {
        if (Date.now() > deadline) throw new Error("setup.provisioning-timeout");
        await sleep(POLL_MS);
        current = await api.refresh();
      }
      setBusinessId(current.provisioning?.businessId ?? null);
      setPhase("done");
    } catch (err) {
      setPhase("idle");
      setError(
        err instanceof Error && err.message === "setup.provisioning-timeout"
          ? t("setup.error.timeout")
          : err instanceof Error && err.message === "payment.provider-unsupported"
            ? t("setup.error.provider")
            : describeError(err, t("setup.error.payment"))
      );
    }
  }

  // A checkout in progress freezes the setup: to edit again it must first be
  // stepped back to Draft. Paid/Completed setups have nowhere to go back to.
  const awaiting = setup.status === "AwaitingPayment";
  const canGoBack = setup.status === "Draft" || (awaiting && setup.allowedActions.includes("CancelCheckout"));

  async function back() {
    if (!awaiting) {
      onBack();
      return;
    }
    setError(null);
    setSteppingBack(true);
    try {
      await api.cancelCheckout();
      onBack();
    } catch (err) {
      if (err instanceof ApiError && err.problem?.errorCode === "onboarding.checkout.already-paid") {
        // The provider settled it first: the setup is now Paid. Reload so Pay
        // continues into provisioning instead of retrying the payment.
        await api.refresh().catch(() => undefined);
        setError(copy("checkout.alreadyPaid"));
      } else {
        setError(describeError(err, copy("checkout.cancelFailed")));
      }
    } finally {
      setSteppingBack(false);
    }
  }

  const quote = setup.quote;
  const dialog = "!max-w-[750px] !rounded-[44px] !p-6";
  const scrim = "bg-black/60";
  const busy = phase === "paying" || phase === "provisioning";
  // Drive Pay from allowedActions rather than canCheckout, which is only ever
  // true for a Draft — a resumed AwaitingPayment / Paid setup must still be
  // able to carry on.
  const canPay =
    setup.status === "Paid" ||
    setup.allowedActions.includes("Checkout") ||
    setup.allowedActions.includes("ConfirmPayment");

  // The frames offer a choice of method, but the checkout itself is opened by
  // the backend's gateway, which takes no method from here — so the pick is
  // kept on screen only and never gates Pay.
  const [method, setMethod] = useState<string | null>(null);

  const money = (n: number) => formatMinor(n, quote?.currency ?? "SAR", locale);
  const planLines = quote?.lines.filter((line) => line.group === "Plan") ?? [];
  const extraLines = quote?.lines.filter((line) => line.group !== "Plan") ?? [];
  const planAmount = planLines.reduce((sum, line) => sum + line.amountMinor, 0);
  const panel = "rounded-[24px] border border-[#0d6efd] bg-[#f1f5f9] p-6";
  // "Pay {amount} / month": the amount is set at full size, what follows it small.
  const [payBefore, payAfter = ""] = t("onboarding.payment.pay").split("{amount}");

  return (
    <div className="flex flex-col gap-6">
      {setup.issues.length > 0 && (
        <ul role="alert" className="flex flex-col gap-1.5 rounded-xl border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-4 py-3 text-[13.5px] text-[#B45309]">
          {setup.issues.map((issue) => (
            <li key={issue.code} className="flex items-start gap-2">
              <TriangleAlert size={16} className="mt-0.5 shrink-0" />
              <span>
                <IssueText issue={issue} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {awaiting && setup.allowedActions.includes("CancelCheckout") && (
        <p className="rounded-xl border border-[#0d6efd]/30 bg-[#f5f9ff] px-4 py-3 text-[13.5px] text-[#58606c]">
          {copy("checkout.awaiting")}
        </p>
      )}

      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6">
          {quote ? (
            <>
              <section className={clsx("flex items-start gap-4", panel)}>
                <CardBadge>
                  <SetupIcon name="logo-white.svg" />
                </CardBadge>
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <h3 className="text-[24px] font-bold leading-[24px] text-[#0f172a]">{t("onboarding.payment.plan")}</h3>
                    <p className="whitespace-nowrap text-[32px] font-bold leading-[32px] text-[#0058da]">
                      {money(planAmount)}{" "}
                      <span className="text-[12px] font-normal leading-[12px]">{t("pricing.perMonth")}</span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <p className="text-[18px] font-semibold leading-[18px] text-[#0f172a]">{t("onboarding.payment.includes")}</p>
                    <ul className="flex flex-col gap-2">
                      {PLAN_INCLUDES.map((key) => (
                        <li key={key} className="flex items-center gap-1 text-[16px] font-medium leading-[16px] text-[#0f172a]">
                          <SetupIcon name="done-outlined-20.svg" />
                          {t(key)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {extraLines.length > 0 && (
                <section className={clsx("flex flex-col gap-4", panel)}>
                  <h3 className="text-[20px] font-medium leading-[20px] text-[#0f172a]">{t("onboarding.review.integrations")}:</h3>
                  <ul className="flex flex-col gap-2">
                    {extraLines.map((line) => {
                      const name = pick(names.get(line.itemCode), locale) || line.itemCode;
                      return (
                        <li
                          key={`${line.kind}:${line.categoryCode ?? ""}:${line.itemCode}`}
                          className="flex min-h-10 items-center justify-between gap-4"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {line.categoryCode !== null && <ProviderLogo code={line.itemCode} name={name} size={40} />}
                            <span className="truncate text-[16px] font-medium leading-[16px] text-[#58606c]">{name}:</span>
                          </span>
                          <span className="whitespace-nowrap text-[24px] font-bold leading-[24px] text-[#0f172a]">
                            {money(line.amountMinor)}{" "}
                            <span className="text-[8px] font-normal leading-[8px]">{t("pricing.perMonth")}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

              <section className={clsx("flex items-start gap-3", panel)}>
                <CardBadge>
                  <SetupIcon name="moneys-white.svg" />
                </CardBadge>
                <div className="flex min-w-0 flex-1 flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                    <h3 className="text-[24px] font-bold leading-[24px] text-[#0f172a]">{t("onboarding.review.total")}</h3>
                    <p className="whitespace-nowrap text-[24px] font-bold leading-[24px] text-[#0058da]">
                      {money(quote.totalMinor)}{" "}
                      <span className="text-[12px] font-normal leading-[12px]">{t("pricing.perMonth")}</span>
                    </p>
                  </div>
                  <p className="text-[12px] leading-[12px] text-[#58606c]">
                    {t("setup.payment.subtotal")} {money(quote.subtotalMinor)} ·{" "}
                    {t("setup.payment.tax").replace("{rate}", String(quote.taxRateBasisPoints / 100))} {money(quote.taxMinor)}
                  </p>
                  <p className="flex items-center gap-1 rounded-[12px] bg-[#fff4e1] p-3 text-[20px] leading-[20px] text-[#ae7100]">
                    <SetupIcon name="error-outline.svg" />
                    {t("onboarding.payment.renewNote")}
                  </p>
                </div>
              </section>
            </>
          ) : (
            <p className="text-[14px] text-[#58606c]">{t("setup.payment.noQuote")}</p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="text-[32px] font-bold leading-[32px] text-[#0f172a]">{t("onboarding.payment.methods")}</h2>

          <fieldset className="flex flex-col gap-6">
            <legend className="sr-only">{t("onboarding.payment.methods")}</legend>
            {PAYMENT_METHODS.map((option) => {
              const active = method === option.id;
              const icon = PAYMENT_ICONS[option.id];
              return (
                <label
                  key={option.id}
                  className={clsx(
                    "flex cursor-pointer items-center justify-between gap-4 rounded-[24px] border px-4 py-3 text-start transition-colors focus-within:ring-2 focus-within:ring-[#0d6efd]/25",
                    active ? "border-[#0d6efd] bg-[#ebf3ff]" : "border-transparent bg-[#f5f0ff] hover:bg-[#ede6ff]"
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.id}
                    checked={active}
                    onChange={() => setMethod(option.id)}
                    className="sr-only"
                  />
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center">{icon && <SetupIcon name={icon} />}</span>
                    <span className={clsx("text-[18px] font-bold leading-[18px]", active ? "text-[#0d6efd]" : "text-[#0f172a]")}>
                      {t(option.labelKey)}
                    </span>
                  </span>
                  <SetupIcon name={active ? "radio-on.svg" : "radio-off.svg"} />
                </label>
              );
            })}
          </fieldset>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-[13.5px] text-[#DC2626]">
          {error}
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 lg:grid-cols-[384px_minmax(0,1fr)]">
        <Button
          variant="secondary"
          onClick={() => void back()}
          disabled={busy || steppingBack || !canGoBack}
          className={clsx(FOOTER_BUTTON, BACK_BUTTON)}
        >
          {steppingBack && <Loader2 size={15} className="me-2 animate-spin" />}
          {awaiting ? copy("checkout.backToEdit") : t("onboarding.back")}
        </Button>
        <Button variant="primary" disabled={!canPay || busy || steppingBack} onClick={() => void pay()} className={FOOTER_BUTTON}>
          {quote ? (
            <span>
              {payBefore}
              {money(quote.totalMinor)}
              <span className="text-[11.61px]">{payAfter}</span>
            </span>
          ) : (
            t("setup.payment.payNoAmount")
          )}
        </Button>
      </div>

      {/* Neither dialog can be dismissed: there is nothing sensible to return
          to mid-payment, and after it the only way on is into the business. */}
      <Modal open={busy} onClose={() => undefined} dismissible={false} className={dialog} backdropClassName={scrim}>
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={PAYMENT_SPINNER_URL} alt="" className="h-[218px] w-[218px] animate-spin object-contain [animation-duration:1.4s]" />
          <div className="flex w-full flex-col gap-4">
            <p className="text-[32px] font-bold leading-[32px] text-[#0f172a]">
              {t(phase === "provisioning" ? "setup.provisioning.title" : "onboarding.payment.processing")}
            </p>
            <p className="text-[20px] leading-[20px] text-[#58606c]">
              {t(phase === "provisioning" ? "setup.provisioning.note" : "onboarding.payment.processingNote")}
            </p>
          </div>
        </div>
      </Modal>

      <Modal open={phase === "done"} onClose={() => undefined} dismissible={false} className={dialog} backdropClassName={scrim}>
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={PAYMENT_STAMP_URL} alt="" className="h-[218px] w-[218px] object-contain" />
          <div className="flex w-full flex-col gap-4">
            <p className="text-[32px] font-bold leading-[32px] text-[#0f172a]">{t("onboarding.payment.success")}</p>
            <p className="text-[20px] leading-[1.4] text-[#58606c]">{t("onboarding.payment.successNote")}</p>
          </div>
          <Button
            variant="primary"
            disabled={!businessId}
            className={clsx("w-full", FOOTER_BUTTON)}
            onClick={() => businessId && onFinish(businessId)}
          >
            {t(finishLabelKey)}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ---- resume / cancel / live price ------------------------------------------------

function ResumeBanner({
  businessName,
  updatedAtUtc,
  canStartOver,
  onStartOver,
  onDismiss,
}: {
  businessName: string | null;
  updatedAtUtc: string;
  canStartOver: boolean;
  onStartOver: () => void;
  onDismiss: () => void;
}) {
  const { locale } = useI18n();
  const copy = useSetupCopy();
  const when = new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    numberingSystem: "latn",
  }).format(new Date(updatedAtUtc));
  return (
    <div className="mb-6 flex flex-wrap items-start gap-3 rounded-xl border border-[#0D6EFD]/30 bg-[#f2f7ff] px-4 py-3">
      <History size={16} className="mt-0.5 shrink-0 text-[#0D6EFD]" />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{copy("resume.title")}</p>
        <p className="mt-0.5 text-[12.5px] text-[var(--octo-text-muted)]">
          {copy("resume.note")
            .replace("{name}", businessName ? ` — “${businessName}”` : "")
            .replace("{when}", when)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {canStartOver && (
          <Button variant="ghost" onClick={onStartOver} className="!text-[12.5px] !font-semibold text-[#0D6EFD]">
            {copy("resume.startOver")}
          </Button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          aria-label={copy("resume.dismiss")}
          className="grid h-7 w-7 place-items-center rounded-lg text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}

/** The running monthly total pinned to the foot of the modules and
 *  integrations steps. The figure is the backend's own preview of the unsaved
 *  selection; the arrow opens its subtotal and VAT. */
function LivePriceBar({ preview, locale, compact = false }: { preview: QuotePreviewState; locale: string; compact?: boolean }) {
  const { t } = useI18n();
  const copy = useSetupCopy();
  const [open, setOpen] = useState(false);
  const { quote, loading, issues, error } = preview;
  let note: ReactNode = null;
  if (loading || (!quote && !error && issues.length === 0)) note = copy("live.updating");
  else if (issues.length > 0)
    note = (
      <span className="text-[#B45309]">
        {copy("live.invalid")}: <IssueText issue={issues[0]} />
      </span>
    );
  else if (error) note = <span className="text-[#DC2626]">{copy("live.failed")}</span>;

  const priced = quote && !error ? quote : null;

  return (
    <div
      aria-live="polite"
      className="sticky bottom-0 z-20 border-t-[0.5px] border-[#cbd5e1] bg-[var(--octo-page-bg)] shadow-[0_-8px_20px_0_rgba(15,23,42,0.05)]"
    >
      {open && priced && (
        <dl className="mx-auto flex max-w-[1248px] flex-col gap-1.5 px-6 pt-4 text-[12px]">
          <div className="flex items-center justify-between">
            <dt className="text-[#58606c]">{t("setup.payment.subtotal")}</dt>
            <dd className="font-medium text-[#0f172a]">{formatMinor(priced.subtotalMinor, priced.currency, locale)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[#58606c]">{t("setup.payment.tax").replace("{rate}", String(priced.taxRateBasisPoints / 100))}</dt>
            <dd className="font-medium text-[#0f172a]">{formatMinor(priced.taxMinor, priced.currency, locale)}</dd>
          </div>
        </dl>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={clsx("mx-auto flex w-full max-w-[1248px] items-center justify-between gap-4 px-6 text-start", compact ? "py-5" : "py-10")}
      >
        <span className="flex flex-wrap items-center gap-3">
          <span className="text-[14px] font-semibold uppercase leading-[14px] text-[#58606c]">{t("pricing.monthlyTotal")}:</span>
          <span className={clsx("flex items-end gap-0.5 whitespace-nowrap transition-opacity", loading && "opacity-60")}>
            <span className={clsx("text-[32px] font-bold leading-[32px]", priced ? "text-[#0058da]" : "text-[#58606c]")}>
              {priced ? formatMinor(priced.totalMinor, priced.currency, locale) : "—"}
            </span>
            {priced && <span className="text-[12px] leading-[12px] text-[#58606c]">{t("pricing.perMonth")}</span>}
          </span>
          {note && (
            <span className="flex items-center gap-1.5 text-[12px] text-[#58606c]">
              {loading && <Loader2 size={13} className="animate-spin text-[#0d6efd]" />}
              {note}
            </span>
          )}
        </span>
        <SetupIcon name="arrow-down.svg" className={clsx("transition-transform duration-200", open && "rotate-180")} />
      </button>
    </div>
  );
}

// ---- the wizard --------------------------------------------------------------------

export interface SetupWizardProps {
  /** Header above the rail. The welcome frame carries a taller bar (help,
   *  language, avatar) than the steps' logo-only one, so a host can render it
   *  from whether the welcome page is showing. */
  chrome?: ReactNode | ((welcome: boolean) => ReactNode);
  containerClassName?: string;
  /** Called with the new business's id once it is Active and the merchant
   *  chose to enter it. The host decides where that goes. */
  onFinish: (businessId: string) => void | Promise<void>;
  finishLabelKey?: string;
  /** Opens on the business profile instead of the welcome page — for a
   *  merchant who is already in and is adding another business. */
  skipWelcome?: boolean;
}

/** The step to resume at, from how far the server-side setup already got. */
function resumeStep(setup: BusinessSetupResponse): number {
  if (setup.status !== "Draft") return LAST;
  if (!setup.businessTypeCode || !setup.businessName) return PROFILE;
  if (!setup.businessVariantCode) return PROFILE + 1;
  return MODULES;
}

export function SetupWizard({
  chrome,
  containerClassName,
  onFinish,
  finishLabelKey = "onboarding.payment.goToDashboard",
  skipWelcome = false,
}: SetupWizardProps) {
  const { t, locale } = useI18n();
  const copy = useSetupCopy();
  const api = useBusinessSetup();
  const { setup } = api;

  const firstStep = skipWelcome ? PROFILE : 0;
  const [step, setStep] = useState(firstStep);
  const [typeCode, setTypeCode] = useState<string | null>(null);
  const [variantCode, setVariantCode] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [modules, setModules] = useState<string[]>([]);
  const [addOns, setAddOns] = useState<AddOnSelection[]>([]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Hydrate the local selections from the server copy once per setup: when the
  // (possibly resumed) setup first arrives, and again after "start over"
  // swaps in a fresh one.
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!setup || hydratedFor.current === setup.setupId) return;
    const firstArrival = hydratedFor.current === null;
    hydratedFor.current = setup.setupId;
    setTypeCode(setup.businessTypeCode);
    setVariantCode(setup.businessVariantCode);
    setName(setup.businessName ?? "");
    setModules(setup.selectedModuleCodes);
    setAddOns(setup.selectedAddOns);
    // A brand-new setup opens on the welcome page (or wherever the merchant
    // already clicked through to while it loaded); a resumed one, or the fresh
    // one "start over" swaps in, goes straight to where there is work to do.
    const untouched = setup.status === "Draft" && !setup.businessTypeCode && !setup.businessName;
    if (!(firstArrival && untouched)) setStep(resumeStep(setup));
  }, [setup]);

  const current = STEPS[step];

  function canContinue(): boolean {
    switch (current.id) {
      case "profile":
        // Backend rule (BusinessName): trimmed, 2-100 characters.
        return typeCode !== null && name.trim().length >= 2;
      case "variant":
        return variantCode !== null;
      default:
        return true;
    }
  }

  async function goNext() {
    if (!setup || saving) return;
    setSaving(true);
    setActionError(null);
    try {
      // Only write what changed: PUT-ing an identical value would bump the
      // setup's version for nothing.
      if (current.id === "profile") {
        if (typeCode && typeCode !== setup.businessTypeCode) await api.saveType(typeCode);
        if (name.trim() !== (setup.businessName ?? "")) await api.saveName(name.trim());
      }
      if (current.id === "variant" && variantCode && variantCode !== setup.businessVariantCode) await api.saveVariant(variantCode);
      if (current.id === "modules") await api.saveModules(modules);
      if (current.id === "addons") await api.saveAddOns(addOns);
      setStep((s) => Math.min(LAST, s + 1));
    } catch (err) {
      setActionError(describeError(err, t("setup.error.save")));
    } finally {
      setSaving(false);
    }
  }

  function onSelectType(code: string) {
    if (code === typeCode) return;
    setTypeCode(code);
    // A different type invalidates everything chosen beneath it.
    setVariantCode(null);
    setModules([]);
    setAddOns([]);
  }

  function onSelectVariant(code: string) {
    if (code === variantCode) return;
    setVariantCode(code);
    setModules([]);
    setAddOns([]);
  }

  const offerings = useVariantOfferings(step >= MODULES ? variantCode : null);
  const effectiveModules = useMemo(() => {
    const set = new Set(modules);
    offerings.data?.modules.filter((m) => m.inclusion === "Mandatory").forEach((m) => set.add(m.moduleCode));
    return set;
  }, [modules, offerings.data]);

  // Live price for the unsaved selection, on the two steps that change it.
  // Add-ons the current modules can't carry are left out, so unticking a
  // module shows the price of what would actually be saved rather than a 422.
  const livePricing = (current.id === "modules" || current.id === "addons") && offerings.data !== null;
  const previewAddOns = useMemo(() => {
    const data = offerings.data;
    if (!data) return [];
    return addOns.filter((a) => {
      const offer = data.integrationCategories
        .find((c) => c.categoryCode === a.categoryCode)
        ?.addOns.find((p) => p.providerCode === a.providerCode);
      return offer !== undefined && (offer.requiredModuleCode === null || effectiveModules.has(offer.requiredModuleCode));
    });
  }, [addOns, offerings.data, effectiveModules]);
  const preview = useQuotePreview(livePricing ? variantCode : null, modules, previewAddOns);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function cancelAndRestart() {
    setCancelling(true);
    setCancelError(null);
    try {
      await api.cancelAndRestart();
      // The hydration effect resets every selection from the fresh setup.
      setActionError(null);
      setConfirmCancel(false);
    } catch (err) {
      setCancelError(describeError(err, copy("cancel.failed")));
    } finally {
      setCancelling(false);
    }
  }

  let body: ReactNode = null;
  if (api.state === "loading") {
    body = (
      <p className="flex items-center gap-2 text-[14px] text-[var(--octo-text-muted)]">
        <Loader2 size={16} className="animate-spin" />
        {t("setup.loading")}
      </p>
    );
  } else if (api.state === "error" || !setup) {
    body = (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-[13.5px] text-[#DC2626]">
        <span>{t("setup.error.start")}</span>
        <button type="button" onClick={api.retry} className="font-semibold underline underline-offset-2">
          {t("setup.retry")}
        </button>
      </div>
    );
  } else {
    switch (current.id) {
      case "welcome":
        body = <GetStartedHero onStart={() => setStep(PROFILE)} />;
        break;
      case "profile":
        body = <ProfileStep name={name} onName={setName} selected={typeCode} onSelect={onSelectType} />;
        break;
      case "variant":
        body = typeCode ? <VariantStep typeCode={typeCode} selected={variantCode} onSelect={onSelectVariant} /> : null;
        break;
      case "modules":
        body = variantCode ? <ModulesStep variantCode={variantCode} selected={modules} onChange={setModules} /> : null;
        break;
      case "addons":
        body = variantCode ? (
          <AddOnsStep variantCode={variantCode} effectiveModules={effectiveModules} selected={addOns} onChange={setAddOns} />
        ) : null;
        break;
      case "payment":
        body = variantCode ? (
          <PaymentStep
            api={api}
            variantCode={variantCode}
            onBack={() => setStep(LAST - 1)}
            onFinish={(id) => void onFinish(id)}
            finishLabelKey={finishLabelKey}
          />
        ) : null;
        break;
    }
  }

  const ready = api.state === "ready" && Boolean(setup);
  const canCancelSetup = ready && Boolean(setup?.allowedActions.includes("CancelSetup")) && !saving;
  const hasProgress = Boolean(setup?.businessTypeCode || setup?.businessName || typeCode);
  const welcome = current.id === "welcome";

  // The modules step is laid out to fit one desktop screen with no page scroll.
  const fitScreen = current.id === "modules";

  const heading = !welcome && (
    <div className={clsx("flex flex-col", current.id === "variant" ? "gap-6" : "gap-4", current.tall && "min-h-[124px]")}>
      <div className="flex items-center justify-between gap-3">
        <span className="block text-[14px] font-medium leading-[14px] text-[#58606c]">
          {t("onboarding.step").replace("{n}", String(step + 1)).replace("{total}", String(RAIL_KEYS.length))}
        </span>
        {canCancelSetup && hasProgress && (
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            className="text-[12px] font-medium leading-[14px] text-[#58606c] underline-offset-2 hover:text-[#DC2626] hover:underline"
          >
            {copy("cancel.link")}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <h1 className="text-[32px] font-semibold leading-[1.1] text-[#0f172a] sm:text-[40px] sm:leading-[40px]">
          {t(current.titleKey)}
        </h1>
        <p className={clsx("text-[#58606c]", current.id === "variant" ? "text-[20px] leading-[20px]" : "text-[16px] leading-[1.5]")}>
          {t(current.subtitleKey)}
        </p>
      </div>
    </div>
  );

  return (
    // Light-only, like every Setup frame: re-declaring the light palette here
    // beats the dark one on <html> for this subtree alone. The welcome frame
    // sits on white, the steps on the frames' off-white.
    <div
      data-theme="light"
      style={{ "--octo-page-bg": welcome ? "#ffffff" : "#fbfafc" } as CSSProperties}
      className={clsx("flex flex-col", containerClassName, fitScreen && "lg:h-screen lg:overflow-hidden")}
    >
      {typeof chrome === "function" ? chrome(welcome) : chrome}

      <main
        className={clsx(
          "mx-auto w-full max-w-[1248px] flex-1 px-6 py-12",
          fitScreen && "lg:flex lg:min-h-0 lg:flex-col lg:py-4"
        )}
      >
        {!welcome && (
          <div className={clsx("mb-12", fitScreen && "lg:mb-5")}>
            <SetupRail step={setup?.status === "Completed" ? RAIL_KEYS.length : step + 1} labelKeys={RAIL_KEYS} />
          </div>
        )}

        {ready && setup && api.resumed && !welcome && (
          <ResumeBanner
            businessName={api.resumed.businessName}
            updatedAtUtc={api.resumed.updatedAtUtc}
            canStartOver={canCancelSetup}
            onStartOver={() => setConfirmCancel(true)}
            onDismiss={api.dismissResumed}
          />
        )}

        {welcome ? (
          body
        ) : current.id === "profile" ? (
          // The frame wraps this step's heading and grid in one white panel,
          // with the AI Insights aside outside it.
          <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_384px]">
            <section className="min-w-0 rounded-[28px] bg-white p-4 shadow-[0_0_12px_0_rgba(0,0,0,0.12)]">
              {heading}
              <div className={current.bodyGap}>{body}</div>
            </section>
            <aside className="min-w-0">
              <InsightsPanel />
            </aside>
          </div>
        ) : (
          <>
            {heading}
            <div className={current.bodyGap}>{body}</div>
          </>
        )}

        {actionError && (
          <p role="alert" className="mt-6 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-[13.5px] text-[#DC2626]">
            {actionError}
          </p>
        )}

        {ready && !welcome && current.id !== "payment" && (
          <div
            className={clsx("grid gap-6", current.footerGap)}
            style={{ gridTemplateColumns: step > firstStep ? "repeat(2,minmax(0,1fr))" : "minmax(0,1fr)" }}
          >
            {step > firstStep && (
              <Button
                variant="secondary"
                onClick={() => {
                  setActionError(null);
                  setStep((s) => Math.max(firstStep, s - 1));
                }}
                disabled={saving}
                className={clsx(FOOTER_BUTTON, BACK_BUTTON)}
              >
                {t("onboarding.back")}
              </Button>
            )}
            <Button variant="primary" disabled={!canContinue() || saving} onClick={() => void goNext()} className={FOOTER_BUTTON}>
              {saving && <Loader2 size={15} className="me-2 animate-spin" />}
              {t("onboarding.next")}
            </Button>
          </div>
        )}
      </main>

      {ready && livePricing && <LivePriceBar preview={preview} locale={locale} compact={fitScreen} />}

      <Modal
        open={confirmCancel}
        onClose={() => !cancelling && setConfirmCancel(false)}
        title={copy("cancel.title")}
        className="!max-w-[460px]"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)} disabled={cancelling}>
              {copy("cancel.keep")}
            </Button>
            <Button variant="danger" onClick={() => void cancelAndRestart()} disabled={cancelling}>
              {cancelling && <Loader2 size={14} className="me-2 animate-spin" />}
              {copy("cancel.confirm")}
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-[var(--octo-text-secondary)]">{copy("cancel.body")}</p>
        {cancelError && (
          <p role="alert" className="mt-3 rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/5 px-3 py-2 text-[12.5px] text-[#DC2626]">
            {cancelError}
          </p>
        )}
      </Modal>
    </div>
  );
}
