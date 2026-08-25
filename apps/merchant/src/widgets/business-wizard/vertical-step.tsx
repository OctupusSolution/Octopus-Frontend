// Step 1 — which business is this? OCTOPUS is multi-vertical, and this single
// choice decides which product the merchant ends up with.
//
// Only restaurants can be provisioned today. The rest are shown honestly as
// "coming soon" — clearly locked, not hidden (which would misrepresent the
// platform) or faked (which would misrepresent the product). The lock badge
// stays at full contrast even while the rest of the card is muted, so
// "not available yet" reads immediately rather than just looking disabled.
import { Check, Lock } from "lucide-react";
import clsx from "clsx";
import { verticals, type VerticalId } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";

function iconUrl(filename: string): string {
  return new URL(`../../../../assets/onboarding-Business/${filename}`, import.meta.url).href;
}

export function VerticalStep({
  selected,
  onSelect,
}: {
  selected: VerticalId | null;
  onSelect: (id: VerticalId) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {verticals.map((vertical) => {
        const available = vertical.status === "available";
        const active = selected === vertical.id;

        return (
          <button
            key={vertical.id}
            type="button"
            disabled={!available}
            onClick={() => onSelect(vertical.id)}
            title={available ? t("onboarding.vertical.available") : t("onboarding.vertical.comingSoon")}
            className={clsx(
              "relative flex flex-col items-center gap-1.5 rounded-xl border p-4 text-center transition-all duration-200",
              active
                ? "border-[#0D6EFD] bg-[var(--octo-selected)] shadow-[0_0_0_3px_rgba(13,110,253,0.08)]"
                : available
                  ? "border-[var(--octo-border-card)] bg-[var(--octo-card)]"
                  : "border-[var(--octo-border-card)] bg-[var(--octo-hover)]",
              available
                ? "cursor-pointer hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
                : "cursor-not-allowed"
            )}
          >
            <img
              src={iconUrl(vertical.image)}
              alt=""
              width={56}
              height={56}
              className={clsx("h-14 w-14 object-contain", !available && "opacity-50 grayscale-[30%]")}
            />
            <span
              className={clsx(
                "text-[12.5px] font-semibold",
                available ? "text-[var(--octo-text-primary)]" : "text-[var(--octo-text-muted)]"
              )}
            >
              {t(vertical.nameKey)}
            </span>
            <span className="text-[10.5px] leading-snug text-[var(--octo-text-faint)]">
              {t(vertical.descKey)}
            </span>

            {active && (
              <span className="absolute end-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-[#0D6EFD] text-white">
                <Check size={11} strokeWidth={3} />
              </span>
            )}

            {available && !active && (
              <span className="absolute end-2 top-2 rounded-full bg-[#16a34a]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#16a34a]">
                {t("onboarding.vertical.available")}
              </span>
            )}

            {!available && (
              <span className="absolute end-2 top-2 grid h-6 w-6 place-items-center rounded-full border border-[var(--octo-border-card)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
                <Lock size={12} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
