// The running monthly total, pinned to the bottom of the flow from the modules
// step onward. The whole point of cumulative pricing is that the merchant
// watches the number move — so it is always on screen, never behind a click.
//
// The frames stack it below the Back/Continue row rather than beside it: the
// buttons are the decision, the total is the context for it.
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { formatSar } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import type { OnboardingDraft } from "./draft";
import { priceFor } from "./pricing";

export function PriceBar({ draft, action }: { draft: OnboardingDraft; action: React.ReactNode }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  // Same helper the payment step uses, so the two surfaces cannot drift apart.
  const price = priceFor(draft);
  const { connectors, total } = price;

  return (
    <div className="sticky bottom-0 z-20 bg-[var(--octo-page-bg)]/95 backdrop-blur">
      <div className="mx-auto max-w-[1248px] px-6 py-4">{action}</div>

      <div className="border-t border-[var(--octo-border-card)] bg-[var(--octo-shell)]">
        {open && (
          <div className="mx-auto max-w-[1248px] px-6 pt-4">
            <ul className="flex flex-col gap-1.5 border-b border-[var(--octo-divider)] pb-3">
              {price.lines.map((line) => (
                <li key={line.id} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-[var(--octo-text-secondary)]">{t(line.labelKey)}</span>
                  <span className="font-medium text-[var(--octo-text-primary)]">
                    {line.amount === null ? t("pricing.onRequest") : formatSar(line.amount, locale)}
                  </span>
                </li>
              ))}
              {connectors > 0 && (
                <li className="flex items-center justify-between text-[12.5px]">
                  <span className="text-[var(--octo-text-secondary)]">{t("pricing.line.integrations")}</span>
                  <span className="font-medium text-[var(--octo-text-primary)]">{formatSar(connectors, locale)}</span>
                </li>
              )}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="mx-auto flex w-full max-w-[1248px] items-center gap-3 px-6 py-5 text-start"
        >
          <span className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-secondary)]">
            {t("pricing.monthlyTotal")}
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[30px] font-bold leading-none text-[#0D6EFD]">{formatSar(total, locale)}</span>
            <span className="text-[12.5px] text-[var(--octo-text-muted)]">{t("pricing.perMonth")}</span>
          </span>
          {price.hasQuotedItems && (
            <span className="text-[11.5px] text-[var(--octo-text-faint)]">{t("pricing.quoted")}</span>
          )}
          <ChevronDown
            size={22}
            className={clsx("ms-auto text-[var(--octo-text-secondary)] transition-transform duration-200", open && "rotate-180")}
          />
        </button>
      </div>
    </div>
  );
}
