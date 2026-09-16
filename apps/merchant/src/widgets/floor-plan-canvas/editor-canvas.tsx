// The builder's drawing surface: rulers, the plan, and every pointer gesture —
// selecting, dragging, resizing, marquee selection, panning, drawing walls,
// rooms and zones, placing text, and measuring.
//
// Gestures edit a private preview copy of the document and hand the result to
// `onCommit` once, on release, so a drag across the room is one undo step
// rather than a hundred.
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import clsx from "clsx";
import {
  METERS_PER_UNIT,
  addItem,
  clamp,
  createObject,
  createZone,
  itemRect,
  moveItems,
  nextZoneColor,
  rectContains,
  rectsOverlap,
  resizeItem,
  round2,
  snap as snapTo,
  type FloorItem,
  type FloorPlanDoc,
  type FloorTable,
  type LiveStatus,
  type Rect,
} from "@/entities/floor-plan";
import { PlanSvg, type HandleId, type ItemKind } from "./plan-svg";
import { SELECTION, ZONE_PALETTE } from "./palette";

export type EditorTool = "select" | "multiSelect" | "move" | "hand" | "wall" | "room" | "text" | "zone" | "lasso" | "measure";

export const LIBRARY_MIME = "application/x-octopus-floor-item";

export interface Point {
  x: number;
  y: number;
}

export interface EditorCanvasHandle {
  /** The plan point at the middle of what is currently scrolled into view. */
  viewportCenter: () => Point;
  fitToView: () => void;
}

export interface EditorCanvasProps {
  doc: FloorPlanDoc;
  selection: readonly string[];
  onSelectionChange: (ids: string[]) => void;
  onCommit: (doc: FloorPlanDoc, selection?: string[]) => void;
  tool: EditorTool;
  onToolChange?: (tool: EditorTool) => void;
  /** Pixels per grid unit. */
  scale: number;
  onScaleChange: (scale: number) => void;
  showGrid: boolean;
  snapEnabled: boolean;
  snapStep: number;
  showLabels: boolean;
  showDimensions?: boolean;
  /** Draw tables as plain dashed status boxes (Quick Box Layout). */
  boxTables?: boolean;
  hiddenIds?: ReadonlySet<string>;
  conflictIds?: ReadonlySet<string>;
  toneFor?: (table: FloorTable) => LiveStatus;
  newZoneName: (index: number) => string;
  newTextLabel: string;
  onCreated?: (item: FloorItem) => void;
  onDropPayload?: (payload: string, point: Point) => void;
  className?: string;
  children?: ReactNode;
}

type Gesture =
  | { kind: "drag"; ids: string[]; anchorId: string; start: Point; origin: FloorPlanDoc; moved: boolean; additive: boolean }
  | { kind: "resize"; id: string; handle: HandleId; start: Point; startRect: Rect; origin: FloorPlanDoc }
  | { kind: "marquee"; start: Point; additive: boolean; base: string[] }
  | { kind: "pan"; clientX: number; clientY: number; scrollLeft: number; scrollTop: number }
  | { kind: "draw"; tool: "wall" | "room" | "zone"; start: Point }
  | { kind: "measure"; start: Point };

const RULER = 26;
const MIN_SCALE = 6;
const MAX_SCALE = 60;
const DRAG_THRESHOLD_UNITS = 0.15;
const WALL_THICKNESS = 0.3;

const EDITABLE_KINDS: ReadonlySet<ItemKind> = new Set(["table", "object", "zone"]);

