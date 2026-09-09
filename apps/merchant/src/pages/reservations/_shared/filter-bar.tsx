import clsx from "clsx";
import { CalendarDays, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { ReservationSource } from "@/shared/api/mock-reservations";
import { DISPLAY_STATE_OPTIONS, SOURCE_LABEL_KEY, STATE_LABEL_KEY, type ListFilters } from "./model";

const SOURCE_OPTIONS: readonly ReservationSource[] = [
  "Direct Booking", "Website", "Walk In", "Phone", "Instagram",
];

// Shared outline pill style for Today / Tomorrow / the date input. Split into
// a base (layout) and two full colour variants rather than layering an
// "active" override on top of the outline classes, so Tailwind's hover
// utilities never fight each other over source order.
const PILL_BASE = "inline-flex items-center gap-1.5 rounded-[9px] border px-3 py-[7px] text-[12px] transition-colors";
const PILL_OUTLINE = "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]";
const PILL_ACTIVE = "border-[#0D6EFD] bg-[#0D6EFD] text-white";

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

export interface FilterBarProps {
  filters: ListFilters;
  onChange: (next: ListFilters) => void;
  areas: readonly string[];
}

export function FilterBar({ filters, onChange, areas }: FilterBarProps) {
  const { t, locale } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onChange({ ...filters, day: "today" })}
        className={clsx(PILL_BASE, filters.day === "today" ? PILL_ACTIVE : PILL_OUTLINE)}
      >
        <CalendarDays size={13} />
        {t("reservations.list.filter.today")}
      </button>

      <button
        type="button"
        onClick={() => onChange({ ...filters, day: "tomorrow" })}
        className={clsx(PILL_BASE, filters.day === "tomorrow" ? PILL_ACTIVE : PILL_OUTLINE)}
      >
        <CalendarDays size={13} />
        {t("reservations.list.filter.tomorrow")}
      </button>

      <label
        className={clsx(PILL_BASE, "relative cursor-pointer", filters.day === "date" ? PILL_ACTIVE : PILL_OUTLINE)}
      >
        <CalendarDays size={13} />
        <span>{formatDatePill(filters.date, locale)}</span>
        <input
          type="date"
          value={filters.date}
          onChange={(e) => onChange({ ...filters, day: "date", date: e.target.value })}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>

      {/* Filters on displayState (fix round 4, finding 20) — the pill the
          row actually shows — so "Confirmed" never returns a row whose
          pill reads "Link Sent", and Link Sent / Expired / Failed /
          Refunded / Payment Cancelled are all reachable here too. */}
      <Select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className="!w-auto !py-[7px]"
      >
        <option value="">{t("reservations.list.filter.allStatus")}</option>
        {DISPLAY_STATE_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {t(STATE_LABEL_KEY[status])}
          </option>
        ))}
      </Select>

      <Select
        value={filters.area}
        onChange={(e) => onChange({ ...filters, area: e.target.value })}
        className="!w-auto !py-[7px]"
      >
        <option value="">{t("reservations.list.filter.allAreas")}</option>
        {areas.map((area) => (
          <option key={area} value={area}>
            {area}
          </option>
        ))}
      </Select>

      <Select
        value={filters.source}
        onChange={(e) => onChange({ ...filters, source: e.target.value })}
        className="!w-auto !py-[7px]"
      >
        <option value="">{t("reservations.list.filter.allSources")}</option>
        {SOURCE_OPTIONS.map((source) => (
          <option key={source} value={source}>
            {t(SOURCE_LABEL_KEY[source])}
          </option>
        ))}
      </Select>

      <button
        type="button"
        disabled
        title={t("reservations.list.actions.noBackend")}
        className={clsx(PILL_BASE, PILL_OUTLINE, "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[var(--octo-card)]")}
      >
        <SlidersHorizontal size={13} />
        {t("reservations.list.filter.more")}
        <ChevronDown size={13} className="text-[var(--octo-text-muted)]" />
      </button>
    </div>
  );
}
