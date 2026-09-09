import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ChefHat, Clock, LayoutGrid, ListChecks, Users } from "lucide-react";
import { reservations, TODAY, type Reservation, type ReservationStatus } from "@/shared/api/mock-reservations";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_COLOR: Record<ReservationStatus, string> = {
  Pending: "#F59E0B",
  Confirmed: "#0D6EFD",
  Arrived: "#6366F1",
  Seated: "#22C55E",
  Completed: "#a9a9b2",
  "No-show": "#EF4444",
  Cancelled: "#9ca3af",
};

// Fixed 14:30 reference point, matching the calendar's mock "now" on TODAY.
const NOW_MINUTES = 870;

// hour < 10 means "after midnight", stored as the next-day offset (24 + hour).
function clock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const displayHour = h % 24;
  return `${String(displayHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[9px] border border-[var(--octo-divider)] bg-[var(--octo-track)] px-3 py-2.5">
      <span className="block text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
        {label}
      </span>
      <span className="mt-0.5 block text-[22px] font-bold leading-none text-[var(--octo-text-primary)]">{value}</span>
    </div>
  );
}

function UpcomingRow({ row }: { row: Reservation }) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-[9px] border border-[var(--octo-divider)] px-2.5 py-2">
      <span className="flex items-center gap-2 text-[12px] font-medium text-[var(--octo-text-primary)]">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: STATUS_COLOR[row.status] }} />
        <Clock size={12} className="text-[var(--octo-text-faint)]" />
        {clock(row.startMinutes)}
        <span className="text-[var(--octo-text-primary)]">{row.guest}</span>
      </span>
      <span className="text-[11px] text-[var(--octo-text-muted)]">
        <Users size={11} className="inline align-[-1px]" /> {row.partySize} · {row.table}
      </span>
    </li>
  );
}

const QUICK_LINKS = [
  {
    id: "calendar",
    path: "/reservations/calendar",
    icon: CalendarDays,
    titleKey: "reservations.hub.quick.calendar",
    descKey: "reservations.hub.quick.calendarDesc",
  },
  {
    id: "floor-plan",
    path: "/reservations/floor-plan",
    icon: LayoutGrid,
    titleKey: "reservations.hub.quick.floorPlan",
    descKey: "reservations.hub.quick.floorPlanDesc",
  },
  {
    id: "waitlist",
    path: "/reservations/waitlist",
    icon: ListChecks,
    titleKey: "reservations.hub.quick.waitlist",
    descKey: "reservations.hub.quick.waitlistDesc",
  },
  {
    id: "events",
    path: "/reservations/events",
    icon: ChefHat,
    titleKey: "reservations.hub.quick.events",
    descKey: "reservations.hub.quick.eventsDesc",
  },
];

export function ReservationsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const todayRows = useMemo(() => reservations.filter((r) => r.date === TODAY), []);
  const covers = todayRows
    .filter((r) => r.status !== "Cancelled" && r.status !== "No-show")
    .reduce((sum, r) => sum + r.partySize, 0);
  const confirmedCount = todayRows.filter((r) => r.status === "Confirmed").length;
  const seatedCount = todayRows.filter((r) => r.status === "Seated").length;
  const noShowCount = todayRows.filter((r) => r.status === "No-show").length;
  const upcoming = [...todayRows]
    .filter((r) => r.status === "Confirmed" && r.startMinutes > NOW_MINUTES)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("reservations.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("reservations.subtitle")}
          </p>
        </div>
      </header>

      <section className="mt-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
            {t("reservations.hub.scheduleTitle")}
          </h2>
          <span className="text-[11px] text-[var(--octo-text-muted)]">{t("reservations.calendar.today")}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("reservations.calendar.rail.covers")} value={covers} />
          <Stat label={t("reservations.calendar.rail.confirmed")} value={confirmedCount} />
          <Stat label={t("reservations.calendar.rail.seated")} value={seatedCount} />
          <Stat label={t("reservations.calendar.rail.noShow")} value={noShowCount} />
        </div>

        <div className="mt-4 border-t border-[var(--octo-divider)] pt-3">
          <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
            {t("reservations.calendar.rail.upcoming")}
          </h3>
          {upcoming.length > 0 ? (
            <ul className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {upcoming.map((row) => (
                <UpcomingRow key={row.id} row={row} />
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] text-[var(--octo-text-muted)]">{t("reservations.hub.scheduleEmpty")}</p>
          )}
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("reservations.hub.quickTitle")}</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => navigate(link.path)}
                className="group flex flex-col gap-2 rounded-[9px] border border-[var(--octo-divider)] p-3 text-start transition-colors hover:bg-[var(--octo-hover)]"
              >
                <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--octo-track)] text-[var(--octo-text-secondary)] transition-colors group-hover:bg-[#0D6EFD]/10 group-hover:text-[#0D6EFD]">
                  <Icon size={15} />
                </span>
                <span>
                  <span className="block text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
                    {t(link.titleKey)}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[var(--octo-text-muted)]">{t(link.descKey)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
