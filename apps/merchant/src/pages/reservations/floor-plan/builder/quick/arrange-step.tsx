// Quick Box Layout, step 2: move the new tables into place and fine-tune each
// one. Only tables are edited here; walls, zones and décor copied in from the
// live plan stay put and can be opened in the full builder.
import { useMemo, useRef, useState } from "react";
import { Copy, Keyboard, Lock, MousePointer2, Move, PencilRuler, Plus, SquareDashedMousePointer, Trash2 } from "lucide-react";
import clsx from "clsx";
import {
  LIVE_STATUSES,
  docStats,
  updateTable,
  validateDoc,
  type FloorTable,
  type LiveStatus,
} from "@/entities/floor-plan";
import { ACTUAL_SIZE_SCALE, EditorCanvas, type EditorCanvasHandle, type EditorTool } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";
import { formatEdited, formatNumber } from "../../_shared/format";
import { BORDER_200, BORDER_300, SURFACE_100, SURFACE_WHITE, TEXT_PRIMARY, TEXT_SEC_GRAY } from "../../../_shared/theme";
import { StatusLegend } from "../../_shared/status-legend";
import { BuilderActions } from "../_shared/builder-actions";
import { CanvasToolbar, type ViewOptions } from "../_shared/canvas-toolbar";
import { FloatingToolbar } from "../_shared/floating-toolbar";
import { STAT_ICONS, StatsBar } from "../_shared/stats-bar";
import { TableSettings } from "../_shared/table-settings";
import type { usePlanEditor } from "../_shared/use-plan-editor";

const MIN_SCALE = 6;
const MAX_SCALE = 60;
// A fixed height, not a ceiling: the drawing surface should occupy the whole
// area it is given instead of shrinking to whatever the plan happens to need.
// The frame draws it 672px tall; taller screens get more of the floor.
export const CANVAS_HEIGHT = "h-[clamp(672px,74vh,960px)]";

