// Step 1 — which business is this? OCTOPUS is multi-vertical, and this single
// choice decides which product the merchant ends up with.
//
// Only restaurants can be provisioned today. The rest are shown honestly as
// "coming soon" with an interest capture, rather than hidden (which would
// misrepresent the platform) or faked (which would misrepresent the product).
import { useState } from "react";
import { Check, Lock } from "lucide-react";
import clsx from "clsx";
import { verticals, type VerticalId } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "../_shared/icon";
import { BRAND_GRADIENT } from "../_shared/brand";

export function VerticalStep({
  selected,
  onSelect,
}: {
  selected: VerticalId | null;
  onSelect: (id: VerticalId) => void;
}) {
  const { t } = useI18n();
  const [notified, setNotified] = useState<VerticalId | null>(null);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {verticals.map((vertical) => {
        const available = vertical.status === "available";
        const active = selected === vertical.id;

        return (
          <article
            key={vertical.id}
            className={clsx(
              "relative flex flex-col rounded-xl border p-[18px] transition-all duration-200",
              active
                ? "border-[#0D6EFD] bg-[var(--octo-selected)] shadow-[0_0_0_3px_rgba(13,110,253,0.08)]"
                : "border-[var(--octo-border-card)] bg-[var(--octo-card)] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]",
              !available && "opacity-75"
            )}
          >
            <button
              type="button"
              disabled={!available}
              onClick={() => onSelect(vertical.id)}
              className={clsx("flex flex-1 flex-col text-start", available ? "cursor-pointer" : "cursor-default")}
            >
              <span
                className={clsx(
                  "grid h-10 w-10 place-items-center rounded-[10px] transition-colors",
                  active ? "text-white" : "bg-[var(--octo-hover)] text-[var(--octo-text-secondary)]"
                )}
                style={active ? { background: BRAND_GRADIENT } : undefined}
              >
                <CatalogIcon name={vertical.icon} size={19} />
              </span>

              <h3 className="mt-3 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
                {t(vertical.nameKey)}
              </h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--octo-text-muted)]">
                {t(vertical.descKey)}
              </p>
            </button>

            {active && (
              <span
                className="absolute end-3 top-3 grid h-5 w-5 place-items-center rounded-full text-white"
                style={{ background: BRAND_GRADIENT }}
              >
                <Check size={11} strokeWidth={3} />
              </span>
            )}

            {!available && (
              <div className="mt-3 border-t border-[var(--octo-divider)] pt-3">
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--octo-hover)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--octo-text-muted)]">
                  <Lock size={10} />
                  {t("onboarding.vertical.comingSoon")}
                </span>
                {notified === vertical.id ? (
                  <p className="mt-2 text-[11px] text-[#16a34a]">{t("onboarding.vertical.notified")}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setNotified(vertical.id)}
                    className="mt-2 block text-[11px] font-medium text-[#0D6EFD] hover:underline"
                  >
                    {t("onboarding.vertical.notifyMe")}
                  </button>
                )}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
