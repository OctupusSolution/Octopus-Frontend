// The merchant's own published plan, each table painted by its QR status with
// the status mark on its corner (Figma 2012:185145) — the drawing is the
// restaurant's real layout, not the frame's sample grid.
import { useMemo, type PointerEvent as ReactPointerEvent } from "react";
import clsx from "clsx";
import { tableRect, type FloorItem, type FloorPlanDoc, type FloorTable, type LiveStatus } from "@/entities/floor-plan";
import { PlanViewport, type ItemKind, type ZoomSetting } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";
import { QR_STATUSES, type QrStatus } from "./qr-store";
import { QR_CHIP } from "./theme";

const TABLES_ONLY: ReadonlySet<ItemKind> = new Set(["table"]);
const FIT: ZoomSetting = { mode: "fit" };

/** QR status → the plan's table tone, so the glyphs keep the plan's own drawing. */
const TONE: Record<QrStatus, LiveStatus> = {
  active: "available",
  reprint: "reserved",
  notGenerated: "blocked",
  disabled: "occupied",
};

const BADGE: Record<QrStatus, string> = {
  active: "#009A39",
  reprint: "#C27C00",
  notGenerated: "#0F172A",
  disabled: "#D30202",
};

function Badge({ status, cx, cy, r }: { status: QrStatus; cx: number; cy: number; r: number }) {
  const s = r * 0.5;
  const line = { stroke: "#fff", strokeWidth: r * 0.26, strokeLinecap: "round" as const, fill: "none" };
  return (
    <g pointerEvents="none">
      <circle cx={cx} cy={cy} r={r} fill={BADGE[status]} stroke="#fff" strokeWidth={r * 0.18} />
      {status === "active" && <path d={`M${cx - s} ${cy} L${cx - s * 0.2} ${cy + s * 0.75} L${cx + s} ${cy - s * 0.6}`} {...line} />}
      {status === "notGenerated" && <path d={`M${cx - s} ${cy} H${cx + s} M${cx} ${cy - s} V${cy + s}`} {...line} />}
      {status === "disabled" && <path d={`M${cx - s * 0.7} ${cy - s * 0.7} L${cx + s * 0.7} ${cy + s * 0.7} M${cx + s * 0.7} ${cy - s * 0.7} L${cx - s * 0.7} ${cy + s * 0.7}`} {...line} />}
      {status === "reprint" && (
        <>
          <path d={`M${cx} ${cy - s} V${cy + s * 0.2}`} {...line} />
          <circle cx={cx} cy={cy + s * 0.75} r={r * 0.14} fill="#fff" />
        </>
      )}
    </g>
  );
}

/** An eye with a slash: the place is hidden from customers' table choice. */
function HiddenMark({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const w = r * 0.62;
  const line = { stroke: "#fff", strokeWidth: r * 0.18, strokeLinecap: "round" as const, fill: "none" };
  return (
    <g pointerEvents="none">
      <circle cx={cx} cy={cy} r={r} fill="#475569" stroke="#fff" strokeWidth={r * 0.18} />
      <path d={`M${cx - w} ${cy} Q${cx} ${cy - w * 0.9} ${cx + w} ${cy} Q${cx} ${cy + w * 0.9} ${cx - w} ${cy} Z`} {...line} />
      <path d={`M${cx - w} ${cy + w} L${cx + w} ${cy - w}`} {...line} />
    </g>
  );
}

export function QrPlan({
  doc,
  statusOf,
  selectedIds,
  dimmedIds,
  hiddenIds,
  onTable,
  className,
}: {
  doc: FloorPlanDoc;
  statusOf: (table: FloorTable) => QrStatus;
  selectedIds?: ReadonlySet<string>;
  dimmedIds?: ReadonlySet<string>;
  /** Tables hidden from customers, marked on their top corner. */
  hiddenIds?: ReadonlySet<string>;
  onTable?: (table: FloorTable) => void;
  className?: string;
}) {
  const overlay = useMemo(
    () =>
      doc.tables
        .filter((t) => t.visible && !dimmedIds?.has(t.id))
        .map((t) => {
          const rect = tableRect(t);
          const r = Math.max(0.28, Math.min(rect.w, rect.h) * 0.16);
          return (
            <g key={t.id}>
              <Badge status={statusOf(t)} cx={rect.x + rect.w - r * 0.6} cy={rect.y + rect.h - r * 0.6} r={r} />
              {hiddenIds?.has(t.id) && <HiddenMark cx={rect.x + rect.w - r * 0.6} cy={rect.y + r * 0.6} r={r} />}
            </g>
          );
        }),
    [doc.tables, statusOf, dimmedIds, hiddenIds]
  );
  return (
    <div className={clsx("relative min-h-0 overflow-hidden rounded-[2px] border border-[#e2e8f0] bg-white", className)}>
      <PlanViewport
        doc={doc}
        zoom={FIT}
        className="h-full"
        showBackground={false}
        toneFor={(t) => TONE[statusOf(t)]}
        selectedIds={selectedIds}
        dimmedIds={dimmedIds}
        interactive={onTable ? TABLES_ONLY : undefined}
        overlay={overlay}
        onItemPointerDown={(_e: ReactPointerEvent<SVGGElement>, item: FloorItem) => {
          if (item.kind === "table") onTable?.(item);
        }}
      />
    </div>
  );
}

/** The four status chips with counts (Figma 2012:185351). */
export function QrLegend({ counts }: { counts: Record<QrStatus, number> }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {QR_STATUSES.map((status) => (
        <span key={status} className={clsx("inline-flex items-center gap-1 rounded-[4px] p-2", QR_CHIP[status])}>
          <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
          <span className="flex items-center gap-2">
            <span className="whitespace-nowrap text-[14px] font-medium leading-[14px]">{t(`floorPlan.qr.status.${status}`)}</span>
            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-white p-1 text-[10px] font-medium leading-[10px] [[data-theme=dark]_&]:bg-[var(--octo-card)]">
              {counts[status]}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
