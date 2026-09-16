// Step 5 — which tools does this business already use? Multi-select, grouped
// by category. Nothing here actually connects anything (no backend yet); real
// setup happens later in Settings → Integrations, which lists this exact same
// vendor set so nothing here feels invented. The step's own subtitle says as
// much, which is why there is no second disclaimer inside the list.
import { useState } from "react";
import { Calculator, Check, CreditCard, MessageCircle, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";
import {
  INTEGRATIONS, type IntegrationCategory, type IntegrationId, type IntegrationOption,
} from "../_shared/extras-catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { integrationLogo } from "../_shared/assets";

const CATEGORIES: readonly { id: IntegrationCategory; icon: LucideIcon; labelKey: string }[] = [
  { id: "delivery",   icon: Truck,          labelKey: "onboarding.integrations.category.delivery" },
  { id: "payments",   icon: CreditCard,     labelKey: "onboarding.integrations.category.payments" },
  { id: "accounting", icon: Calculator,     labelKey: "onboarding.integrations.category.accounting" },
  { id: "messaging",  icon: MessageCircle,  labelKey: "onboarding.integrations.category.messaging" },
];

export function IntegrationsStep({
  selected,
  onToggle,
}: {
  selected: readonly IntegrationId[];
  onToggle: (id: IntegrationId) => void;
}) {
  const { t, locale } = useI18n();

  return (
    <div className="flex flex-col gap-8">
      {CATEGORIES.map(({ id, icon: Icon, labelKey }) => {
        const items = INTEGRATIONS.filter((i) => i.category === id);
        if (items.length === 0) return null;
        return (
          <section key={id}>
            <h3 className="flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-[var(--octo-text-primary)]">
              <Icon size={20} className="text-[var(--octo-text-primary)]" />
              {t(labelKey)}
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <IntegrationCard
                  key={item.id}
                  item={item}
                  active={selected.includes(item.id)}
                  onToggle={() => onToggle(item.id)}
                  t={t}
                  locale={locale}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function IntegrationCard({
  item, active, onToggle, t, locale,
}: {
  item: IntegrationOption;
  active: boolean;
  onToggle: () => void;
  t: (key: string) => string;
  locale: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  // Two decimals, the way the frame prices a connector — these are contract
  // amounts, not the rounded running total in the price bar.
  const price = new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", {
    numberingSystem: "latn",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(item.priceSar);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={clsx(
        "flex items-start gap-3.5 rounded-[14px] border p-4 text-start transition-all duration-200",
        active
          ? "border-[#0D6EFD] bg-[var(--octo-selected)]"
          : "border-[var(--octo-border-input)] bg-[var(--octo-card)] hover:border-[#c7d9f8] hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
      )}
    >
      {item.image && !imageFailed ? (
        <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-[10px]">
          <img
            src={integrationLogo(item.image)}
            alt=""
            className="block h-full w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        </span>
      ) : (
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] text-[15px] font-bold"
          style={{ backgroundColor: `${item.color}1A`, color: item.color }}
        >
          {item.name.charAt(0)}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-bold leading-tight text-[var(--octo-text-primary)]">{item.name}</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--octo-text-muted)]">{t(item.descKey)}</p>
        <p className="mt-2.5 text-[16px] font-bold text-[#0D6EFD]">
          {t("pricing.currency")} {price}
          <span className="text-[11px] font-semibold">{t("pricing.perMonth")}</span>
        </p>
      </div>

      <span
        aria-hidden
        className={clsx(
          "mt-0.5 grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[6px] border-[1.5px] transition-colors",
          active ? "border-[#0D6EFD] bg-[#0D6EFD] text-white" : "border-[var(--octo-crumb)] text-transparent"
        )}
      >
        <Check size={13} strokeWidth={3} />
      </span>
    </button>
  );
}
