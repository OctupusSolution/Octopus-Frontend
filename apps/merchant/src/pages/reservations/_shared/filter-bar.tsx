import clsx from "clsx";
import { CalendarDays, SlidersHorizontal, ChevronDown } from "lucide-react";
import { Select } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import type { ReservationSource, ReservationStatus } from "@/shared/api/mock-reservations";
import type { ListFilters } from "./model";

const STATUS_OPTIONS: readonly ReservationStatus[] = [
  "Pending", "Confirmed", "Arrived", "Seated", "Completed", "No-show", "Cancelled",
];

const STATUS_LABEL_KEY: Record<ReservationStatus, string> = {
  Pending: "reservations.state.pending",
  Confirmed: "reservations.state.confirmed",
  Arrived: "reservations.state.arrived",
  Seated: "reservations.state.seated",
  Completed: "reservations.state.completed",
  "No-show": "reservations.state.noShow",
  Cancelled: "reservations.state.cancelled",
};

const SOURCE_OPTIONS: readonly ReservationSource[] = [
  "Direct Booking", "Website", "Walk In", "Phone", "Instagram",
];

const SOURCE_LABEL_KEY: Record<ReservationSource, string> = {
  "Direct Booking": "reservations.source.directBooking",
  Website: "reservations.source.website",
  "Walk In": "reservations.source.walkIn",
  Phone: "reservations.source.phone",
  Instagram: "reservations.source.instagram",
};

// Shared outline pill style for Today / Tomorrow / the date input. Split into
// a base (layout) and two full colour variants rather than layering an
// "active" override on top of the outline classes, so Tailwind's hover
// utilities never fight each other over source order.
const PILL_BASE = "inline-flex items-center gap-1.5 rounded-[9px] border px-3 py-[7px] text-[12px] transition-colors";
const PILL_OUTLINE = "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]";
const PILL_ACTIVE = "border-[#0D6EFD] bg-[#0D6EFD] text-white";

export interface FilterBarProps {
  filters: ListFilters;
  onChange: (next: ListFilters) => void;
  areas: readonly string[];
}

export function FilterBar({ filters, onChange, areas }: FilterBarProps) {
  const { t } = useI18n();

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

      <label className={clsx(PILL_BASE, "cursor-pointer", filters.day === "date" ? PILL_ACTIVE : PILL_OUTLINE)}>
        <CalendarDays size={13} />
        <input
          type="date"
          value={filters.date}
          onChange={(e) => onChange({ ...filters, day: "date", date: e.target.value })}
          className="bg-transparent text-[12px] outline-none"
        />
      </label>

      <Select
        value={filters.status}
        onChange={(e) => onChange({ ...filters, status: e.target.value })}
        className="!w-auto !py-[7px]"
      >
        <option value="">{t("reservations.list.filter.allStatus")}</option>
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {t(STATUS_LABEL_KEY[status])}
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
