// Business-wide floor plan settings: named table sizes per shape, the drawing
// layers new scenes start with, and the plan limits (capped by the platform's
// own maximums). Each tab saves on its own and carries the settings version,
// so two managers saving at once get a conflict instead of a silent overwrite.
import { useEffect, useState } from "react";
import { Plus, RotateCcw, Settings2, Trash2, X } from "lucide-react";
import clsx from "clsx";
import {
  getFloorPlanSettings,
  resetFloorPlanSettings,
  updateFloorPlanLimits,
  updateFloorPlanSceneLayers,
  updateFloorPlanSizePresets,
  type FloorPlanSceneLayerSettingDto,
  type FloorPlanSettingsLimitsDto,
  type FloorPlanSettingsResponse,
  type FloorPlanSizePresetDto,
} from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useAdminText, type AdminTextKey } from "./admin-text";
import { errorText } from "./api-error";
import { ConfirmModal } from "./confirm-modal";
import { SwitchField } from "./switch";

type Tab = "sizes" | "layers" | "limits";

const LIMIT_KEYS: (keyof FloorPlanSettingsLimitsDto)[] = [
  "capacityCeiling",
  "maxSpotsPerPlan",
  "maxZonesPerPlan",
  "maxPlansPerBusiness",
  "maxSpotsPerGridAction",
  "editLockMinutes",
  "cleaningMinutes",
  "reservedHoldMinutes",
  "minAisleMeters",
];

const INPUT =
  "h-10 w-full rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 text-[13.5px] text-[var(--octo-text-primary)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/20";

function NumberInput({ value, onChange, step = 1, label }: { value: number; onChange: (value: number) => void; step?: number; label: string }) {
  const [text, setText] = useState<string | null>(null);
  return (
    <input
      aria-label={label}
      inputMode="decimal"
      dir="ltr"
      value={text ?? String(value)}
      onChange={(event) => setText(event.target.value)}
      onBlur={() => {
        if (text === null) return;
        const n = Number(text.replace(",", "."));
        setText(null);
        if (Number.isFinite(n) && n >= 0) onChange(step >= 1 ? Math.round(n) : Math.round(n * 100) / 100);
      }}
      className={clsx(INPUT, "tabular-nums")}
    />
  );
}

