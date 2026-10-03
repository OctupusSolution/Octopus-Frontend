// The builder's seven-step rail, drawn to the Figma frames: 24px numbered
// circles with a 14px label under each, 40px apart, on a 4px track that runs
// from the first circle's centre to the last one's.
//
// The frames have no Back button — a step already behind the merchant is a
// button here, so the rail itself is the way back.
import { useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";

interface TrackGeometry {
  start: number;
  width: number;
  fill: number;
}

export function BuilderRail({
  step,
  labelKeys,
  onStep,
}: {
  /** 1-based current step. */
  step: number;
  labelKeys: readonly string[];
  /** Called with a 1-based step the merchant has already passed. */
  onStep?: (step: number) => void;
}) {
  const { t, locale } = useI18n();
  const rowRef = useRef<HTMLOListElement>(null);
  const [track, setTrack] = useState<TrackGeometry | null>(null);

  // The frames run the blue fill on to the next step's circle (and stop at the
  // current one once only two steps remain); the last step fills the track.
  const last = labelKeys.length;
  const fillTo = step >= last ? last : step < last - 2 ? step + 1 : step;

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => {
      const dots = Array.from(row.querySelectorAll<HTMLElement>("[data-rail-dot]"));
      if (dots.length < 2) return;
      const origin = row.getBoundingClientRect();
      const centres = dots.map((dot) => {
        const box = dot.getBoundingClientRect();
        return box.left + box.width / 2 - origin.left;
      });
      const first = centres[0];
      const end = centres[centres.length - 1];
      const target = centres[fillTo - 1];
      setTrack({
        start: Math.min(first, end),
        width: Math.abs(end - first),
        fill: Math.abs(target - first),
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [fillTo, locale, labelKeys.length]);

  return (
    <div className="relative shrink-0">
      {track && (
        <div
          aria-hidden
          className="absolute top-[10px] h-1 overflow-hidden rounded-full bg-[var(--pl-g100)]"
          style={{ left: track.start, width: track.width }}
        >
          <div
            className="absolute inset-y-0 start-0 rounded-full bg-[var(--pl-primary)] transition-[width] duration-300"
            style={{ width: track.fill }}
          />
        </div>
      )}
      <ol ref={rowRef} className="relative flex items-start gap-10">
        {labelKeys.map((labelKey, index) => {
          const n = index + 1;
          const reached = n <= step;
          const canJump = Boolean(onStep) && n < step;
          const body = (
            <>
              <span
                data-rail-dot
                className={clsx(
                  "grid h-6 w-6 place-items-center rounded-full text-[12px] font-semibold leading-[12px]",
                  reached ? "text-white" : "bg-[var(--pl-g100)] text-[var(--pl-text-3)]",
                  reached && n > 1 && "bg-[var(--pl-primary)]"
                )}
                style={reached && n === 1 ? { backgroundImage: "linear-gradient(135deg, #0d6efd 0%, #6c4dff 100%)" } : undefined}
              >
                {n}
              </span>
              <span
                className={clsx(
                  "whitespace-nowrap text-center text-[14px] font-normal leading-[14px]",
                  reached ? "text-[var(--pl-primary-text)]" : "text-[var(--pl-text-3)]"
                )}
              >
                {t(labelKey)}
              </span>
            </>
          );
          return (
            <li key={labelKey} aria-current={n === step ? "step" : undefined} className={clsx(index === 0 && "min-w-[93px]")}>
              {canJump ? (
                <button
                  type="button"
                  onClick={() => onStep?.(n)}
                  className="flex w-full flex-col items-center gap-2 rounded-[4px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
                >
                  {body}
                </button>
              ) : (
                <span className="flex flex-col items-center gap-2">{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
