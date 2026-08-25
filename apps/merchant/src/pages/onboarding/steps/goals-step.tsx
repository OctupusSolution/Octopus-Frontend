// Step 3 — what does this merchant actually want out of OCTOPUS? Multi-select,
// unlike the vertical/type steps: a business can chase more than one goal at
// once, and nothing here gates modules — it's context for the Review step,
// not a decision with consequences.
import { Check } from "lucide-react";
import clsx from "clsx";
import { GOALS, type GoalId } from "../_shared/extras-catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { BRAND_GRADIENT } from "@/shared/lib/brand";

function imageUrl(filename: string): string {
  return new URL(`../../../../../assets/onboarding-Goals/${filename}`, import.meta.url).href;
}

export function GoalsStep({
  selected,
  onToggle,
}: {
  selected: readonly GoalId[];
  onToggle: (id: GoalId) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {GOALS.map((goal) => {
        const active = selected.includes(goal.id);
        return (
          <button
            key={goal.id}
            type="button"
            onClick={() => onToggle(goal.id)}
            aria-pressed={active}
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
              src={imageUrl(goal.image)}
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
            />

            <h3 className="mt-3 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
              {t(goal.nameKey)}
            </h3>
            <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--octo-text-muted)]">
              {t(goal.descKey)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
