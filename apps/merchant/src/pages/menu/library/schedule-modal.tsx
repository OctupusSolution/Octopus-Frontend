// The four numbered blocks of the frame's Schedule Menu modal (the numbers
// live in the i18n strings). Edits are held
// locally and only committed on Save, so closing without saving changes
// nothing. The channel toggles here set the menu's channel visibility; the
// menu's own status is not touched — a scheduled menu can still be POS-only.
import { useEffect, useState, type ReactNode } from "react";
import { Globe, MonitorSmartphone, QrCode, X } from "lucide-react";
import { Modal, Button, Select, Checkbox } from "@ui/primitives";
import {
  WEEKDAYS,
  SEED_BRANCHES,
  applyScheduleType,
  channelStateFor,
  fallbackCandidates,
  isServerId,
  setScheduleTime,
  useSchedulePresets,
  type Menu,
  type MenuSchedule,
  type Weekday,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { MenuCover, STATUS_TONE } from "./menu-card";
import { Badge } from "@ui/primitives";
import { ScheduleTimeline } from "./schedule-timeline";
import { useMenuCopy } from "../copy";

const TYPES: MenuSchedule["type"][] = ["all-day", "breakfast", "lunch", "dinner", "custom"];

const CHANNEL_ICON: Record<"pos" | "publicLink" | "tableQr", ReactNode> = {
  pos: <MonitorSmartphone size={22} aria-hidden />,
  publicLink: <Globe size={22} aria-hidden />,
  tableQr: <QrCode size={22} aria-hidden />,
};

const FIELD =
  "mt-1.5 w-full rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2.5 text-[15px] text-[var(--octo-text-primary)]";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-[var(--octo-border-card)] pt-4">
      <h3 className="text-[17px] font-medium text-[var(--octo-text-primary)]">{title}</h3>
      {children}
    </section>
  );
}

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
  const c = useMenuCopy();
  // The platform's preset codes; they carry no windows, so a known code also
  // applies the builder's window for it and an unknown one only tags the save.
  const presets = useSchedulePresets(menu !== null);
  const [draft, setDraft] = useState<MenuSchedule | null>(null);
  const [channels, setChannels] = useState<Menu["channels"] | null>(null);

  // Re-seed whenever a different menu opens the modal, so yesterday's edits
  // never leak into today's menu.
  useEffect(() => {
    setDraft(menu ? { ...menu.schedule, days: [...menu.schedule.days], branchIds: [...menu.schedule.branchIds] } : null);
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

  const unpicked = SEED_BRANCHES.filter((b) => !draft.branchIds.includes(b.id));

  return (
    <Modal
      open
      onClose={onClose}
      className="max-h-[92vh] max-w-[740px] overflow-y-auto sm:p-7"
      title={<span className="text-[24px] font-bold">{t("menuLib.sched.title")}</span>}
      footer={
        <Button className="h-12 w-full justify-center text-[17px] font-semibold" onClick={() => onSave(draft, channels)}>
          {t("menuLib.sched.save")}
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Which menu is being scheduled — the modal is opened from one of
            nine look-alike cards, so it names its subject before anything. */}
        <div className="flex items-center gap-3">
          <MenuCover className="h-11 w-11 text-[9px]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold text-[var(--octo-text-primary)]">{menu.name}</p>
            <p className="text-[13px] text-[var(--octo-text-secondary)]">
              {t(`menuLib.scheduleType.${menu.schedule.type}`)}
            </p>
          </div>
          <Badge tone={STATUS_TONE[menu.status]}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
            {t(`menuLib.status.${menu.status}`)}
          </Badge>
        </div>

        <Block title={t("menuLib.sched.availability")}>
          <p className="mt-1 text-[14px] text-[var(--octo-text-secondary)]">{t("menuLib.sched.chooseType")}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {TYPES.map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={draft.type === type}
                onClick={() =>
                  setDraft({
                    ...applyScheduleType(draft, type),
                    presetCode: presets.data?.some((p) => p.code === type) ? type : null,
                  })
                }
                className={`rounded-[10px] border px-3 py-2.5 text-[15px] ${
                  draft.type === type
                    ? "border-[var(--octo-accent)] bg-[var(--octo-selected)] text-[var(--octo-accent)]"
                    : "border-[var(--octo-border-card)] text-[var(--octo-text-primary)]"
                }`}
              >
                {t(`menuLib.scheduleType.${type}`)}
              </button>
            ))}
          </div>
          {presets.data && presets.data.some((p) => !TYPES.includes(p.code as MenuSchedule["type"])) && (
            <>
              <p className="mt-3 text-[13px] text-[var(--octo-text-secondary)]">{c("schedule.presets")}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {presets.data
                  .filter((p) => !TYPES.includes(p.code as MenuSchedule["type"]))
                  .map((p) => (
                    <button
                      key={p.code}
                      type="button"
                      aria-pressed={draft.presetCode === p.code}
                      onClick={() => patch({ presetCode: draft.presetCode === p.code ? null : p.code })}
                      className={`rounded-[10px] border px-3 py-2 text-[14px] ${
                        draft.presetCode === p.code
                          ? "border-[var(--octo-accent)] bg-[var(--octo-selected)] text-[var(--octo-accent)]"
                          : "border-[var(--octo-border-card)] text-[var(--octo-text-primary)]"
                      }`}
                    >
                      {t(`menuLib.scheduleType.${p.code}`) === `menuLib.scheduleType.${p.code}` ? p.code : t(`menuLib.scheduleType.${p.code}`)}
                    </button>
                  ))}
              </div>
            </>
          )}
          {isServerId(menu.id) && <ScheduleTimeline menuId={menu.id} />}
        </Block>

        <Block title={t("menuLib.sched.window")}>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {(["start", "end"] as const).map((field) => (
              <label key={field} className="text-[14px] text-[var(--octo-text-secondary)]">
                {t(field === "start" ? "menuLib.sched.startTime" : "menuLib.sched.endTime")}
                <input
                  type="time"
                  value={draft[field]}
                  onChange={(e) => setDraft({ ...setScheduleTime(draft, field, e.target.value), presetCode: null })}
                  className={FIELD}
                />
              </label>
            ))}
          </div>

          <p className="mt-3 text-[14px] text-[var(--octo-text-secondary)]">{t("menuLib.sched.applyTo")}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={draft.days.includes(day)}
                onClick={() => toggleDay(day)}
                className={`rounded-full px-3.5 py-1.5 text-[14px] ${
                  draft.days.includes(day)
                    ? "bg-[var(--octo-accent)] text-white"
                    : "border border-[var(--octo-border-card)] text-[var(--octo-text-secondary)]"
                }`}
              >
                {t(`menuLib.day.${day}`)}
              </button>
            ))}
          </div>

          <div className="mt-3 space-y-3">
            <label className="block text-[14px] text-[var(--octo-text-secondary)]">
              {t("menuLib.sched.timezone")}
              <Select className="mt-1.5" value={draft.timezone} onChange={(e) => patch({ timezone: e.target.value })}>
                <option value="Asia/Riyadh">(GMT+ 03:00) Asia/Riyadh</option>
              </Select>
            </label>

            {/* Several branches can share one menu, so this is a chip set:
                chosen branches as removable chips, the rest in a picker. The
                last chip cannot be removed — a menu must serve somewhere. */}
            <div className="text-[14px] text-[var(--octo-text-secondary)]">
              {t("menuLib.sched.branches")}
              <div className="mt-1.5 flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-[10px] border border-[var(--octo-border-card)] p-1.5">
                {draft.branchIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--octo-accent)] bg-[var(--octo-selected)] px-2 py-1 text-[13px] text-[var(--octo-accent)]"
                  >
                    {SEED_BRANCHES.find((b) => b.id === id)?.label ?? id}
                    {draft.branchIds.length > 1 && (
                      <button
                        type="button"
                        aria-label={`${t("menuLib.sched.removeBranch")} ${SEED_BRANCHES.find((b) => b.id === id)?.label ?? id}`}
                        onClick={() => patch({ branchIds: draft.branchIds.filter((b) => b !== id) })}
                        className="rounded-full"
                      >
                        <X size={13} aria-hidden />
                      </button>
                    )}
                  </span>
                ))}
                {unpicked.length > 0 && (
                  <select
                    aria-label={t("menuLib.sched.addBranch")}
                    value=""
                    onChange={(e) => e.target.value && patch({ branchIds: [...draft.branchIds, e.target.value] })}
                    className="min-w-0 flex-1 bg-transparent px-1 py-1 text-[13px] text-[var(--octo-text-secondary)] outline-none"
                  >
                    <option value="">+ {t("menuLib.sched.addBranch")}</option>
                    {unpicked.map((branch) => (
                      <option key={branch.id} value={branch.id}>{branch.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        </Block>

        <Block title={t("menuLib.sched.channels")}>
          <div className="mt-2 divide-y divide-[var(--octo-border-card)]">
            {(["pos", "publicLink", "tableQr"] as const).map((channel) => {
              const on = channels[channel] !== "off";
              return (
                <div key={channel} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-[var(--octo-text-secondary)]">{CHANNEL_ICON[channel]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-[var(--octo-text-primary)]">
                      {t(`menuLib.channel.${channel}`)}
                    </p>
                    <p className="text-[13px] text-[var(--octo-text-secondary)]">{t(`menuLib.sched.${channel}Hint`)}</p>
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
                        prev ? { ...prev, [channel]: on ? "off" : channelStateFor(menu.status) } : prev
                      )
                    }
                    className={`h-[22px] w-[40px] shrink-0 rounded-full p-[2px] transition-colors ${
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
        </Block>

        <Block title={t("menuLib.sched.additional")}>
          <label className="mt-2 block text-[14px] text-[var(--octo-text-secondary)]">
            {t("menuLib.sched.fallback")} <span>({t("menuLib.sched.fallbackHint")})</span>
            <Select
              className="mt-1.5"
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
        </Block>
      </div>
    </Modal>
  );
}
