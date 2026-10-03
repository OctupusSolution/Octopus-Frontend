// A read-only plan in a scrollable frame, sized to fit its container or shown
// at a fixed zoom. Used by the live floor and the publish preview; the builder
// has its own editor canvas with rulers.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { boundsOf, itemRect, tableRect, type FloorObject, type FloorPlanDoc } from "@/entities/floor-plan";
import { PlanSvg, type PlanSvgProps } from "./plan-svg";

export type ZoomSetting = { mode: "fit" } | { mode: "fitWidth" } | { mode: "percent"; percent: number };

/** Pixels per unit at 100%. */
export const ACTUAL_SIZE_SCALE = 22;
const PADDING = 12;
/** Breathing room (plan units) kept around the drawn content when cropping. */
const CONTENT_MARGIN = 0.6;

/** The part of the canvas that actually holds something, or null when empty. */
function contentBounds(doc: FloorPlanDoc) {
  const b = boundsOf([...doc.zones, ...doc.objects, ...doc.tables.filter((t) => t.visible)].map(itemRect));
  if (!b) return null;
  return { x: b.x - CONTENT_MARGIN, y: b.y - CONTENT_MARGIN, w: b.w + CONTENT_MARGIN * 2, h: b.h + CONTENT_MARGIN * 2 };
}

type Box = { x: number; y: number; w: number; h: number };

/** Long runs that can lengthen without looking wrong. */
const STRETCHY = new Set<FloorObject["type"]>(["wall", "halfWall", "planterBox"]);
const DOORS = new Set<FloorObject["type"]>(["door", "doubleDoor"]);

/**
 * Spreads the plan out to a frame of another shape without distorting it:
 * zones and wall runs lengthen, while tables, furniture and doors keep their
 * real size and only move apart. Walls that ended at a door are re-attached to
 * it, so openings stay closed.
 */
function stretchDoc(doc: FloorPlanDoc, origin: Box, sx: number, sy: number): FloorPlanDoc {
  const X = (x: number) => origin.x + (x - origin.x) * sx;
  const Y = (y: number) => origin.y + (y - origin.y) * sy;
  const moveKeepingSize = <T extends { x: number; y: number }>(item: T, w: number, h: number): T => ({
    ...item,
    x: X(item.x + w / 2) - w / 2,
    y: Y(item.y + h / 2) - h / 2,
  });

  const doors = doc.objects.filter((o) => DOORS.has(o.type));
  const movedDoors = new Map(doors.map((d) => [d.id, moveKeepingSize(d, d.w, d.h)]));

  const objects = doc.objects.map((o) => {
    if (DOORS.has(o.type)) return movedDoors.get(o.id)!;
    if (!STRETCHY.has(o.type)) return moveKeepingSize(o, o.w, o.h);
    if (o.w >= o.h) {
      let x0 = X(o.x);
      let x1 = X(o.x + o.w);
      for (const d of doors) {
        if (Math.abs(d.y + d.h / 2 - (o.y + o.h / 2)) > d.h) continue;
        const nd = movedDoors.get(d.id)!;
        if (Math.abs(o.x + o.w - d.x) < 0.3) x1 = nd.x;
        if (Math.abs(d.x + d.w - o.x) < 0.3) x0 = nd.x + nd.w;
      }
      return { ...o, x: x0, w: Math.max(0.1, x1 - x0), y: Y(o.y + o.h / 2) - o.h / 2 };
    }
    let y0 = Y(o.y);
    let y1 = Y(o.y + o.h);
    for (const d of doors) {
      if (Math.abs(d.x + d.w / 2 - (o.x + o.w / 2)) > d.w) continue;
      const nd = movedDoors.get(d.id)!;
      if (Math.abs(o.y + o.h - d.y) < 0.3) y1 = nd.y;
      if (Math.abs(d.y + d.h - o.y) < 0.3) y0 = nd.y + nd.h;
    }
    return { ...o, y: y0, h: Math.max(0.1, y1 - y0), x: X(o.x + o.w / 2) - o.w / 2 };
  });

  return {
    ...doc,
    zones: doc.zones.map((z) => ({ ...z, x: X(z.x), y: Y(z.y), w: z.w * sx, h: z.h * sy })),
    tables: doc.tables.map((t) => {
      const r = tableRect(t);
      return moveKeepingSize(t, r.w, r.h);
    }),
    objects,
  };
}

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
  fillFrame = false,
  ...planProps
}: Omit<PlanSvgProps, "scale" | "doc" | "view"> & {
  /** In "fit" mode, zoom to the restaurant's drawn content instead of the whole
   *  canvas and stretch the paper to the frame, leaving no empty bands. */
  fillFrame?: boolean;
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

  // fillFrame: spread the room to the frame's exact shape, then fit it — the
  // whole plan shows edge to edge with no empty bands and no scrolling.
  const content = fillFrame && zoom.mode === "fit" && box.width > 0 ? contentBounds(doc) : null;
  const frameRatio = box.width / Math.max(1, box.height);
  const sx = content ? Math.max(1, (frameRatio * content.h) / content.w) : 1;
  const sy = content ? Math.max(1, content.w / (frameRatio * content.h)) : 1;
  const shown = useMemo(
    () => (content && (sx !== 1 || sy !== 1) ? stretchDoc(doc, content, sx, sy) : doc),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, content?.x, content?.y, sx, sy]
  );
  const view = content ? { x: content.x, y: content.y, w: content.w * sx, h: content.h * sy } : undefined;
  const scale = box.width <= 0 ? 0 : view ? box.width / view.w : computeScale(zoom, doc, box);

  useEffect(() => {
    if (scale > 0) onScaleChange?.(Math.round((scale / ACTUAL_SIZE_SCALE) * 100));
  }, [scale, onScaleChange]);

  return (
    <div ref={boxRef} dir="ltr" className={clsx("octo-scroll relative overflow-auto", className)}>
      {scale > 0 && view ? (
        <PlanSvg doc={shown} scale={scale} view={view} {...planProps} />
      ) : scale > 0 && (
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
