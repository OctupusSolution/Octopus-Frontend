// The four numbered blocks of the frame's Schedule Menu modal (the numbers
// live in the i18n strings). Edits are held
// locally and only committed on Save, so closing without saving changes
// nothing. The channel toggles here set the menu's channel visibility; the
// menu's own status is not touched — a scheduled menu can still be POS-only.
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import {
  WEEKDAYS,
  SEED_BRANCHES,
  applyScheduleType,
  channelStateFor,
  fallbackCandidates,
  isServerId,
  setScheduleTime,
  useSchedulePresets,
  validateSchedule,
  type Menu,
  type MenuSchedule,
  type ScheduleField,
  type Weekday,
} from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { MenuCover, STATUS_TONE } from "./menu-card";
import { ScheduleTimeline } from "./schedule-timeline";
import { useMenuCopy } from "../copy";
import { CheckBox, SelectBox, StatusPill, Switch } from "../_shared/controls";
import { MenuIcon } from "../_shared/menu-icon";
import {
  FIELD_BORDER,
  FIELD_INVALID,
  FOCUS,
  FOCUS_WITHIN,
  LINE,
  MODAL_SUBMIT,
  TEXT,
  TEXT_INPUT_CLASS,
  TEXT_SECONDARY,
} from "../_shared/theme";

const TYPES: MenuSchedule["type"][] = ["all-day", "breakfast", "lunch", "dinner", "custom"];

// The frame draws neither the platform's extra preset chips nor the resolved
// timeline, so both stay in the code but out of the modal.
const SHOW_PLATFORM_PRESETS: boolean = false;
const SHOW_TIMELINE: boolean = false;

type Channel = "pos" | "publicLink" | "tableQr";
const CHANNELS: readonly Channel[] = ["pos", "publicLink", "tableQr"];

// The POS glyph is exported at its drawn size (21.5×20.5) and centred in the
// same 24px slot as the other two.
const CHANNEL_ICON: Record<Channel, { name: string; size: number }> = {
  pos: { name: "menu-pos-receipt.svg", size: 21.5 },
  publicLink: { name: "menu-globe.svg", size: 24 },
  tableQr: { name: "menu-qr-code.svg", size: 24 },
};

/** The frame's hint grey (#58606c), one step darker than TEXT_SECONDARY. */
const TEXT_HINT = "text-[#58606c] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";
const LABEL = clsx("text-[12px] font-medium leading-3", TEXT);

/** The 28px outlined chip: schedule types and the chosen branches. */
const CHIP = "inline-flex items-center rounded-[4px] border px-1 py-2 text-[12px] font-medium leading-3 whitespace-nowrap transition-colors";
const CHIP_ON = "border-[#0D6EFD] bg-[#f5f9ff] text-[#0D6EFD] [[data-theme=dark]_&]:bg-[#0d6efd]/15";
const CHIP_OFF =
  "border-[#e2e8f0] bg-[var(--octo-card)] text-[#687280] hover:border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-input)] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]";

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={clsx("flex flex-col gap-3 border-b pb-2", LINE)}>
      <h3 className={clsx("ps-1 text-[16px] font-medium leading-4", TEXT)}>{title}</h3>
      {children}
    </section>
  );
}

function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-[12px] leading-[14px] text-[#d30202]">
      {children}
    </p>
  );
}

/** A native time input dressed as the frame's 40px dropdown: the browser's
 *  own picker button is stretched, invisible, over the arrow. */
function TimeField({
  label,
  value,
  onChange,
  onBlur,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error: string | null;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-2">
      <span className={LABEL}>{label}</span>
      <span className="relative block">
        <input
          type="time"
          value={value}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          className={clsx(
            TEXT_INPUT_CLASS,
            "relative pe-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:end-0 [&::-webkit-calendar-picker-indicator]:top-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-10 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0",
            error && FIELD_INVALID
          )}
        />
        <MenuIcon
          name="menu-arrow-down.svg"
          size={24}
          className={clsx("pointer-events-none absolute end-2 top-1/2 -translate-y-1/2", TEXT_SECONDARY)}
        />
      </span>
      {error && <ErrorLine>{error}</ErrorLine>}
    </label>
  );
}