export function ArrangeStep({
  editor,
  view,
  onViewChange,
  toneFor,
  onAddMore,
  onPreview,
  onPublish,
  onSaveDraft,
  saveState,
  lastEditedAt,
  author,
  onOpenFullBuilder,
}: {
  editor: ReturnType<typeof usePlanEditor>;
  view: ViewOptions;
  onViewChange: (view: ViewOptions) => void;
  toneFor: (table: FloorTable) => LiveStatus;
  onAddMore: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onSaveDraft: () => void;
  saveState: "idle" | "saved";
  lastEditedAt: number | null;
  author: string;
  onOpenFullBuilder: () => void;
}) {
  const { t, locale } = useI18n();
  const { doc, selectedItems } = editor;
  const [tool, setTool] = useState<EditorTool>("select");
  // Real size by default, not a computed fit percentage — "Fit to view" is
  // still one click away for anyone who wants the whole plan to shrink into view.
  const [scale, setScale] = useState(ACTUAL_SIZE_SCALE);
  const canvasRef = useRef<EditorCanvasHandle>(null);

  const tables = selectedItems.filter((item): item is FloorTable => item.kind === "table");
  const others = selectedItems.filter((item) => item.kind !== "table");
  const stats = useMemo(() => docStats(doc), [doc]);
  const conflictIds = useMemo(() => new Set(validateDoc(doc).overlaps.flat()), [doc]);
  const counts = useMemo(() => {
    const result = Object.fromEntries(LIVE_STATUSES.map((s) => [s, 0])) as Record<LiveStatus, number>;
    for (const table of doc.tables) if (table.visible) result[toneFor(table)] += 1;
    return result;
  }, [doc.tables, toneFor]);

  const anyLocked = selectedItems.length > 0 && selectedItems.every((item) => item.locked);

  return (
    <div className="flex flex-col gap-6">
      <StatusLegend counts={counts} />

      <CanvasToolbar
        canUndo={editor.canUndo}
        canRedo={editor.canRedo}
        onUndo={editor.undo}
        onRedo={editor.redo}
        view={view}
        onViewChange={onViewChange}
        secondToggle="labels"
        zoomPercent={Math.round((scale / ACTUAL_SIZE_SCALE) * 100)}
        onZoomIn={() => setScale((s) => Math.min(MAX_SCALE, s * 1.2))}
        onZoomOut={() => setScale((s) => Math.max(MIN_SCALE, s / 1.2))}
        onFit={() => canvasRef.current?.fitToView()}
      />

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_249px]">
        <div className="flex min-w-0 flex-col gap-4">
          <EditorCanvas
            ref={canvasRef}
            className={clsx(CANVAS_HEIGHT, "border", BORDER_200)}
            doc={doc}
            selection={editor.selection}
            onSelectionChange={editor.select}
            onCommit={editor.commit}
            tool={tool}
            onToolChange={setTool}
            scale={scale}
            onScaleChange={setScale}
            showGrid={view.showGrid}
            snapEnabled={view.snap}
            snapStep={view.gridStep}
            showLabels={view.showLabels}
            boxTables
            conflictIds={conflictIds}
            toneFor={toneFor}
            newZoneName={(n) => t("floorPlan.defaults.zoneName").replace("{n}", String(n))}
            newTextLabel={t("floorPlan.defaults.text")}
          />
          <FloatingToolbar
            tools={[
              { id: "select", label: t("floorPlan.tools.select"), icon: <MousePointer2 size={20} />, active: tool === "select", onClick: () => setTool("select") },
              { id: "multi", label: t("floorPlan.tools.multiSelect"), icon: <SquareDashedMousePointer size={20} />, active: tool === "multiSelect", onClick: () => setTool("multiSelect") },
              { id: "move", label: t("floorPlan.tools.move"), icon: <Move size={20} />, active: tool === "move", onClick: () => setTool("move") },
              { id: "duplicate", label: t("floorPlan.tools.duplicate"), icon: <Copy size={20} />, disabled: selectedItems.length === 0, onClick: editor.duplicateSelected, shortcut: "Ctrl+D" },
              { id: "delete", label: t("floorPlan.tools.delete"), icon: <Trash2 size={20} />, disabled: selectedItems.length === 0 || anyLocked, onClick: editor.deleteSelected, shortcut: "Del", tone: "danger" },
              { id: "lock", label: t("floorPlan.tools.lockUnlock"), icon: <Lock size={20} />, disabled: selectedItems.length === 0, active: anyLocked, onClick: editor.toggleLockSelected, shortcut: "L" },
            ]}
          />
        </div>

        <aside className={clsx("octo-scroll flex min-w-0 flex-col gap-4 rounded-[20px] border p-3 xl:max-h-[calc(clamp(672px,74vh,960px)+72px)] xl:overflow-y-auto", BORDER_300, SURFACE_WHITE)}>
          <h2 className={clsx("text-[16px] font-medium leading-[16px]", TEXT_PRIMARY)}>
            {t("floorPlan.selection.title")}{" "}
            <span className={clsx("text-[12px] font-normal leading-[12px]", TEXT_SEC_GRAY)}>
              ({t(tables.length === 1 ? "floorPlan.selection.oneTable" : "floorPlan.selection.nTables").replace("{n}", String(tables.length))})
            </span>
          </h2>

          {tables.length > 0 ? (
            <TableSettings
              doc={doc}
              tables={tables}
              toneFor={toneFor}
              onPatch={(patch) => {
                let next = doc;
                for (const table of tables) next = updateTable(next, table.id, patch);
                editor.commit(next);
              }}
              onDuplicate={editor.duplicateSelected}
              onDelete={editor.deleteSelected}
              onRotate={editor.rotateSelected}
              onToggleLock={editor.toggleLockSelected}
            />
          ) : others.length > 0 ? (
            <div className="flex flex-col gap-3">
              <p className={clsx("text-[12px] font-medium leading-[1.4]", TEXT_SEC_GRAY)}>
                {t("floorPlan.selection.otherItems").replace("{n}", String(others.length))}
              </p>
              <button
                type="button"
                onClick={onOpenFullBuilder}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] bg-[#0d6efd] px-2 text-[14px] font-semibold text-white hover:opacity-90"
              >
                <PencilRuler size={17} />
                {t("floorPlan.selection.openBuilder")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className={clsx("flex flex-col items-center gap-2 rounded-[12px] border border-dashed px-3 py-6 text-center", BORDER_300)}>
                <MousePointer2 size={24} className={TEXT_SEC_GRAY} />
                <p className={clsx("text-[12px] font-medium leading-[1.4]", TEXT_SEC_GRAY)}>{t("floorPlan.selection.empty")}</p>
              </div>
              <button
                type="button"
                onClick={onAddMore}
                className="flex h-9 items-center justify-center gap-2 rounded-[8px] border border-[#0d6efd] px-2 text-[14px] font-semibold text-[#0d6efd] transition-colors hover:bg-[#0d6efd]/5"
              >
                <Plus size={17} />
                {t("floorPlan.selection.addMore")}
              </button>
              <div className={clsx("rounded-[12px] p-2", SURFACE_100)}>
                <p className={clsx("flex items-center gap-2 text-[14px] font-medium leading-[14px]", TEXT_PRIMARY)}>
                  <Keyboard size={15} />
                  {t("floorPlan.tutorial.shortcuts")}
                </p>
                <dl className="mt-3 flex flex-col gap-2 text-[12px]">
                  {[
                    ["Shift + Click", "floorPlan.shortcut.addToSelection"],
                    ["← ↑ → ↓", "floorPlan.shortcut.nudge"],
                    ["Ctrl + D", "floorPlan.tutorial.shortcut.duplicate"],
                    ["R", "floorPlan.tutorial.shortcut.rotate"],
                    ["Space", "floorPlan.tutorial.shortcut.pan"],
                  ].map(([keys, label]) => (
                    <div key={keys} className="flex items-center justify-between gap-2">
                      <dt className={TEXT_SEC_GRAY}>{t(label)}</dt>
                      <dd dir="ltr">
                        <kbd className={clsx("rounded-md border px-1.5 py-0.5 font-sans text-[11px] font-semibold", BORDER_300, SURFACE_WHITE, TEXT_PRIMARY)}>{keys}</kbd>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </aside>
      </div>

      <StatsBar
        items={[
          { icon: STAT_ICONS.tables, label: t("floorPlan.stats.tablesInPlan"), value: formatNumber(stats.tables, locale) },
          { icon: STAT_ICONS.capacity, label: t("floorPlan.stats.totalCapacity"), value: t("floorPlan.common.seatsCount").replace("{n}", formatNumber(stats.seats, locale)) },
          { icon: STAT_ICONS.categories, label: t("floorPlan.stats.categories"), value: formatNumber(stats.categories, locale) },
          { icon: STAT_ICONS.blocked, label: t("floorPlan.stats.blocked"), value: formatNumber(stats.blocked, locale) },
          {
            icon: STAT_ICONS.edited,
            label: t("floorPlan.stats.lastEdited"),
            value: lastEditedAt ? formatEdited(lastEditedAt, locale, t) : t("floorPlan.stats.notSaved"),
            sub: lastEditedAt && author ? t("floorPlan.stats.by").replace("{name}", author) : undefined,
          },
        ]}
      />

      <BuilderActions
        className="mt-2"
        onSaveDraft={onSaveDraft}
        onPreview={onPreview}
        onPublish={onPublish}
        publishLabel={t("floorPlan.actions.publish")}
        saveState={saveState}
      />
    </div>
  );
}
