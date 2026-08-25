// A numbered rail, not a plain progress bar — the flow genuinely is a set of
// ordered steps, and the merchant benefits from seeing how many are left,
// which are behind them, and what each one is.
import { Fragment } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";

export function StepRail({ step, labelKeys }: { step: number; labelKeys: readonly string[] }) {
  const { t } = useI18n();

  return (
    <div className="flex w-full items-start" role="presentation">
      {labelKeys.map((labelKey, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;

        return (
          <Fragment key={labelKey}>
            <div className="flex w-7 flex-col items-center gap-1.5">
              <div
                className={clsx(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold transition-all duration-300",
                  (done || active) && "bg-[#0D6EFD] text-white",
                  active && "ring-4 ring-[#0D6EFD]/15",
                  !done && !active &&
                    "border border-[var(--octo-border-card)] bg-[var(--octo-card)] text-[var(--octo-text-faint)]"
                )}
              >
                {done ? <Check size={12} strokeWidth={3} /> : n}
              </div>
              <span
                className={clsx(
                  "w-[72px] text-center text-[10px] font-medium leading-tight",
                  done || active ? "text-[#0D6EFD]" : "text-[var(--octo-text-faint)]"
                )}
              >
                {t(labelKey)}
              </span>
            </div>
            {i < labelKeys.length - 1 && (
              <div
                className={clsx(
                  "mx-1 mt-3.5 h-[2px] flex-1 rounded-full transition-colors duration-500 sm:mx-1.5",
                  n < step ? "bg-[#0D6EFD]" : "bg-[var(--octo-track)]"
                )}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
