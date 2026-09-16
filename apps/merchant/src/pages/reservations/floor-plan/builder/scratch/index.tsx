// Build From Scratch: the full floor plan editor — library, layers,
// properties, drawing tools — editing the business's one draft.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BrickWall,
  Grid3x3,
  Hand,
  LayoutTemplate,
  Lasso,
  Maximize2,
  MousePointer2,
  Redo2,
  Ruler,
  Shapes,
  Square,
  SquareDashedBottom,
  Type,
  Undo2,
  Upload,
  Users,
} from "lucide-react";
import clsx from "clsx";
import {
  addItem,
  allItems,
  boundsOf,
  clamp,
  createObject,
  createTable,
  createZone,
  defaultSeats,
  DEFAULT_CANVAS_WIDTH,
  docStats,
  emptyDoc,
  itemRect,
  nextTableNumber,
  rectsOverlap,
  round2,
  sampleLayout,
  snap,
  tableRect,
  toggleLock,
  validateDoc,
  type FloorPlanDoc,
  type Rect,
  type WriteOutcome,
} from "@/entities/floor-plan";
import { ACTUAL_SIZE_SCALE, EditorCanvas, type EditorCanvasHandle, type EditorTool, type Point } from "@/widgets/floor-plan-canvas";
import { useI18n } from "@/app/providers/i18n-provider";
import { formatNumber } from "../../_shared/format";
import { TableIcon } from "../../_shared/icons";
import { PageShell } from "../../_shared/page-header";
import { FLOOR_PLAN_BUILDER_PATH, LIVE_FLOOR_PLAN_PATH } from "../../_shared/paths";
import { SwitchField } from "../../_shared/switch";
import { ToastBanner, useToast } from "../../_shared/toast";
import { useFloorPlan } from "../../_shared/use-floor-plan";
import { BuilderActions } from "../_shared/builder-actions";
import { DEFAULT_VIEW, ZoomControls, type ViewOptions } from "../_shared/canvas-toolbar";
import { FloatingToolbar } from "../_shared/floating-toolbar";
import { PlanPreviewModal, PublishConfirmModal, PublishSuccessModal } from "../_shared/publish-flow";
import { StatsBar } from "../_shared/stats-bar";
import { useAutosave, usePlanEditor } from "../_shared/use-plan-editor";
import { useBuilderTones } from "../quick";
import { LayersPanel } from "./layers-panel";
import { LibraryPanel, MAX_BACKGROUND_BYTES, type LibraryPayload } from "./library-panel";
import { PropertiesPanel } from "./properties-panel";

type Tab = "library" | "layers" | "properties";

const TOOL_KEYS: Record<string, EditorTool> = { v: "select", h: "hand", w: "wall", b: "room", t: "text", z: "zone", q: "lasso", m: "measure" };
const ACCEPTED = ["image/png", "image/jpeg", "application/pdf"];
const MIN_SCALE = 6;
const MAX_SCALE = 60;

/** Where a library item lands. Clicking several items in a row used to drop
 *  them all on the same spot in the middle of the canvas, so this takes the
 *  asked-for spot when it is clear and otherwise scans the floor for the first
 *  one that is. (Sliding diagonally instead just piled them into the corner.) */
