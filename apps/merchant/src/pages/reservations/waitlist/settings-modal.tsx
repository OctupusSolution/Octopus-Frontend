// Waiting List settings (GET/PUT /settings) and source catalog
// (GET/PUT /settings/sources). PUT /settings replaces the whole row, so the
// full document fetched from the server stays in state and fields without a
// control here (per-area service minutes, removal reason codes) go back
// exactly as they came down. `expectedVersion` is required by the backend.
// PUT /settings/sources is an upsert: only sources whose toggle changed are sent.
import { useEffect, useState } from "react";
import {
  getWaitingListSettings,
  getWaitingSources,
  updateWaitingListSettings,
  updateWaitingSources,
  type WaitingListSettingsResponse,
  type WaitingSourceResponse,
} from "@octopus/api-client";
import { Button, Modal } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useWaitlistExtraText } from "./_shared/extra-text";
import { describeWaitlistError } from "./_shared/waitlist-api";

const inputClass =
  "h-10 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 text-[13.5px] text-[var(--octo-text-primary)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25";
const labelClass = "text-[12.5px] font-medium text-[var(--octo-text-primary)]";

type NumericField = "noShowGraceMinutes" | "defaultServiceMinutes" | "estimateSampleThreshold" | "minAttendees" | "maxAttendees";

// Platform ceilings (PlatformDefaults.cs); the server refuses beyond them rather than clamping.
const LIMITS: Record<NumericField, { min: number; max: number }> = {
  noShowGraceMinutes: { min: 0, max: 240 },
  defaultServiceMinutes: { min: 1, max: 1440 },
  estimateSampleThreshold: { min: 1, max: 1000 },
  minAttendees: { min: 1, max: 500 },
  maxAttendees: { min: 1, max: 500 },
};

export function WaitlistSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const text = useWaitlistExtraText();
  const { activeBusinessId } = useAuth();
  const [settings, setSettings] = useState<WaitingListSettingsResponse | null>(null);
  const [sources, setSources] = useState<WaitingSourceResponse[] | null>(null);
  const [initialSources, setInitialSources] = useState<WaitingSourceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !activeBusinessId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSettings(null);
    Promise.all([getWaitingListSettings(activeBusinessId), getWaitingSources(activeBusinessId)])
      .then(([s, src]) => {
        if (cancelled) return;
        const sorted = [...src].sort((a, b) => a.sortOrder - b.sortOrder);
        setSettings(s);
        setSources(sorted);
        setInitialSources(sorted);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(`${text.loadFailed} ${describeWaitlistError(err)}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, activeBusinessId, text.loadFailed]);

  function patchNum(key: NumericField, value: string) {
    const { min, max } = LIMITS[key];
    setSettings((prev) => (prev ? { ...prev, [key]: Math.min(max, Math.max(min, Math.round(Number(value) || 0))) } : prev));
  }

  function toggleSource(code: string) {
    setSources((prev) => (prev ? prev.map((s) => (s.code === code ? { ...s, isEnabled: !s.isEnabled } : s)) : prev));
  }

  async function save() {
    if (!activeBusinessId || !settings) return;
    setSaving(true);
    setError(null);
    try {
      const { version, ...rest } = settings;
      const saved = await updateWaitingListSettings(activeBusinessId, { ...rest, expectedVersion: version });
      setSettings(saved);
      const changed = (sources ?? []).filter((s) => initialSources.find((i) => i.code === s.code)?.isEnabled !== s.isEnabled);
      if (changed.length > 0) {
        const next = await updateWaitingSources(activeBusinessId, {
          sources: changed.map((s) => ({ code: s.code, displayName: s.displayName, isEnabled: s.isEnabled, sortOrder: s.sortOrder })),
        });
        const sorted = [...next].sort((a, b) => a.sortOrder - b.sortOrder);
        setSources(sorted);
        setInitialSources(sorted);
      }
      onClose();
    } catch (err) {
      setError(describeWaitlistError(err));
    } finally {
      setSaving(false);
    }
  }

  const num = (key: NumericField, label: string) =>
    settings && (
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{label}</span>
        <input
          type="number"
          min={LIMITS[key].min}
          max={LIMITS[key].max}
          value={settings[key]}
          onChange={(e) => patchNum(key, e.target.value)}
          className={inputClass}
        />
      </label>
    );

  const check = (key: "noShowAuto" | "requireRemoveReason", label: string) =>
    settings && (
      <label className="flex items-center gap-2 text-[13.5px] text-[var(--octo-text-primary)]">
        <input type="checkbox" checked={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })} />
        {label}
      </label>
    );

  const invalidRange = settings !== null && settings.minAttendees > settings.maxAttendees;

  return (
    <Modal open={open} onClose={onClose} title={text.settings} className="max-w-2xl">
      {loading ? (
        <p className="py-6 text-center text-[13px] text-[var(--octo-text-secondary)]">{text.loading}</p>
      ) : !settings ? (
        <p role="alert" className="rounded-[9px] bg-error/10 px-3 py-2 text-[13px] text-error">
          {error ?? text.loadFailed}
        </p>
      ) : (
        <div className="octo-scroll max-h-[65vh] overflow-y-auto pe-1">
          {error && <p role="alert" className="mb-3 rounded-[9px] bg-error/10 px-3 py-2 text-[13px] text-error">{error}</p>}

          <h3 className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{text.queueRules}</h3>
          <div className="mt-3 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            {num("noShowGraceMinutes", text.noShowGrace)}
            {num("defaultServiceMinutes", text.defaultService)}
            {num("estimateSampleThreshold", text.sampleThreshold)}
            {num("minAttendees", text.minAttendees)}
            {num("maxAttendees", text.maxAttendees)}
            <label className="flex flex-col gap-1.5">
              <span className={labelClass}>{text.timeZone}</span>
              <input
                type="text"
                dir="ltr"
                value={settings.timeZoneId}
                onChange={(e) => setSettings({ ...settings, timeZoneId: e.target.value })}
                className={inputClass}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            {check("noShowAuto", text.noShowAuto)}
            {check("requireRemoveReason", text.requireReason)}
          </div>

          {sources && sources.length > 0 && (
            <>
              <h3 className="mt-5 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{text.sources}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {sources.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    aria-pressed={s.isEnabled}
                    onClick={() => toggleSource(s.code)}
                    className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                      s.isEnabled
                        ? "border-[#0D6EFD] bg-[#0D6EFD]/10 text-[#0D6EFD]"
                        : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)]"
                    }`}
                  >
                    {s.displayName}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {text.cancel}
        </Button>
        <Button
          variant="primary"
          onClick={() => void save()}
          disabled={loading || saving || !settings || invalidRange || !settings.timeZoneId.trim()}
        >
          {saving ? text.saving : text.save}
        </Button>
      </div>
    </Modal>
  );
}
