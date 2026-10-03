// The button row at the foot of every build step, and the red strip the frames
// put above it when the step cannot continue.
//
// The row is the same three weights everywhere — a grey quiet action, a
// pale-blue secondary one and the solid step forward — but each step words
// them differently, so labels and handlers come in as props.
import clsx from "clsx";
import { MenuIcon } from "../_shared/menu-icon";
import { ERROR_STRIP, SURFACE_BLUE, SURFACE_SUBTLE, TEXT, TEXT_GRAY } from "../_shared/theme";

/** quiet: grey fill, grey text ("Cancel", "Save as Draft").
 *  tinted: pale-blue fill, dark text ("Save Draft").
 *  tintedAccent: pale-blue fill, blue text ("Save &Add another item"). */
export type FooterTone = "quiet" | "tinted" | "tintedAccent";

export interface FooterAction {
  label: string;
  onClick: () => void;
  tone?: FooterTone;
  disabled?: boolean;
}

export interface FooterNext {
  label: string;
  onClick: () => void;
  /** Drawn at half strength, as the frames do while the step is incomplete. */
  disabled?: boolean;
}

const BUTTON =
  "inline-flex h-12 min-w-0 items-center justify-center gap-2 rounded-[8px] px-3 text-[18px] font-bold leading-[18px] transition-[filter,opacity] disabled:cursor-not-allowed";

const TONE: Record<FooterTone, string> = {
  quiet: `${SURFACE_SUBTLE} ${TEXT_GRAY} hover:brightness-95 disabled:opacity-50`,
  tinted: `${SURFACE_BLUE} ${TEXT} hover:brightness-95 disabled:opacity-50`,
  tintedAccent: `${SURFACE_BLUE} text-[#0D6EFD] hover:brightness-95 disabled:opacity-50`,
};

// The frames' own widths (171 / 367 / 562 of 1148) as ratios, so the row keeps
// its proportions at any content width.
const COLUMNS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-[minmax(0,171fr)_minmax(0,367fr)_minmax(0,562fr)]",
};

export function WizardFooter({
  actions = [],
  next,
  error,
  className,
}: {
  /** The secondary buttons, start to end. Up to two. */
  actions?: FooterAction[];
  /** The solid step-forward button; omit on a step that has none. */
  next?: FooterNext | null;
  /** Shown in the red strip above the row. */
  error?: string | null;
  className?: string;
}) {
  const count = actions.length + (next ? 1 : 0);
  if (count === 0 && !error) return null;

  return (
    <footer className={clsx("flex flex-col gap-3", className)}>
      {error && (
        <p role="alert" className={clsx("flex items-center gap-1 rounded-[12px] px-3 py-2 text-[14px] font-medium leading-[1.3]", ERROR_STRIP)}>
          <MenuIcon name="menu-info-circle.svg" size={24} />
          {error}
        </p>
      )}
      {count > 0 && (
        <div className={clsx("grid gap-3 sm:gap-6", COLUMNS[Math.min(count, 3)])}>
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={clsx(BUTTON, TONE[action.tone ?? "quiet"])}
            >
              <span className="truncate">{action.label}</span>
            </button>
          ))}
          {next && (
            <button
              type="button"
              onClick={next.onClick}
              disabled={next.disabled}
              className={clsx(BUTTON, "bg-[#0D6EFD] text-white hover:opacity-90 disabled:opacity-50")}
            >
              <span className="truncate">{next.label}</span>
              <MenuIcon name="menu-arrow-right.svg" size={24} className="rtl:rotate-180" />
            </button>
          )}
        </div>
      )}
    </footer>
  );
}
