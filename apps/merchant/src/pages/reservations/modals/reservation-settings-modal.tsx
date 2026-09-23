// Reservation module settings: BACKEND_GAPS — updateReservationSettings /
// getReservationChannels / updateReservationChannels were ready and unused,
// and there was no settings screen at all. `UpdateReservationSettingsRequest`
// is (almost) the whole settings document, not a partial patch, so this keeps
// the full object fetched from the server in state and only ever touches the
// handful of fields the form exposes — sending everything else back exactly
// as it came down, rather than risk dropping refund bands, message
// templates or the timezone the form has no field for. Weekly booking
// windows and closure dates need a calendar picker the frames don't specify,
// so those stay out of this pass too, same reasoning.
import { useEffect, useState } from "react";
import {
  getReservationChannels,
  getReservationSettings,
  updateReservationChannels,
  updateReservationSettings,
  type ReservationChannelResponse,
  type ReservationDepositKind,
  type ReservationSettingsResponse,
} from "@octopus/api-client";
import { Button, Modal } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";

const inputClass =
  "h-10 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 text-[13.5px] text-[var(--octo-text-primary)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25";
const labelClass = "text-[12.5px] font-medium text-[var(--octo-text-primary)]";

type EditableField =
  | "maxAdvanceDays"
  | "minNoticeMinutes"
  | "defaultDurationMinutes"
  | "gapMinutes"
  | "slotGranularityMinutes"
  | "minAttendees"
  | "maxAttendees"
  | "maxConcurrentGroupHolds"
  | "depositAmount";

export function ReservationSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { activeBusinessId } = useAuth();
  const [settings, setSettings] = useState<ReservationSettingsResponse | null>(null);
  const [channels, setChannels] = useState<ReservationChannelResponse[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !activeBusinessId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getReservationSettings(activeBusinessId), getReservationChannels(activeBusinessId)])
      .then(([s, ch]) => {
        if (cancelled) return;
        setSettings(s);
        setChannels(ch);
      })
      .catch(() => {
        if (!cancelled) setError(t("reservations.settings.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, activeBusinessId, t]);

  function patchNum(key: EditableField, min: number, value: string) {
    setSettings((prev) => (prev ? { ...prev, [key]: Math.max(min, Number(value) || 0) } : prev));
  }

  function toggleChannel(code: string) {
    setChannels((prev) => (prev ? prev.map((c) => (c.code === code ? { ...c, isEnabled: !c.isEnabled } : c)) : prev));
  }

  async function save() {
    if (!activeBusinessId || !settings) return;
    setSaving(true);
    setError(null);
    try {
      const { overriddenFields: _overriddenFields, ...request } = settings;
      await updateReservationSettings(activeBusinessId, request);
      if (channels) {
        await updateReservationChannels(
          activeBusinessId,
          channels.map((c) => ({ code: c.code, displayName: c.displayName, isEnabled: c.isEnabled, sortOrder: c.sortOrder }))
        );
      }
      onClose();
    } catch {
      setError(t("reservations.settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const num = (key: EditableField, label: string, min = 0) =>
    settings && (
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>{label}</span>
        <input
          type="number"
          min={min}
          value={settings[key] as number}
          onChange={(e) => patchNum(key, min, e.target.value)}
          className={inputClass}
        />
      </label>
    );

  return (
    <Modal open={open} onClose={onClose} title={t("reservations.settings.title")} className="max-w-2xl">
      {loading || !settings ? (
        <p className="py-6 text-center text-[13px] text-[var(--octo-text-secondary)]">{t("reservations.settings.loading")}</p>
      ) : (
        <div className="octo-scroll max-h-[65vh] overflow-y-auto pe-1">
          {error && <p role="alert" className="mb-3 rounded-[9px] bg-error/10 px-3 py-2 text-[13px] text-error">{error}</p>}

          <h3 className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{t("reservations.settings.general")}</h3>
          <div className="mt-3 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
            {num("maxAdvanceDays", t("reservations.settings.maxAdvanceDays"), 1)}
            {num("minNoticeMinutes", t("reservations.settings.minNoticeMinutes"))}
            {num("defaultDurationMinutes", t("reservations.settings.defaultDurationMinutes"), 15)}
            {num("gapMinutes", t("reservations.settings.gapMinutes"))}
            {num("slotGranularityMinutes", t("reservations.settings.slotGranularityMinutes"), 5)}
            {num("maxConcurrentGroupHolds", t("reservations.settings.maxConcurrentGroupHolds"), 1)}
            {num("minAttendees", t("reservations.settings.minAttendees"), 1)}
            {num("maxAttendees", t("reservations.settings.maxAttendees"), 1)}
          </div>

          <h3 className="mt-5 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{t("reservations.settings.deposits")}</h3>
          <div className="mt-3 flex flex-wrap items-end gap-3.5">
            <label className="flex items-center gap-2 text-[13.5px] text-[var(--octo-text-primary)]">
              <input
                type="checkbox"
                checked={settings.depositsEnabled}
                onChange={(e) => setSettings({ ...settings, depositsEnabled: e.target.checked })}
              />
              {t("reservations.settings.depositsEnabled")}
            </label>
            {settings.depositsEnabled && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className={labelClass}>{t("reservations.settings.depositKind")}</span>
                  <select
                    value={settings.depositKind}
                    onChange={(e) => setSettings({ ...settings, depositKind: e.target.value as ReservationDepositKind })}
                    className={inputClass}
                  >
                    <option value="FixedPerReservation">{t("reservations.settings.depositKind.fixed")}</option>
                    <option value="PerAttendee">{t("reservations.settings.depositKind.perAttendee")}</option>
                  </select>
                </label>
                {num("depositAmount", t("reservations.settings.depositAmount"))}
              </>
            )}
          </div>

          {channels && channels.length > 0 && (
            <>
              <h3 className="mt-5 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">{t("reservations.settings.channels")}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {channels.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    aria-pressed={c.isEnabled}
                    onClick={() => toggleChannel(c.code)}
                    className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                      c.isEnabled
                        ? "border-[#0D6EFD] bg-[#0D6EFD]/10 text-[#0D6EFD]"
                        : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)]"
                    }`}
                  >
                    {c.displayName}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          {t("reservations.settings.cancel")}
        </Button>
        <Button variant="primary" onClick={() => void save()} disabled={loading || saving || !settings}>
          {saving ? t("reservations.settings.saving") : t("reservations.settings.save")}
        </Button>
      </div>
    </Modal>
  );
}
