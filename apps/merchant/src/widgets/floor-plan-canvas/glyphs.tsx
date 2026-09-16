// How each kind of item is drawn, in grid units. Every glyph draws in its own
// unrotated frame about its centre and lets a single `rotate` turn it, so a
// door's swing or a bar's stools stay on the right side after a rotation.
import { memo, type ReactNode } from "react";
import {
  CHAIR_DEPTH,
  FLOOR_SEATING_SHAPES,
  chairPlacements,
  isQuarterTurned,
  tableBody,
  tableRect,
  type FloorObject,
  type FloorTable,
  type LiveStatus,
} from "@/entities/floor-plan";
import { ITEM_OUTLINE, TABLE_TONES } from "./palette";

const CHAIR_GAP = 0.1;
const CHAIR_THICKNESS = CHAIR_DEPTH - CHAIR_GAP - 0.1;

export const LockIcon = memo(function LockIcon({ x, y, size, color }: { x: number; y: number; size: number; color: string }) {
  const s = size;
  const sw = s * 0.13;
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round">
      <rect x={-s * 0.42} y={-s * 0.05} width={s * 0.84} height={s * 0.62} rx={s * 0.12} />
      <path d={`M ${-s * 0.24} ${-s * 0.05} V ${-s * 0.24} a ${s * 0.24} ${s * 0.24} 0 0 1 ${s * 0.48} 0 V ${-s * 0.05}`} />
      <circle cx={0} cy={s * 0.26} r={s * 0.07} fill={color} stroke="none" />
    </g>
  );
});