function normalizeRect(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

function dataUrlToObjectUrl(dataUrl: string): string | null {
  try {
    const [meta, base64] = dataUrl.split(",");
    const mime = /data:(.*?);/.exec(meta)?.[1] ?? "application/octet-stream";
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return null;
  }
}

function Ruler({ length, scale, orientation }: { length: number; scale: number; orientation: "horizontal" | "vertical" }) {
  const size = length * scale;
  const horizontal = orientation === "horizontal";
  // Label every other unit, or fewer when zoomed far out so numbers never touch.
  const every = scale >= 14 ? 2 : scale >= 8 ? 4 : 8;
  const ticks = [];
  for (let i = 0; i <= length; i += 1) {
    const major = i % every === 0;
    const at = i * scale;
    ticks.push(
      horizontal ? (
        <line key={i} x1={at} x2={at} y1={RULER} y2={RULER - (major ? 7 : 4)} stroke="currentColor" strokeOpacity={0.55} strokeWidth={1} />
      ) : (
        <line key={i} y1={at} y2={at} x1={RULER} x2={RULER - (major ? 7 : 4)} stroke="currentColor" strokeOpacity={0.55} strokeWidth={1} />
      )
    );
    if (major) {
      ticks.push(
        horizontal ? (
          <text key={`t${i}`} x={at} y={12} textAnchor="middle" fontSize={11} fill="currentColor">
            {i}
          </text>
        ) : (
          <text key={`t${i}`} x={12} y={at} textAnchor="middle" dominantBaseline="central" fontSize={11} fill="currentColor">
            {i}
          </text>
        )
      );
    }
  }
  // The rulers sit on the themed chrome, not the plan's paper, so they take
  // the theme's text colour rather than a fixed grey.
  return (
    <svg
      width={horizontal ? size + 1 : RULER}
      height={horizontal ? RULER : size + 1}
      style={{ display: "block", overflow: "visible", fontFamily: "inherit", color: "var(--octo-text-secondary)" }}
      aria-hidden
    >
      {ticks}
    </svg>
  );
}

export const EditorCanvas = forwardRef<EditorCanvasHandle, EditorCanvasProps>(function EditorCanvas(
  {
    doc,
    selection,
    onSelectionChange,
    onCommit,
    tool,
    onToolChange,
    scale,
    onScaleChange,
    showGrid,
    snapEnabled,
    snapStep,
    showLabels,
    showDimensions = false,
    boxTables = false,
    hiddenIds,
    conflictIds,
    toneFor,
    newZoneName,
    newTextLabel,
    onCreated,
    onDropPayload,
    className,
    children,
  },
  ref
) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const [previewDoc, setPreviewDoc] = useState<FloorPlanDoc | null>(null);
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [drawRect, setDrawRect] = useState<{ tool: "wall" | "room" | "zone"; rect: Rect } | null>(null);
  const [measure, setMeasure] = useState<{ a: Point; b: Point } | null>(null);
  const [panning, setPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const zoomAnchor = useRef<{ point: Point; clientX: number; clientY: number } | null>(null);

  const shown = previewDoc ?? doc;
  const selectedSet = useMemo(() => new Set(selection), [selection]);
  const effectiveTool: EditorTool = spaceHeld ? "hand" : tool;
  const step = snapEnabled ? snapStep : 0.05;

  const toUnits = useCallback((clientX: number, clientY: number): Point => {
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      viewportCenter: () => {
        const el = scrollRef.current;
        if (!el) return { x: doc.width / 2, y: doc.height / 2 };
        const box = el.getBoundingClientRect();
        const point = toUnits(box.left + RULER + (box.width - RULER) / 2, box.top + RULER + (box.height - RULER) / 2);
        return { x: clamp(point.x, 0, doc.width), y: clamp(point.y, 0, doc.height) };
      },
      fitToView: () => {
        const el = scrollRef.current;
        if (!el) return;
        // Fill the width: a plan narrower than the frame used to leave a dead
        // band down one side. Fitting to width alone always uses all of it,
        // and a plan taller than the frame at that scale just scrolls — nothing
        // is cropped, it's simply below the fold, same as any tall document.
        const next = (el.clientWidth - RULER - 24) / doc.width;
        onScaleChange(clamp(next, MIN_SCALE, MAX_SCALE));
      },
    }),
    [doc.width, doc.height, onScaleChange, toUnits]
  );

  // Space bar pans while held, the way every drawing tool behaves.
  useEffect(() => {
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    const down = (event: KeyboardEvent) => {
      if (event.code === "Space" && !isTyping(event.target)) {
        event.preventDefault();
        setSpaceHeld(true);
      }
      if (event.key === "Escape") {
        setMeasure(null);
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Ctrl/⌘ + wheel zooms about the pointer.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const next = clamp(scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12), MIN_SCALE, MAX_SCALE);
      if (next === scale) return;
      zoomAnchor.current = { point: toUnits(event.clientX, event.clientY), clientX: event.clientX, clientY: event.clientY };
      onScaleChange(next);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scale, onScaleChange, toUnits]);

  useLayoutEffect(() => {
    const anchor = zoomAnchor.current;
    const el = scrollRef.current;
    const svg = svgRef.current;
    if (!anchor || !el || !svg) return;
    zoomAnchor.current = null;
    const box = svg.getBoundingClientRect();
    el.scrollLeft += box.left + anchor.point.x * scale - anchor.clientX;
    el.scrollTop += box.top + anchor.point.y * scale - anchor.clientY;
  }, [scale]);

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const pdfData = doc.background?.mime === "application/pdf" ? doc.background.dataUrl : null;
  useEffect(() => {
    if (!pdfData) {
      setPdfUrl(null);
      return;
    }
    const url = dataUrlToObjectUrl(pdfData);
    setPdfUrl(url);
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [pdfData]);

  function endGesture() {
    gestureRef.current = null;
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", handleUp);
    window.removeEventListener("pointercancel", handleUp);
  }

  function beginGesture(gesture: Gesture) {
    gestureRef.current = gesture;
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  }

  // Handlers read the latest props through a ref so the window listeners
  // added at pointerdown never act on a stale document or selection.
  const latest = useRef({ doc, selection, step, onCommit, onSelectionChange, onCreated, onToolChange, newZoneName, newTextLabel, tool, hiddenIds });
  latest.current = { doc, selection, step, onCommit, onSelectionChange, onCreated, onToolChange, newZoneName, newTextLabel, tool, hiddenIds };

  // What the gesture in progress has produced so far, in refs as well as
  // state: state paints the preview, the refs are what pointer-up reads. The
  // result is then committed from the event handler itself — never from
  // inside a state updater, which React runs during render and may run twice.
  const previewRef = useRef<FloorPlanDoc | null>(null);
  const marqueeRef = useRef<Rect | null>(null);
  const drawRef = useRef<{ tool: "wall" | "room" | "zone"; rect: Rect } | null>(null);
  const showPreview = (next: FloorPlanDoc | null) => {
    previewRef.current = next;
    setPreviewDoc(next);
  };
  const showMarquee = (next: Rect | null) => {
    marqueeRef.current = next;
    setMarquee(next);
  };
  const showDraw = (next: { tool: "wall" | "room" | "zone"; rect: Rect } | null) => {
    drawRef.current = next;
    setDrawRect(next);
  };

  function handleMove(event: PointerEvent) {
    const gesture = gestureRef.current;
    if (!gesture) return;
    const { step: snapStepNow } = latest.current;
    if (gesture.kind === "pan") {
      const el = scrollRef.current;
      if (!el) return;
      el.scrollLeft = gesture.scrollLeft - (event.clientX - gesture.clientX);
      el.scrollTop = gesture.scrollTop - (event.clientY - gesture.clientY);
      return;
    }
    const point = toUnits(event.clientX, event.clientY);
    if (gesture.kind === "drag") {
      const rawDx = point.x - gesture.start.x;
      const rawDy = point.y - gesture.start.y;
      if (!gesture.moved && Math.hypot(rawDx, rawDy) < DRAG_THRESHOLD_UNITS) return;
      gesture.moved = true;
      const anchor = gesture.origin.tables.find((t) => t.id === gesture.anchorId) ??
        gesture.origin.objects.find((o) => o.id === gesture.anchorId) ??
        gesture.origin.zones.find((z) => z.id === gesture.anchorId);
      if (!anchor) return;
      // Snap the grabbed item to the grid and carry the rest of the
      // selection by the same offset, so a group keeps its arrangement.
      const dx = snapTo(anchor.x + rawDx, snapStepNow) - anchor.x;
      const dy = snapTo(anchor.y + rawDy, snapStepNow) - anchor.y;
      showPreview(moveItems(gesture.origin, gesture.ids, dx, dy));
      return;
    }
    if (gesture.kind === "resize") {
      const r = gesture.startRect;
      let left = r.x;
      let top = r.y;
      let right = r.x + r.w;
      let bottom = r.y + r.h;
      const sx = snapTo(point.x, snapStepNow);
      const sy = snapTo(point.y, snapStepNow);
      if (gesture.handle.includes("w")) left = Math.min(sx, right - 0.25);
      if (gesture.handle.includes("e")) right = Math.max(sx, left + 0.25);
      if (gesture.handle.includes("n")) top = Math.min(sy, bottom - 0.25);
      if (gesture.handle.includes("s")) bottom = Math.max(sy, top + 0.25);
      showPreview(resizeItem(gesture.origin, gesture.id, { x: left, y: top, w: right - left, h: bottom - top }));
      return;
    }
    if (gesture.kind === "marquee") {
      showMarquee(normalizeRect(gesture.start, point));
      return;
    }
    if (gesture.kind === "draw") {
      const a = { x: snapTo(gesture.start.x, snapStepNow), y: snapTo(gesture.start.y, snapStepNow) };
      const b = { x: snapTo(point.x, snapStepNow), y: snapTo(point.y, snapStepNow) };
      if (gesture.tool === "wall") {
        const horizontal = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);
        const rect = horizontal
          ? { x: Math.min(a.x, b.x), y: a.y - WALL_THICKNESS / 2, w: Math.abs(b.x - a.x), h: WALL_THICKNESS }
          : { x: a.x - WALL_THICKNESS / 2, y: Math.min(a.y, b.y), w: WALL_THICKNESS, h: Math.abs(b.y - a.y) };
        showDraw({ tool: "wall", rect });
      } else {
        showDraw({ tool: gesture.tool, rect: normalizeRect(a, b) });
      }
      return;
    }
    if (gesture.kind === "measure") {
      setMeasure({ a: gesture.start, b: { x: snapTo(point.x, snapStepNow), y: snapTo(point.y, snapStepNow) } });
    }
  }

  function handleUp() {
    const gesture = gestureRef.current;
    const current = latest.current;
    endGesture();
    if (!gesture) return;

    if (gesture.kind === "pan") {
      setPanning(false);
      return;
    }
    if (gesture.kind === "drag" || gesture.kind === "resize") {
      // Pressing an item that is already part of a group keeps the group so
      // it can be dragged together; releasing without moving means the
      // merchant clicked that one item, so it becomes the whole selection.
      if (gesture.kind === "drag" && !gesture.moved && !gesture.additive && gesture.ids.length > 1) {
        current.onSelectionChange([gesture.anchorId]);
      }
      const preview = previewRef.current;
      showPreview(null);
      if (preview && (gesture.kind === "resize" || gesture.moved)) current.onCommit(preview);
      return;
    }
    if (gesture.kind === "marquee") {
      const rect = marqueeRef.current;
      showMarquee(null);
      if (!rect || rect.w + rect.h < DRAG_THRESHOLD_UNITS * 2) {
        if (!gesture.additive) current.onSelectionChange([]);
        return;
      }
      const hidden = current.hiddenIds;
      const hits = [
        ...current.doc.zones.filter((z) => !hidden?.has(z.id) && rectContains(rect, itemRect(z))),
        ...current.doc.objects.filter((o) => !hidden?.has(o.id) && rectsOverlap(rect, itemRect(o), 0)),
        ...current.doc.tables.filter((t) => !hidden?.has(t.id) && rectsOverlap(rect, itemRect(t), 0)),
      ].map((item) => item.id);
      current.onSelectionChange(gesture.additive ? Array.from(new Set([...gesture.base, ...hits])) : hits);
      return;
    }
    if (gesture.kind === "draw") {
      const draft = drawRef.current;
      showDraw(null);
      if (!draft) return;
      const { rect } = draft;
      let item: FloorItem | null = null;
      if (draft.tool === "wall" && Math.max(rect.w, rect.h) >= 0.5) {
        item = createObject("wall", round2(rect.x), round2(rect.y), { w: round2(rect.w), h: round2(rect.h) });
      } else if (draft.tool === "room" && rect.w >= 1 && rect.h >= 1) {
        item = createObject("room", rect.x, rect.y, { w: rect.w, h: rect.h });
      } else if (draft.tool === "zone" && rect.w >= 1 && rect.h >= 1) {
        item = createZone(current.newZoneName(current.doc.zones.length + 1), nextZoneColor(current.doc), rect);
      }
      if (item) {
        current.onCommit(addItem(current.doc, item), [item.id]);
        current.onCreated?.(item);
        if (draft.tool !== "wall") current.onToolChange?.("select");
      }
    }
  }

  useEffect(() => endGesture, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startPan(event: ReactPointerEvent) {
    const el = scrollRef.current;
    if (!el) return;
    setPanning(true);
    beginGesture({ kind: "pan", clientX: event.clientX, clientY: event.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop });
  }

  function onBackgroundPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (event.button === 1 || effectiveTool === "hand") {
      event.preventDefault();
      startPan(event);
      return;
    }
    if (event.button !== 0) return;
    const point = toUnits(event.clientX, event.clientY);
    setMeasure(null);
    switch (effectiveTool) {
      case "wall":
      case "room":
      case "zone":
        beginGesture({ kind: "draw", tool: effectiveTool, start: point });
        return;
      case "measure": {
        const start = { x: snapTo(point.x, step), y: snapTo(point.y, step) };
        setMeasure({ a: start, b: start });
        beginGesture({ kind: "measure", start });
        return;
      }
      case "text": {
        const preset = createObject("text", 0, 0, { label: newTextLabel });
        const item = { ...preset, x: round2(snapTo(point.x - preset.w / 2, step)), y: round2(snapTo(point.y - preset.h / 2, step)) };
        onCommit(addItem(doc, item), [item.id]);
        onCreated?.(item);
        onToolChange?.("select");
        return;
      }
      case "move":
        return;
      default:
        beginGesture({
          kind: "marquee",
          start: point,
          additive: event.shiftKey || effectiveTool === "multiSelect",
          base: [...selection],
        });
    }
  }

  function onItemPointerDown(event: ReactPointerEvent<SVGGElement>, item: FloorItem) {
    if (event.button === 1 || effectiveTool === "hand") {
      event.preventDefault();
      startPan(event);
      return;
    }
    if (event.button !== 0) return;
    // Drawing tools draw straight across whatever is underneath.
    if (effectiveTool === "wall" || effectiveTool === "room" || effectiveTool === "zone" || effectiveTool === "measure" || effectiveTool === "text") {
      onBackgroundPointerDown(event as unknown as ReactPointerEvent<SVGSVGElement>);
      return;
    }
    const point = toUnits(event.clientX, event.clientY);
    if (effectiveTool === "lasso") {
      beginGesture({ kind: "marquee", start: point, additive: event.shiftKey, base: [...selection] });
      return;
    }

    const additive = event.shiftKey || event.metaKey || event.ctrlKey || effectiveTool === "multiSelect";
    let nextSelection: string[];
    if (additive) {
      nextSelection = selectedSet.has(item.id) ? selection.filter((id) => id !== item.id) : [...selection, item.id];
    } else {
      nextSelection = selectedSet.has(item.id) ? [...selection] : [item.id];
    }
    if (nextSelection.join() !== selection.join()) onSelectionChange(nextSelection);
    if (additive && selectedSet.has(item.id)) return;

    beginGesture({ kind: "drag", ids: nextSelection, anchorId: item.id, start: point, origin: doc, moved: false, additive });
  }

  function onHandlePointerDown(event: ReactPointerEvent<SVGCircleElement>, item: FloorItem, handle: HandleId) {
    if (event.button !== 0) return;
    beginGesture({ kind: "resize", id: item.id, handle, start: toUnits(event.clientX, event.clientY), startRect: itemRect(item), origin: doc });
  }

  function onDragOver(event: DragEvent) {
    if (event.dataTransfer.types.includes(LIBRARY_MIME)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function onDrop(event: DragEvent) {
    const payload = event.dataTransfer.getData(LIBRARY_MIME);
    if (!payload) return;
    event.preventDefault();
    const point = toUnits(event.clientX, event.clientY);
    onDropPayload?.(payload, { x: clamp(point.x, 0, doc.width), y: clamp(point.y, 0, doc.height) });
  }

  const cursorFor = (item: FloorItem): string => {
    if (effectiveTool === "hand") return panning ? "grabbing" : "grab";
    if (["wall", "room", "zone", "measure", "text"].includes(effectiveTool)) return "crosshair";
    if (effectiveTool === "lasso") return "crosshair";
    return item.locked ? "pointer" : "move";
  };

  const px = 1 / scale;
  const overlay = (
    <g pointerEvents="none">
      {marquee && (
        <rect
          x={marquee.x}
          y={marquee.y}
          width={marquee.w}
          height={marquee.h}
          fill="rgba(99,102,241,0.08)"
          stroke={SELECTION}
          strokeWidth={1.5 * px}
          strokeDasharray={`${4 * px} ${3 * px}`}
          rx={effectiveTool === "lasso" ? 0.4 : 0}
        />
      )}
      {drawRect?.tool === "wall" && <rect {...{ x: drawRect.rect.x, y: drawRect.rect.y, width: drawRect.rect.w, height: drawRect.rect.h }} fill="#374151" opacity={0.8} />}
      {drawRect?.tool === "room" && (
        <rect x={drawRect.rect.x} y={drawRect.rect.y} width={drawRect.rect.w} height={drawRect.rect.h} fill="none" stroke="#1F2937" strokeWidth={0.22} opacity={0.8} />
      )}
      {drawRect?.tool === "zone" && (
        <rect
          x={drawRect.rect.x}
          y={drawRect.rect.y}
          width={drawRect.rect.w}
          height={drawRect.rect.h}
          fill={ZONE_PALETTE[nextZoneColor(doc)].fill}
          fillOpacity={0.85}
          stroke={ZONE_PALETTE[nextZoneColor(doc)].label}
          strokeWidth={1.5 * px}
          strokeDasharray={`${5 * px} ${3 * px}`}
        />
      )}
      {drawRect && (drawRect.rect.w > 0 || drawRect.rect.h > 0) && (
        <text
          x={drawRect.rect.x + drawRect.rect.w / 2}
          y={drawRect.rect.y - 0.4}
          textAnchor="middle"
          fontSize={Math.max(0.5, 12 * px)}
          fontWeight={600}
          fill="#374151"
        >
          {drawRect.tool === "wall"
            ? `${round2(Math.max(drawRect.rect.w, drawRect.rect.h) * METERS_PER_UNIT).toFixed(2)}m`
            : `${round2(drawRect.rect.w * METERS_PER_UNIT).toFixed(2)}m × ${round2(drawRect.rect.h * METERS_PER_UNIT).toFixed(2)}m`}
        </text>
      )}
      {measure && (
        <g>
          <line x1={measure.a.x} y1={measure.a.y} x2={measure.b.x} y2={measure.b.y} stroke="#DB2777" strokeWidth={2 * px} strokeDasharray={`${6 * px} ${3 * px}`} />
          <circle cx={measure.a.x} cy={measure.a.y} r={4 * px} fill="#DB2777" />
          <circle cx={measure.b.x} cy={measure.b.y} r={4 * px} fill="#DB2777" />
          {Math.hypot(measure.b.x - measure.a.x, measure.b.y - measure.a.y) > 0.05 && (
            <g transform={`translate(${(measure.a.x + measure.b.x) / 2} ${(measure.a.y + measure.b.y) / 2 - 0.7})`}>
              <rect x={-2} y={-0.55} width={4} height={1.1} rx={0.3} fill="#DB2777" />
              <text textAnchor="middle" dominantBaseline="central" fontSize={0.62} fontWeight={600} fill="#FFFFFF">
                {round2(Math.hypot(measure.b.x - measure.a.x, measure.b.y - measure.a.y) * METERS_PER_UNIT).toFixed(2)}m
              </text>
            </g>
          )}
        </g>
      )}
    </g>
  );

  const planWidth = shown.width * scale;
  const planHeight = shown.height * scale;
  const backgroundCursor =
    effectiveTool === "hand" ? (panning ? "grabbing" : "grab") : ["wall", "room", "zone", "measure", "text", "lasso"].includes(effectiveTool) ? "crosshair" : "default";

  return (
    <div ref={scrollRef} dir="ltr" className={clsx("octo-scroll relative w-full overflow-auto bg-[var(--octo-card)]", className)}>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `${RULER}px ${planWidth + 24}px`,
          gridTemplateRows: `${RULER}px ${planHeight + 24}px`,
          width: "max-content",
          minWidth: "100%",
          minHeight: "100%",
        }}
      >
        <div className="sticky left-0 top-0 z-[3] bg-[var(--octo-card)]" />
        <div className="sticky top-0 z-[2] bg-[var(--octo-card)]">
          <Ruler length={shown.width} scale={scale} orientation="horizontal" />
        </div>
        <div className="sticky left-0 z-[2] bg-[var(--octo-card)]">
          <Ruler length={shown.height} scale={scale} orientation="vertical" />
        </div>
        <div className="relative" onDragOver={onDragOver} onDrop={onDrop} style={{ cursor: backgroundCursor }}>
          <div className="relative border-s border-t border-[#D1D5DB] bg-white" style={{ width: planWidth, height: planHeight }}>
            {pdfUrl && (
              <object
                data={`${pdfUrl}#toolbar=0&navpanes=0&view=Fit`}
                type="application/pdf"
                aria-hidden
                className="pointer-events-none absolute inset-0 h-full w-full"
                style={{ opacity: doc.background?.opacity ?? 0.5 }}
              />
            )}
            <PlanSvg
              doc={shown}
              scale={scale}
              svgRef={svgRef}
              className="relative"
              transparentPaper={Boolean(pdfUrl)}
              toneFor={toneFor}
              showGrid={showGrid}
              showLabels={showLabels}
              showDimensions={showDimensions}
              boxTables={boxTables}
              ghostHiddenTables
              selectedIds={selectedSet}
              conflictIds={conflictIds}
              hiddenIds={hiddenIds}
              interactive={EDITABLE_KINDS}
              editable={effectiveTool === "select" || effectiveTool === "move"}
              cursorFor={cursorFor}
              onItemPointerDown={onItemPointerDown}
              onHandlePointerDown={onHandlePointerDown}
              onBackgroundPointerDown={onBackgroundPointerDown}
              overlay={overlay}
            />
            {children}
          </div>
        </div>
      </div>
    </div>
  );
});
