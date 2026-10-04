// The "Step 1 of 2" pill and the two-node rail beside the page title. The
// frames draw two steps — Add Tables and Arrange Tables — so that is what the
// rail shows; Review & Publish is reached from Arrange's Preview button and
// reads as both nodes done, with the pill naming it instead of counting.
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { SURFACE_100, SURFACE_BRAND_LIGHT, TEXT_BRAND_DEEP, TEXT_SEC_GRAY, TEXT_SECONDARY } from "../../../_shared/theme";

export const QUICK_STEPS = ["add", "arrange", "review"] as const;
const RAIL_STEPS = ["add", "arrange"] as const;

const TEXT_BRAND_PRIMARY = "text-[#0058da] [[data-theme=dark]_&]:text-[var(--octo-accent)]";

export function StepBadge({ step }: { step: number }) {
  const { t } = useI18n();
  return (
    <span className={clsx("whitespace-nowrap rounded-full px-3 py-1 text-[16px] font-medium leading-[16px]", SURFACE_BRAND_LIGHT, TEXT_BRAND_DEEP)}>
      {step > RAIL_STEPS.length
        ? t("floorPlan.quick.step.review")
        : t("floorPlan.quick.stepOf").replace("{n}", String(step)).replace("{total}", String(RAIL_STEPS.length))}
    </span>
  );
}

export function StepProgress({ current, furthest, onJump }: { current: number; furthest: number; onJump: (step: 1 | 2 | 3) => void }) {
  const { t } = useI18n();
  return (
    <ol className="relative flex w-full max-w-[407px] shrink-0 items-start justify-between sm:w-[407px]">
      <li aria-hidden className="absolute end-[50px] start-[46px] top-[10px] h-1 rounded-full bg-[#0d6efd]" />
      {RAIL_STEPS.map((id, index) => {
        const n = (index + 1) as 1 | 2;
        const done = n < current;
        const active = n === current;
        const reachable = n <= furthest && !active;
        const circle = (
          <span
            className={clsx(
              "grid h-6 w-6 place-items-center rounded-full text-[12px] font-semibold leading-[12px] transition-colors",
              done && "border border-[#0d6efd] bg-[#0d6efd] text-white",
              active && clsx("border border-[#0d6efd]", SURFACE_BRAND_LIGHT, TEXT_BRAND_PRIMARY),
              !done && !active && clsx(SURFACE_100, TEXT_SECONDARY)
            )}
          >
            {n}
          </span>
        );
        return (
          <li key={id} className={clsx("relative flex flex-col items-center gap-2", index === 0 ? "w-[93px]" : "w-[100px]")}>
            {reachable ? (
              <button type="button" onClick={() => onJump(n)} aria-label={t(`floorPlan.quick.step.${id}`)} className="rounded-full">
                {circle}
              </button>
            ) : (
              <span aria-current={active ? "step" : undefined}>{circle}</span>
            )}
            <span className={clsx("whitespace-nowrap text-center text-[14px] leading-[14px]", done || active ? TEXT_BRAND_PRIMARY : TEXT_SEC_GRAY)}>
              {t(`floorPlan.quick.step.${id}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
