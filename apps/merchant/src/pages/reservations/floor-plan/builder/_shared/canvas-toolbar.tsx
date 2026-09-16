// Undo · Redo · Grid · Snap · Show Labels (or Show Dimensions), as the builder
// frames lay them out, plus a zoom cluster at the far end.
import type { ReactNode } from "react";
import { Grid3x3, Maximize, Minus, Plus, Redo2, Undo2 } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { Dropdown } from "../../_shared/dropdown";
import { SwitchField } from "../../_shared/switch";

export interface ViewOptions {
  showGrid: boolean;
  gridStep: 0.5 | 1;
  snap: boolean;
  showLabels: boolean;
  showDimensions: boolean;
}

export const DEFAULT_VIEW: ViewOptions = { showGrid: true, gridStep: 0.5, snap: true, showLabels: true, showDimensions: false };

function ToolbarButton({ onClick, disabled, icon, label, title }: { onClick: () => void; disabled?: boolean; icon: ReactNode; label: string; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-colors",
        disabled
          ? "cursor-not-allowed border-transparent bg-[var(--octo-seg-bg)] text-[var(--octo-text-muted)]"
          : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ToggleChip({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <div className="flex h-8 items-center rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2.5">
      <SwitchField checked={checked} onChange={onChange} label={label} size="sm" />
    </div>
  );
}

/** Zoom out / percent / zoom in / fit — its own component so a page that
 *  moved the rest of this bar's controls elsewhere can still show just this. */
export function ZoomControls({
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onFit,
  className,
}: {
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={clsx("flex h-8 items-center rounded-lg border border-[var(--octo-border-input)] bg-[var(--octo-card)]", className)}>
      <button type="button" onClick={onZoomOut} aria-label={t("floorPlan.toolbar.zoomOut")} className="grid h-full w-7 place-items-center text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]">
        <Minus size={14} />
      </button>
      <span className="min-w-[40px] text-center text-[12px] font-semibold tabular-nums text-[var(--octo-text-primary)]">{zoomPercent}%</span>
      <button type="button" onClick={onZoomIn} aria-label={t("floorPlan.toolbar.zoomIn")} className="grid h-full w-7 place-items-center text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]">
        <Plus size={14} />
      </button>
      <span className="h-5 w-px bg-[var(--octo-border-input)]" />
      <button type="button" onClick={onFit} title={t("floorPlan.toolbar.fit")} aria-label={t("floorPlan.toolbar.fit")} className="grid h-full w-7 place-items-center text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]">
        <Maximize size={13} />
      </button>
    </div>
  );
}

export function CanvasToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  view,
  onViewChange,
  secondToggle,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onFit,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  view: ViewOptions;
  onViewChange: (view: ViewOptions) => void;
  secondToggle: "labels" | "dimensions";
  zoomPercent: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}) {
  const { t } = useI18n();
  const set = (patch: Partial<ViewOptions>) => onViewChange({ ...view, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ToolbarButton onClick={onUndo} disabled={!canUndo} icon={<Undo2 size={15} />} label={t("floorPlan.toolbar.undo")} title="Ctrl + Z" />
      <ToolbarButton onClick={onRedo} disabled={!canRedo} icon={<Redo2 size={15} />} label={t("floorPlan.toolbar.redo")} title="Ctrl + Shift + Z" />
      <Dropdown label={t("floorPlan.toolbar.grid")} align="start" buttonClassName="!h-8 !min-w-0 !rounded-lg !px-2.5 !text-[13px] font-medium" panelClassName="w-[250px] p-3">
        {() => (
          <div className="flex flex-col gap-3">
            <SwitchField checked={view.showGrid} onChange={(showGrid) => set({ showGrid })} label={t("floorPlan.toolbar.showGrid")} size="sm" />
            <div>
              <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                <Grid3x3 size={13} /> {t("floorPlan.toolbar.gridSize")}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-1.5 rounded-[10px] bg-[var(--octo-seg-bg)] p-1" role="radiogroup">
                {([0.5, 1] as const).map((step) => (
                  <button
                    key={step}
                    type="button"
                    role="radio"
                    aria-checked={view.gridStep === step}
                    onClick={() => set({ gridStep: step })}
                    className={clsx(
                      "rounded-lg px-2 py-1.5 text-[12.5px] font-medium transition-colors",
                      view.gridStep === step ? "bg-[var(--octo-card)] text-[#0D6EFD] shadow-sm" : "text-[var(--octo-text-secondary)]"
                    )}
                  >
                    {step === 0.5 ? t("floorPlan.toolbar.gridFine") : t("floorPlan.toolbar.gridStandard")}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11.5px] text-[var(--octo-text-muted)]">{t("floorPlan.toolbar.gridHint")}</p>
            </div>
          </div>
        )}
      </Dropdown>
      <ToggleChip checked={view.snap} onChange={(snap) => set({ snap })} label={t("floorPlan.toolbar.snap")} />
      {secondToggle === "labels" ? (
        <ToggleChip checked={view.showLabels} onChange={(showLabels) => set({ showLabels })} label={t("floorPlan.toolbar.showLabels")} />
      ) : (
        <ToggleChip checked={view.showDimensions} onChange={(showDimensions) => set({ showDimensions })} label={t("floorPlan.toolbar.showDimensions")} />
      )}

      <ZoomControls className="ms-auto" zoomPercent={zoomPercent} onZoomIn={onZoomIn} onZoomOut={onZoomOut} onFit={onFit} />
    </div>
  );
}
