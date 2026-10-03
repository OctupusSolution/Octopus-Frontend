// The two cards under step 2's columns — Availability and Schedule — plus the
// nutrition summary strip beneath them.
//
// The strip's four figures read item.nutrition. They are not a second copy: the
// Nutrition tab is the only place they are entered, and the strip is a readout.
import clsx from "clsx";
import { WEEKDAYS, type Item, type Weekday } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { SelectBox, Switch } from "../../_shared/controls";
import { MenuIcon } from "../../_shared/menu-icon";
import { LINE, SURFACE_BLUE, TEXT, TEXT_GRAY } from "../../_shared/theme";
import { ACCENT_TEXT, FieldError, LABEL_12, LABEL_14, LABEL_16, RadioRow } from "./ui";
import type { ItemForm } from "./use-item-form";

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

const CARD = `flex flex-col rounded-[16px] border p-4 ${LINE}`;

/** "HH:00" stays the stored value; the label is 12-hour as the frame draws it
 *  ("10:00 AM"). Latin digits in Arabic too, matching the rest of the console. */
function hourLabel(value: string, rtl: boolean): string {
  const hour = Number(value.slice(0, 2));
  return new Intl.DateTimeFormat(rtl ? "ar-u-nu-latn" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(2000, 0, 1, hour));
}

