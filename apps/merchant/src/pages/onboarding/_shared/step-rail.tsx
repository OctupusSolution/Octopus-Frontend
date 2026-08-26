// A numbered rail, not a plain progress bar — the flow genuinely is a set of
// ordered steps, and the merchant benefits from seeing how many are left,
// which are behind them, and what each one is.
import { Fragment } from "react";
import { Check } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";

export function StepRail({ step, labelKeys }: { step: number; labelKeys: readonly string[] }) {
  const { t } = useI18n();

  // The label is a fixed 72px block under a 7px-wide dot column, with ~12px
  // of connector margin between columns — a rail of N labels needs roughly
  // N*72 + (N-1)*12 px of room before they stop touching each other. Below
  // that, the rail falls back to numbered dots, which stay legible at any
  // width and keep the active step (ringed, coloured) on screen without
  // scrolling.
  //
  // This rail renders inside two hosts that do not have the same room at the
  // same viewport width: signup runs full-bleed outside the app shell, but
  // add-business runs inside the settings shell, where the expanded sidebar
  // (258px) plus the shell's own paddings leave it with roughly 400px less
  // than signup has at any given viewport. Both of today's lists (9 steps for
  // add-business, 10 for signup) need that narrower host's numbers, not
  // signup's, to pick a breakpoint that never shows labels with too little
  // room to hold them — hence `xl`, not `lg`: at `lg` (1024px) add-business's
  // column is only ~596px, well short of the ~744px nine labels need, and the
  // gap does not close until past 1100px either.
  const labelVisibility = labelKeys.length <= 6 ? "hidden sm:block" : "hidden xl:block";

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
                  labelVisibility,
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
