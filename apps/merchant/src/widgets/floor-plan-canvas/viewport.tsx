// A read-only plan in a scrollable frame, sized to fit its container or shown
// at a fixed zoom. Used by the live floor and the publish preview; the builder
// has its own editor canvas with rulers.
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import type { FloorPlanDoc } from "@/entities/floor-plan";
import { PlanSvg, type PlanSvgProps } from "./plan-svg";

export type ZoomSetting = { mode: "fit" } | { mode: "fitWidth" } | { mode: "percent"; percent: number };

/** Pixels per unit at 100%. */
export const ACTUAL_SIZE_SCALE = 22;
const PADDING = 12;

export function computeScale(zoom: ZoomSetting, doc: Pick<FloorPlanDoc, "width" | "height">, box: { width: number; height: number }): number {
  const availableW = Math.max(40, box.width - PADDING * 2);
  const availableH = Math.max(40, box.height - PADDING * 2);
  if (zoom.mode === "percent") return (ACTUAL_SIZE_SCALE * zoom.percent) / 100;
  if (zoom.mode === "fitWidth") return availableW / doc.width;
  return Math.min(availableW / doc.width, availableH / doc.height);
}

export function PlanViewport({
  doc,
  zoom,
  onScaleChange,
  className,
  frameClassName,
  children,
  ...planProps
}: Omit<PlanSvgProps, "scale" | "doc"> & {
  doc: FloorPlanDoc;
  zoom: ZoomSetting;
  onScaleChange?: (percent: number) => void;
  className?: string;
  frameClassName?: string;
  children?: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = box.width > 0 ? computeScale(zoom, doc, box) : 0;

  useEffect(() => {
    if (scale > 0) onScaleChange?.(Math.round((scale / ACTUAL_SIZE_SCALE) * 100));
  }, [scale, onScaleChange]);

  return (
    <div ref={boxRef} dir="ltr" className={clsx("octo-scroll relative overflow-auto", className)}>
      {scale > 0 && (
        <div className="flex min-h-full min-w-full" style={{ padding: PADDING }}>
          <div className={clsx("m-auto shrink-0", frameClassName)}>
            <PlanSvg doc={doc} scale={scale} {...planProps} />
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
