import { Fragment } from "react";
import clsx from "clsx";
import { SURFACE_100, SURFACE_BRAND_LIGHT, TEXT_SEC_GRAY, TEXT_SECONDARY } from "../_shared/theme";

// The frame's "primary text" blue, a shade deeper than the brand blue.
const TEXT_STEP = "text-[#0058da] [[data-theme=dark]_&]:text-[var(--octo-accent)]";
const LINE = "h-1 bg-[#0d6efd]";

/** The progress in the page header: Reservation Details, then Select Table.
 *  A finished step turns solid and stays clickable to go back; a later step is
 *  clickable only once `maxReachable` allows it. */
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
  const last = labels.length - 1;
  return (
    <nav aria-label={labels.join(" / ")} className="flex w-full max-w-[414px] items-start">
      {labels.map((label, i) => {
        const n = i + 1;
        const state = step === n ? "active" : step > n ? "done" : "upcoming";
        return (
          <Fragment key={n}>
            {/* The frames draw the line solid blue on both steps. */}
            {i > 0 && <div className={clsx(LINE, "mt-[10px] min-w-4 flex-1")} />}
            <div className="relative flex shrink-0 flex-col items-center gap-2">
              {/* Each column is as wide as its label, so the line is carried
                  from the column's edge to the circle's centre. */}
              {i > 0 && <span className={clsx(LINE, "absolute end-1/2 start-0 top-[10px]")} />}
              {i < last && <span className={clsx(LINE, "absolute end-0 start-1/2 top-[10px]")} />}
              <Node n={n} state={state} first={i === 0} label={label} disabled={n > maxReachable} onClick={() => onStepClick(n)} />
              <span className={clsx("whitespace-nowrap text-center text-[14px] leading-[14px]", state === "upcoming" ? TEXT_SEC_GRAY : TEXT_STEP)}>
                {label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </nav>
  );
}

function Node({
  n,
  state,
  first,
  label,
  disabled,
  onClick,
}: {
  n: number;
  state: "active" | "done" | "upcoming";
  /** The frames fill the active first step lighter than the active last one. */
  first: boolean;
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
        "relative grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-semibold leading-3 transition-opacity",
        state === "active" && ["border border-[#0d6efd]", first ? SURFACE_BRAND_LIGHT : SURFACE_100, TEXT_STEP],
        state === "done" && "bg-[linear-gradient(135deg,#0d6efd_0%,#6c4dff_100%)] text-white hover:opacity-90",
        state === "upcoming" && [SURFACE_100, TEXT_SECONDARY, "enabled:hover:opacity-80"],
        "disabled:cursor-default"
      )}
    >
      {n}
    </button>
  );
}
