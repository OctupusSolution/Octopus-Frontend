// Booking mode: pick a time and a party size, and the floor answers — green
// tables can take that party then, red ones cannot.
import { CalendarDays, CircleCheck, CircleSlash, Info, Users } from "lucide-react";
import clsx from "clsx";
import {
  MAX_PARTY_SIZE,
  bookingAt,
  isAvailable,
  slotsForDay,
  startOfDay,
  type Availability,
  type AvailabilitySummary,
  type Booking,
} from "@/entities/floor-plan";
import { useI18n } from "@/app/providers/i18n-provider";
import { Dropdown, MenuItem } from "../_shared/dropdown";
import { NumberStepper } from "../_shared/fields";
import { formatNumber, formatTime } from "../_shared/format";
import { seatsLabel } from "../_shared/labels";
import type { LiveEntry } from "../_shared/use-floor-plan";

export interface SlotQuery {
  at: number;
  partySize: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function BookingBar({
  query,
  onQueryChange,
  summary,
  now,
  className,
}: {
  query: SlotQuery;
  onQueryChange: (query: SlotQuery) => void;
  summary: AvailabilitySummary;
  now: number;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const today = startOfDay(now);
  const selectedDay = startOfDay(query.at);
  const isToday = selectedDay === today;
  const slots = slotsForDay(query.at);

  function pickDay(dayStart: number) {
    const minutes = new Date(query.at).getHours() * 60 + new Date(query.at).getMinutes();
    const candidates = slotsForDay(dayStart + 12 * 60 * 60 * 1000);
    const sameTime = candidates.find((slot) => {
      const date = new Date(slot);
      return date.getHours() * 60 + date.getMinutes() === minutes;
    });
    const next = candidates.find((slot) => slot >= now);
    onQueryChange({ ...query, at: sameTime && sameTime >= now ? sameTime : next ?? candidates[0] });
  }

  return (
    <section className={clsx("rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-soft-bg)] px-5 py-4", className)}>
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div>
          <p className="mb-1.5 text-[13px] font-medium text-[var(--octo-text-secondary)]">{t("floorPlan.booking.day")}</p>
          <div className="flex rounded-[10px] bg-[var(--octo-seg-bg)] p-1" role="radiogroup">
            {[
              { key: "today", day: today, label: t("floorPlan.booking.today") },
              { key: "tomorrow", day: today + DAY_MS, label: t("floorPlan.booking.tomorrow") },
            ].map((option) => {
              const active = startOfDay(option.day) === selectedDay;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => pickDay(option.day)}
                  className={clsx(
                    "h-9 rounded-lg px-4 text-[13.5px] font-medium transition-colors",
                    active ? "bg-[var(--octo-card)] text-[#0D6EFD] shadow-sm" : "text-[var(--octo-text-secondary)]"
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-[150px]">
          <p className="mb-1.5 text-[13px] font-medium text-[var(--octo-text-secondary)]">{t("floorPlan.booking.time")}</p>
          <Dropdown label={formatTime(query.at, locale)} icon={<CalendarDays size={16} />} buttonClassName="w-full" panelClassName="max-h-[280px] overflow-y-auto">
            {(close) =>
              slots.map((slot) => (
                <MenuItem
                  key={slot}
                  label={formatTime(slot, locale)}
                  selected={slot === query.at}
                  disabled={isToday && slot < now}
                  onClick={() => {
                    onQueryChange({ ...query, at: slot });
                    close();
                  }}
                />
              ))
            }
          </Dropdown>
        </div>

        <div className="min-w-[168px]">
          <p className="mb-1.5 text-[13px] font-medium text-[var(--octo-text-secondary)]">{t("floorPlan.booking.party")}</p>
          <NumberStepper
            value={query.partySize}
            min={1}
            max={MAX_PARTY_SIZE}
            label={t("floorPlan.booking.party")}
            suffix={t("floorPlan.booking.guests")}
            onChange={(partySize) => onQueryChange({ ...query, partySize })}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 pb-0.5">
          <span className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[14px] font-medium" style={{ backgroundColor: "var(--octo-tone-success-bg)", color: "var(--octo-tone-success-text)" }}>
            <CircleCheck size={16} />
            {t("floorPlan.booking.availableCount").replace("{n}", formatNumber(summary.available, locale))}
            <span className="text-[12px] opacity-80">· {seatsLabel(summary.seats, t)}</span>
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[14px] font-medium" style={{ backgroundColor: "var(--octo-tone-danger-bg)", color: "var(--octo-tone-danger-text)" }}>
            <CircleSlash size={16} />
            {t("floorPlan.booking.unavailableCount").replace("{n}", formatNumber(summary.unavailable, locale))}
          </span>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-2 text-[13px] text-[var(--octo-text-secondary)]">
        <Info size={15} className="shrink-0 text-[#0D6EFD]" />
        {t("floorPlan.booking.tip")}
      </p>
    </section>
  );
}

const REASON_KEY: Record<Availability, string> = {
  available: "floorPlan.booking.reason.available",
  booked: "floorPlan.booking.reason.booked",
  tooSmall: "floorPlan.booking.reason.tooSmall",
  blocked: "floorPlan.booking.reason.blocked",
  notReservable: "floorPlan.booking.reason.notReservable",
  largePartyOnly: "floorPlan.booking.reason.largePartyOnly",
};

/** The right-hand card while booking mode is on. */
export function BookingTablePanel({
  entry,
  availability,
  bookings,
  query,
  onBook,
  onCancelBooking,
}: {
  entry: LiveEntry | null;
  availability: Availability | null;
  bookings: readonly Booking[];
  query: SlotQuery;
  onBook: () => void;
  onCancelBooking: (booking: Booking) => void;
}) {
  const { t, locale } = useI18n();

  if (!entry || !availability) {
    return (
      <section className="flex flex-col items-center gap-2 rounded-[20px] border border-dashed border-[var(--octo-border-input)] bg-[var(--octo-card)] px-5 py-8 text-center">
        <CalendarDays size={26} className="text-[var(--octo-text-faint)]" />
        <p className="text-[14px] font-medium text-[var(--octo-text-primary)]">{t("floorPlan.booking.selectTitle")}</p>
        <p className="text-[12.5px] text-[var(--octo-text-muted)]">{t("floorPlan.booking.selectBody")}</p>
      </section>
    );
  }

  const free = isAvailable(availability);
  const ours = bookingAt(entry.table.id, query.at, bookings);

  return (
    <section className="rounded-[20px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-semibold text-[var(--octo-text-primary)]">
          {t("floorPlan.live.detail.title").replace("{number}", entry.table.number)}
        </h2>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium"
          style={{
            backgroundColor: free ? "var(--octo-tone-success-bg)" : "var(--octo-tone-danger-bg)",
            color: free ? "var(--octo-tone-success-text)" : "var(--octo-tone-danger-text)",
          }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          {t(free ? "floorPlan.booking.legend.available" : "floorPlan.booking.legend.unavailable")}
        </span>
      </div>

      <dl className="mt-2 flex flex-col gap-1 text-[14px]">
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-2 text-[var(--octo-text-secondary)]">
            <Users size={16} className="text-[var(--octo-text-muted)]" />
            {t("floorPlan.live.detail.capacity")}
          </dt>
          <dd className="font-medium text-[var(--octo-text-primary)]">{seatsLabel(entry.table.seats, t)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-2 text-[var(--octo-text-secondary)]">
            <CalendarDays size={16} className="text-[var(--octo-text-muted)]" />
            {t("floorPlan.booking.slot")}
          </dt>
          <dd className="font-medium text-[var(--octo-text-primary)]">{formatTime(query.at, locale)}</dd>
        </div>
      </dl>

      <p className="mt-2.5 rounded-xl bg-[var(--octo-soft-bg)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--octo-text-secondary)]">
        {t(REASON_KEY[availability]).replace("{n}", String(query.partySize))}
      </p>

      {ours ? (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[12.5px] text-[var(--octo-text-secondary)]">
            {t("floorPlan.booking.heldFor").replace("{name}", ours.guestName || t("floorPlan.live.message.guestFallback")).replace("{n}", String(ours.partySize))}
          </p>
          <button
            type="button"
            onClick={() => onCancelBooking(ours)}
            className="h-11 rounded-[10px] border border-[#EF4444]/40 text-[14px] font-semibold text-[#DC2626] transition-colors hover:bg-[#FEE2E2]"
          >
            {t("floorPlan.booking.cancel")}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!free}
          onClick={onBook}
          className="mt-3 h-12 w-full rounded-[12px] bg-[#0D6EFD] text-[15px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("floorPlan.booking.book")}
        </button>
      )}
    </section>
  );
}
