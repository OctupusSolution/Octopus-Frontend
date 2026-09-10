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
        const done = n <= current;
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
                    "grid h-[26px] w-[26px] place-items-center rounded-full text-[13px] font-semibold transition-colors",
                    done
                      ? "bg-[var(--octo-accent)] text-white"
                      : "bg-[var(--octo-track)] text-[var(--octo-text-muted)]"
                  )}
                >
                  {n}
                </button>
              ) : (
                <span
                  className="grid h-[26px] w-[26px] place-items-center rounded-full bg-[var(--octo-track)] text-[13px] font-semibold text-[var(--octo-text-muted)]"
                  aria-disabled
                >
                  {n}
                </span>
              )}
              <span
                className={clsx(
                  "whitespace-nowrap text-[13px]",
                  done
                    ? "font-medium text-[var(--octo-accent)]"
                    : "text-[var(--octo-text-muted)]"
                )}
              >
                {t(LABEL_KEYS[step])}
              </span>
            </div>

            {!isLast && (
              // The connector fills only where the merchant has already been,
              // which is what tells them at a glance how much is left.
              <span
                aria-hidden
                className={clsx(
                  "mt-[13px] h-[2px] flex-1",
                  n < current ? "bg-[var(--octo-accent)]" : "bg-[var(--octo-border-card)]"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
