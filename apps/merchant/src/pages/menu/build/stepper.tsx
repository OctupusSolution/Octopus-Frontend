// The wizard's four-node rail. Every build frame draws it identically: a 24px
// numbered circle per step over a 4px track that fills in behind you.
//
// Reached steps are buttons; the ones ahead are inert spans. A merchant cannot
// jump to Review before there is anything to review, and rendering that as a
// dead button rather than as plain text would invite the click.
import { useLayoutEffect, useRef, useState } from "react";
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

const DOT = "grid size-6 place-items-center rounded-full text-[12px] font-semibold leading-3 transition-colors";
const DOT_AHEAD =
  "bg-[#f1f5f9] text-[#58606c] [[data-theme=dark]_&]:bg-[var(--octo-track)] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";
const DOT_CURRENT =
  "border border-[#0D6EFD] bg-[#f1f5f9] text-[#0D6EFD] [[data-theme=dark]_&]:bg-[var(--octo-track)]";
const DOT_DONE = "bg-[linear-gradient(135deg,#0D6EFD_0%,#6C4DFF_100%)] text-white";

interface Track {
  left: number;
  width: number;
  fill: number;
}

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
  const { t, locale } = useI18n();
  const row = useRef<HTMLOListElement>(null);
  const dots = useRef<(HTMLElement | null)[]>([]);
  const [track, setTrack] = useState<Track | null>(null);

  // The frames run the fill to the step you are on, and never shorter than the
  // first segment — on step 1 the line already points at Items.
  const fillTo = Math.min(WIZARD_STEPS.length, Math.max(current, 2));

  // The labels have different widths in each language, so the track's ends
  // (the centres of the first and last circle) are measured, not assumed.
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      const centres = dots.current.map((dot) => {
        const r = dot?.getBoundingClientRect();
        return r ? r.left + r.width / 2 - box.left : 0;
      });
      const first = centres[0] ?? 0;
      const last = centres[WIZARD_STEPS.length - 1] ?? 0;
      const target = centres[fillTo - 1] ?? first;
      setTrack({ left: Math.min(first, last), width: Math.abs(last - first), fill: Math.abs(target - first) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fillTo, locale]);

  return (
    <div className="relative">
      {track && (
        <div
          aria-hidden
          style={{ left: track.left, width: track.width }}
          className="absolute top-[10px] h-1 overflow-hidden rounded-full bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-track)]"
        >
          <div
            style={{ insetInlineStart: -20, width: track.fill + 20 }}
            className="absolute inset-y-0 rounded-full bg-[#0D6EFD] transition-[width] duration-200"
          />
        </div>
      )}

      <ol ref={row} className="relative flex items-start justify-between">
        {WIZARD_STEPS.map((step, index) => {
          const n = index + 1;
          const done = n < current;
          const isCurrent = n === current;
          const reachable = n <= furthest;
          const tone = isCurrent ? DOT_CURRENT : done ? DOT_DONE : DOT_AHEAD;
          const setDot = (el: HTMLElement | null) => {
            dots.current[index] = el;
          };

          return (
            <li
              key={step}
              // The frames pad the end steps so their circles sit inside the
              // track's rounded ends rather than on the page edge.
              className={clsx("flex flex-col items-center gap-2", index === 0 && "min-w-[93px]")}
            >
              {reachable ? (
                <button
                  type="button"
                  ref={setDot}
                  onClick={() => onJump(n)}
                  aria-current={isCurrent ? "step" : undefined}
                  className={clsx(DOT, tone)}
                >
                  {n}
                </button>
              ) : (
                <span ref={setDot} className={clsx(DOT, DOT_AHEAD)} aria-disabled>
                  {n}
                </span>
              )}
              <span
                className={clsx(
                  "whitespace-nowrap text-center text-[14px] font-medium leading-[14px]",
                  done || isCurrent
                    ? "text-[#0058da] [[data-theme=dark]_&]:text-[#8ab8ff]"
                    : "text-[#58606c] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]"
                )}
              >
                {t(LABEL_KEYS[step])}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
