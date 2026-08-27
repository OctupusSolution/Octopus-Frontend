// The running monthly total, pinned to the bottom of the flow from the
// questions step onward. The whole point of cumulative pricing is that the
// merchant watches the number move — so it is always on screen, never behind
// a click.
import { useState } from "react";
import { ChevronUp } from "lucide-react";
import clsx from "clsx";
import { formatSar } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import type { OnboardingDraft } from "./draft";
import { priceFor } from "./pricing";

export function PriceBar({ draft, action }: { draft: OnboardingDraft; action: React.ReactNode }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  // Same helper the review aside and the payment step use, so the three
  // surfaces cannot drift apart.
  const price = priceFor(draft);
  const { connectors, total } = price;

  return (
    <div className="sticky bottom-0 z-20 border-t border-[var(--octo-border-card)] bg-[var(--octo-card)]/95 shadow-[0_-8px_20px_rgba(15,23,42,0.05)] backdrop-blur">
      {open && (
        <div className="mx-auto max-w-[1180px] px-5 pt-4">
          <ul className="flex flex-col gap-1.5 border-b border-[var(--octo-divider)] pb-3">
            {price.lines.map((line) => (
              <li key={line.id} className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--octo-text-secondary)]">{t(line.labelKey)}</span>
                <span className="font-medium text-[var(--octo-text-primary)]">
                  {line.amount === null ? t("pricing.onRequest") : formatSar(line.amount, locale)}
                </span>
              </li>
            ))}
            {connectors > 0 && (
              <li className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--octo-text-secondary)]">{t("pricing.line.integrations")}</span>
                <span className="font-medium text-[var(--octo-text-primary)]">{formatSar(connectors, locale)}</span>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-start"
          aria-expanded={open}
        >
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("pricing.monthlyTotal")}
            </p>
            <p className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-[22px] font-bold leading-none text-[var(--octo-text-primary)]">
                {formatSar(total, locale)}
              </span>
              <span className="text-[11.5px] text-[var(--octo-text-muted)]">{t("pricing.perMonth")}</span>
            </p>
            {price.hasQuotedItems && (
              <p className="mt-1 text-[10.5px] text-[var(--octo-text-faint)]">{t("pricing.quoted")}</p>
            )}
          </div>
          <ChevronUp
            size={15}
            className={clsx("text-[var(--octo-text-faint)] transition-transform duration-200", open && "rotate-180")}
          />
        </button>

        <div className="flex items-center gap-2">{action}</div>
      </div>
    </div>
  );
}
