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
import { typeIcon } from "@/pages/onboarding/_shared/assets";

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
              "relative flex flex-col items-start rounded-xl border p-[18px] text-start transition-all duration-200",
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
              src={typeIcon(type.image)}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 object-contain"
            />

            <h3 className="mt-3 text-[13.5px] font-bold text-[var(--octo-text-primary)]">
              {t(type.nameKey)}
            </h3>
            <p className="mt-1 text-[11px] text-[var(--octo-text-muted)]">
              {t(type.descKey)}
            </p>
            <p className="mt-2.5 flex w-full items-start gap-1.5 rounded-[8px] bg-[var(--octo-selected)] px-2 py-1.5 text-[10.5px] leading-relaxed text-[#0D6EFD]">
              <Check size={12} strokeWidth={3} className="mt-px shrink-0" />
              <span>{t(type.fitKey)}</span>
            </p>
          </button>
        );
      })}
    </div>
  );
}
