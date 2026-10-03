// Step 3 — which of the twelve restaurant types is this?
//
// The type is the single highest-leverage answer in the whole flow: it drives
// which modules switch on, which questions get asked at all, and what the
// dashboard looks like afterwards. So each card carries a definition plus a
// "right for you if…" line to help a merchant place themselves correctly.
import { CircleCheck } from "lucide-react";
import clsx from "clsx";
import { restaurantTypes, type TypeCode } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
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
    <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-4">
      {restaurantTypes.map((type) => {
        const active = selected === type.code;
        return (
          <button
            key={type.code}
            type="button"
            onClick={() => onSelect(type.code)}
            aria-pressed={active}
            className={clsx(
              "flex flex-col items-start rounded-[14px] border p-5 text-start transition-all duration-200",
              active
                ? "border-[#0D6EFD] bg-[var(--octo-selected)]"
                : "border-[var(--octo-border-input)] bg-[var(--octo-card)] hover:border-[#c7d9f8] hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
            )}
          >
            <img
              src={typeIcon(type.image)}
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />

            <h3 className="mt-4 text-[17px] font-bold leading-tight tracking-tight text-[var(--octo-text-primary)]">
              {t(type.nameKey)}
            </h3>
            <p className="mb-4 mt-2 text-[12.5px] leading-relaxed text-[var(--octo-text-muted)]">
              {t(type.descKey)}
            </p>
            {/* Pushed to the bottom so the pills line up across a row whose
                definitions run to different numbers of lines. */}
            <p className="mt-auto flex w-full items-start gap-2 rounded-[10px] bg-[var(--octo-selected)] px-3 py-2.5 text-[12.5px] font-semibold leading-snug text-[#0D6EFD]">
              <CircleCheck size={16} strokeWidth={2} className="mt-px shrink-0" />
              <span>{t(type.fitKey)}</span>
            </p>
          </button>
        );
      })}
    </div>
  );
}
