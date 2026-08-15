import { useEffect, useState } from "react";
import {
  UtensilsCrossed, Coffee, Croissant, ChefHat, Truck, Store, PartyPopper, Check, Info, LayoutGrid, CircleCheck,
} from "lucide-react";
import { Badge, Button, Modal } from "@ui/primitives";
import clsx from "clsx";
import {
  moduleCards, packCards, type ModuleCard, type ModuleTier, type PackPlan,
} from "@/shared/api/mock-settings-modules";
import { useI18n } from "@/app/providers/i18n-provider";

const TYPE_ICONS: Record<string, React.ElementType> = {
  Restaurant: UtensilsCrossed,
  Café: Coffee,
  Bakery: Croissant,
  "Cloud Kitchen": ChefHat,
  "Food Truck": Truck,
  Kiosk: Store,
  Catering: PartyPopper,
};
const TYPE_KEY: Record<string, string> = {
  Restaurant: "settings.modules.type.restaurant",
  Café: "settings.modules.type.cafe",
  Bakery: "settings.modules.type.bakery",
  "Cloud Kitchen": "settings.modules.type.cloudKitchen",
  "Food Truck": "settings.modules.type.foodTruck",
  Kiosk: "settings.modules.type.kiosk",
  Catering: "settings.modules.type.catering",
};

const RESTAURANT_TYPES = Object.keys(TYPE_ICONS);

const MODULE_KEY: Record<string, string> = {
  "Orders & POS": "settings.modules.name.orders",
  "Tax Invoicing (ZATCA)": "settings.modules.name.tax",
  Payments: "settings.modules.name.payments",
  "Bookings & Reservations": "settings.modules.name.bookings",
  "Customers / CRM": "settings.modules.name.customers",
  "Core Settings": "settings.modules.name.core",
  Inventory: "settings.modules.name.inventory",
  Accounting: "settings.modules.name.accounting",
  "Loyalty & Marketing": "settings.modules.name.loyalty",
  "HR / Staff": "settings.modules.name.hr",
  Messaging: "settings.modules.name.messaging",
  "Integration Hub": "settings.modules.name.integrations",
};

const DESC_KEY: Record<string, string> = {
  "Orders & POS": "settings.modules.desc.orders",
  "Tax Invoicing (ZATCA)": "settings.modules.desc.tax",
  Payments: "settings.modules.desc.payments",
  "Bookings & Reservations": "settings.modules.desc.bookings",
  "Customers / CRM": "settings.modules.desc.customers",
  "Core Settings": "settings.modules.desc.core",
  Inventory: "settings.modules.desc.inventory",
  Accounting: "settings.modules.desc.accounting",
  "Loyalty & Marketing": "settings.modules.desc.loyalty",
  "HR / Staff": "settings.modules.desc.hr",
  Messaging: "settings.modules.desc.messaging",
  "Integration Hub": "settings.modules.desc.integrations",
};

const TIER_TONE: Record<ModuleTier, "success" | "info" | "warning"> = {
  Included: "success",
  "Add-on": "info",
  Enterprise: "warning",
};
const TIER_KEY: Record<ModuleTier, string> = {
  Included: "settings.modules.tier.included",
  "Add-on": "settings.modules.tier.addOn",
  Enterprise: "settings.modules.tier.enterprise",
};

const PLAN_KEY: Record<PackPlan, string> = {
  Lite: "settings.modules.plan.lite",
  Core: "settings.modules.plan.core",
  Growth: "settings.modules.plan.growth",
};

const PACK_DESC_KEY: Record<PackPlan, string> = {
  Lite: "settings.modules.packDesc.lite",
  Core: "settings.modules.packDesc.core",
  Growth: "settings.modules.packDesc.growth",
};

