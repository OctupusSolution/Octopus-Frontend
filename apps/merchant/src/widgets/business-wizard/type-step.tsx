// Step 2 — which of the twelve restaurant types is this?
//
// The type is the single highest-leverage answer in the whole flow: it drives
// which modules switch on, which questions get asked at all, and what the
// dashboard looks like afterwards. So each card carries a definition plus a
// "right for you if…" line to help a merchant place themselves correctly.
import { Check } from "lucide-react";
import clsx from "clsx";
import { restaurantTypes, type TypeCode } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { BRAND_GRADIENT } from "@/shared/lib/brand";

function imageUrl(filename: string): string {
  return new URL(`../../../../assets/onboarding-Type/${filename}`, import.meta.url).href;
}

export function TypeStep({
  selected,
  onSelect,
}: {
  selected: TypeCode | null;
  onSelect: (code: TypeCode) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {restaurantTypes.map((type) => {
        const active = selected === type.code;
        return (
          <button
            key={type.code}
            type="button"
            onClick={() => onSelect(type.code)}
            className={clsx(
              "relative flex flex-col items-center rounded-xl border p-[18px] text-center transition-all duration-200",
              active
                ? "border-[#0D6EFD] bg-[var(--octo-selected)] shadow-[0_0_0_3px_rgba(13,110,253,0.08)]"
                : "border-[var(--octo-border-card)] bg-[var(--octo-card)] hover:-translate-y-px hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
            )}
          >
            {active && (
              <span
                className="absolute end-3 top-3 grid h-5 w-5 place-items-center rounded-full text-white"
                style={{ background: BRAND_GRADIENT }}
              >
                <Check size={11} strokeWidth={3} />
              </span>
            )}

            <img
              src={imageUrl(type.image)}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
            />

            <h3 className="mt-3 text-[13px] font-semibold text-[var(--octo-text-primary)]">
              {t(type.nameKey)}
            </h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--octo-text-muted)]">
              {t(type.descKey)}
            </p>
            <p className="mt-2 w-full border-t border-[var(--octo-divider)] pt-2 text-[11px] leading-relaxed text-[var(--octo-text-secondary)]">
              {t(type.fitKey)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