export function FloorPlanSettingsModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (message: string) => void }) {
  const t = useAdminText();
  const { activeBusinessId } = useAuth();
  const [tab, setTab] = useState<Tab>("sizes");
  const [settings, setSettings] = useState<FloorPlanSettingsResponse | null>(null);
  const [presets, setPresets] = useState<FloorPlanSizePresetDto[]>([]);
  const [layers, setLayers] = useState<FloorPlanSceneLayerSettingDto[]>([]);
  const [limits, setLimits] = useState<FloorPlanSettingsLimitsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  function load(next: FloorPlanSettingsResponse) {
    setSettings(next);
    setPresets(next.sizePresets.map((p) => ({ ...p })));
    setLayers(next.sceneLayers.map((l) => ({ ...l })));
    setLimits({ ...next.limits });
  }

  useEffect(() => {
    if (!open || !activeBusinessId) return;
    let cancelled = false;
    setError(null);
    setSettings(null);
    getFloorPlanSettings(activeBusinessId)
      .then((s) => {
        if (!cancelled) load(s);
      })
      .catch((err) => {
        if (!cancelled) setError(errorText(err, t) || t("settings.loadFailed"));
      });
    return () => {
      cancelled = true;
    };
  }, [open, activeBusinessId, t]);

  async function run(job: (businessId: string, version: number) => Promise<FloorPlanSettingsResponse>, message: string) {
    if (!activeBusinessId || !settings) return;
    setBusy(true);
    setError(null);
    try {
      load(await job(activeBusinessId, settings.version));
      onSaved(message);
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (tab === "sizes") {
      const clean = presets.filter((p) => p.shapeCode && p.presetCode.trim() && p.width > 0 && p.height > 0).map((p) => ({ ...p, presetCode: p.presetCode.trim().toLowerCase() }));
      void run((b, expectedVersion) => updateFloorPlanSizePresets(b, { presets: clean, expectedVersion }), t("settings.saved"));
    } else if (tab === "layers") {
      void run((b, expectedVersion) => updateFloorPlanSceneLayers(b, { layers, expectedVersion }), t("settings.saved"));
    } else if (limits) {
      void run((b, expectedVersion) => updateFloorPlanLimits(b, { limits, expectedVersion }), t("settings.saved"));
    }
  }

  const shapes = settings?.shapes.filter((s) => s.isEnabled) ?? [];
  const max = settings?.platformMaximums;

  return (
    <>
      <Modal open={open && !confirmReset} onClose={onClose} className="flex max-h-[90vh] max-w-[680px] flex-col p-0">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--octo-border-card)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Settings2 size={20} className="text-[var(--octo-text-secondary)]" />
            <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">{t("settings.title")}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")} className="-me-1 grid h-8 w-8 place-items-center rounded-lg text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pt-4">
          <div className="grid grid-cols-3 gap-1.5 rounded-[10px] bg-[var(--octo-seg-bg)] p-1" role="tablist">
            {(["sizes", "layers", "limits"] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={clsx(
                  "rounded-lg px-2 py-1.5 text-[13px] font-medium transition-colors",
                  tab === id ? "bg-[var(--octo-card)] text-[#0D6EFD] shadow-sm" : "text-[var(--octo-text-secondary)]"
                )}
              >
                {t(`settings.tab.${id}` as AdminTextKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="octo-scroll min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {error && (
            <p role="alert" className="mb-3 rounded-[9px] bg-error/10 px-3 py-2 text-[12.5px] text-error">
              {error}
            </p>
          )}
          {!settings ? (
            !error && <p className="py-8 text-center text-[13px] text-[var(--octo-text-muted)]">{t("common.loading")}</p>
          ) : tab === "sizes" ? (
            <div className="flex flex-col gap-2">
              <div className="hidden grid-cols-[1.3fr_1fr_0.8fr_0.8fr_40px] gap-2 px-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)] sm:grid">
                <span>{t("settings.shape")}</span>
                <span>{t("settings.preset")}</span>
                <span>{t("settings.width")}</span>
                <span>{t("settings.height")}</span>
                <span />
              </div>
              {presets.map((preset, index) => {
                const patch = (next: Partial<FloorPlanSizePresetDto>) => setPresets((list) => list.map((p, i) => (i === index ? { ...p, ...next } : p)));
                return (
                  <div key={index} className="grid grid-cols-2 gap-2 rounded-[10px] border border-[var(--octo-border-card)] p-2 sm:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_40px] sm:border-0 sm:p-0">
                    <select aria-label={t("settings.shape")} value={preset.shapeCode} onChange={(event) => patch({ shapeCode: event.target.value })} className={INPUT}>
                      {!shapes.some((s) => s.code === preset.shapeCode) && <option value={preset.shapeCode}>{preset.shapeCode}</option>}
                      {shapes.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <input aria-label={t("settings.preset")} value={preset.presetCode} maxLength={32} onChange={(event) => patch({ presetCode: event.target.value })} className={INPUT} />
                    <NumberInput label={t("settings.width")} step={0.01} value={preset.width} onChange={(width) => patch({ width })} />
                    <NumberInput label={t("settings.height")} step={0.01} value={preset.height} onChange={(height) => patch({ height })} />
                    <button
                      type="button"
                      aria-label={t("settings.remove")}
                      title={t("settings.remove")}
                      onClick={() => setPresets((list) => list.filter((_, i) => i !== index))}
                      className="grid h-10 w-10 place-items-center rounded-[10px] text-[#DC2626] hover:bg-[#FEE2E2]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setPresets((list) => [...list, { shapeCode: shapes[0]?.code ?? "square", presetCode: "", width: 1, height: 1 }])}
                className="mt-1 flex h-10 items-center justify-center gap-2 rounded-[10px] border border-dashed border-[var(--octo-border-input)] text-[13px] font-medium text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
              >
                <Plus size={15} />
                {t("settings.addPreset")}
              </button>
            </div>
          ) : tab === "layers" ? (
            <ul className="flex flex-col gap-2">
              {layers.map((layer, index) => {
                const patch = (next: Partial<FloorPlanSceneLayerSettingDto>) => setLayers((list) => list.map((l, i) => (i === index ? { ...l, ...next } : l)));
                return (
                  <li key={layer.code} className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--octo-border-card)] p-3 sm:flex-row sm:items-center">
                    <span className="w-24 shrink-0 truncate font-mono text-[12px] text-[var(--octo-text-muted)]" dir="ltr">
                      {layer.code}
                    </span>
                    <input aria-label={t("settings.layerLabel")} value={layer.label} maxLength={40} onChange={(event) => patch({ label: event.target.value })} className={clsx(INPUT, "sm:flex-1")} />
                    <div className="flex gap-4">
                      <SwitchField size="sm" checked={layer.defaultVisible} onChange={(defaultVisible) => patch({ defaultVisible })} label={t("settings.visible")} />
                      <SwitchField size="sm" checked={layer.defaultLocked} onChange={(defaultLocked) => patch({ defaultLocked })} label={t("settings.locked")} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            limits && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {LIMIT_KEYS.map((k) => (
                  <label key={k} className="flex flex-col gap-1.5">
                    <span className="flex items-baseline justify-between gap-2 text-[12.5px] font-medium text-[var(--octo-text-secondary)]">
                      {t(`limits.${k}` as AdminTextKey)}
                      {max && <span className="text-[11px] font-normal text-[var(--octo-text-faint)]">{t("settings.max", { n: max[k] })}</span>}
                    </span>
                    <NumberInput
                      label={t(`limits.${k}` as AdminTextKey)}
                      step={k === "minAisleMeters" ? 0.01 : 1}
                      value={limits[k]}
                      onChange={(value) => setLimits({ ...limits, [k]: max ? Math.min(max[k], value) : value })}
                    />
                  </label>
                ))}
              </div>
            )
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--octo-border-card)] px-6 py-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            disabled={!settings || busy}
            onClick={() => setConfirmReset(true)}
            className="flex h-10 items-center justify-center gap-2 rounded-[9px] px-3 text-[13px] font-medium text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-50"
          >
            <RotateCcw size={15} />
            {t("settings.reset")}
          </button>
          <button
            type="button"
            disabled={!settings || busy}
            onClick={save}
            className="h-10 rounded-[9px] bg-[#0D6EFD] px-5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? t("common.saving") : t("settings.save")}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        open={open && confirmReset}
        onClose={() => setConfirmReset(false)}
        tone="danger"
        icon={<RotateCcw size={20} />}
        title={t("settings.resetTitle")}
        body={t("settings.resetBody")}
        actions={[
          { label: t("common.cancel"), variant: "secondary", onClick: () => setConfirmReset(false) },
          {
            label: t("settings.reset"),
            variant: "danger",
            onClick: () => {
              setConfirmReset(false);
              void run((b, expectedVersion) => resetFloorPlanSettings(b, { expectedVersion }), t("settings.resetDone"));
            },
          },
        ]}
      />
    </>
  );
}