/** The platform's own preset codes beyond the five the frame draws. Not
 *  rendered while SHOW_PLATFORM_PRESETS is off. */
function PlatformPresets({
  codes,
  selected,
  onPick,
}: {
  codes: readonly string[];
  selected: string | null | undefined;
  onPick: (code: string | null) => void;
}) {
  const { t } = useI18n();
  const c = useMenuCopy();
  if (codes.length === 0) return null;
  return (
    <>
      <p className={clsx("text-[12px] font-medium leading-3", TEXT_HINT)}>{c("schedule.presets")}</p>
      <div className="flex flex-wrap gap-3">
        {codes.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={selected === code}
            onClick={() => onPick(selected === code ? null : code)}
            className={clsx(CHIP, selected === code ? CHIP_ON : CHIP_OFF)}
          >
            {t(`menuLib.scheduleType.${code}`) === `menuLib.scheduleType.${code}` ? code : t(`menuLib.scheduleType.${code}`)}
          </button>
        ))}
      </div>
    </>
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
  // The platform's preset codes; they carry no windows, so a known code also
  // applies the builder's window for it and an unknown one only tags the save.
  const presets = useSchedulePresets(menu !== null);
  const [draft, setDraft] = useState<MenuSchedule | null>(null);
  const [channels, setChannels] = useState<Menu["channels"] | null>(null);
  // An error is shown only for a field the merchant has been in, or for all
  // of them once Save was pressed — never on a form that was just opened.
  const [touched, setTouched] = useState<ReadonlySet<ScheduleField>>(new Set());
  const [submitted, setSubmitted] = useState(false);

  // Re-seed whenever a different menu opens the modal, so yesterday's edits
  // never leak into today's menu.
  useEffect(() => {
    setDraft(menu ? { ...menu.schedule, days: [...menu.schedule.days], branchIds: [...menu.schedule.branchIds] } : null);
    setChannels(menu ? { ...menu.channels } : null);
    setTouched(new Set());
    setSubmitted(false);
  }, [menu]);

  if (!menu || !draft || !channels) return null;

  const errors = validateSchedule(draft, menu.id);

  function errorFor(field: ScheduleField): string | null {
    const issue = errors[field];
    return issue && (submitted || touched.has(field)) ? t(`menuLib.sched.error.${issue}`) : null;
  }

  function touch(field: ScheduleField) {
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)));
  }

  function patch(next: Partial<MenuSchedule>) {
    setDraft((current) => (current ? { ...current, ...next } : current));
  }

  function toggleDay(day: Weekday) {
    touch("days");
    patch({
      days: draft!.days.includes(day)
        ? draft!.days.filter((d) => d !== day)
        : [...draft!.days, day],
    });
  }

  function save() {
    if (Object.keys(errors).length > 0) {
      setSubmitted(true);
      return;
    }
    onSave(draft!, channels!);
  }

  const unpicked = SEED_BRANCHES.filter((b) => !draft.branchIds.includes(b.id));
  const branchLabel = (id: string) => SEED_BRANCHES.find((b) => b.id === id)?.label ?? id;
  const extraPresets = (presets.data ?? [])
    .map((p) => p.code)
    .filter((code) => !TYPES.includes(code as MenuSchedule["type"]));

  const daysError = errorFor("days");
  const branchesError = errorFor("branchIds");
  const fallbackError = errorFor("fallbackMenuId");

  return (
    <Modal
      open
      onClose={onClose}
      className="max-h-[92vh] max-w-[738px] overflow-y-auto !rounded-[12px] !p-6"
      title={
        <span className="block text-[24px] font-semibold leading-6 text-[#0e0e0e] [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">
          {t("menuLib.sched.title")}
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        {/* Which menu is being scheduled — the modal is opened from one of
            nine look-alike cards, so it names its subject before anything. */}
        <div className={clsx("flex items-center gap-2 border-b pb-2", LINE)}>
          <MenuCover className="h-[39px] w-[37px]" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[16px] font-semibold leading-5 text-black [[data-theme=dark]_&]:text-[var(--octo-text-primary)]">
                {menu.name}
              </p>
              <StatusPill tone={STATUS_TONE[menu.status]}>{t(`menuLib.status.${menu.status}`)}</StatusPill>
            </div>
            <p className={clsx("text-[12px] leading-3", TEXT)}>{t(`menuLib.scheduleType.${menu.schedule.type}`)}</p>
          </div>
        </div>

        <Block title={t("menuLib.sched.availability")}>
          <p className={clsx("-mt-1 text-[12px] font-medium leading-3", TEXT_HINT)}>{t("menuLib.sched.chooseType")}</p>
          <div className="flex flex-wrap items-center gap-3">
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
                className={clsx(CHIP, draft.type === type ? CHIP_ON : CHIP_OFF)}
              >
                {t(`menuLib.scheduleType.${type}`)}
              </button>
            ))}
          </div>
          {SHOW_PLATFORM_PRESETS && (
            <PlatformPresets codes={extraPresets} selected={draft.presetCode} onPick={(code) => patch({ presetCode: code })} />
          )}
          {SHOW_TIMELINE && isServerId(menu.id) && <ScheduleTimeline menuId={menu.id} />}
        </Block>

        <Block title={t("menuLib.sched.window")}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            {(["start", "end"] as const).map((field) => (
              <TimeField
                key={field}
                label={t(field === "start" ? "menuLib.sched.startTime" : "menuLib.sched.endTime")}
                value={draft[field]}
                onChange={(value) => setDraft({ ...setScheduleTime(draft, field, value), presetCode: null })}
                // The end's message depends on both times, so leaving either
                // one is enough to show it.
                onBlur={() => {
                  touch(field);
                  touch("end");
                }}
                error={errorFor(field)}
              />
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <span className={LABEL}>{t("menuLib.sched.applyTo")}</span>
            <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
              {WEEKDAYS.map((day) => {
                const on = draft.days.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(day)}
                    className={clsx(
                      "rounded-full px-2 py-1 text-[12px] font-medium leading-3 transition-colors",
                      on
                        ? "bg-[#0D6EFD] text-white"
                        : "bg-[#f1f5f9] text-[#58606c] [[data-theme=dark]_&]:bg-[var(--octo-track)] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]"
                    )}
                  >
                    {t(`menuLib.day.${day}`)}
                  </button>
                );
              })}
            </div>
            {daysError && <ErrorLine>{daysError}</ErrorLine>}
          </div>

          <div className="flex flex-col gap-2">
            <span className={LABEL}>{t("menuLib.sched.timezone")}</span>
            <SelectBox
              ariaLabel={t("menuLib.sched.timezone")}
              value={draft.timezone}
              onChange={(timezone) => patch({ timezone })}
            >
              <option value="Asia/Riyadh">(GMT+ 03:00) Asia/Riyadh</option>
            </SelectBox>
          </div>

          {/* Several branches can share one menu, so this is a chip set:
              chosen branches as removable chips, the rest in the picker that
              lies, invisible, under the whole box. Removing the last chip is
              allowed and answered with the "at least one branch" message. */}
          <div className="flex flex-col gap-2">
            <span className={LABEL}>{t("menuLib.sched.branches")}</span>
            <div
              className={clsx(
                "relative flex min-h-[50px] items-center justify-between gap-2 rounded-[12px] bg-[var(--octo-card)] p-2",
                FIELD_BORDER,
                FOCUS_WITHIN,
                branchesError && FIELD_INVALID
              )}
            >
              {unpicked.length > 0 && (
                <select
                  aria-label={t("menuLib.sched.addBranch")}
                  aria-invalid={branchesError ? true : undefined}
                  value=""
                  onBlur={() => touch("branchIds")}
                  onChange={(event) => {
                    if (!event.target.value) return;
                    touch("branchIds");
                    patch({ branchIds: [...draft.branchIds, event.target.value] });
                  }}
                  className="absolute inset-0 size-full cursor-pointer appearance-none rounded-[12px] opacity-0"
                >
                  <option value="" hidden />
                  {unpicked.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.label}</option>
                  ))}
                </select>
              )}
              <div className="pointer-events-none flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {draft.branchIds.length === 0 && (
                  <span className={clsx("text-[14px] leading-[14px]", TEXT_SECONDARY)}>{t("menuLib.sched.addBranch")}</span>
                )}
                {draft.branchIds.map((id) => (
                  <span key={id} className={clsx(CHIP, CHIP_ON, "pointer-events-auto relative gap-2")}>
                    {branchLabel(id)}
                    <button
                      type="button"
                      aria-label={`${t("menuLib.sched.removeBranch")} ${branchLabel(id)}`}
                      onClick={() => {
                        touch("branchIds");
                        patch({ branchIds: draft.branchIds.filter((b) => b !== id) });
                      }}
                      className={clsx("-my-0.5 grid size-4 place-items-center rounded-full", FOCUS)}
                    >
                      <MenuIcon name="menu-close-circle.svg" size={16} />
                    </button>
                  </span>
                ))}
              </div>
              <MenuIcon name="menu-arrow-down.svg" size={24} className={clsx("pointer-events-none", TEXT_SECONDARY)} />
            </div>
            {branchesError && <ErrorLine>{branchesError}</ErrorLine>}
          </div>
        </Block>

        <Block title={t("menuLib.sched.channels")}>
          {CHANNELS.map((channel) => {
            const on = channels[channel] !== "off";
            const icon = CHANNEL_ICON[channel];
            return (
              <div key={channel} className="flex items-start gap-2">
                <span className={clsx("grid size-6 shrink-0 place-items-center", TEXT)}>
                  <MenuIcon name={icon.name} size={icon.size} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={clsx("text-[12px] font-semibold leading-3", TEXT)}>{t(`menuLib.channel.${channel}`)}</p>
                    {/* Switching a channel off is not the same as holding the
                        menu: the menu stays active everywhere else, so the
                        toggle writes the channel and never the status. */}
                    <Switch
                      checked={on}
                      label={t(`menuLib.channel.${channel}`)}
                      onChange={(next) =>
                        setChannels((prev) =>
                          prev ? { ...prev, [channel]: next ? channelStateFor(menu.status) : "off" } : prev
                        )
                      }
                    />
                  </div>
                  <p className={clsx("text-[12px] leading-[1.2]", TEXT_HINT)}>{t(`menuLib.sched.${channel}Hint`)}</p>
                </div>
              </div>
            );
          })}
        </Block>

        <Block title={t("menuLib.sched.additional")}>
          <div className="flex flex-col gap-2">
            <span className={LABEL}>
              {t("menuLib.sched.fallback")}{" "}
              <span className={clsx("font-normal", TEXT_HINT)}>({t("menuLib.sched.fallbackHint")})</span>
            </span>
            <SelectBox
              ariaLabel={t("menuLib.sched.fallback")}
              value={draft.fallbackMenuId ?? ""}
              placeholderShown={draft.fallbackMenuId === null}
              invalid={Boolean(fallbackError)}
              onBlur={() => touch("fallbackMenuId")}
              onChange={(value) => patch({ fallbackMenuId: value || null })}
            >
              <option value="">{t("menuLib.sched.fallbackNone")}</option>
              {/* A menu cannot fall back to itself. */}
              {fallbackCandidates(menus, menu.id).map((candidate) => (
                <option key={candidate.id} value={candidate.id}>{candidate.name}</option>
              ))}
            </SelectBox>
            {fallbackError && <ErrorLine>{fallbackError}</ErrorLine>}
          </div>
        </Block>

        <CheckBox
          className="self-start"
          checked={draft.allowPreorderOutsideSchedule}
          onChange={(next) => patch({ allowPreorderOutsideSchedule: next })}
          label={t("menuLib.sched.preorder")}
        />

        <button type="button" onClick={save} className={MODAL_SUBMIT}>
          {t("menuLib.sched.save")}
        </button>
      </div>
    </Modal>
  );
}
