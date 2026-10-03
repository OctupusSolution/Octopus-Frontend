// Staff module settings: BACKEND_GAPS — getStaffSettings/updateStaffSettings
// were ready and unused, and there was no screen to attach them to. Two
// fields only, so a small modal off the schedule header covers it rather
// than a whole new settings page.
import { useEffect, useState } from "react";
import { getStaffSettings, updateStaffSettings, type StaffWeekDay } from "@octopus/api-client";
import clsx from "clsx";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { Field, SelectInput, TextInput } from "../_shared/form";
import { StaffModal } from "../_shared/staff-modal";
import { FILL_RED, INK_MUTED, TEXT_RED } from "../_shared/theme";

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
    <StaffModal
      open={open}
      onClose={onClose}
      title={t("staff.settings.title")}
      submitLabel={saving ? t("staff.settings.saving") : t("staff.settings.save")}
      onSubmit={() => void save()}
      submitDisabled={loading || saving}
    >
      {loading ? (
        <p className={clsx("py-6 text-center text-[14px] font-medium leading-[14px]", INK_MUTED)}>{t("staff.settings.loading")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {error && (
            <p role="alert" className={clsx("rounded-[8px] px-3 py-2 text-[14px] font-medium leading-5", FILL_RED, TEXT_RED)}>
              {error}
            </p>
          )}
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
            <TextInput
              id="staff-invite-ttl"
              type="number"
              min={1}
              max={90}
              value={invitationTtlDays}
              onChange={(e) => setInvitationTtlDays(Math.max(1, Math.min(90, Number(e.target.value) || 1)))}
            />
          </Field>
        </div>
      )}
    </StaffModal>
  );
}
