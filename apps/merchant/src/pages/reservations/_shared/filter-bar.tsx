import clsx from "clsx";
import type { ReactNode } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import type { ReservationSource } from "@/shared/api/mock-reservations";
import { DISPLAY_STATE_OPTIONS, SOURCE_LABEL_KEY, STATE_LABEL_KEY, type ListFilters } from "./model";
import { BORDER_200, BORDER_300, SURFACE_WHITE, TEXT_SECONDARY } from "./theme";

const SOURCE_OPTIONS: readonly ReservationSource[] = [
  "Direct Booking", "Website", "Walk In", "Phone", "Instagram",
];

// Shared outline pill style for Today / Tomorrow / the date input. Split into
// a base (layout) and two full colour variants rather than layering an
// "active" override on top of the outline classes, so Tailwind's hover
// utilities never fight each other over source order.
const PILL_BASE = "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-[8px] border p-2 text-[14px] font-medium leading-[14px] transition-colors";
const PILL_OUTLINE = clsx(BORDER_200, SURFACE_WHITE, TEXT_SECONDARY, "hover:bg-[var(--octo-hover)]");
// The frame draws the date pill with the darker of its two outline greys.
const PILL_DATE = clsx(BORDER_300, SURFACE_WHITE, TEXT_SECONDARY, "hover:bg-[var(--octo-hover)]");
const PILL_ACTIVE = "border-[#0d6efd] bg-[#0d6efd] text-white";

// A native <select> drawn as one of the frame's dropdown pills: the browser's
// own arrow is hidden and the frame's 24px chevron sits over the end padding.
// field-sizing keeps the pill as wide as the picked option, like the frame,
// instead of as wide as the longest option in the list.
function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <span className={clsx("relative inline-flex", TEXT_SECONDARY)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={clsx(
          "h-10 cursor-pointer appearance-none rounded-[8px] border py-2 pe-10 ps-2 text-[14px] font-medium leading-[14px] outline-none transition-colors [field-sizing:content] hover:bg-[var(--octo-hover)] focus-visible:border-[#0d6efd]",
          BORDER_200,
          SURFACE_WHITE
        )}
      >
        {children}
      </select>
      <ShellIcon name="rsv-arrow-down.svg" size={24} className="pointer-events-none absolute end-2 top-2" />
    </span>
  );
}

// The frame draws the picked date as "Fri, Aug 14, 2026"; a bare
// <input type="date"> renders the browser's own locale-native format
// instead ("08/08/2026" in Chrome/en) (fix round 1). Format it ourselves
// for display and lay the real input on top, invisible but still
// focusable/clickable, so the native picker still opens from anywhere on
// the pill and the control stays keyboard-reachable.
function formatDatePill(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    numberingSystem: "latn",
  }).format(new Date(`${date}T00:00:00`));
}

// Clicking an invisible date input only focuses it in Chrome; the picker
// opens only from its own indicator. Open it explicitly so a click anywhere
// on the pill works. showPicker() throws without user activation or inside a
// cross-origin frame, and older browsers lack it — fall back to plain focus.
export function openDatePicker(input: HTMLInputElement) {
  try {
    input.showPicker();
  } catch {
    input.focus();
  }
}

export interface FilterBarProps {
  filters: ListFilters;
  onChange: (next: ListFilters) => void;
  areas: readonly string[];
}

export function FilterBar({ filters, onChange, areas }: FilterBarProps) {
  const { t, locale } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => onChange({ ...filters, day: "today" })}
        className={clsx(PILL_BASE, filters.day === "today" ? PILL_ACTIVE : PILL_OUTLINE)}
      >
        <ShellIcon name="rsv-calendar.svg" size={24} />
        {t("reservations.list.filter.today")}
      </button>

      <button
        type="button"
        onClick={() => onChange({ ...filters, day: "tomorrow" })}
        className={clsx(PILL_BASE, filters.day === "tomorrow" ? PILL_ACTIVE : PILL_OUTLINE)}
      >
        <ShellIcon name="rsv-calendar.svg" size={24} />
        {t("reservations.list.filter.tomorrow")}
      </button>

      <label
        className={clsx(PILL_BASE, "relative cursor-pointer", filters.day === "date" ? PILL_ACTIVE : PILL_DATE)}
      >
        <ShellIcon name="rsv-calendar.svg" size={24} />
        <span>{formatDatePill(filters.date, locale)}</span>
        <input
          type="date"
          value={filters.date}
          onChange={(e) => onChange({ ...filters, day: "date", date: e.target.value })}
          onClick={(e) => openDatePicker(e.currentTarget)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>

      {/* Filters on displayState (fix round 4, finding 20) — the pill the
          row actually shows — so "Confirmed" never returns a row whose
          pill reads "Link Sent", and Link Sent / Expired / Failed /
          Refunded / Payment Cancelled are all reachable here too. */}
      <FilterSelect value={filters.status} onChange={(status) => onChange({ ...filters, status })}>
        <option value="">{t("reservations.list.filter.allStatus")}</option>
        {DISPLAY_STATE_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {t(STATE_LABEL_KEY[status])}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect value={filters.area} onChange={(area) => onChange({ ...filters, area })}>
        <option value="">{t("reservations.list.filter.allAreas")}</option>
        {areas.map((area) => (
          <option key={area} value={area}>
            {area}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect value={filters.source} onChange={(source) => onChange({ ...filters, source })}>
        <option value="">{t("reservations.list.filter.allSources")}</option>
        {SOURCE_OPTIONS.map((source) => (
          <option key={source} value={source}>
            {t(SOURCE_LABEL_KEY[source])}
          </option>
        ))}
      </FilterSelect>

      <button
        type="button"
        disabled
        title={t("reservations.list.actions.noBackend")}
        className={clsx(PILL_BASE, PILL_OUTLINE, "disabled:cursor-not-allowed disabled:opacity-50")}
      >
        <ShellIcon name="rsv-filter.svg" size={24} />
        {t("reservations.list.filter.more")}
        <ShellIcon name="rsv-arrow-down.svg" size={24} />
      </button>
    </div>
  );
}
