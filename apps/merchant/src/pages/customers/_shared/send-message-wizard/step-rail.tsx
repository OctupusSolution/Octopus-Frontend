// apps/merchant/src/pages/customers/_shared/send-message-wizard/step-rail.tsx
import { useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { BRAND_TEXT_CLASS, INSET_BG_CLASS } from "./styles";

interface Track {
  start: number;
  width: number;
  fill: number;
}

export function StepRail({
  step,
  labels,
  ariaLabel,
  onStepClick,
}: {
  step: number;
  labels: readonly string[];
  ariaLabel: string;
  /** Called for an already-completed stop; later stops are not clickable. */
  onStepClick: (step: number) => void;
}) {
  const listRef = useRef<HTMLOListElement>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const labelsKey = labels.join("|");

  // The labels differ in width (and per locale), so the track is measured
  // between the first and last dots instead of being inset by a fixed amount.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const dots = list.querySelectorAll<HTMLElement>("[data-dot]");
      if (dots.length === 0) return;
      const box = list.getBoundingClientRect();
      const centre = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect();
        return rect.left + rect.width / 2 - box.left;
      };
      const first = centre(dots[0]);
      const last = centre(dots[dots.length - 1]);
      // The frames draw the first segment blue already on step 1.
      const reached = centre(dots[Math.min(Math.max(step, 2), dots.length) - 1]);
      setTrack({ start: Math.min(first, last), width: Math.abs(last - first), fill: Math.abs(reached - first) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    list.querySelectorAll("li").forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [step, labelsKey]);

  return (
    <nav aria-label={ariaLabel}>
      <ol ref={listRef} className="relative flex w-full items-start justify-between">
        {track && (
          <li aria-hidden className={clsx("absolute top-[10px] h-1 overflow-hidden rounded-full", INSET_BG_CLASS)} style={{ left: track.start, width: track.width }}>
            <span className="absolute inset-y-0 start-0 block rounded-full bg-[#0d6efd] transition-[width] duration-300" style={{ width: track.fill }} />
          </li>
        )}
        {labels.map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const current = n === step;
          return (
            <li key={label} className={clsx("relative flex flex-col items-center gap-2", i === 0 && "min-w-[93px]")}>
              <button
                type="button"
                data-dot
                disabled={!done}
                onClick={() => onStepClick(n)}
                aria-current={current ? "step" : undefined}
                className={clsx(
                  "grid h-6 w-6 place-items-center rounded-full text-[12px] font-semibold leading-[12px] transition-colors",
                  done && "cursor-pointer bg-[#0d6efd] text-white hover:opacity-90",
                  current && clsx("border border-[#0d6efd]", INSET_BG_CLASS, BRAND_TEXT_CLASS),
                  !done && !current && clsx(INSET_BG_CLASS, "text-[var(--octo-text-secondary)]")
                )}
              >
                {n}
              </button>
              <span className={clsx("whitespace-nowrap text-center text-[14px] font-medium leading-[14px]", done || current ? BRAND_TEXT_CLASS : "text-[var(--octo-text-secondary)]")}>
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