export function AvailabilityCard({
  item,
  onPatch,
}: {
  item: Item;
  onPatch: (patch: Partial<Item>) => void;
}) {
  const { t } = useI18n();
  const rows: { id: keyof Item["availability"]; labelKey: string; hintKey?: string }[] = [
    { id: "available", labelKey: "menuWiz.item.available", hintKey: "menuWiz.item.availableHint" },
    { id: "delivery", labelKey: "menuWiz.item.forDelivery" },
    { id: "takeaway", labelKey: "menuWiz.item.forTakeaway" },
    { id: "dineIn", labelKey: "menuWiz.item.forDineIn" },
  ];

  return (
    <section className={clsx(CARD, "gap-6")}>
      <h3 className={LABEL_16}>{t("menuWiz.item.availability")}</h3>
      <div className="flex flex-col gap-4">
        {rows.map(({ id, labelKey, hintKey }) => (
          <div key={id} className="flex items-start gap-2">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <p className={LABEL_14}>{t(labelKey)}</p>
              {hintKey && <p className={clsx("text-[12px] leading-3", TEXT_GRAY)}>{t(hintKey)}</p>}
            </div>
            <Switch
              checked={item.availability[id]}
              label={t(labelKey)}
              onChange={(next) => onPatch({ availability: { ...item.availability, [id]: next } })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ScheduleCard({
  item,
  onPatch,
  form,
}: {
  item: Item;
  onPatch: (patch: Partial<Item>) => void;
  form: ItemForm;
}) {
  const { t, dir } = useI18n();
  const rtl = dir === "rtl";
  // Narrow on the schedule itself rather than on a boolean: a separate flag
  // does not tell the compiler which arm of the union it came from.
  const sched = item.schedule;
  const custom = sched.mode === "custom";
  const start = sched.mode === "custom" ? sched.start : "10:00";
  const end = sched.mode === "custom" ? sched.end : "12:00";
  const days: Weekday[] = sched.mode === "custom" ? sched.days : [...WEEKDAYS];

  const startKey = form.error("scheduleStart");
  const endKey = form.error("scheduleEnd");
  const daysKey = form.error("scheduleDays");

  function setCustom(next: { start?: string; end?: string; days?: Weekday[] }) {
    onPatch({
      schedule: {
        mode: "custom",
        start: next.start ?? start,
        end: next.end ?? end,
        days: next.days ?? days,
      },
    });
  }

  return (
    <section className={clsx(CARD, "gap-4")}>
      <h3 className={LABEL_16}>{t("menuWiz.item.schedule")}</h3>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {(["all-day", "custom"] as const).map((mode) => (
          <RadioRow
            key={mode}
            name={`sched-${item.id}`}
            checked={item.schedule.mode === mode}
            onChange={() => (mode === "all-day" ? onPatch({ schedule: { mode: "all-day" } }) : setCustom({}))}
          >
            {t(mode === "all-day" ? "menuWiz.item.allDay" : "menuWiz.item.customHours")}
          </RadioRow>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <span className={LABEL_12}>{t("menuWiz.item.startTime")}</span>
          <SelectBox
            value={start}
            disabled={!custom}
            placeholderShown={!custom}
            invalid={Boolean(startKey)}
            ariaLabel={t("menuWiz.item.startTime")}
            onChange={(value) => setCustom({ start: value })}
            onBlur={() => form.touch("scheduleStart")}
            className="[&>select]:disabled:!opacity-100"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{hourLabel(h, rtl)}</option>
            ))}
          </SelectBox>
          <FieldError>{startKey ? t(startKey) : null}</FieldError>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <span className={LABEL_12}>{t("menuWiz.item.endTime")}</span>
          <SelectBox
            value={end}
            disabled={!custom}
            placeholderShown={!custom}
            invalid={Boolean(endKey)}
            ariaLabel={t("menuWiz.item.endTime")}
            onChange={(value) => {
              setCustom({ end: value });
              form.touch("scheduleEnd");
            }}
            onBlur={() => form.touch("scheduleEnd")}
            className="[&>select]:disabled:!opacity-100"
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{hourLabel(h, rtl)}</option>
            ))}
          </SelectBox>
          <FieldError>{endKey ? t(endKey) : null}</FieldError>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={LABEL_12}>{t("menuWiz.item.days")}</span>
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          {WEEKDAYS.map((day) => {
            const on = days.includes(day);
            return (
              <button
                key={day}
                type="button"
                disabled={!custom}
                aria-pressed={on}
                onClick={() => {
                  setCustom({ days: on ? days.filter((d: Weekday) => d !== day) : [...days, day] });
                  form.touch("scheduleDays");
                }}
                className={clsx(
                  // Unselected days keep the chip's shape in the pale tint, so
                  // the row reads as one control rather than two kinds of pill.
                  "rounded-full px-2 py-1 text-[12px] font-medium leading-3 disabled:cursor-not-allowed",
                  on ? "bg-[#0D6EFD] text-white" : `${SURFACE_BLUE} ${ACCENT_TEXT}`
                )}
              >
                {t(`menuLib.day.${day}`)}
              </button>
            );
          })}
        </div>
        <FieldError>{daysKey ? t(daysKey) : null}</FieldError>
      </div>
    </section>
  );
}

export function NutritionStrip({
  item,
  onOpenNutrition,
}: {
  item: Item;
  onOpenNutrition: () => void;
}) {
  const { t } = useI18n();
  const cells: { key: string; value: number | null; suffix: string }[] = [
    { key: "menuWiz.item.calories", value: item.nutrition.calories, suffix: "" },
    { key: "menuWiz.item.protein", value: item.nutrition.protein, suffix: "g" },
    { key: "menuWiz.item.carbs", value: item.nutrition.carb, suffix: "g" },
    { key: "menuWiz.item.fat", value: item.nutrition.fat, suffix: "g" },
  ];

  return (
    <section className={clsx(CARD, "gap-4 lg:flex-row lg:items-center lg:gap-6")}>
      <h3 className={clsx("lg:whitespace-nowrap", LABEL_16)}>{t("menuWiz.item.nutriSummary")}</h3>
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {cells.map(({ key, value, suffix }) => (
            <div
              key={key}
              className={clsx(
                "flex w-[112px] flex-col items-center gap-2 rounded-[4px] border bg-[#fbfafc] p-2 text-center [[data-theme=dark]_&]:bg-[var(--octo-hover)]",
                LINE
              )}
            >
              <p className={clsx("text-[14px] font-bold leading-[14px]", TEXT)}>
                {value === null ? "—" : `${value}${suffix}`}
              </p>
              <p className={clsx("text-[12px] font-medium leading-3", TEXT_GRAY)}>{t(key)}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onOpenNutrition}
          className="inline-flex items-center gap-2 text-[18px] font-bold leading-[18px] text-[#0D6EFD] hover:opacity-80"
        >
          {t("menuWiz.item.fullNutrition")}
          <MenuIcon name="menu-arrow-right.svg" size={24} className="rtl:rotate-180" />
        </button>
      </div>
    </section>
  );
}
