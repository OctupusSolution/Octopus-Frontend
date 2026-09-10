// The four numbered blocks of the frame's Schedule Menu modal. Edits are held
// locally and only committed on Save, so closing without saving changes
// nothing. The channel toggles here set the menu's channel visibility; the
// menu's own status is not touched — a scheduled menu can still be POS-only.
import { useEffect, useState } from "react";
import { Modal, Button, Select, Checkbox } from "@ui/primitives";
import {
  WEEKDAYS,
  SEED_BRANCHES,
  channelStateFor,
  fallbackCandidates,
  type Menu,
  type MenuSchedule,
  type Weekday,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

const TYPES: MenuSchedule["type"][] = ["all-day", "breakfast", "lunch", "dinner", "custom"];

export function ScheduleModal({
  menu,
  menus,
  onClose,
  onSave,
}: {
  menu: Menu | null;
  menus: Menu[];
  onClose: () => void;
  onSave: (schedule: MenuSchedule, channels: Menu["channels"]) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<MenuSchedule | null>(null);
  const [channels, setChannels] = useState<Menu["channels"] | null>(null);

  // Re-seed whenever a different menu opens the modal, so yesterday's edits
  // never leak into today's menu.
  useEffect(() => {
    setDraft(menu ? { ...menu.schedule, days: [...menu.schedule.days] } : null);
    setChannels(menu ? { ...menu.channels } : null);
  }, [menu]);

  if (!menu || !draft || !channels) return null;

  function patch(next: Partial<MenuSchedule>) {
    setDraft((current) => (current ? { ...current, ...next } : current));
  }

  function toggleDay(day: Weekday) {
    patch({
      days: draft!.days.includes(day)
        ? draft!.days.filter((d) => d !== day)
        : [...draft!.days, day],
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t("menuLib.sched.title")}
      footer={
        <Button className="w-full" onClick={() => onSave(draft, channels)}>
          {t("menuLib.sched.save")}
        </Button>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuLib.sched.availability")}
          </h3>
          <p className="mt-1 text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuLib.sched.chooseType")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => patch({ type })}
                className={`rounded-[8px] border px-3 py-1.5 text-[14px] ${
                  draft.type === type
                    ? "border-[var(--octo-accent)] text-[var(--octo-accent)]"
                    : "border-[var(--octo-border-card)] text-[var(--octo-text-primary)]"
                }`}
              >
                {t(`menuLib.scheduleType.${type}`)}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuLib.sched.window")}
          </h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className="text-[13px] text-[var(--octo-text-secondary)]">
              {t("menuLib.sched.startTime")}
              <input
                type="time"
                value={draft.start}
                onChange={(e) => patch({ start: e.target.value })}
                className="mt-1 w-full rounded-[9px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2 text-[14px] text-[var(--octo-text-primary)]"
              />
            </label>
            <label className="text-[13px] text-[var(--octo-text-secondary)]">
              {t("menuLib.sched.endTime")}
              <input
                type="time"
                value={draft.end}
                onChange={(e) => patch({ end: e.target.value })}
                className="mt-1 w-full rounded-[9px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2 text-[14px] text-[var(--octo-text-primary)]"
              />
            </label>
          </div>

          <p className="mt-3 text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuLib.sched.applyTo")}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={draft.days.includes(day)}
                onClick={() => toggleDay(day)}
                className={`rounded-full px-3 py-1 text-[13px] ${
                  draft.days.includes(day)
                    ? "bg-[var(--octo-accent)] text-white"
                    : "border border-[var(--octo-border-card)] text-[var(--octo-text-secondary)]"
                }`}
              >
                {t(`menuLib.day.${day}`)}
              </button>
            ))}
          </div>

          <label className="mt-3 block text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuLib.sched.timezone")}
            <Select
              className="mt-1"
              value={draft.timezone}
              onChange={(e) => patch({ timezone: e.target.value })}
            >
              <option value="Asia/Riyadh">(GMT+ 03:00) Asia/Riyadh</option>
            </Select>
          </label>

          <label className="mt-3 block text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuLib.sched.branches")}
            <Select
              className="mt-1"
              value={draft.branchIds[0] ?? ""}
              onChange={(e) => patch({ branchIds: [e.target.value] })}
            >
              {SEED_BRANCHES.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.label}</option>
              ))}
            </Select>
          </label>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuLib.sched.channels")}
          </h3>
          <div className="mt-2 divide-y divide-[var(--octo-border-card)]">
            {(["pos", "publicLink", "tableQr"] as const).map((channel) => {
              const on = channels[channel] !== "off";
              return (
                <div key={channel} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">
                      {t(`menuLib.channel.${channel}`)}
                    </p>
                    <p className="text-[13px] text-[var(--octo-text-secondary)]">
                      {t(`menuLib.sched.${channel}Hint`)}
                    </p>
                  </div>
                  {/* Switching a channel off is not the same as holding the
                      menu: the menu stays active everywhere else, so the
                      toggle writes the channel and never the status. */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on}
                    aria-label={t(`menuLib.channel.${channel}`)}
                    onClick={() =>
                      setChannels((prev) =>
                        prev
                          ? { ...prev, [channel]: on ? "off" : channelStateFor(menu.status) }
                          : prev
                      )
                    }
                    className={`mt-0.5 h-[22px] w-[40px] shrink-0 rounded-full p-[2px] transition-colors ${
                      on ? "bg-[var(--octo-accent)]" : "bg-[var(--octo-switch-off)]"
                    }`}
                  >
                    <span
                      className={`block h-[18px] w-[18px] rounded-full bg-[var(--octo-knob)] transition-transform ${
                        on ? "translate-x-[18px] rtl:-translate-x-[18px]" : ""
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h3 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuLib.sched.additional")}
          </h3>
          <label className="mt-2 block text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuLib.sched.fallback")}{" "}
            <span className="text-[var(--octo-text-secondary)]">({t("menuLib.sched.fallbackHint")})</span>
            <Select
              className="mt-1"
              value={draft.fallbackMenuId ?? ""}
              onChange={(e) => patch({ fallbackMenuId: e.target.value || null })}
            >
              <option value="">{t("menuLib.sched.fallbackNone")}</option>
              {/* A menu cannot fall back to itself. */}
              {fallbackCandidates(menus, menu.id).map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
              ))}
            </Select>
          </label>

          <Checkbox
            className="mt-3"
            checked={draft.allowPreorderOutsideSchedule}
            onChange={(e) => patch({ allowPreorderOutsideSchedule: e.target.checked })}
            label={t("menuLib.sched.preorder")}
          />
        </section>
      </div>
    </Modal>
  );
}