/** Mixes a hex colour toward black (negative) or white (positive). */
export function shade(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  const target = amount < 0 ? 0 : 255;
  const t = Math.min(1, Math.abs(amount));
  const channel = (i: number) => {
    const c = parseInt(full.slice(i, i + 2), 16);
    return Math.round(c + (target - c) * t).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
}

export type Face = "shadow" | "side" | "top";

/** Fakes a raised, lit object on a top-down plan: a soft cast shadow, the
 *  object's side face peeking out below it, then its top. `draw` renders the
 *  silhouette once per face so any shape — circle, L, tent — gets the same
 *  treatment. */
export function Solid({ depth, draw }: { depth: number; draw: (face: Face) => ReactNode }) {
  return (
    <g>
      <g transform={`translate(${depth * 0.7} ${depth * 1.6})`} opacity={0.18}>
        {draw("shadow")}
      </g>
      <g transform={`translate(0 ${depth})`}>{draw("side")}</g>
      {draw("top")}
    </g>
  );
}

/** Face-aware fill + outline: the shadow is a flat blur-free silhouette, the
 *  side a darker tone of the top, and both keep the black outline. */
function faceStyle(face: Face, top: string, strokeWidth: number, dash?: string) {
  if (face === "shadow") return { fill: "#0F172A", stroke: "none" };
  return { fill: face === "side" ? shade(top, -0.3) : top, stroke: ITEM_OUTLINE, strokeWidth, strokeDasharray: dash };
}

/** A padded seat seen from above and slightly in front: shadow, side, seat
 *  cushion, and a firmer backrest along the edge facing away from the table. */
function Chair3D({
  x,
  y,
  w,
  h,
  outer,
  fill,
  strokeWidth,
  dash,
  rx,
  transform,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  outer: "top" | "bottom" | "left" | "right";
  fill: string;
  strokeWidth: number;
  dash?: string;
  rx: number;
  transform?: string;
}) {
  const depth = Math.min(0.12, Math.min(w, h) * 0.22);
  const back = outer === "top" || outer === "bottom" ? h * 0.36 : w * 0.36;
  const backRect =
    outer === "top"
      ? { x, y, width: w, height: back }
      : outer === "bottom"
        ? { x, y: y + h - back, width: w, height: back }
        : outer === "left"
          ? { x, y, width: back, height: h }
          : { x: x + w - back, y, width: back, height: h };
  return (
    <g transform={transform}>
      <Solid depth={depth} draw={(face) => <rect x={x} y={y} width={w} height={h} rx={rx} {...faceStyle(face, fill, strokeWidth, dash)} />} />
      <rect {...backRect} rx={rx * 0.8} fill={shade(fill, -0.16)} stroke={ITEM_OUTLINE} strokeWidth={strokeWidth * 0.8} strokeDasharray={dash} />
      <rect x={x + w * 0.2} y={y + h * 0.2} width={w * 0.6} height={h * 0.6} rx={rx * 0.6} fill="#FFFFFF" opacity={0.28} />
    </g>
  );
}

/** The table top itself, raised with a side face and a cast shadow. Saudi
 *  floor seating gets its own silhouettes: a low round tabliya, an L-shaped
 *  majlis whose arms are the seating, and a square tent booth. */
function TableBody({
  table,
  body,
  colors,
  strokeWidth,
  dash,
  shortSide,
}: {
  table: FloorTable;
  body: { w: number; h: number };
  colors: { fill: string; stroke: string; text: string };
  strokeWidth: number;
  dash?: string;
  shortSide: number;
}) {
  const sw = strokeWidth * 1.15;
  const floorLow = FLOOR_SEATING_SHAPES.has(table.shape);
  const depth = Math.min(floorLow ? 0.16 : 0.3, shortSide * 0.09);
  const { w, h } = body;
  const style = (face: Face) => faceStyle(face, colors.fill, sw, dash);
  // A soft specular sheen on the top face, inset from the edge.
  const sheen = { fill: "#FFFFFF", opacity: 0.35 };

  if (table.shape === "round" || table.shape === "tabliya") {
    const r = w / 2;
    return (
      <g>
        <Solid depth={depth} draw={(face) => <circle r={r} {...style(face)} />} />
        {table.shape === "tabliya" && (
          <circle r={Math.max(0.2, r - Math.min(0.4, w * 0.14))} fill="none" stroke={shade(colors.fill, -0.35)} strokeWidth={strokeWidth * 0.8} />
        )}
        <ellipse cx={-r * 0.28} cy={-r * 0.32} rx={r * 0.42} ry={r * 0.22} {...sheen} transform={`rotate(-30 ${-r * 0.28} ${-r * 0.32})`} />
      </g>
    );
  }

  if (table.shape === "tent") {
    const peak = Math.min(0.9, h * 0.24);
    const rx = Math.min(0.6, shortSide * 0.16);
    return (
      <g>
        <Solid depth={depth} draw={(face) => <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} {...style(face)} />} />
        {/* Canvas roof panels meeting at a ridge. */}
        <path d={`M ${-w / 2} ${-h / 2} L 0 0 L ${w / 2} ${-h / 2} Z`} fill={shade(colors.fill, 0.25)} opacity={0.7} />
        <path d={`M ${-w / 2} ${h / 2} L 0 0 L ${w / 2} ${h / 2} Z`} fill={shade(colors.fill, -0.12)} opacity={0.55} />
        <path d={`M ${-w / 2} ${-h / 2} L ${w / 2} ${h / 2} M ${w / 2} ${-h / 2} L ${-w / 2} ${h / 2}`} stroke={ITEM_OUTLINE} strokeWidth={strokeWidth * 0.6} opacity={0.35} />
        <path
          d={`M ${-w / 2} ${-h / 2} L 0 ${-h / 2 - peak} L ${w / 2} ${-h / 2}`}
          fill={shade(colors.fill, -0.2)}
          stroke={ITEM_OUTLINE}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
        <circle r={Math.min(0.18, shortSide * 0.05)} fill={ITEM_OUTLINE} />
      </g>
    );
  }

  if (table.shape === "majlisL") {
    const band = Math.min(w, h) * 0.42;
    const pad = 0.18;
    const placements = chairPlacements("majlisL", table.seats);
    const topCount = placements.filter((placement) => placement.layout === "side" && placement.side === "top").length;
    const leftCount = placements.length - topCount;
    const lPath = `M ${-w / 2} ${-h / 2} H ${w / 2} V ${-h / 2 + band} H ${-w / 2 + band} V ${h / 2} H ${-w / 2} Z`;
    const cushionFill = "#F7EFE2";
    const cushion = (key: string, x: number, y: number, cw: number, ch: number) => (
      <g key={key}>
        <rect x={x + 0.05} y={y + 0.08} width={cw} height={ch} rx={0.3} fill="#0F172A" opacity={0.14} />
        <rect x={x} y={y} width={cw} height={ch} rx={0.3} fill={cushionFill} stroke={ITEM_OUTLINE} strokeWidth={strokeWidth * 0.7} />
        <rect x={x + cw * 0.18} y={y + ch * 0.18} width={cw * 0.64} height={ch * 0.3} rx={0.12} fill="#FFFFFF" opacity={0.55} />
      </g>
    );
    const lowW = Math.max(0.6, w - band - 0.7);
    const lowH = Math.max(0.6, h - band - 0.7);
    const lowX = -w / 2 + band + 0.35;
    const lowY = -h / 2 + band + 0.35;
    return (
      <g>
        <Solid depth={depth} draw={(face) => <path d={lPath} strokeLinejoin="round" {...style(face)} />} />
        {Array.from({ length: topCount }, (_, i) => {
          const span = w / Math.max(1, topCount);
          return cushion(`top-${i}`, -w / 2 + pad + i * span, -h / 2 + pad, Math.max(0.2, span - pad * 2), Math.max(0.2, band - pad * 2));
        })}
        {Array.from({ length: leftCount }, (_, i) => {
          const span = (h - band) / Math.max(1, leftCount);
          return cushion(`left-${i}`, -w / 2 + pad, -h / 2 + band + pad + i * span, Math.max(0.2, band - pad * 2), Math.max(0.2, span - pad * 2));
        })}
        {/* The low wooden table the majlis gathers around. */}
        <Solid
          depth={0.12}
          draw={(face) => <rect x={lowX} y={lowY} width={lowW} height={lowH} rx={0.35} {...faceStyle(face, "#D8B98E", strokeWidth * 0.8)} />}
        />
        <rect x={lowX + lowW * 0.12} y={lowY + lowH * 0.12} width={lowW * 0.76} height={lowH * 0.76} rx={0.25} fill="none" stroke="#A7825A" strokeWidth={strokeWidth * 0.6} />
      </g>
    );
  }

  const rx = Math.min(0.5, shortSide * 0.14);
  return (
    <g>
      <Solid depth={depth} draw={(face) => <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} {...style(face)} />} />
      <rect x={-w / 2 + w * 0.08} y={-h / 2 + h * 0.08} width={w * 0.5} height={Math.min(h * 0.18, 0.5)} rx={rx * 0.6} {...sheen} />
    </g>
  );
}

