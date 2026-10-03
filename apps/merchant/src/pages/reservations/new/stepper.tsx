import { Fragment } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";

/** The progress in the page header: Guest Details, Reservation Details, then
 *  Select Table. A finished step shows a check and stays clickable to go back;
 *  a later step is clickable only once `maxReachable` allows it. */
export function Stepper({
  step,
  labels,
  maxReachable,
  onStepClick,
}: {
  step: number;
  labels: string[];
  /** The furthest step the user may jump to right now. */
  maxReachable: number;
  onStepClick: (step: number) => void;
}) {
  return (
    <nav aria-label={labels.join(" / ")} className="w-full max-w-[640px]">
      <div className="flex items-center">
        {labels.map((label, i) => {
          const n = i + 1;
          return (
            <Fragment key={n}>
              {i > 0 && (
                <div
                  className={clsx(
                    "mx-1 h-[3px] flex-1 rounded-full",
                    step >= n ? "bg-[#0D6EFD]" : "bg-[var(--octo-track)]"
                  )}
                />
              )}
              <Node
                n={n}
                state={step === n ? "active" : step > n ? "done" : "upcoming"}
                label={label}
                disabled={n > maxReachable}
                onClick={() => onStepClick(n)}
              />
            </Fragment>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between gap-4 text-[13px]">
        {labels.map((label, i) => (
          <span
            key={label}
            className={clsx(
              step === i + 1
                ? "font-medium text-[#0D6EFD]"
                : step > i + 1
                  ? "text-[var(--octo-tone-info-text)]"
                  : "text-[var(--octo-text-muted)]"
            )}
          >
            {label}
          </span>
        ))}
      </div>
    </nav>
  );
}

function Node({
  n,
  state,
  label,
  disabled,
  onClick,
}: {
  n: number;
  state: "active" | "done" | "upcoming";
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || state === "active"}
      aria-current={state === "active" ? "step" : undefined}
      aria-label={label}
      className={clsx(
        "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12.5px] font-semibold transition-colors",
        state === "active" && "border-2 border-[#0D6EFD] bg-[var(--octo-card)] text-[#0D6EFD]",
        state === "done" && "bg-[#0D6EFD] text-white hover:opacity-90",
        state === "upcoming" && "bg-[var(--octo-track)] text-[var(--octo-text-muted)] enabled:hover:bg-[var(--octo-hover)]",
        "disabled:cursor-default"
      )}
    >
      {state === "done" ? <Check size={14} strokeWidth={3} /> : n}
    </button>
  );
}
