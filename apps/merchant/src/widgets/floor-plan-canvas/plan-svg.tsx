// The plan itself: paper, grid, zones, fixtures, tables, labels and the
// selection chrome, drawn in grid units inside one SVG. The builder, the
// preview and the live floor all render through this; they differ only in
// which items respond to the pointer and what tone each table is painted in.
import { useId, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from "react";
import {
  METERS_PER_UNIT,
  WALL_TYPES,
  ZONE_COLORS,
  itemRect,
  round2,
  type FloorItem,
  type FloorPlanDoc,
  type FloorTable,
  type LiveStatus,
  type Rect,
} from "@/entities/floor-plan";
import { LockIcon, ObjectGlyph, TableGlyph } from "./glyphs";
import { BASE_GRID, CONFLICT, PAPER, SELECTION, ZONE_PALETTE } from "./palette";

export type HandleId = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
export type ItemKind = FloorItem["kind"];

export interface PlanSvgProps {
  doc: FloorPlanDoc;
  /** Pixels per grid unit. */
  scale: number;
  svgRef?: Ref<SVGSVGElement>;
  className?: string;
  toneFor?: (table: FloorTable) => LiveStatus;
  showGrid?: boolean;
  showLabels?: boolean;
  /** Booking mode prints each table's seat count under its number. */
  showSeats?: boolean;
  /** Draw tables as plain dashed status boxes (Quick Box Layout). */
  boxTables?: boolean;
  showDimensions?: boolean;
  showBackground?: boolean;
  /** Leaves the paper unpainted so a PDF background layered underneath the
   *  SVG shows through. */
  transparentPaper?: boolean;
  /** Draw tables switched off "Show on Floor Plan" as dashed ghosts (builder)
   *  rather than leaving them out (live floor). */
  ghostHiddenTables?: boolean;
  selectedIds?: ReadonlySet<string>;
  conflictIds?: ReadonlySet<string>;
  hiddenIds?: ReadonlySet<string>;
  dimmedIds?: ReadonlySet<string>;
  /** Which kinds of item take pointer events. */
  interactive?: ReadonlySet<ItemKind>;
  /** Whether a single unlocked selection shows resize handles. */
  editable?: boolean;
  cursorFor?: (item: FloorItem) => string;
  onItemPointerDown?: (event: ReactPointerEvent<SVGGElement>, item: FloorItem) => void;
  onHandlePointerDown?: (event: ReactPointerEvent<SVGCircleElement>, item: FloorItem, handle: HandleId) => void;
  onBackgroundPointerDown?: (event: ReactPointerEvent<SVGSVGElement>) => void;
  /** Drawn last, in grid units — marquees, measuring lines, shapes being drawn. */
  overlay?: ReactNode;
}

const NO_IDS: ReadonlySet<string> = new Set();
const NO_KINDS: ReadonlySet<ItemKind> = new Set();

function defaultTone(table: FloorTable): LiveStatus {
  return table.blocked ? "blocked" : "available";
}

export function handlesFor(item: FloorItem, rect: Rect): HandleId[] {
  if (item.kind === "table") return ["nw", "ne", "se", "sw"];
  if (item.kind === "object" && WALL_TYPES.has(item.type)) {
    return rect.w >= rect.h ? ["w", "e"] : ["n", "s"];
  }
  return ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
}

export function handlePoint(rect: Rect, handle: HandleId): { x: number; y: number } {
  const x = handle.includes("w") ? rect.x : handle.includes("e") ? rect.x + rect.w : rect.x + rect.w / 2;
  const y = handle.includes("n") ? rect.y : handle.includes("s") ? rect.y + rect.h : rect.y + rect.h / 2;
  return { x, y };
}

const HANDLE_CURSOR: Record<HandleId, string> = {
  nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize",
  n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
};

function meters(units: number): string {
  return `${round2(units * METERS_PER_UNIT).toFixed(2)}m`;
}

export function PlanSvg({
  doc,
  scale,
  svgRef,
  className,
  toneFor = defaultTone,
  showGrid = true,
  showLabels = true,
  showSeats = false,
  boxTables = false,
  showDimensions = false,
  showBackground = true,
  transparentPaper = false,
  ghostHiddenTables = false,
  selectedIds = NO_IDS,
  conflictIds = NO_IDS,
  hiddenIds = NO_IDS,
  dimmedIds = NO_IDS,
  interactive = NO_KINDS,
  editable = false,
  cursorFor,
  onItemPointerDown,
  onHandlePointerDown,
  onBackgroundPointerDown,
  overlay,
}: PlanSvgProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const px = 1 / scale;

  const bind = (item: FloorItem) =>
    interactive.has(item.kind)
      ? {
          onPointerDown: (event: ReactPointerEvent<SVGGElement>) => {
            event.stopPropagation();
            onItemPointerDown?.(event, item);
          },
          style: { cursor: cursorFor?.(item) ?? "pointer" },
        }
      : { pointerEvents: "none" as const };

  // Box mode is a pure grid of tables — walls, doors, bars, plants and zone
  // tints are left out, not deleted, so the full builder still has them.
  const zones = boxTables ? [] : doc.zones.filter((z) => !hiddenIds.has(z.id));
  const objects = boxTables ? [] : doc.objects.filter((o) => !hiddenIds.has(o.id));
  const tables = doc.tables.filter((t) => !hiddenIds.has(t.id) && (t.visible || ghostHiddenTables));

  const selected = [...zones, ...objects, ...tables].filter((item) => selectedIds.has(item.id));
  const single = selected.length === 1 ? selected[0] : null;

  return (
    <svg
      ref={svgRef}
      width={doc.width * scale}
      height={doc.height * scale}
      viewBox={`0 0 ${doc.width} ${doc.height}`}
      className={className}
      style={{ display: "block", fontFamily: "inherit", touchAction: "none" }}
      onPointerDown={onBackgroundPointerDown}
      role="img"
      aria-label={doc.name}
    >
      <defs>
        <pattern id={`${uid}-grid`} width={1} height={1} patternUnits="userSpaceOnUse">
          <path d="M 1 0 L 0 0 0 1" fill="none" stroke={BASE_GRID} strokeWidth={px} />
        </pattern>
        {ZONE_COLORS.map((color) => (
          <pattern key={color} id={`${uid}-grid-${color}`} width={1} height={1} patternUnits="userSpaceOnUse">
            <path d="M 1 0 L 0 0 0 1" fill="none" stroke={ZONE_PALETTE[color].grid} strokeWidth={px} />
          </pattern>
        ))}
      </defs>

      <rect width={doc.width} height={doc.height} fill={transparentPaper ? "transparent" : PAPER} />
      {showBackground && doc.background?.mime.startsWith("image/") && (
        <image
          href={doc.background.dataUrl}
          width={doc.width}
          height={doc.height}
          preserveAspectRatio="xMidYMid meet"
          opacity={doc.background.opacity}
          pointerEvents="none"
        />
      )}
      {showGrid && <rect width={doc.width} height={doc.height} fill={`url(#${uid}-grid)`} pointerEvents="none" />}

      {zones.map((zone) => (
        <g key={zone.id} {...bind(zone)} opacity={dimmedIds.has(zone.id) ? 0.35 : 1}>
          <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} fill={ZONE_PALETTE[zone.color].fill} fillOpacity={doc.background ? 0.72 : 1} />
          {showGrid && <rect x={zone.x} y={zone.y} width={zone.w} height={zone.h} fill={`url(#${uid}-grid-${zone.color})`} />}
        </g>
      ))}

      {objects.map((object) => (
        <g key={object.id} {...bind(object)} opacity={dimmedIds.has(object.id) ? 0.35 : 1}>
          {/* A generous invisible hit box: a 0.3-unit wall is otherwise a
              four-pixel target. */}
          <rect x={object.x - 0.3} y={object.y - 0.3} width={object.w + 0.6} height={object.h + 0.6} fill="transparent" />
          <ObjectGlyph object={object} px={px} showLabel={showLabels} />
        </g>
      ))}

      {tables.map((table) => (
        <g key={table.id} {...bind(table)} opacity={dimmedIds.has(table.id) ? 0.25 : 1} data-table={table.number}>
          <TableGlyph table={table} tone={toneFor(table)} showLabel={showLabels} showSeats={showSeats} box={boxTables} ghost={!table.visible} px={px} />
        </g>
      ))}

      {zones.map((zone) => {
        if (!showLabels || !zone.name.trim()) return null;
        const font = Math.min(0.8, Math.max(0.5, zone.w * 0.07));
        const width = Math.min(zone.w - 0.4, zone.name.length * font * 0.56 + font * 1.3);
        return (
          <g key={`label-${zone.id}`} transform={`translate(${zone.x + zone.w / 2} ${zone.y + 0.35 + font * 0.8})`} {...bind(zone)}>
            <rect x={-width / 2} y={-font * 0.8} width={width} height={font * 1.6} rx={font * 0.45} fill={ZONE_PALETTE[zone.color].label} />
            <text textAnchor="middle" dominantBaseline="central" fontSize={font} fontWeight={500} fill="#FFFFFF" style={{ userSelect: "none" }}>
              {zone.name}
            </text>
          </g>
        );
      })}

      {showDimensions && (
        <g pointerEvents="none" fontSize={Math.max(0.45, 11 * px)} fill="#6B7280" fontWeight={500}>
          {[...zones, ...objects].map((item) => {
            if (item.kind === "object" && WALL_TYPES.has(item.type)) {
              const horizontal = item.w >= item.h;
              return (
                <text
                  key={`dim-${item.id}`}
                  x={item.x + item.w / 2 + (horizontal ? 0 : 0.5)}
                  y={item.y + item.h / 2 - (horizontal ? 0.45 : 0)}
                  textAnchor={horizontal ? "middle" : "start"}
                  dominantBaseline={horizontal ? "auto" : "central"}
                >
                  {meters(Math.max(item.w, item.h))}
                </text>
              );
            }
            if (item.kind === "zone" || (item.kind === "object" && item.type === "room")) {
              return (
                <text key={`dim-${item.id}`} x={item.x + item.w / 2} y={item.y + item.h - 0.4} textAnchor="middle">
                  {meters(item.w)} × {meters(item.h)}
                </text>
              );
            }
            return null;
          })}
        </g>
      )}

      {tables
        .filter((t) => conflictIds.has(t.id))
        .map((table) => {
          const rect = itemRect(table);
          return (
            <rect
              key={`conflict-${table.id}`}
              x={rect.x - 0.15}
              y={rect.y - 0.15}
              width={rect.w + 0.3}
              height={rect.h + 0.3}
              rx={0.3}
              fill="none"
              stroke={CONFLICT}
              strokeWidth={2 * px}
              strokeDasharray={`${5 * px} ${3 * px}`}
              pointerEvents="none"
            />
          );
        })}

      {selected.map((item) => {
        const rect = itemRect(item);
        return (
          <g key={`sel-${item.id}`} pointerEvents="none">
            <rect
              x={rect.x - 0.12}
              y={rect.y - 0.12}
              width={rect.w + 0.24}
              height={rect.h + 0.24}
              fill="none"
              stroke={SELECTION}
              strokeWidth={2 * px}
              strokeDasharray={item.locked ? `${5 * px} ${3 * px}` : undefined}
            />
            {item.locked && (
              <g transform={`translate(${rect.x + rect.w + 0.12} ${rect.y - 0.12})`}>
                <circle r={9 * px} fill={SELECTION} />
                <LockIcon x={0} y={-1 * px} size={10 * px} color="#FFFFFF" />
              </g>
            )}
          </g>
        );
      })}

      {editable && single && !single.locked &&
        handlesFor(single, itemRect(single)).map((handle) => {
          const rect = itemRect(single);
          const point = handlePoint({ x: rect.x - 0.12, y: rect.y - 0.12, w: rect.w + 0.24, h: rect.h + 0.24 }, handle);
          return (
            <circle
              key={handle}
              cx={point.x}
              cy={point.y}
              r={5.5 * px}
              fill={SELECTION}
              stroke="#FFFFFF"
              strokeWidth={1.5 * px}
              style={{ cursor: HANDLE_CURSOR[handle] }}
              onPointerDown={(event) => {
                event.stopPropagation();
                onHandlePointerDown?.(event, single, handle);
              }}
            />
          );
        })}

      {overlay}
    </svg>
  );
}