function freeSpot(doc: FloorPlanDoc, rect: Rect, step: number): { x: number; y: number } {
  const taken = allItems(doc)
    .filter((item) => item.kind !== "zone")
    .map(itemRect);
  const maxX = Math.max(0, doc.width - rect.w);
  const maxY = Math.max(0, doc.height - rect.h);
  const fits = (x: number, y: number) => !taken.some((other) => rectsOverlap(other, { ...rect, x, y }));

  const asked = { x: snap(clamp(rect.x, 0, maxX), step), y: snap(clamp(rect.y, 0, maxY), step) };
  if (fits(asked.x, asked.y)) return asked;

  // Nearest clear spot to where the merchant asked for it — scanning from the
  // canvas origin instead sent every new item to the far top-left corner.
  const stride = Math.max(0.6, step, Math.min(rect.w, rect.h) * 0.5);
  const candidates: { x: number; y: number }[] = [];
  for (let y = 0; y <= maxY; y = round2(y + stride)) {
    for (let x = 0; x <= maxX; x = round2(x + stride)) candidates.push({ x: snap(x, step), y: snap(y, step) });
  }
  const distance = (spot: { x: number; y: number }) => (spot.x - asked.x) ** 2 + (spot.y - asked.y) ** 2;
  candidates.sort((a, b) => distance(a) - distance(b));
  for (const spot of candidates) {
    if (fits(spot.x, spot.y)) return spot;
  }
  return asked;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function BuildFromScratchPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const floorPlan = useFloorPlan();
  const { toast, notify } = useToast();

  const [boot] = useState(() => {
    const { draft, published } = floorPlan;
    const source = params.get("source");
    // A plan saved under a different canvas width keeps that old boundary —
    // one saved narrow leaves a dead strip beside it, one saved too wide
    // leaves the floor stranded in a sea of empty grid. Put the boundary back
    // on the standard width, never cutting into what's already drawn.
    const normalizeWidth = (doc: FloorPlanDoc): FloorPlanDoc => {
      const content = boundsOf(allItems(doc).map(itemRect));
      const width = Math.max(DEFAULT_CANVAS_WIDTH, Math.ceil(content ? content.x + content.w : 0));
      return width === doc.width ? doc : { ...doc, width };
    };
    if (draft) {
      const doc = normalizeWidth(draft.doc);
      return { doc, fromPublished: draft.fromPublished, hadDraft: true, widthFixed: doc !== draft.doc };
    }
    if (source === "live" && published) {
      return { doc: normalizeWidth(structuredClone(published.doc)), fromPublished: true, hadDraft: false, widthFixed: false };
    }
    if (source === "sample") return { doc: sampleLayout(t("floorPlan.defaults.planName")), fromPublished: false, hadDraft: false, widthFixed: false };
    return { doc: emptyDoc(t("floorPlan.defaults.planName")), fromPublished: false, hadDraft: false, widthFixed: false };
  });

  const [view, setView] = useState<ViewOptions>({ ...DEFAULT_VIEW, showDimensions: true });
  const [tool, setTool] = useState<EditorTool>("select");
  const [tab, setTab] = useState<Tab>("library");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  // Real size by default — 22px per grid unit is true 100%, not a computed
  // fit percentage that changes with window width. "Fit to view" is still one
  // click away for anyone who wants the whole plan to shrink into view.
  const [scale, setScale] = useState(ACTUAL_SIZE_SCALE);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [modal, setModal] = useState<"preview" | "confirm" | null>(null);
  const [successDoc, setSuccessDoc] = useState<FloorPlanDoc | null>(null);
  const canvasRef = useRef<EditorCanvasHandle>(null);
  const uploadRef = useRef<HTMLInputElement>(null);

  const editor = usePlanEditor(() => ({ doc: boot.doc }), { nudgeStep: view.gridStep });
  const { doc } = editor;
  const docRef = useRef(doc);
  docRef.current = doc;
  const toneFor = useBuilderTones(floorPlan.published?.doc ?? null);

  const hasDraft = useRef(boot.hadDraft);
  const published = useRef(false);
  const save = useCallback((): WriteOutcome => {
    if (published.current || !(hasDraft.current || editor.state.revision > 0)) return "saved";
    hasDraft.current = true;
    return floorPlan.saveDraft(editor.doc, { method: "scratch", fromPublished: boot.fromPublished });
  }, [editor.doc, editor.state.revision, floorPlan, boot.fromPublished]);
  const autosave = useAutosave(editor.state.revision, save);

  // Autosave only runs after an edit, so a boundary corrected on open would
  // otherwise stay corrected on screen but stale on disk — write it once.
  useEffect(() => {
    if (boot.widthFixed) autosave.flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (saveState !== "saved") return;
    const id = window.setTimeout(() => setSaveState("idle"), 2200);
    return () => window.clearTimeout(id);
  }, [saveState]);

  const lastOutcome = useRef<WriteOutcome | null>(null);
  useEffect(() => {
    if (!autosave.outcome || autosave.outcome === lastOutcome.current) return;
    lastOutcome.current = autosave.outcome;
    if (autosave.outcome === "memoryOnly") notify(t("floorPlan.storage.memoryOnly"), "error");
    if (autosave.outcome === "savedWithoutBackground") notify(t("floorPlan.storage.withoutBackground"), "info");
  }, [autosave.outcome, notify, t]);

  // Tool shortcuts. Editing shortcuts (undo, delete, nudge…) live in the
  // editor hook; these only switch the active tool.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.closest("[role=dialog]"))) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const next = TOOL_KEYS[event.key.toLowerCase()];
      if (next) setTool(next);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const addFromLibrary = useCallback(
    (payload: LibraryPayload, at?: Point) => {
      const current = docRef.current;
      const point = at ?? canvasRef.current?.viewportCenter() ?? { x: current.width / 2, y: current.height / 2 };
      const step = view.snap ? view.gridStep : 0.05;
      if (payload.kind === "table") {
        const table = createTable(nextTableNumber(current), 0, 0, { shape: payload.shape, size: "medium", seats: defaultSeats(payload.shape, "medium") });
        const rect = tableRect(table);
        const spot = freeSpot(current, { ...rect, x: snap(point.x - rect.w / 2, step), y: snap(point.y - rect.h / 2, step) }, step);
        const placed = { ...table, ...spot };
        editor.commit(addItem(current, placed), [placed.id]);
      } else if (payload.kind === "object") {
        const label = payload.type === "bar" ? t("floorPlan.object.bar") : payload.type === "text" ? t("floorPlan.defaults.text") : "";
        const object = createObject(payload.type, 0, 0, { label });
        const spot = freeSpot(
          current,
          { x: snap(point.x - object.w / 2, step), y: snap(point.y - object.h / 2, step), w: object.w, h: object.h },
          step
        );
        const placed = { ...object, ...spot };
        editor.commit(addItem(current, placed), [placed.id]);
      } else {
        const zone = createZone(t("floorPlan.defaults.zoneName").replace("{n}", String(current.zones.length + 1)), payload.color, {
          x: snap(point.x - 6, step),
          y: snap(point.y - 5, step),
          w: 12,
          h: 10,
        });
        editor.commit(addItem(current, zone), [zone.id]);
      }
    },
    [editor, t, view.snap, view.gridStep]
  );

  async function setBackgroundFile(file: File) {
    if (!ACCEPTED.includes(file.type)) {
      notify(t("floorPlan.library.badType"), "error");
      return;
    }
    if (file.size > MAX_BACKGROUND_BYTES) {
      notify(t("floorPlan.library.tooLarge"), "error");
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      editor.commit({ ...docRef.current, background: { dataUrl, mime: file.type, fileName: file.name, opacity: docRef.current.background?.opacity ?? 0.5 } });
      notify(t("floorPlan.library.backgroundAdded"));
    } catch {
      notify(t("floorPlan.library.readFailed"), "error");
    }
  }

  const stats = useMemo(() => docStats(doc), [doc]);
  const conflictIds = useMemo(() => new Set(validateDoc(doc).overlaps.flat()), [doc]);
  const isEmpty = doc.tables.length + doc.objects.length + doc.zones.length === 0;

  function saveNow() {
    hasDraft.current = true;
    autosave.flush();
    setSaveState("saved");
    notify(t("floorPlan.actions.draftSaved"));
  }

  function confirmPublish() {
    published.current = true;
    const current = editor.doc;
    const outcome = floorPlan.publish(current);
    setModal(null);
    setSuccessDoc(current);
    if (outcome === "memoryOnly") notify(t("floorPlan.storage.memoryOnly"), "error");
  }

  function showItems(ids: string[]) {
    setHiddenIds((current) => new Set([...current].filter((id) => !ids.includes(id))));
    editor.select(ids);
    setTab("properties");
  }

  const tools = [
    { id: "select", label: t("floorPlan.tools.select"), icon: <MousePointer2 size={20} />, shortcut: "V" },
    { id: "hand", label: t("floorPlan.tools.hand"), icon: <Hand size={20} />, shortcut: "H" },
    { id: "wall", label: t("floorPlan.tools.drawWall"), icon: <BrickWall size={20} />, shortcut: "W" },
    { id: "room", label: t("floorPlan.tools.room"), icon: <Square size={20} />, shortcut: "B" },
    { id: "text", label: t("floorPlan.tools.text"), icon: <Type size={20} />, shortcut: "T" },
    { id: "zone", label: t("floorPlan.tools.zone"), icon: <SquareDashedBottom size={20} />, shortcut: "Z", overflow: true },
    { id: "lasso", label: t("floorPlan.tools.lasso"), icon: <Lasso size={20} />, shortcut: "Q", overflow: true },
    { id: "measure", label: t("floorPlan.tools.measure"), icon: <Ruler size={20} />, shortcut: "M", overflow: true },
  ] as const;

  const hint =
    tool === "wall" ? t("floorPlan.hint.wall") :
    tool === "room" ? t("floorPlan.hint.room") :
    tool === "zone" ? t("floorPlan.hint.zone") :
    tool === "text" ? t("floorPlan.hint.text") :
    tool === "lasso" ? t("floorPlan.hint.lasso") :
    tool === "measure" ? t("floorPlan.hint.measure") :
    tool === "hand" ? t("floorPlan.hint.hand") : null;

  return (
    <PageShell fill>
      {/* No page header here — the app's own breadcrumb already names this
          screen, and every control that lived in it (title aside, Undo, Redo,
          Grid, Snap, Show Dimensions) moved into the Tools bar over the
          canvas, so the library/canvas/layers section gets that height back. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 xl:flex-row">
        {/* The tool row floats over the canvas's own bottom edge instead of
            taking a row beneath it, so the drawing area keeps that height. */}
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <EditorCanvas
            ref={canvasRef}
            className="h-full rounded-[18px] border border-[var(--octo-border-card)]"
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
            showDimensions={view.showDimensions}
            hiddenIds={hiddenIds}
            conflictIds={conflictIds}
            toneFor={toneFor}
            newZoneName={(n) => t("floorPlan.defaults.zoneName").replace("{n}", String(n))}
            newTextLabel={t("floorPlan.defaults.text")}
            onCreated={(item) => {
              if (item.kind !== "object" || item.type !== "wall") setTab("properties");
            }}
            onDropPayload={(payload, point) => {
              try {
                addFromLibrary(JSON.parse(payload) as LibraryPayload, point);
              } catch {
                // Not one of ours.
              }
            }}
          >
            {isEmpty && !doc.background && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center p-6">
                <div className="pointer-events-auto flex max-w-[420px] flex-col items-center rounded-[22px] border border-[var(--octo-border-card)] bg-[var(--octo-card)]/95 p-6 text-center shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur">
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-[#6D28D9]/10 text-[#6D28D9]">
                    <Shapes size={24} />
                  </span>
                  <h2 className="mt-3 text-[18px] font-bold text-[var(--octo-text-primary)]">{t("floorPlan.scratch.emptyTitle")}</h2>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--octo-text-secondary)]">{t("floorPlan.scratch.emptyBody")}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => editor.commit(sampleLayout(doc.name))}
                      className="flex h-10 items-center gap-2 rounded-[10px] bg-[#6D28D9] px-4 text-[13.5px] font-semibold text-white hover:opacity-90"
                    >
                      <LayoutTemplate size={16} />
                      {t("floorPlan.scratch.useSample")}
                    </button>
                    <button
                      type="button"
                      onClick={() => uploadRef.current?.click()}
                      className="flex h-10 items-center gap-2 rounded-[10px] border border-[var(--octo-border-input)] px-4 text-[13.5px] font-semibold text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                    >
                      <Upload size={16} />
                      {t("floorPlan.scratch.uploadPlan")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </EditorCanvas>
          {hint && (
            <p className="pointer-events-none absolute start-1/2 top-9 z-[4] -translate-x-1/2 rounded-full bg-[#111827]/85 px-3.5 py-1.5 text-[12.5px] font-medium text-white shadow-lg rtl:translate-x-1/2">
              {hint}
            </p>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[5] flex justify-center px-3">
            <FloatingToolbar
              className="pointer-events-auto !bg-[var(--octo-card)]/90 backdrop-blur"
              tools={[
                { id: "undo", label: t("floorPlan.toolbar.undo"), icon: <Undo2 size={18} />, shortcut: "Ctrl+Z", disabled: !editor.canUndo, onClick: editor.undo },
                { id: "redo", label: t("floorPlan.toolbar.redo"), icon: <Redo2 size={18} />, shortcut: "Ctrl+Shift+Z", disabled: !editor.canRedo, onClick: editor.redo },
                ...tools.map((item, index) => ({ ...item, active: tool === item.id, onClick: () => setTool(item.id), separator: index === 0 })),
                {
                  id: "view-settings",
                  label: t("floorPlan.toolbar.grid"),
                  icon: <Grid3x3 size={18} />,
                  overflow: true,
                  separator: true,
                  overflowContent: (
                    <div className="flex w-[220px] flex-col gap-2.5 px-1 py-1">
                      <SwitchField checked={view.showGrid} onChange={(showGrid) => setView({ ...view, showGrid })} label={t("floorPlan.toolbar.showGrid")} size="sm" />
                      <div className="grid grid-cols-2 gap-1.5 rounded-[10px] bg-[var(--octo-seg-bg)] p-1" role="radiogroup">
                        {([0.5, 1] as const).map((step) => (
                          <button
                            key={step}
                            type="button"
                            role="radio"
                            aria-checked={view.gridStep === step}
                            onClick={() => setView({ ...view, gridStep: step })}
                            className={clsx(
                              "rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition-colors",
                              view.gridStep === step ? "bg-[var(--octo-card)] text-[#0D6EFD] shadow-sm" : "text-[var(--octo-text-secondary)]"
                            )}
                          >
                            {step === 0.5 ? t("floorPlan.toolbar.gridFine") : t("floorPlan.toolbar.gridStandard")}
                          </button>
                        ))}
                      </div>
                      <div className="my-0.5 h-px bg-[var(--octo-border-input)]" />
                      <SwitchField checked={view.snap} onChange={(snap) => setView({ ...view, snap })} label={t("floorPlan.toolbar.snap")} size="sm" />
                      <SwitchField checked={view.showDimensions} onChange={(showDimensions) => setView({ ...view, showDimensions })} label={t("floorPlan.toolbar.showDimensions")} size="sm" />
                    </div>
                  ),
                },
              ]}
            />
          </div>
          <ZoomControls
            className="pointer-events-auto absolute bottom-3 end-3 z-[5] !bg-[var(--octo-card)]/90 backdrop-blur"
            zoomPercent={Math.round((scale / ACTUAL_SIZE_SCALE) * 100)}
            onZoomIn={() => setScale((s) => Math.min(MAX_SCALE, s * 1.2))}
            onZoomOut={() => setScale((s) => Math.max(MIN_SCALE, s / 1.2))}
            onFit={() => canvasRef.current?.fitToView()}
          />
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-[22px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] xl:w-[340px] xl:shrink-0">
          <div className="flex border-b border-[var(--octo-border-card)] px-2" role="tablist">
            {(["library", "layers", "properties"] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={clsx(
                  "relative flex flex-1 items-center justify-center gap-1.5 px-2 py-3.5 text-[16px] transition-colors",
                  tab === id ? "font-medium text-[#0D6EFD]" : "text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]"
                )}
              >
                {t(`floorPlan.scratch.tab.${id}`)}
                {id === "properties" && editor.selection.length > 0 && (
                  <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#0D6EFD] px-1 text-[10.5px] font-semibold text-white">
                    {editor.selection.length}
                  </span>
                )}
                {tab === id && <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[#0D6EFD]" />}
              </button>
            ))}
          </div>
          <div className="octo-scroll min-h-0 flex-1 overflow-y-auto p-4">
            {tab === "library" && (
              <LibraryPanel
                onAdd={(payload) => addFromLibrary(payload)}
                background={doc.background}
                onBackgroundFile={setBackgroundFile}
                onBackgroundOpacity={(opacity) => doc.background && editor.commit({ ...doc, background: { ...doc.background, opacity } })}
                onRemoveBackground={() => editor.commit({ ...doc, background: null })}
              />
            )}
            {tab === "layers" && (
              <LayersPanel
                doc={doc}
                selection={editor.selection}
                hiddenIds={hiddenIds}
                onSelect={editor.select}
                onToggleHidden={(id) =>
                  setHiddenIds((current) => {
                    const next = new Set(current);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  })
                }
                onToggleLock={(id) => editor.commit(toggleLock(doc, [id]))}
              />
            )}
            {tab === "properties" && (
              <PropertiesPanel
                doc={doc}
                items={editor.selectedItems}
                toneFor={toneFor}
                onDoc={(next) => editor.commit(next)}
                onDuplicate={editor.duplicateSelected}
                onDelete={editor.deleteSelected}
                onRotate={editor.rotateSelected}
                onToggleLock={editor.toggleLockSelected}
                toolShortcuts={tools.map((item) => [item.shortcut, item.label] as [string, string])}
              />
            )}
          </div>
        </aside>
      </div>

      {/* One compact row, not two stacked ones: the stats strip and the save/
          publish buttons share the width instead of each claiming a full-width
          line, so the canvas above keeps more of the page. */}
      <div className="mt-3 flex shrink-0 flex-col gap-2 xl:flex-row xl:items-center">
        <StatsBar
          className="xl:min-w-0 xl:flex-1"
          items={[
            { icon: <Maximize2 size={20} />, label: t("floorPlan.stats.canvasSize"), value: <span dir="ltr">{`${stats.widthMeters.toFixed(2)}m * ${stats.heightMeters.toFixed(2)}m`}</span> },
            { icon: <Shapes size={20} />, label: t("floorPlan.stats.objects"), value: formatNumber(stats.objects, locale) },
            { icon: <TableIcon size={22} />, label: t("floorPlan.stats.tables"), value: formatNumber(stats.tables, locale) },
            { icon: <Users size={20} />, label: t("floorPlan.stats.capacity"), value: t("floorPlan.common.seatsCount").replace("{n}", formatNumber(stats.seats, locale)) },
            { icon: <SquareDashedBottom size={20} />, label: t("floorPlan.stats.zones"), value: formatNumber(stats.zones, locale) },
            { icon: <BrickWall size={20} />, label: t("floorPlan.stats.walls"), value: <span dir="ltr">{`${stats.wallsMeters.toFixed(1)}m`}</span> },
          ]}
        />
        <BuilderActions
          inline
          className="xl:shrink-0"
          onSaveDraft={saveNow}
          onPreview={() => setModal("preview")}
          onPublish={() => setModal("confirm")}
          publishLabel={t("floorPlan.actions.publishLive")}
          saveState={saveState}
        />
      </div>

      <input
        ref={uploadRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void setBackgroundFile(file);
          event.target.value = "";
        }}
      />

      <PlanPreviewModal
        open={modal === "preview"}
        onClose={() => setModal(null)}
        doc={doc}
        onRename={(name) => editor.commit({ ...doc, name })}
        onShowItems={showItems}
        onPublish={() => setModal("confirm")}
        publishLabel={t("floorPlan.actions.publishLive")}
      />
      <PublishConfirmModal
        open={modal === "confirm"}
        onClose={() => setModal(null)}
        onConfirm={confirmPublish}
        doc={doc}
        replacingName={floorPlan.published?.doc.name ?? null}
      />
      {successDoc && (
        <PublishSuccessModal
          open
          doc={successDoc}
          onViewLive={() => navigate(LIVE_FLOOR_PLAN_PATH)}
          onBackToBuilder={() => navigate(FLOOR_PLAN_BUILDER_PATH)}
        />
      )}
      <ToastBanner toast={toast} />
    </PageShell>
  );
}
