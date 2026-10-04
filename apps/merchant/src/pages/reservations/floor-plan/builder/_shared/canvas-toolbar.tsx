// Undo · Redo · Grid · Snap · Show Labels (or Show Dimensions), as the builder
// frames lay them out, plus a zoom cluster at the far end.
import { useCallback, useState, type ReactNode } from "react";
import { Grid3x3, Maximize, Minus, Plus } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { BORDER_200, BORDER_300, SURFACE_100, SURFACE_WHITE, TEXT_PRIMARY, TEXT_SEC_GRAY } from "../../../_shared/theme";
import { useDismiss } from "../../../_shared/use-dismiss";
import { Switch, SwitchField } from "../../_shared/switch";

export interface ViewOptions {
  showGrid: boolean;
  gridStep: 0.5 | 1;
  snap: boolean;
  showLabels: boolean;
  showDimensions: boolean;
}

export const DEFAULT_VIEW: ViewOptions = { showGrid: true, gridStep: 0.5, snap: true, showLabels: true, showDimensions: false };

const LABEL = "whitespace-nowrap text-[16px] font-medium leading-4";
const HOVER = "hover:bg-[#f8fafc] [[data-theme=dark]_&]:hover:bg-[var(--octo-hover)]";
const CHIP = clsx("flex h-[34px] shrink-0 items-center rounded-lg border px-2 transition-colors", BORDER_300, SURFACE_WHITE, TEXT_PRIMARY);

/** A bordered pill button of the toolbar row — exported so a page can add its
 *  own control (`extra`) that looks like the ones beside it. */
export function ToolbarButton({ onClick, disabled, icon, label, title }: { onClick: () => void; disabled?: boolean; icon?: ReactNode; label: string; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        "flex shrink-0 items-center gap-1 rounded-lg px-2 transition-colors",
        LABEL,
        disabled ? clsx("h-8 cursor-not-allowed", SURFACE_100, TEXT_SEC_GRAY) : clsx("h-[34px] border", BORDER_300, SURFACE_WHITE, TEXT_PRIMARY, HOVER)
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ToggleChip({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <div className={clsx(CHIP, "gap-1")}>
      <Switch checked={checked} onChange={onChange} label={label} size="sm" />
      <button type="button" tabIndex={-1} aria-hidden onClick={() => onChange(!checked)} className={LABEL}>
        {label}
      </button>
    </div>
  );
}

function GridMenu({ view, onChange }: { view: ViewOptions; onChange: (patch: Partial<ViewOptions>) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);

  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={clsx(CHIP, HOVER, LABEL, "gap-2")}>
        {t("floorPlan.toolbar.grid")}
        <ShellIcon name="fp-scratch-arrow-down.svg" size={24} className={clsx("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className={clsx("absolute start-0 top-full z-40 mt-1.5 w-[250px] rounded-xl border p-3 shadow-[0_12px_32px_rgba(15,23,42,0.14)]", BORDER_200, SURFACE_WHITE)}>
          <div className="flex flex-col gap-3">
            <SwitchField checked={view.showGrid} onChange={(showGrid) => onChange({ showGrid })} label={t("floorPlan.toolbar.showGrid")} size="sm" />
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
                    onClick={() => onChange({ gridStep: step })}
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
        </div>
      )}
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
  const button = clsx("grid h-full w-8 place-items-center", TEXT_PRIMARY);
  return (
    <div className={clsx("flex h-[34px] shrink-0 items-center rounded-lg border", BORDER_300, SURFACE_WHITE, className)}>
      <button type="button" onClick={onZoomOut} aria-label={t("floorPlan.toolbar.zoomOut")} className={button}>
        <Minus size={16} />
      </button>
      <span className={clsx("min-w-[46px] text-center text-[14px] font-medium leading-4 tabular-nums", TEXT_PRIMARY)}>{zoomPercent}%</span>
      <button type="button" onClick={onZoomIn} aria-label={t("floorPlan.toolbar.zoomIn")} className={button}>
        <Plus size={16} />
      </button>
      <span className="h-5 w-px bg-[#cbd5e1] [[data-theme=dark]_&]:bg-[var(--octo-border-input)]" />
      <button type="button" onClick={onFit} title={t("floorPlan.toolbar.fit")} aria-label={t("floorPlan.toolbar.fit")} className={button}>
        <Maximize size={15} />
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
  extra,
  className,
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
  /** Page-specific controls, shown after the toggles. */
  extra?: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();
  const set = (patch: Partial<ViewOptions>) => onViewChange({ ...view, ...patch });

  return (
    <div className={clsx("flex flex-wrap items-center gap-3 rounded-[24px] p-4", SURFACE_WHITE, className)}>
      <ToolbarButton onClick={onUndo} disabled={!canUndo} icon={<ShellIcon name="fp-scratch-undo.svg" size={24} />} label={t("floorPlan.toolbar.undo")} title="Ctrl + Z" />
      <ToolbarButton onClick={onRedo} disabled={!canRedo} icon={<ShellIcon name="fp-scratch-redo.svg" size={24} />} label={t("floorPlan.toolbar.redo")} title="Ctrl + Shift + Z" />
      <GridMenu view={view} onChange={set} />
      <ToggleChip checked={view.snap} onChange={(snap) => set({ snap })} label={t("floorPlan.toolbar.snap")} />
      {secondToggle === "labels" ? (
        <ToggleChip checked={view.showLabels} onChange={(showLabels) => set({ showLabels })} label={t("floorPlan.toolbar.showLabels")} />
      ) : (
        <ToggleChip checked={view.showDimensions} onChange={(showDimensions) => set({ showDimensions })} label={t("floorPlan.toolbar.showDimensions")} />
      )}
      {extra}

      <ZoomControls className="ms-auto" zoomPercent={zoomPercent} onZoomIn={onZoomIn} onZoomOut={onZoomOut} onFit={onFit} />
    </div>
  );
}