export const TableGlyph = memo(function TableGlyph({
  table,
  tone,
  showLabel,
  showSeats = false,
  box = false,
  ghost,
  px,
}: {
  table: FloorTable;
  tone: LiveStatus;
  showLabel: boolean;
  /** Booking mode prints the seat count under the number. */
  showSeats?: boolean;
  /** Quick Box Layout draws every table as a plain status-tinted box with a
   *  dashed border — no chairs, no shape — so a big batch reads as a grid. */
  box?: boolean;
  ghost: boolean;
  px: number;
}) {
  const colors = TABLE_TONES[tone];
  if (box) {
    const r = tableRect(table);
    const inset = Math.min(0.12, r.w * 0.03);
    const w = r.w - inset * 2;
    const h = r.h - inset * 2;
    const size = Math.min(1.1, Math.min(w, h) * 0.26);
    return (
      <g opacity={ghost ? 0.55 : 1}>
        <rect
          x={r.x + inset}
          y={r.y + inset}
          width={w}
          height={h}
          rx={0.12}
          fill={colors.fill}
          stroke={colors.stroke}
          strokeWidth={Math.max(0.08, 1.8 * px)}
          strokeDasharray={`${0.28} ${0.18}`}
        />
        {showLabel && (
          <text
            x={r.x + r.w / 2}
            y={r.y + r.h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={size}
            fontWeight={700}
            fill={colors.text}
            style={{ userSelect: "none" }}
          >
            {table.number}
          </text>
        )}
      </g>
    );
  }
  const body = tableBody(table.shape, table.size);
  const rect = tableRect(table);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const strokeWidth = Math.max(0.09, 1.8 * px);
  const dash = ghost ? `${4 * px} ${3 * px}` : undefined;
  const shortSide = Math.min(body.w, body.h);
  const fontSize = Math.min(0.95, shortSide * 0.3);
  // An L-shaped majlis has its open corner at the centre of the box, so its
  // number sits on the low table in the middle of the seating instead.
  const majlisBand = table.shape === "majlisL" ? Math.min(body.w, body.h) * 0.42 : 0;
  const labelX = majlisBand / 2;
  const labelY = (table.blocked || showSeats ? -fontSize * 0.5 : 0) + majlisBand / 2;
  const lockY = showSeats ? labelY + fontSize * 2.1 : labelY + fontSize * 1.25;

  const floorSeating = FLOOR_SEATING_SHAPES.has(table.shape);
  // The L-shaped majlis seats guests on its own arms, so its cushions are
  // drawn inside the band by TableBody rather than as chairs around it.
  const chairs = (table.shape === "majlisL" ? [] : chairPlacements(table.shape, table.seats)).map((placement, i) => {
    // Floor cushions are a warm fabric tone; chairs pick up the table's status tint.
    const seat = { fill: floorSeating ? "#F4E7D3" : colors.fill, strokeWidth, dash, rx: floorSeating ? 0.34 : 0.22 };
    if (placement.layout === "radial") {
      const radius = body.w / 2 + CHAIR_GAP + CHAIR_THICKNESS / 2;
      const along = Math.min(1.05, ((Math.PI * body.w) / Math.max(1, table.seats)) * 0.62);
      const rad = (placement.angle * Math.PI) / 180;
      // In this rotated frame local -y points away from the table.
      return (
        <Chair3D
          key={i}
          {...seat}
          outer="top"
          x={-along / 2}
          y={-CHAIR_THICKNESS / 2}
          w={along}
          h={CHAIR_THICKNESS}
          transform={`translate(${radius * Math.cos(rad)} ${radius * Math.sin(rad)}) rotate(${placement.angle + 90})`}
        />
      );
    }
    const horizontal = placement.side === "top" || placement.side === "bottom";
    const sideLength = horizontal ? body.w : body.h;
    const along = Math.min(1.15, (sideLength / placement.count) * 0.66);
    const offset = (sideLength * (placement.index + 0.5)) / placement.count - along / 2;
    if (horizontal) {
      const y = placement.side === "top" ? -body.h / 2 - CHAIR_GAP - CHAIR_THICKNESS : body.h / 2 + CHAIR_GAP;
      return <Chair3D key={i} {...seat} outer={placement.side} x={-body.w / 2 + offset} y={y} w={along} h={CHAIR_THICKNESS} />;
    }
    const x = placement.side === "left" ? -body.w / 2 - CHAIR_GAP - CHAIR_THICKNESS : body.w / 2 + CHAIR_GAP;
    return <Chair3D key={i} {...seat} outer={placement.side} x={x} y={-body.h / 2 + offset} w={CHAIR_THICKNESS} h={along} />;
  });

  return (
    <g transform={`translate(${cx} ${cy})`} opacity={ghost ? 0.55 : 1}>
      <g transform={table.rotation ? `rotate(${table.rotation})` : undefined}>
        {chairs}
        <TableBody table={table} body={body} colors={colors} strokeWidth={strokeWidth} dash={dash} shortSide={shortSide} />
      </g>
      {showLabel && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight={700}
          fill={colors.text}
          style={{ userSelect: "none" }}
        >
          {table.number}
        </text>
      )}
      {showSeats && (
        <text
          x={labelX}
          y={labelY + fontSize * 1.05}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize * 0.82}
          fontWeight={600}
          fill={colors.text}
          opacity={0.85}
          style={{ userSelect: "none" }}
        >
          {table.seats}
        </text>
      )}
      {table.blocked && <LockIcon x={labelX} y={lockY} size={fontSize * 1.15} color={colors.text} />}
    </g>
  );
});

