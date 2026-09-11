// The two cards under step 2's columns — Availability and Schedule — plus the
// nutrition summary strip beneath them.
//
// The strip's four figures read item.nutrition. They are not a second copy: the
// Nutrition tab is the only place they are entered, and the strip is a readout.
import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { Select } from "@ui/primitives";
import { WEEKDAYS, type Item, type Weekday } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

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

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={clsx(
        "h-[22px] w-[40px] shrink-0 rounded-full p-[2px] transition-colors",
        checked ? "bg-[var(--octo-accent)]" : "bg-[var(--octo-switch-off)]"
      )}
    >
      <span
        className={clsx(
          "block h-[18px] w-[18px] rounded-full bg-[var(--octo-knob)] transition-transform",
          checked && "translate-x-[18px] rtl:-translate-x-[18px]"
        )}
      />
    </button>
  );
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
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h3 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
        {t("menuWiz.item.availability")}
      </h3>
      <div className="mt-2 divide-y divide-[var(--octo-border-card)]">
        {rows.map(({ id, labelKey, hintKey }) => (
          <div key={id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">
                {t(labelKey)}
              </p>
              {hintKey && (
                <p className="text-[13px] text-[var(--octo-text-secondary)]">{t(hintKey)}</p>
              )}
            </div>
            <Switch
              checked={item.availability[id]}
              label={t(labelKey)}
              onChange={() =>
                onPatch({
                  availability: { ...item.availability, [id]: !item.availability[id] },
                })
              }
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
}: {
  item: Item;
  onPatch: (patch: Partial<Item>) => void;
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
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h3 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
        {t("menuWiz.item.schedule")}
      </h3>

      <div className="mt-2 flex flex-wrap gap-5">
        {(["all-day", "custom"] as const).map((mode) => (
          <label key={mode} className="flex items-center gap-2.5 text-[14px]">
            <input
              type="radio"
              name={`sched-${item.id}`}
              checked={item.schedule.mode === mode}
              onChange={() =>
                mode === "all-day"
                  ? onPatch({ schedule: { mode: "all-day" } })
                  : setCustom({})
              }
              className="h-4 w-4 accent-[var(--octo-accent)]"
            />
            <span
              className={clsx(
                item.schedule.mode === mode
                  ? "font-medium text-[var(--octo-accent)]"
                  : "text-[var(--octo-text-primary)]"
              )}
            >
              {t(mode === "all-day" ? "menuWiz.item.allDay" : "menuWiz.item.customHours")}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuWiz.item.startTime")}
          </span>
          <Select
            className="mt-1"
            disabled={!custom}
            value={start}
            onChange={(e) => setCustom({ start: e.target.value })}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{hourLabel(h, rtl)}</option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="text-[13px] text-[var(--octo-text-secondary)]">
            {t("menuWiz.item.endTime")}
          </span>
          <Select
            className="mt-1"
            disabled={!custom}
            value={end}
            onChange={(e) => setCustom({ end: e.target.value })}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>{hourLabel(h, rtl)}</option>
            ))}
          </Select>
        </label>
      </div>

      <p className="mt-3 text-[13px] text-[var(--octo-text-secondary)]">{t("menuWiz.item.days")}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {WEEKDAYS.map((day) => {
          const on = days.includes(day);
          return (
            <button
              key={day}
              type="button"
              disabled={!custom}
              aria-pressed={on}
              onClick={() =>
                setCustom({ days: on ? days.filter((d: Weekday) => d !== day) : [...days, day] })
              }
              className={clsx(
                // Unselected days keep the chip's shape in a pale accent tint,
                // so the row reads as one control rather than two kinds of pill.
                "rounded-full border px-2.5 py-0.5 text-[14px] disabled:opacity-60",
                on
                  ? "border-[var(--octo-accent)] bg-[var(--octo-accent)] text-white"
                  : "border-[var(--octo-accent)] bg-[var(--octo-selected)] text-[var(--octo-accent)]"
              )}
            >
              {t(`menuLib.day.${day}`)}
            </button>
          );
        })}
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
    <section className="flex flex-wrap items-center gap-4 rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h3 className="text-[15px] font-medium text-[var(--octo-text-primary)]">
        {t("menuWiz.item.nutriSummary")}
      </h3>
      <div className="flex flex-1 flex-wrap gap-2.5">
        {cells.map(({ key, value, suffix }) => (
          <div
            key={key}
            className="min-w-[92px] rounded-[10px] border border-[var(--octo-border-card)] px-4 py-2.5 text-center"
          >
            <p className="text-[17px] font-semibold text-[var(--octo-text-primary)]">
              {value === null ? "—" : `${value}${suffix}`}
            </p>
            <p className="text-[12.5px] text-[var(--octo-text-secondary)]">{t(key)}</p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenNutrition}
        className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--octo-accent)]"
      >
        {t("menuWiz.item.fullNutrition")}
        <ArrowRight size={15} className="rtl:rotate-180" aria-hidden />
      </button>
    </section>
  );
}
