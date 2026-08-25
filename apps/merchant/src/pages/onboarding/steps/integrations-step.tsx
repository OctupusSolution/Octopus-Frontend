// Step 6 — which tools does this business already use? Multi-select, grouped
// by category. Nothing here actually connects anything (no backend yet) — the
// same honesty as "coming soon" verticals: shown for real, not faked as live.
// Real setup happens later in Settings → Integrations, which lists this exact
// same vendor set so nothing here feels invented.
import { useState } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import {
  INTEGRATIONS, type IntegrationCategory, type IntegrationId, type IntegrationOption,
} from "../_shared/extras-catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { BRAND_GRADIENT } from "@/shared/lib/brand";

function imageUrl(filename: string): string {
  return new URL(`../../../../../assets/onboarding-Integrations/${filename}`, import.meta.url).href;
}

const CATEGORIES: readonly IntegrationCategory[] = ["delivery", "payments", "accounting", "messaging"];
const CATEGORY_KEY: Record<IntegrationCategory, string> = {
  delivery: "onboarding.integrations.category.delivery",
  payments: "onboarding.integrations.category.payments",
  accounting: "onboarding.integrations.category.accounting",
  messaging: "onboarding.integrations.category.messaging",
};

export function IntegrationsStep({
  selected,
  onToggle,
}: {
  selected: readonly IntegrationId[];
  onToggle: (id: IntegrationId) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-4">
      {CATEGORIES.map((category) => {
        const items = INTEGRATIONS.filter((i) => i.category === category);
        if (items.length === 0) return null;
        return (
          <section key={category}>
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t(CATEGORY_KEY[category])}
            </h3>
            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <IntegrationCard
                  key={item.id}
                  item={item}
                  active={selected.includes(item.id)}
                  onToggle={() => onToggle(item.id)}
                  t={t}
                />
              ))}
            </div>
          </section>
        );
      })}

      <p className="rounded-[10px] bg-[var(--octo-hover)] px-3 py-2.5 text-[11.5px] text-[var(--octo-text-secondary)]">
        {t("onboarding.integrations.disclaimer")}
      </p>
    </div>
  );
}

function IntegrationCard({
  item, active, onToggle, t,
}: {
  item: IntegrationOption;
  active: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={clsx(
        "flex items-start gap-3 rounded-[10px] border p-3 text-start transition-all duration-200",
        active
          ? "border-[#0D6EFD] bg-[var(--octo-selected)] shadow-[0_0_0_3px_rgba(13,110,253,0.08)]"
          : "border-[var(--octo-border-card)] bg-[var(--octo-card)] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
      )}
    >
      {item.image ? (
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-[var(--octo-border-card)] bg-white p-1.5">
          {imageFailed ? (
            <span
              className="grid h-full w-full place-items-center rounded-md text-[13px] font-bold"
              style={{ backgroundColor: `${item.color}1A`, color: item.color }}
            >
              {item.name.charAt(0)}
            </span>
          ) : (
            <img
              src={imageUrl(item.image)}
              alt=""
              className="block h-full w-full object-contain"
              onError={() => setImageFailed(true)}
            />
          )}
        </span>
      ) : (
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[13px] font-bold"
          style={{ backgroundColor: `${item.color}1A`, color: item.color }}
        >
          {item.name.charAt(0)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{item.name}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--octo-text-muted)]">{t(item.descKey)}</p>
      </div>
      {active && (
        <span
          className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-white"
          style={{ background: BRAND_GRADIENT }}
        >
          <Check size={9} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