/** A potted plant seen from above: a clay rim and a rosette of soft leaves in
 *  two rings, so it reads as foliage rather than a spiky star. */
function TopViewPlant({ size, pot = true }: { size: number; pot?: boolean }) {
  const r = size / 2;
  const leaf = (count: number, reach: number, width: number, turn: number, fill: string) =>
    Array.from({ length: count }, (_, i) => (
      <ellipse
        key={`${fill}-${i}`}
        cx={reach / 2}
        cy={0}
        rx={reach / 2}
        ry={width}
        fill={fill}
        transform={`rotate(${(360 / count) * i + turn})`}
      />
    ));
  return (
    <g>
      {pot && <circle r={r} fill="#E9D3B4" stroke="#B98B5C" strokeWidth={r * 0.08} />}
      {pot && <circle r={r * 0.84} fill="#7A5A3C" />}
      {leaf(8, r * 0.92, r * 0.2, 0, "#3F7A34")}
      {leaf(6, r * 0.68, r * 0.17, 30, "#5E9B45")}
      {leaf(5, r * 0.4, r * 0.12, 12, "#8CC063")}
      <circle r={r * 0.1} fill="#A9D67E" />
    </g>
  );
}

/** A leafy canopy from above: overlapping clumps over a soft ground shadow,
 *  lit from the top-left. */
function TopViewTree({ size }: { size: number }) {
  const r = size / 2;
  const lobes = 7;
  const clumps = Array.from({ length: lobes }, (_, i) => {
    const a = ((Math.PI * 2) / lobes) * i;
    return { x: Math.cos(a) * r * 0.5, y: Math.sin(a) * r * 0.5 };
  });
  return (
    <g>
      <circle cx={r * 0.08} cy={r * 0.1} r={r * 0.98} fill="#000000" opacity={0.12} />
      {clumps.map((c, i) => (
        <circle key={`o${i}`} cx={c.x} cy={c.y} r={r * 0.46} fill="#2E6B2F" />
      ))}
      <circle r={r * 0.6} fill="#2E6B2F" />
      {clumps.map((c, i) => (
        <circle key={`m${i}`} cx={c.x * 0.86 - r * 0.04} cy={c.y * 0.86 - r * 0.05} r={r * 0.34} fill="#43893A" />
      ))}
      <circle cx={-r * 0.08} cy={-r * 0.1} r={r * 0.42} fill="#4F9A42" />
      <circle cx={-r * 0.28} cy={-r * 0.3} r={r * 0.2} fill="#7DBF5E" opacity={0.9} />
      <circle cx={r * 0.18} cy={-r * 0.34} r={r * 0.12} fill="#7DBF5E" opacity={0.75} />
      <circle cx={-r * 0.36} cy={r * 0.12} r={r * 0.1} fill="#7DBF5E" opacity={0.6} />
    </g>
  );
}

/** Rounded shrubs packed along the long axis of a box — the hedge inside a
 *  planter or along a fence line. */
function Hedge({ length, depth }: { length: number; depth: number }) {
  const bush = depth * 0.92;
  const count = Math.max(1, Math.round(length / (bush * 0.72)));
  const step = count > 1 ? (length - bush) / (count - 1) : 0;
  const start = count > 1 ? -length / 2 + bush / 2 : 0;
  return (
    <g>
      {Array.from({ length: count }, (_, i) => (
        <circle key={`s${i}`} cx={start + step * i + depth * 0.04} cy={depth * 0.06} r={bush / 2} fill="#000000" opacity={0.1} />
      ))}
      {Array.from({ length: count }, (_, i) => (
        <circle key={`b${i}`} cx={start + step * i} cy={0} r={bush / 2} fill={i % 2 ? "#3F7F36" : "#4A8C3E"} />
      ))}
      {Array.from({ length: count }, (_, i) => (
        <circle key={`h${i}`} cx={start + step * i - bush * 0.14} cy={-bush * 0.14} r={bush * 0.16} fill="#7DBF5E" opacity={0.8} />
      ))}
    </g>
  );
}

