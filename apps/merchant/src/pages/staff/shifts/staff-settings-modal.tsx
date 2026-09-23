// Staff module settings: BACKEND_GAPS — getStaffSettings/updateStaffSettings
// were ready and unused, and there was no screen to attach them to. Two
// fields only, so a small modal off the schedule header covers it rather
// than a whole new settings page.
import { useEffect, useState } from "react";
import { getStaffSettings, updateStaffSettings, type StaffWeekDay } from "@octopus/api-client";
import { Modal } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "../_shared/buttons";
import { Field, SelectInput } from "../_shared/form";

const WEEK_DAYS: readonly StaffWeekDay[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function StaffSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const { activeBusinessId } = useAuth();
  const [weekStartDay, setWeekStartDay] = useState<StaffWeekDay>("Sunday");
  const [invitationTtlDays, setInvitationTtlDays] = useState(7);
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !activeBusinessId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getStaffSettings(activeBusinessId)
      .then((res) => {
        if (cancelled) return;
        setWeekStartDay(res.weekStartDay);
        setInvitationTtlDays(res.invitationTtlDays);
        setVersion(res.version);
      })
      .catch(() => {
        if (!cancelled) setError(t("staff.settings.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, activeBusinessId, t]);

  async function save() {
    if (!activeBusinessId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateStaffSettings(activeBusinessId, { weekStartDay, invitationTtlDays, expectedVersion: version });
      setVersion(res.version);
      onClose();
    } catch {
      setError(t("staff.settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={t("staff.settings.title")} className="max-w-md">
      {loading ? (
        <p className="py-6 text-center text-[13px] text-[var(--octo-text-secondary)]">{t("staff.settings.loading")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {error && <p role="alert" className="rounded-[9px] bg-error/10 px-3 py-2 text-[13px] text-error">{error}</p>}
          <Field label={t("staff.settings.weekStartDay")} htmlFor="staff-week-start">
            <SelectInput id="staff-week-start" value={weekStartDay} onChange={(e) => setWeekStartDay(e.target.value as StaffWeekDay)}>
              {WEEK_DAYS.map((day) => (
                <option key={day} value={day}>
                  {t(`staff.settings.day.${day}`)}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label={t("staff.settings.invitationTtl")} htmlFor="staff-invite-ttl" hint={t("staff.settings.invitationTtlHint")}>
            <input
              id="staff-invite-ttl"
              type="number"
              min={1}
              max={90}
              value={invitationTtlDays}
              onChange={(e) => setInvitationTtlDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
              className="h-11 w-full rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3.5 text-[14px] text-[var(--octo-text-primary)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25"
            />
          </Field>
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={buttonClass("secondary")}>
          {t("staff.availability.close")}
        </button>
        <button type="button" onClick={() => void save()} disabled={loading || saving} className={buttonClass("primary")}>
          {saving ? t("staff.settings.saving") : t("staff.settings.save")}
        </button>
      </div>
    </Modal>
  );
}
