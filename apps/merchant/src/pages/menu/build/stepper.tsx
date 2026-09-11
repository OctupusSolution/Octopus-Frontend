// The wizard's four-node rail. Every build frame draws it identically: a
// numbered circle per step, joined by a line that fills in behind you.
//
// Reached steps are buttons; the ones ahead are inert spans. A merchant cannot
// jump to Review before there is anything to review, and rendering that as a
// dead button rather than as plain text would invite the click.
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";

export const WIZARD_STEPS = ["sections", "items", "theme", "review"] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

const LABEL_KEYS: Record<WizardStep, string> = {
  sections: "menuWiz.step.sections",
  items: "menuWiz.step.items",
  theme: "menuWiz.step.theme",
  review: "menuWiz.step.review",
};

export function Stepper({
  current,
  furthest,
  onJump,
}: {
  current: number;
  /** How far the merchant has actually got. Steps beyond it are not reachable
   *  even by clicking, however far back `current` has been dragged. */
  furthest: number;
  onJump: (step: number) => void;
}) {
  const { t } = useI18n();

  return (
    <ol className="mt-5 flex items-start">
      {WIZARD_STEPS.map((step, index) => {
        const n = index + 1;
        const done = n < current;
        const isCurrent = n === current;
        const reachable = n <= furthest;
        const isLast = index === WIZARD_STEPS.length - 1;

        return (
          <li key={step} className={clsx("flex items-start", !isLast && "flex-1")}>
            <div className="flex flex-col items-center gap-2">
              {reachable ? (
                <button
                  type="button"
                  onClick={() => onJump(n)}
                  aria-current={n === current ? "step" : undefined}
                  className={clsx(
                    "grid h-[30px] w-[30px] place-items-center rounded-full text-[14px] font-semibold transition-colors",
                    // The frames ring the step you are on and fill the ones
                    // behind you, so "here" and "done" never look alike.
                    isCurrent
                      ? "border-2 border-[var(--octo-accent)] bg-[var(--octo-card)] text-[var(--octo-accent)]"
                      : done
                        ? "bg-[var(--octo-accent)] text-white"
                        : "border border-[var(--octo-border-card)] bg-[var(--octo-card)] text-[var(--octo-text-muted)]"
                  )}
                >
                  {n}
                </button>
              ) : (
                <span
                  className="grid h-[30px] w-[30px] place-items-center rounded-full border border-[var(--octo-border-card)] bg-[var(--octo-card)] text-[14px] font-semibold text-[var(--octo-text-muted)]"
                  aria-disabled
                >
                  {n}
                </span>
              )}
              <span
                className={clsx(
                  "whitespace-nowrap text-[14px]",
                  done || isCurrent
                    ? "font-medium text-[var(--octo-accent)]"
                    : "text-[var(--octo-text-muted)]"
                )}
              >
                {t(LABEL_KEYS[step])}
              </span>
            </div>

            {!isLast && (
              // The frames fill the connector leaving the current step too — the
              // line points at where you are heading — and leave the rest grey.
              <span
                aria-hidden
                className={clsx(
                  "mt-[15px] h-[2px] flex-1",
                  n <= current ? "bg-[var(--octo-accent)]" : "bg-[var(--octo-border-card)]"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
