// A numbered rail, not a plain progress bar — the flow genuinely is five
// ordered steps, and each merchant benefits from seeing exactly how many are
// left and which ones are already behind them.
import { Check } from "lucide-react";
import clsx from "clsx";
import { BRAND_GRADIENT } from "./brand";

export function StepRail({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center" role="presentation">
      {Array.from({ length: total }, (_, i) => i + 1).map((n, i) => {
        const done = n < step;
        const active = n === step;
        return (
          <div key={n} className="flex items-center">
            <div
              className={clsx(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold transition-all duration-300",
                (done || active) && "text-white",
                active && "ring-4 ring-[#0D6EFD]/15",
                !done && !active && "bg-[var(--octo-track)] text-[var(--octo-text-faint)]"
              )}
              style={done || active ? { background: BRAND_GRADIENT } : undefined}
            >
              {done ? <Check size={11} strokeWidth={3} /> : n}
            </div>
            {i < total - 1 && (
              <div
                className="mx-1 h-[2px] w-5 rounded-full transition-colors duration-500 sm:w-9"
                style={{ background: n < step ? BRAND_GRADIENT : "var(--octo-track)" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
