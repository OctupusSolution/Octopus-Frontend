// A numbered rail, not a plain progress bar — the flow genuinely is ten
// ordered steps, and each merchant benefits from seeing exactly how many are
// left, which ones are already behind them, and what each one actually is.
//
// Spans the full body width (flexible connecting lines) rather than the
// compact, tightly-packed version that used to live in the header.
import { Fragment } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { BRAND_GRADIENT } from "@/shared/lib/brand";
import { useI18n } from "@/app/providers/i18n-provider";

export function StepRail({
  step,
  total,
  labelPrefix = "onboarding.rail.step",
}: {
  step: number;
  total: number;
  /** i18n key prefix for each step's label, suffixed with the step number (1-based). */
  labelPrefix?: string;
}) {
  const { t } = useI18n();
  const steps = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div className="flex w-full items-start" role="presentation">
      {steps.map((n, i) => {
        const done = n < step;
        const active = n === step;

        return (
          <Fragment key={n}>
            <div className="flex w-8 flex-col items-center gap-1.5">
              <div
                className={clsx(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold transition-all duration-300",
                  (done || active) && "text-white",
                  active && "ring-4 ring-[#0D6EFD]/15",
                  !done && !active && "border border-[var(--octo-border-card)] bg-[var(--octo-card)] text-[var(--octo-text-faint)]"
                )}
                style={done || active ? { background: BRAND_GRADIENT } : undefined}
              >
                {done ? <Check size={13} strokeWidth={3} /> : n}
              </div>
              <span
                className={clsx(
                  "w-16 text-center text-[10px] font-medium leading-tight",
                  active ? "text-[var(--octo-text-primary)]" : "text-[var(--octo-text-faint)]"
                )}
              >
                {t(`${labelPrefix}${n}`)}
              </span>
            </div>
            {i < total - 1 && (
              <div
                className="mx-1.5 mt-4 h-[2px] flex-1 rounded-full transition-colors duration-500 sm:mx-2"
                style={{ background: n < step ? BRAND_GRADIENT : "var(--octo-track)" }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
