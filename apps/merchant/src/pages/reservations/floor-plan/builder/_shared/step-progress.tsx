// "Step 1 of 3" and the numbered rail beside it. The frames draw the badge
// as "of 3" but only two nodes; the third step is Review & Publish, so the
// rail shows all three and the two agree.
import { Fragment } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";

export const QUICK_STEPS = ["add", "arrange", "review"] as const;

export function StepBadge({ step }: { step: number }) {
  const { t } = useI18n();
  return (
    <span className="rounded-full bg-[var(--octo-selected)] px-3.5 py-1 text-[16px] font-medium text-[#0D6EFD]">
      {t("floorPlan.quick.stepOf").replace("{n}", String(step)).replace("{total}", String(QUICK_STEPS.length))}
    </span>
  );
}

export function StepProgress({ current, furthest, onJump }: { current: number; furthest: number; onJump: (step: 1 | 2 | 3) => void }) {
  const { t } = useI18n();
  return (
    <ol className="flex w-full items-start sm:w-[min(560px,100%)]">
      {QUICK_STEPS.map((id, index) => {
        const n = (index + 1) as 1 | 2 | 3;
        const done = n < current;
        const active = n === current;
        const reachable = n <= furthest && !active;
        const circle = (
          <span
            className={clsx(
              "grid h-8 w-8 place-items-center rounded-full text-[14px] font-semibold transition-colors",
              done && "bg-[#0D6EFD] text-white",
              active && "border-2 border-[#0D6EFD] bg-[var(--octo-card)] text-[#0D6EFD]",
              !done && !active && "border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-muted)]"
            )}
          >
            {done ? <Check size={15} strokeWidth={3} /> : n}
          </span>
        );
        return (
          <Fragment key={id}>
            <li className="flex w-24 shrink-0 flex-col items-center gap-2 first:items-start last:items-end">
              {reachable ? (
                <button type="button" onClick={() => onJump(n)} aria-label={t(`floorPlan.quick.step.${id}`)}>
                  {circle}
                </button>
              ) : (
                <span aria-current={active ? "step" : undefined}>{circle}</span>
              )}
              <span className={clsx("whitespace-nowrap text-[15px]", done || active ? "font-medium text-[#0D6EFD]" : "text-[var(--octo-text-secondary)]")}>
                {t(`floorPlan.quick.step.${id}`)}
              </span>
            </li>
            {index < QUICK_STEPS.length - 1 && (
              <li aria-hidden className={clsx("mt-[15px] h-[3px] flex-1 rounded-full", n <= current ? "bg-[#0D6EFD]" : "bg-[var(--octo-track)]")} />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
