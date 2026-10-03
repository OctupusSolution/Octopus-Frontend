import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import {
  CONTACT_CHANNELS,
  DEFAULT_FILTERS,
  PARTY_SIZE_BUCKETS,
  WAITLIST_SORTS,
  WAITLIST_SOURCES,
  WAITLIST_STATUSES,
  advancedFilterCount,
  type WaitlistFilters,
  type WaitlistSort,
} from "@/entities/waitlist-entry";
import { useI18n } from "@/app/providers/i18n-provider";
import { MenuItem } from "@/pages/reservations/floor-plan/_shared/dropdown";
import { useDismiss } from "@/pages/reservations/_shared/use-dismiss";
import { BUCKET_KEY, CHANNEL_KEY, SORT_KEY, SOURCE_KEY, STATUS_KEY } from "./_shared/labels";
import { INK, LINE_SOFT, SUB, SURFACE } from "./_shared/theme";
import { WaitlistIcon } from "./_shared/waitlist-icon";

/** Every control in the frame's toolbar row: 40px tall, 24px glyph, 14px medium label. */
const CONTROL = "h-10 rounded-[8px] px-4 text-[14px] font-medium leading-[14px]";
const OUTLINE = clsx(SURFACE, LINE_SOFT, SUB, "border transition-colors hover:bg-[#F8FAFC] [[data-theme=dark]_&]:hover:bg-[var(--octo-hover)]");

export function ToolbarSelect({ label, children }: { label: ReactNode; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  return (
    <div ref={ref} className="relative shrink-0">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={clsx(CONTROL, OUTLINE, "flex items-center gap-2 whitespace-nowrap")}>
        {label}
        <WaitlistIcon name="arrow-down.svg" className={clsx("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="absolute start-0 top-full z-40 mt-1.5 min-w-full rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1.5 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function WaitlistToolbar({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  areas,
  onExport,
  exportDisabled,
}: {
  filters: WaitlistFilters;
  onFiltersChange: (next: WaitlistFilters) => void;
  sort: WaitlistSort;
  onSortChange: (sort: WaitlistSort) => void;
  areas: readonly string[];
  onExport: () => void;
  exportDisabled: boolean;
}) {
  const { t } = useI18n();
  const set = (patch: Partial<WaitlistFilters>) => onFiltersChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className={clsx(SURFACE, LINE_SOFT, SUB, "flex h-10 min-w-[200px] flex-1 items-center gap-2 rounded-[12px] border px-4 focus-within:border-[#0D6EFD]")}>
        <span className="sr-only">{t("waitlist.toolbar.search")}</span>
        <WaitlistIcon name="search.svg" />
        <input
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          placeholder={t("waitlist.toolbar.search")}
          className={clsx(INK, "h-full min-w-0 flex-1 bg-transparent text-[14px] font-medium leading-[14px] placeholder:text-[#687280] focus:outline-none [[data-theme=dark]_&]:placeholder:text-[var(--octo-text-muted)]")}
        />
        {filters.query && (
          <button type="button" onClick={() => set({ query: "" })} aria-label={t("waitlist.toolbar.clearSearch")} className="grid h-6 w-6 shrink-0 place-items-center rounded-md hover:bg-[var(--octo-hover)]">
            <X size={14} />
          </button>
        )}
      </label>

      <FiltersPopover filters={filters} onChange={onFiltersChange} />

      <ToolbarSelect label={filters.area || t("waitlist.toolbar.allAreas")}>
        {(close) => (
          <>
            <MenuItem label={t("waitlist.toolbar.allAreas")} selected={!filters.area} onClick={() => { set({ area: "" }); close(); }} />
            {areas.map((area) => (
              <MenuItem key={area} label={area} selected={filters.area === area} onClick={() => { set({ area }); close(); }} />
            ))}
          </>
        )}
      </ToolbarSelect>

      <ToolbarSelect label={t(BUCKET_KEY[filters.partySize])}>
        {(close) =>
          PARTY_SIZE_BUCKETS.map((bucket) => (
            <MenuItem key={bucket} label={t(BUCKET_KEY[bucket])} selected={filters.partySize === bucket} onClick={() => { set({ partySize: bucket }); close(); }} />
          ))
        }
      </ToolbarSelect>

      <ToolbarSelect
        label={
          <span>
            {t("waitlist.toolbar.sortedBy")}_<span className="text-[12px] font-normal leading-[12px]">{t(SORT_KEY[sort])}</span>
          </span>
        }
      >
        {(close) =>
          WAITLIST_SORTS.map((option) => (
            <MenuItem key={option} label={t(SORT_KEY[option])} selected={sort === option} onClick={() => { onSortChange(option); close(); }} />
          ))
        }
      </ToolbarSelect>

      <button
        type="button"
        onClick={onExport}
        disabled={exportDisabled}
        className={clsx(CONTROL, "flex shrink-0 items-center gap-2 bg-[#007BFF] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50")}
      >
        <WaitlistIcon name="export.svg" />
        {t("waitlist.toolbar.export")}
      </button>
    </div>
  );
}

function FiltersPopover({ filters, onChange }: { filters: WaitlistFilters; onChange: (next: WaitlistFilters) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useDismiss(open, () => setOpen(false));
  const count = advancedFilterCount(filters);

  function toggle<K extends "statuses" | "sources" | "channels">(key: K, value: WaitlistFilters[K][number]) {
    const list = filters[key] as readonly string[];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    onChange({ ...filters, [key]: next });
  }

  const group = <K extends "statuses" | "sources" | "channels">(key: K, title: string, values: readonly WaitlistFilters[K][number][], labelKey: Record<string, string>) => (
    <fieldset className="border-t border-[var(--octo-divider)] pt-3 first:border-0 first:pt-0">
      <legend className="mb-2 text-[12px] font-semibold text-[var(--octo-text-muted)]">{title}</legend>
      <div className="flex flex-wrap gap-1.5">
        {values.map((value) => {
          const on = (filters[key] as readonly string[]).includes(value);
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(key, value)}
              className={clsx(
                "rounded-full border px-3 py-1 text-[12.5px] transition-colors",
                on ? "border-[#0D6EFD] bg-[var(--octo-tone-info-bg)] font-medium text-[var(--octo-tone-info-text)]" : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
              )}
            >
              {t(labelKey[value])}
            </button>
          );
        })}
      </div>
    </fieldset>
  );

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
        className={clsx(CONTROL, OUTLINE, "flex items-center gap-2", count > 0 && "!border-[#0D6EFD] !text-[#0D6EFD]")}
      >
        <WaitlistIcon name="filter.svg" />
        {t("waitlist.toolbar.filters")}
        {count > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#0D6EFD] px-1 text-[11px] font-semibold text-white">{count}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label={t("waitlist.toolbar.filters")} className="absolute start-0 top-full z-40 mt-1.5 w-[320px] max-w-[calc(100vw-32px)] rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
          <div className="flex flex-col gap-3">
            {group("statuses", t("waitlist.filters.status"), WAITLIST_STATUSES, STATUS_KEY)}
            {group("sources", t("waitlist.filters.source"), WAITLIST_SOURCES, SOURCE_KEY)}
            {group("channels", t("waitlist.filters.channel"), CONTACT_CHANNELS, CHANNEL_KEY)}
          </div>
          <div className="mt-4 flex justify-between gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...filters, statuses: DEFAULT_FILTERS.statuses, sources: [], channels: [] })}
              className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
            >
              {t("waitlist.filters.reset")}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg bg-[#0D6EFD] px-4 py-1.5 text-[13px] font-medium text-white hover:opacity-90">
              {t("waitlist.filters.done")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