const INCLUDE_KEY: Record<string, string> = {
  "1 branch": "settings.modules.include.branch1",
  "1 device per branch": "settings.modules.include.devicePerBranch",
  "Orders & POS": "settings.modules.include.ordersPos",
  "Standard support": "settings.modules.include.standardSupport",
  "5 branches": "settings.modules.include.branches5",
  "Unlimited devices": "settings.modules.include.unlimitedDevices",
  "Orders, Bookings, CRM": "settings.modules.include.ordersBookingsCrm",
  "Priority support": "settings.modules.include.prioritySupport",
  "Unlimited branches": "settings.modules.include.unlimitedBranches",
  "All modules": "settings.modules.include.allModules",
  "Dedicated account manager": "settings.modules.include.dedicatedManager",
  "Custom integrations": "settings.modules.include.customIntegrations",
};

// Mock prices look like "SAR 99 / month" or "Custom". Split off the period
// so the unit can be localized without touching the currency amount.
function priceLabel(price: string, t: (key: string) => string): string {
  const perMonth = price.match(/^(.*) \/ month$/);
  if (perMonth) return `${perMonth[1]} / ${t("settings.modules.perMonth")}`;
  return price === "Custom" ? t("settings.modules.customPrice") : price;
}

function Switch({ checked, onChange, disabled, dir }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; dir: "ltr" | "rtl" }) {
  return (
    <span
      className={clsx(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className={clsx(
          "inline-block h-4 w-4 transform rounded-full bg-[var(--octo-knob)] shadow transition-transform",
          checked
            ? dir === "rtl" ? "-translate-x-[18px]" : "translate-x-[18px]"
            : dir === "rtl" ? "-translate-x-[2px]" : "translate-x-[2px]"
        )}
      />
    </span>
  );
}

function ModuleTile({
  module, enabled, disabled, hint, onToggle, dir,
}: {
  module: ModuleCard;
  enabled: boolean;
  disabled?: boolean;
  hint?: string;
  onToggle: (checked: boolean) => void;
  dir: "ltr" | "rtl";
}) {
  const { t } = useI18n();
  return (
    <article className="flex flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t(MODULE_KEY[module.name] ?? module.name)}</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--octo-text-muted)]">
            {t(DESC_KEY[module.name] ?? module.name)}
          </p>
        </div>
        <Badge tone={TIER_TONE[module.tier]}>{t(TIER_KEY[module.tier])}</Badge>
      </div>

      {hint && (
        <p className="mt-3 flex items-center gap-1.5 rounded-[9px] bg-[var(--octo-warning-bg)] px-3 py-2 text-[11px] text-[var(--octo-text-secondary)]">
          <Info size={12} className="shrink-0" />
          {hint}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <span className="text-[11.5px] font-medium text-[var(--octo-text-secondary)]">{priceLabel(module.price ?? "—", t)}</span>
        <span className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--octo-text-faint)]">
            {enabled ? t("settings.modules.enabled") : t("settings.modules.disabled")}
          </span>
          <Switch checked={enabled} onChange={onToggle} disabled={disabled} dir={dir} />
        </span>
      </div>
    </article>
  );
}

export function ModulesSettingsPage() {
  const { t, dir } = useI18n();
  const [selectedType, setSelectedType] = useState("Restaurant");
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(moduleCards.map((m) => [m.id, m.enabled]))
  );
  const [pending, setPending] = useState<ModuleCard | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PackPlan>("Core");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const dependentsOf = (id: string): ModuleCard[] =>
    moduleCards.filter((m) => m.dependencies?.includes(id));

  function toggleModule(module: ModuleCard, next: boolean) {
    if (next === false && dependentsOf(module.id).length > 0) {
      setPending(module);
      return;
    }
    applyToggle(module, next);
  }

  function applyToggle(module: ModuleCard, next: boolean) {
    setEnabled((prev) => {
      const nextState = { ...prev, [module.id]: next };
      if (!next) {
        // Disabling a module also disables everything that depends on it.
        for (const dep of dependentsOf(module.id)) nextState[dep.id] = false;
      }
      return nextState;
    });
    setPending(null);
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("settings.modules.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("settings.modules.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="info">{t("settings.modules.planLabel")}: {t(PLAN_KEY[currentPlan])}</Badge>
          <Button variant="secondary" size="sm" onClick={() => setToast(t("settings.modules.planChanged"))}>
            {t("settings.modules.modifyPlan")}
          </Button>
        </div>
      </header>

      {/* Restaurant type */}
      <section className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-2">
          <LayoutGrid size={15} className="text-[var(--octo-text-muted)]" />
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("settings.modules.restaurantType")}</h2>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {RESTAURANT_TYPES.map((type) => {
            const Icon = TYPE_ICONS[type];
            const active = type === selectedType;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={clsx(
                  "relative flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-colors",
                  active
                    ? "border-[#0D6EFD] bg-[var(--octo-selected)] text-[#0D6EFD]"
                    : "border-[var(--octo-border-card)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
                )}
              >
                {active && (
                  <span className="absolute end-2 top-2 grid h-4 w-4 place-items-center rounded-full bg-[#0D6EFD] text-white">
                    <Check size={10} strokeWidth={3} />
                  </span>
                )}
                <Icon size={18} />
                <span className="text-[11px] font-medium">{t(TYPE_KEY[type])}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Modules */}
      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("settings.modules.yourModules")}</h2>
            <span className="text-[11.5px] text-[var(--octo-text-faint)]">
              {moduleCards.filter((m) => enabled[m.id]).length}/{moduleCards.length}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {moduleCards.map((module) => {
            const blockedBy = module.dependencies?.find((dep) => !enabled[dep]);
            const depName = blockedBy ? moduleCards.find((m) => m.id === blockedBy)?.name : undefined;
            return (
              <ModuleTile
                key={module.id}
                module={module}
                enabled={enabled[module.id]}
                disabled={Boolean(blockedBy)}
                hint={
                  blockedBy && depName
                    ? t("settings.modules.dependencyNote").replace("{name}", t(MODULE_KEY[depName] ?? depName))
                    : undefined
                }
                onToggle={(next) => toggleModule(module, next)}
                dir={dir}
              />
            );
          })}
        </div>
      </section>

      {/* Plan cards */}
      <section className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {packCards.map((pack) => {
          const isCurrent = pack.plan === currentPlan;
          return (
            <article
              key={pack.id}
              className={clsx(
                "flex flex-col rounded-xl border bg-[var(--octo-card)] px-[18px] py-[15px]",
                isCurrent ? "border-[#0D6EFD]" : "border-[var(--octo-border-card)]"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t(PLAN_KEY[pack.plan])}</p>
                {isCurrent && <Badge tone="info">{t("settings.modules.current")}</Badge>}
              </div>
              <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{t(PACK_DESC_KEY[pack.plan])}</p>
              <p className="mt-3 text-[18px] font-bold text-[var(--octo-text-primary)]">{priceLabel(pack.price, t)}</p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {pack.includes.map((inc) => (
                  <li key={inc} className="flex items-center gap-1.5 text-[11.5px] text-[var(--octo-text-secondary)]">
                    <Check size={12} className="shrink-0 text-[#22C55E]" strokeWidth={2.5} />
                    {t(INCLUDE_KEY[inc] ?? inc)}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-4">
                <Button
                  variant={isCurrent ? "secondary" : "primary"}
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setCurrentPlan(pack.plan);
                    setToast(t("settings.modules.planChanged"));
                  }}
                >
                  {isCurrent ? t("settings.modules.currentPlan") : t("settings.modules.choose")}
                </Button>
              </div>
            </article>
          );
        })}
      </section>

      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title={t("settings.modules.disableTitle")}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setPending(null)}>
              {t("settings.modules.cancel")}
            </Button>
            <Button variant="danger" size="sm" onClick={() => pending && applyToggle(pending, false)}>
              {t("settings.modules.disable")}
            </Button>
          </>
        }
      >
        <p className="text-[12.5px] leading-relaxed text-[var(--octo-text-secondary)]">
          {t("settings.modules.disableBody").replace(
            "{name}",
            t(MODULE_KEY[dependentsOf(pending?.id ?? "")[0]?.name ?? ""] ?? dependentsOf(pending?.id ?? "")[0]?.name ?? "")
          )}
        </p>
      </Modal>

      {toast && (
        <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-[9px] border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-2.5 text-[12.5px] font-medium text-[#16a34a] shadow-lg">
          <CircleCheck size={14} className="text-[#22C55E]" />
          {toast}
        </div>
      )}
    </div>
  );
}
