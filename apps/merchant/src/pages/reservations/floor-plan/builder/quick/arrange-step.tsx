// Quick Box Layout, step 2: move the new tables into place and fine-tune each
// one. Only tables are edited here; walls, zones and décor copied in from the
// live plan stay put and can be opened in the full builder.
import { useMemo, useRef, useState } from "react";
import {
  Ban,
  Copy,
  Keyboard,
  LayoutGrid,
  Lock,
  MousePointer2,
  Move,
  PencilLine,
  PencilRuler,
  Plus,
  SquareDashedMousePointer,
  Trash2,
  Users,
} from "lucide-react";
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
import { TableIcon } from "../../_shared/icons";
import { StatusLegend } from "../../_shared/status-legend";
import { BuilderActions } from "../_shared/builder-actions";
import { CanvasToolbar, type ViewOptions } from "../_shared/canvas-toolbar";
import { FloatingToolbar } from "../_shared/floating-toolbar";
import { StatsBar } from "../_shared/stats-bar";
import { TableSettings } from "../_shared/table-settings";
import type { usePlanEditor } from "../_shared/use-plan-editor";

const MIN_SCALE = 6;
const MAX_SCALE = 60;
// A ceiling, not a fixed height: the frame hugs the plan so a short floor
// never leaves a dead white band under the grid, and scrolls once zoomed in.
// A fixed height, not a ceiling: the drawing surface should occupy the whole
// area it is given instead of shrinking to whatever the plan happens to need.
export const CANVAS_HEIGHT = "h-[clamp(560px,74vh,960px)]";

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
    <div className="flex flex-col gap-5">
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <EditorCanvas
            ref={canvasRef}
            className={`${CANVAS_HEIGHT} rounded-[18px] border border-[var(--octo-border-card)]`}
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

        <aside className={`octo-scroll flex flex-col rounded-[22px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4 xl:max-h-[calc(clamp(520px,68vh,880px)+72px)] xl:overflow-y-auto`}>
          <h2 className="text-[18px] font-medium text-[var(--octo-text-primary)]">
            {t("floorPlan.selection.title")}{" "}
            <span className="text-[13px] font-normal text-[var(--octo-text-secondary)]">
              ({t(tables.length === 1 ? "floorPlan.selection.oneTable" : "floorPlan.selection.nTables").replace("{n}", String(tables.length))})
            </span>
          </h2>

          {tables.length > 0 ? (
            <TableSettings
              className="mt-3"
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
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-[13.5px] leading-relaxed text-[var(--octo-text-secondary)]">
                {t("floorPlan.selection.otherItems").replace("{n}", String(others.length))}
              </p>
              <button
                type="button"
                onClick={onOpenFullBuilder}
                className="flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#0D6EFD] text-[14px] font-semibold text-white hover:opacity-90"
              >
                <PencilRuler size={17} />
                {t("floorPlan.selection.openBuilder")}
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--octo-border-input)] px-4 py-6 text-center">
                <MousePointer2 size={24} className="text-[var(--octo-text-faint)]" />
                <p className="text-[13.5px] text-[var(--octo-text-secondary)]">{t("floorPlan.selection.empty")}</p>
              </div>
              <button
                type="button"
                onClick={onAddMore}
                className="flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#0D6EFD] text-[14px] font-semibold text-[#0D6EFD] transition-colors hover:bg-[#0D6EFD]/5"
              >
                <Plus size={17} />
                {t("floorPlan.selection.addMore")}
              </button>
              <div className="rounded-2xl bg-[var(--octo-soft-bg)] p-3.5">
                <p className="flex items-center gap-2 text-[13px] font-semibold text-[var(--octo-text-primary)]">
                  <Keyboard size={15} />
                  {t("floorPlan.tutorial.shortcuts")}
                </p>
                <dl className="mt-2 flex flex-col gap-1.5 text-[12.5px]">
                  {[
                    ["Shift + Click", "floorPlan.shortcut.addToSelection"],
                    ["← ↑ → ↓", "floorPlan.shortcut.nudge"],
                    ["Ctrl + D", "floorPlan.tutorial.shortcut.duplicate"],
                    ["R", "floorPlan.tutorial.shortcut.rotate"],
                    ["Space", "floorPlan.tutorial.shortcut.pan"],
                  ].map(([keys, label]) => (
                    <div key={keys} className="flex items-center justify-between gap-2">
                      <dt className="text-[var(--octo-text-secondary)]">{t(label)}</dt>
                      <dd dir="ltr">
                        <kbd className="rounded-md border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-1.5 py-0.5 font-sans text-[11px] font-semibold">{keys}</kbd>
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
          { icon: <TableIcon size={22} />, label: t("floorPlan.stats.tablesInPlan"), value: formatNumber(stats.tables, locale) },
          { icon: <Users size={21} />, label: t("floorPlan.stats.totalCapacity"), value: t("floorPlan.common.seatsCount").replace("{n}", formatNumber(stats.seats, locale)) },
          { icon: <LayoutGrid size={21} />, label: t("floorPlan.stats.categories"), value: formatNumber(stats.categories, locale) },
          { icon: <Ban size={21} />, label: t("floorPlan.stats.blocked"), value: formatNumber(stats.blocked, locale) },
          {
            icon: <PencilLine size={21} />,
            label: t("floorPlan.stats.lastEdited"),
            value: lastEditedAt ? formatEdited(lastEditedAt, locale, t) : t("floorPlan.stats.notSaved"),
            sub: lastEditedAt && author ? t("floorPlan.stats.by").replace("{name}", author) : undefined,
          },
        ]}
      />

      <BuilderActions
        onSaveDraft={onSaveDraft}
        onPreview={onPreview}
        onPublish={onPublish}
        publishLabel={t("floorPlan.actions.publish")}
        saveState={saveState}
      />
    </div>
  );
}