export const ObjectGlyph = memo(function ObjectGlyph({ object, px, showLabel }: { object: FloorObject; px: number; showLabel: boolean }) {
  const cx = object.x + object.w / 2;
  const cy = object.y + object.h / 2;
  // The box is stored already turned; draw in the unturned frame, then rotate.
  const [w, h] = isQuarterTurned(object.rotation) ? [object.h, object.w] : [object.w, object.h];
  const left = -w / 2;
  const top = -h / 2;
  const line = Math.max(0.08, 1.5 * px);

  let body: JSX.Element;
  switch (object.type) {
    case "wall": {
      // A solid wall with its height showing: a darker face below the cap and
      // a cast shadow, lit cap line down its length.
      const long = w >= h;
      const thin = Math.min(w, h);
      const depth = Math.max(0.14, thin * 0.7);
      body = (
        <g>
          <Solid
            depth={depth}
            draw={(face) => (
              <rect x={left} y={top} width={w} height={h} rx={thin * 0.2} {...(face === "shadow" ? { fill: "#0F172A" } : { fill: face === "side" ? "#1B212B" : "#3A4452" })} />
            )}
          />
          {thin > 0.2 &&
            (long ? (
              <line x1={left + thin * 0.5} y1={0} x2={w / 2 - thin * 0.5} y2={0} stroke="#6B7686" strokeWidth={thin * 0.2} strokeLinecap="round" />
            ) : (
              <line x1={0} y1={top + thin * 0.5} x2={0} y2={h / 2 - thin * 0.5} stroke="#6B7686" strokeWidth={thin * 0.2} strokeLinecap="round" />
            ))}
        </g>
      );
      break;
    }
    case "halfWall": {
      // A low partition: shorter face than a wall, hatched cap.
      const long = w >= h;
      const length = long ? w : h;
      const thin = long ? h : w;
      const ticks = Math.max(2, Math.floor(length / Math.max(0.35, thin * 1.2)));
      body = (
        <g>
          <Solid
            depth={Math.max(0.08, thin * 0.35)}
            draw={(face) => (
              <rect x={left} y={top} width={w} height={h} rx={thin * 0.3} {...(face === "shadow" ? { fill: "#0F172A" } : { fill: face === "side" ? "#9CA3AF" : "#E5E7EB", stroke: "#6B7280", strokeWidth: line })} />
            )}
          />
          {Array.from({ length: ticks }, (_, i) => {
            const at = -length / 2 + ((i + 0.5) * length) / ticks;
            const d = thin * 0.4;
            return long ? (
              <line key={i} x1={at - d} y1={thin * 0.4} x2={at + d} y2={-thin * 0.4} stroke="#9CA3AF" strokeWidth={line * 0.8} />
            ) : (
              <line key={i} x1={-thin * 0.4} y1={at + d} x2={thin * 0.4} y2={at - d} stroke="#9CA3AF" strokeWidth={line * 0.8} />
            );
          })}
        </g>
      );
      break;
    }
    // Architect's door symbol without wall stubs: the leaf drawn at 90° and a
    // quarter-circle showing its swing.
    case "door": {
      const cap = Math.min(0.4, w * 0.13);
      const wallY = h / 2;
      const hinge = left + cap;
      const radius = Math.max(0.3, Math.min(w - cap * 2, h - 0.15));
      const leaf = Math.max(0.12, line * 2.4);
      body = (
        <g>
          <path d={`M ${hinge} ${wallY - radius} A ${radius} ${radius} 0 0 1 ${hinge + radius} ${wallY}`} fill="none" stroke={ITEM_OUTLINE} strokeWidth={line} opacity={0.75} />
          <rect x={hinge} y={wallY - radius} width={leaf} height={radius} fill={ITEM_OUTLINE} />
        </g>
      );
      break;
    }
    case "doubleDoor": {
      const cap = Math.min(0.4, w * 0.09);
      const wallY = h / 2;
      const leftHinge = left + cap;
      const rightHinge = w / 2 - cap;
      const radius = Math.max(0.3, Math.min((w - cap * 2) / 2, h - 0.15));
      const leaf = Math.max(0.12, line * 2.4);
      body = (
        <g>
          <path d={`M ${leftHinge} ${wallY - radius} A ${radius} ${radius} 0 0 1 ${leftHinge + radius} ${wallY}`} fill="none" stroke={ITEM_OUTLINE} strokeWidth={line} opacity={0.75} />
          <path d={`M ${rightHinge} ${wallY - radius} A ${radius} ${radius} 0 0 0 ${rightHinge - radius} ${wallY}`} fill="none" stroke={ITEM_OUTLINE} strokeWidth={line} opacity={0.75} />
          <rect x={leftHinge} y={wallY - radius} width={leaf} height={radius} fill={ITEM_OUTLINE} />
          <rect x={rightHinge - leaf} y={wallY - radius} width={leaf} height={radius} fill={ITEM_OUTLINE} />
        </g>
      );
      break;
    }
    case "plantSmall":
    case "plantLarge": {
      const size = Math.min(w, h);
      body = (
        <g>
          <circle cx={size * 0.06} cy={size * 0.1} r={size * 0.5} fill="#0F172A" opacity={0.16} />
          <TopViewPlant size={size} />
        </g>
      );
      break;
    }
    case "planterBox": {
      // A raised timber planter (or a fence line of hedges) along its long axis.
      const long = w >= h;
      const length = long ? w : h;
      const depth = long ? h : w;
      const rim = depth * 0.14;
      body = (
        <g>
          <Solid
            depth={Math.max(0.1, depth * 0.22)}
            draw={(face) => <rect x={left} y={top} width={w} height={h} rx={depth * 0.22} {...faceStyle(face, "#C9A77C", line)} />}
          />
          <rect x={left + rim} y={top + rim} width={w - rim * 2} height={h - rim * 2} rx={depth * 0.14} fill="#6E5238" />
          <g transform={long ? undefined : "rotate(90)"}>
            <Hedge length={length - rim * 2.4} depth={depth - rim * 2.4} />
          </g>
        </g>
      );
      break;
    }
    case "tree":
      body = <TopViewTree size={Math.min(w, h)} />;
      break;
    case "bar": {
      const counterDepth = Math.min(0.85, h * 0.22);
      const labelSpace = object.label ? Math.min(1.6, h * 0.34) : 0;
      const counterTop = top + labelSpace;
      const returnWidth = counterDepth;
      const stoolSize = Math.min(1.0, (h - labelSpace - counterDepth) * 0.52);
      const stoolCount = Math.max(1, Math.floor((w - returnWidth - 0.6) / (stoolSize * 1.4)));
      const stoolGap = (w - returnWidth - stoolCount * stoolSize) / (stoolCount + 1);
      const labelFont = Math.min(0.85, labelSpace * 0.55);
      const labelWidth = object.label.length * labelFont * 0.62 + labelFont * 1.4;
      const wood = "#8A5A36";
      const top_ = "#EFE7DA";
      const lPath = `M ${left} ${counterTop} H ${w / 2} V ${h / 2} H ${w / 2 - returnWidth} V ${counterTop + counterDepth} H ${left} Z`;
      body = (
        <g>
          {/* L-shaped counter: wooden body, pale stone top with a front lip. */}
          <Solid depth={0.32} draw={(face) => <path d={lPath} strokeLinejoin="round" {...(face === "shadow" ? { fill: "#0F172A" } : { fill: face === "side" ? wood : top_, stroke: "#4A2E16", strokeWidth: line })} />} />
          <line x1={left + 0.15} y1={counterTop + counterDepth * 0.72} x2={w / 2 - returnWidth - 0.1} y2={counterTop + counterDepth * 0.72} stroke="#C9B79C" strokeWidth={line} />
          {/* Taps and glasses along the counter. */}
          {Array.from({ length: Math.max(2, Math.floor((w - returnWidth) / 2.4)) }).map((_, i, all) => (
            <circle key={`g${i}`} cx={left + ((i + 0.5) * (w - returnWidth)) / all.length} cy={counterTop + counterDepth * 0.36} r={Math.min(0.14, counterDepth * 0.18)} fill="#9FC7E8" stroke="#4A6A86" strokeWidth={line * 0.6} />
          ))}
          {Array.from({ length: stoolCount }, (_, i) => {
            const cx = left + stoolGap + i * (stoolSize + stoolGap) + stoolSize / 2;
            const cy = counterTop + counterDepth + 0.25 + stoolSize / 2;
            const r = stoolSize / 2;
            return (
              <g key={i}>
                <ellipse cx={cx + r * 0.2} cy={cy + r * 0.38} rx={r} ry={r * 0.85} fill="#0F172A" opacity={0.18} />
                <circle cx={cx} cy={cy + r * 0.22} r={r} fill="#3B2A1D" />
                <circle cx={cx} cy={cy} r={r} fill="#B9855A" stroke="#4A2E16" strokeWidth={line} />
                <circle cx={cx} cy={cy} r={r * 0.62} fill="#D7A77A" />
                <ellipse cx={cx - r * 0.25} cy={cy - r * 0.28} rx={r * 0.3} ry={r * 0.16} fill="#FFFFFF" opacity={0.45} />
              </g>
            );
          })}
          {showLabel && object.label && (
            <g transform={`translate(${-returnWidth / 2} ${top + labelSpace * 0.45})`}>
              <rect x={-labelWidth / 2} y={-labelFont * 0.85} width={labelWidth} height={labelFont * 1.7} rx={labelFont * 0.4} fill="#4A2E16" />
              <text textAnchor="middle" dominantBaseline="central" fontSize={labelFont} fontWeight={600} fill="#FFFFFF" style={{ userSelect: "none" }}>
                {object.label}
              </text>
            </g>
          )}
        </g>
      );
      break;
    }
    case "counter": {
      // A straight service counter: stone top over a wooden body, a till and a
      // row of display trays.
      const depth = Math.min(0.4, h * 0.2);
      body = (
        <g>
          <Solid depth={depth} draw={(face) => <rect x={left} y={top} width={w} height={h} rx={0.18} {...(face === "shadow" ? { fill: "#0F172A" } : { fill: face === "side" ? "#8A5A36" : "#F1ECE4", stroke: "#4A2E16", strokeWidth: line })} />} />
          <rect x={left + 0.18} y={top + 0.18} width={w - 0.36} height={h - 0.36} rx={0.12} fill="none" stroke="#CFC4B3" strokeWidth={line} />
          {Array.from({ length: Math.max(2, Math.floor((w - 1.8) / 1.1)) }).map((_, i, all) => (
            <rect key={i} x={left + 0.35 + (i * (w - 2.1)) / all.length} y={top + h * 0.3} width={(w - 2.1) / all.length - 0.15} height={h * 0.4} rx={0.08} fill="#FFFFFF" stroke="#B8AA96" strokeWidth={line * 0.7} />
          ))}
          <Solid depth={0.12} draw={(face) => <rect x={w / 2 - 1.35} y={top + h * 0.22} width={1} height={h * 0.56} rx={0.1} {...(face === "shadow" ? { fill: "#0F172A" } : { fill: face === "side" ? "#1F2937" : "#374151", stroke: "#111827", strokeWidth: line * 0.7 })} />} />
          <rect x={w / 2 - 1.22} y={top + h * 0.3} width={0.74} height={h * 0.22} rx={0.05} fill="#7DD3FC" />
        </g>
      );
      break;
    }
    case "hostStand": {
      // A reception podium: wooden stand, tablet, reservation book and a lamp.
      const s = Math.min(w, h);
      const pw = s * 0.78;
      const ph = s * 0.62;
      body = (
        <g>
          <Solid depth={s * 0.12} draw={(face) => <rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} rx={s * 0.08} {...(face === "shadow" ? { fill: "#0F172A" } : { fill: face === "side" ? "#6B4226" : "#A8744A", stroke: "#3F2614", strokeWidth: line })} />} />
          <rect x={-pw / 2 + s * 0.06} y={-ph / 2 + s * 0.06} width={pw - s * 0.12} height={ph - s * 0.12} rx={s * 0.05} fill="#C99466" />
          <rect x={-pw * 0.36} y={-ph * 0.3} width={pw * 0.4} height={ph * 0.52} rx={s * 0.03} fill="#1F2937" />
          <rect x={-pw * 0.33} y={-ph * 0.26} width={pw * 0.34} height={ph * 0.44} rx={s * 0.02} fill="#60A5FA" />
          <rect x={pw * 0.08} y={-ph * 0.22} width={pw * 0.26} height={ph * 0.36} rx={s * 0.02} fill="#F8FAFC" stroke="#94A3B8" strokeWidth={line * 0.6} />
          <circle cx={pw * 0.3} cy={ph * 0.28} r={s * 0.07} fill="#FCD34D" stroke="#B45309" strokeWidth={line * 0.6} />
        </g>
      );
      break;
    }
    case "station": {
      // A waiter's service station: cabinet with cutlery trays and a card reader.
      const depth = Math.min(0.35, h * 0.18);
      const bins = 3;
      const binW = (w * 0.62) / bins;
      body = (
        <g>
          <Solid depth={depth} draw={(face) => <rect x={left} y={top} width={w} height={h} rx={0.16} {...(face === "shadow" ? { fill: "#0F172A" } : { fill: face === "side" ? "#475569" : "#CBD5E1", stroke: "#1E293B", strokeWidth: line })} />} />
          {Array.from({ length: bins }, (_, i) => (
            <rect key={i} x={left + 0.2 + i * binW} y={top + h * 0.22} width={binW - 0.12} height={h * 0.56} rx={0.08} fill="#F8FAFC" stroke="#64748B" strokeWidth={line * 0.7} />
          ))}
          <rect x={w / 2 - w * 0.3} y={top + h * 0.25} width={w * 0.22} height={h * 0.5} rx={0.08} fill="#111827" />
          <rect x={w / 2 - w * 0.27} y={top + h * 0.3} width={w * 0.16} height={h * 0.16} rx={0.03} fill="#34D399" />
        </g>
      );
      break;
    }
    case "majlisFloor": {
      // A floor majlis bench: a firm back cushion along the wall and plump seat
      // cushions in front, each casting its own shadow.
      const seat = h * 0.62;
      const count = Math.max(1, Math.round(w / 1.7));
      const span = w / count;
      body = (
        <g>
          <Solid depth={0.14} draw={(face) => <rect x={left} y={top} width={w} height={h - seat} rx={h * 0.12} {...faceStyle(face, "#B98E5F", line)} />} />
          <Solid depth={0.08} draw={(face) => <rect x={left} y={top + (h - seat)} width={w} height={seat} rx={h * 0.1} {...faceStyle(face, "#8E2F2F", line)} />} />
          {Array.from({ length: count }, (_, i) => {
            const x = left + 0.1 + i * span;
            const y = top + (h - seat) + 0.1;
            const cw = Math.max(0.2, span - 0.2);
            const ch = Math.max(0.2, seat - 0.2);
            return (
              <g key={i}>
                <rect x={x + 0.05} y={y + 0.08} width={cw} height={ch} rx={0.24} fill="#0F172A" opacity={0.16} />
                <rect x={x} y={y} width={cw} height={ch} rx={0.24} fill="#F4E7D3" stroke={ITEM_OUTLINE} strokeWidth={line * 0.8} />
                <path d={`M ${x + cw * 0.15} ${y + ch * 0.5} H ${x + cw * 0.85}`} stroke="#C9A97C" strokeWidth={line * 0.9} strokeDasharray={`${0.12} ${0.1}`} />
                <rect x={x + cw * 0.15} y={y + ch * 0.12} width={cw * 0.7} height={ch * 0.22} rx={0.1} fill="#FFFFFF" opacity={0.5} />
              </g>
            );
          })}
        </g>
      );
      break;
    }
    case "chair":
      body = (
        <g>
          <Solid depth={0.1} draw={(face) => <rect x={left + w * 0.12} y={top + h * 0.28} width={w * 0.76} height={h * 0.64} rx={Math.min(w, h) * 0.14} {...faceStyle(face, "#CFEBD3", line)} />} />
          <Solid depth={0.14} draw={(face) => <rect x={left + w * 0.08} y={top + h * 0.06} width={w * 0.84} height={h * 0.22} rx={h * 0.08} {...faceStyle(face, "#9FCFA7", line)} />} />
          <rect x={left + w * 0.26} y={top + h * 0.4} width={w * 0.48} height={h * 0.3} rx={h * 0.08} fill="#FFFFFF" opacity={0.32} />
        </g>
      );
      break;
    case "armchair":
      body = (
        <g>
          <Solid depth={0.12} draw={(face) => <rect x={left + w * 0.18} y={top + h * 0.28} width={w * 0.64} height={h * 0.64} rx={Math.min(w, h) * 0.12} {...faceStyle(face, "#D3DDC7", line)} />} />
          <Solid depth={0.16} draw={(face) => <rect x={left + w * 0.05} y={top + h * 0.05} width={w * 0.9} height={h * 0.26} rx={h * 0.1} {...faceStyle(face, "#A9BC96", line)} />} />
          <Solid depth={0.14} draw={(face) => <rect x={left + w * 0.03} y={top + h * 0.28} width={w * 0.17} height={h * 0.64} rx={w * 0.07} {...faceStyle(face, "#A9BC96", line)} />} />
          <Solid depth={0.14} draw={(face) => <rect x={left + w * 0.8} y={top + h * 0.28} width={w * 0.17} height={h * 0.64} rx={w * 0.07} {...faceStyle(face, "#A9BC96", line)} />} />
          <rect x={left + w * 0.3} y={top + h * 0.4} width={w * 0.4} height={h * 0.3} rx={h * 0.08} fill="#FFFFFF" opacity={0.32} />
        </g>
      );
      break;
    case "sofa": {
      const seats = 2;
      const armW = w * 0.08;
      const seatW = (w - armW * 2) / seats;
      body = (
        <g>
          <Solid depth={0.16} draw={(face) => <rect x={left} y={top} width={w} height={h * 0.3} rx={h * 0.1} {...faceStyle(face, "#A9BC96", line)} />} />
          {Array.from({ length: seats }, (_, i) => (
            <g key={i}>
              <Solid
                depth={0.12}
                draw={(face) => <rect x={left + armW + i * seatW + 0.04} y={top + h * 0.3} width={seatW - 0.08} height={h * 0.62} rx={h * 0.12} {...faceStyle(face, "#D3DDC7", line)} />}
              />
              <rect x={left + armW + i * seatW + seatW * 0.2} y={top + h * 0.42} width={seatW * 0.6} height={h * 0.2} rx={h * 0.07} fill="#FFFFFF" opacity={0.32} />
            </g>
          ))}
          <Solid depth={0.14} draw={(face) => <rect x={left} y={top + h * 0.26} width={armW} height={h * 0.68} rx={armW * 0.4} {...faceStyle(face, "#A9BC96", line)} />} />
          <Solid depth={0.14} draw={(face) => <rect x={w / 2 - armW} y={top + h * 0.26} width={armW} height={h * 0.68} rx={armW * 0.4} {...faceStyle(face, "#A9BC96", line)} />} />
        </g>
      );
      break;
    }
    case "room":
      body = <rect x={left} y={top} width={w} height={h} fill="none" stroke="#1F2937" strokeWidth={Math.max(0.22, 3 * px)} />;
      break;
    case "text":
    default:
      body = <rect x={left} y={top} width={w} height={h} fill="transparent" />;
  }

  // Labels read horizontally whatever the rotation, so they sit outside the
  // rotated group.
  const label =
    showLabel && (object.type === "text" || object.type === "room") ? (
      <text
        x={object.type === "room" ? -object.w / 2 + 0.4 : 0}
        y={object.type === "room" ? -object.h / 2 + 0.5 : 0}
        textAnchor={object.type === "room" ? "start" : "middle"}
        dominantBaseline={object.type === "room" ? "hanging" : "central"}
        fontSize={object.type === "room" ? 0.8 : Math.max(0.5, Math.min(object.h * 0.62, 1.4))}
        fontWeight={600}
        fill={object.label ? "#111827" : "#9CA3AF"}
        style={{ userSelect: "none" }}
      >
        {object.label || (object.type === "text" ? "Text" : "")}
      </text>
    ) : null;

  return (
    <g transform={`translate(${cx} ${cy})`}>
      <g transform={object.rotation ? `rotate(${object.rotation})` : undefined}>{body}</g>
      {label}
    </g>
  );
});
