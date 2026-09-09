import { useEffect, useMemo, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Phone,
  Users,
  Tag,
  MapPin,
  AlertTriangle,
  Clock,
  User,
  CalendarDays,
  LayoutGrid,
  Utensils,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Badge, Button, Input, Modal, Select, Segmented } from "@ui/primitives";
import {
  reservations as initialReservations,
  branches,
  TODAY,
  type Branch,
  type Reservation,
  type ReservationStatus,
  type ReservationSource,
} from "@/shared/api/mock-reservations";
import { useI18n } from "@/app/providers/i18n-provider";
import { nextId, nextRef } from "../_shared/model";
import { TONE } from "../_shared/status-pill";

const TIME_START = 600; // 10:00
const TIME_END = 1560; // 02:00 the next day
const ROW_MINUTES = 30;
const ROW_HEIGHT = 28;
const ROWS = (TIME_END - TIME_START) / ROW_MINUTES;
const NOW_MINUTES = 870; // fixed 14:30 reference point for "upcoming" on the mock's TODAY

// The row pill's own colour map (fix round 4, finding 13) — this file used
// to keep a second, independently-drifted copy (Confirmed blue here vs.
// gold on the list, No-show red here vs. slate on the list); TONE in
// _shared/status-pill.tsx is the one sampled from the frames and is
// authoritative.

const STATUS_TONE: Record<ReservationStatus, "success" | "error" | "warning" | "info" | "neutral"> = {
  Pending: "warning",
  Confirmed: "info",
  Arrived: "info",
  Seated: "success",
  Completed: "neutral",
  "No-show": "error",
  Cancelled: "neutral",
};

const STATUS_KEY: Record<ReservationStatus, string> = {
  Pending: "status.pending",
  Confirmed: "status.confirmed",
  Arrived: "status.arrived",
  Seated: "status.seated",
  Completed: "status.completed",
  "No-show": "status.noShow",
  Cancelled: "status.cancelled",
};

const SOURCE_KEY: Record<ReservationSource, string> = {
  "Direct Booking": "reservations.source.directBooking",
  Website: "reservations.source.website",
  "Walk In": "reservations.source.walkIn",
  Phone: "reservations.source.phone",
  Instagram: "reservations.source.instagram",
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}
function addMonths(d: Date, n: number): Date {
  const next = new Date(d);
  next.setMonth(next.getMonth() + n);
  return next;
}
// Week starts Saturday — the Saudi operating week.
function getWeekStart(d: Date): Date {
  const date = new Date(d);
  const diff = (date.getDay() + 1) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${pad2(h)}:${pad2(m)}`;
}
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const hour = h < 10 ? h + 24 : h;
  return hour * 60 + m;
}

type CalendarMode = "gregorian" | "hijri";

// Locale-aware DateTimeFormat; the Hijri calendar uses the Saudi Umm al-Qura
// variant so Gregorian dates map to the official civil calendar used in KSA.
function makeDt(locale: string, calendar: CalendarMode, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(locale, {
    ...options,
    numberingSystem: "latn",
    ...(calendar === "hijri" ? { calendar: "islamic-umalqura" } : {}),
  });
}

interface LaidOutReservation extends Reservation {
  col: number;
  cols: number;
}

// Greedy interval-column layout so overlapping reservations sit side by side
// instead of stacking on top of each other.
function layoutDay(dayReservations: Reservation[]): LaidOutReservation[] {
  const sorted = [...dayReservations].sort(
    (a, b) => a.startMinutes - b.startMinutes || a.durationMinutes - b.durationMinutes
  );
  const result: LaidOutReservation[] = [];
  let cluster: LaidOutReservation[] = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (cluster.length === 0) return;
    const colEnds: number[] = [];
    for (const ev of cluster) {
      let placed = false;
      for (let c = 0; c < colEnds.length; c++) {
        if (colEnds[c] <= ev.startMinutes) {
          ev.col = c;
          colEnds[c] = ev.startMinutes + ev.durationMinutes;
          placed = true;
          break;
        }
      }
      if (!placed) {
        ev.col = colEnds.length;
        colEnds.push(ev.startMinutes + ev.durationMinutes);
      }
    }
    const cols = colEnds.length;
    for (const ev of cluster) ev.cols = cols;
    result.push(...cluster);
    cluster = [];
  };

  for (const r of sorted) {
    const ev: LaidOutReservation = { ...r, col: 0, cols: 1 };
    if (ev.startMinutes >= clusterEnd) {
      flush();
      clusterEnd = ev.startMinutes + ev.durationMinutes;
    } else {
      clusterEnd = Math.max(clusterEnd, ev.startMinutes + ev.durationMinutes);
    }
    cluster.push(ev);
  }
  flush();
  return result;
}

type ViewMode = "day" | "week" | "month";

export function ReservationCalendarPage() {
  const { t, locale } = useI18n();
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState<Date>(() => fromISO(TODAY));
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [calendar, setCalendar] = useState<CalendarMode>("gregorian");
  const [refreshing, setRefreshing] = useState(false);
  const [updatedJustNow, setUpdatedJustNow] = useState(false);
  const [rows, setRows] = useState<Reservation[]>(() => initialReservations.map((r) => ({ ...r })));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<{
    guest: string;
    phone: string;
    partySize: string;
    table: string;
    branch: Branch;
    date: string;
    time: string;
  }>({
    guest: "",
    phone: "",
    partySize: "2",
    table: "T-01",
    branch: branches[0],
    date: TODAY,
    time: "19:00",
  });

  const resetForm = () =>
    setForm({ guest: "", phone: "", partySize: "2", table: "T-01", branch: branches[0], date: TODAY, time: "19:00" });

  const createReservation = () => {
    const newReservation: Reservation = {
      // Deterministic ids/refs (fix round 4, findings 14 and 21) — this
      // used to be `res-${Date.now()}` (the module's "now" is NOW_MINUTES,
      // not the wall clock) and a hardcoded "RSV-NEW" ref shared by every
      // reservation created here, which nextRef's own regex can't advance
      // past. Both are scanned off current state the same way the list
      // page's Add/Duplicate do.
      id: nextId(rows),
      date: form.date || TODAY,
      startMinutes: timeToMinutes(form.time || "19:00"),
      durationMinutes: 90,
      ref: nextRef(rows),
      guest: form.guest,
      phone: form.phone || "+9665XXXXXXXX",
      partySize: Number(form.partySize) || 2,
      area: "Main Dining",
      table: form.table || "T-01",
      branch: form.branch,
      source: "Phone",
      status: "Confirmed",
    };
    setRows((prev) => [newReservation, ...prev]);
    setCreateOpen(false);
    resetForm();
  };

  const dtLocale = locale === "ar" ? "ar" : "en";
  const filtered = useMemo(
    () => (branchFilter === "all" ? rows : rows.filter((r) => r.branch === branchFilter)),
    [rows, branchFilter]
  );

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const goToday = () => setAnchor(fromISO(TODAY));
  const goPrev = () =>
    setAnchor((d) => (view === "day" ? addDays(d, -1) : view === "week" ? addDays(d, -7) : addMonths(d, -1)));
  const goNext = () =>
    setAnchor((d) => (view === "day" ? addDays(d, 1) : view === "week" ? addDays(d, 7) : addMonths(d, 1)));

  const handleRefresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    window.setTimeout(() => {
      setRefreshing(false);
      setUpdatedJustNow(true);
    }, 900);
  };

  const rangeLabel = useMemo(() => {
    if (view === "day") {
      return makeDt(dtLocale, calendar, {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      }).format(anchor);
    }
    if (view === "month") {
      return makeDt(dtLocale, calendar, { month: "long", year: "numeric" }).format(anchor);
    }
    const start = getWeekStart(anchor);
    const end = addDays(start, 6);
    const startLabel = makeDt(dtLocale, calendar, { weekday: "short", day: "numeric" }).format(start);
    const endLabel = makeDt(dtLocale, calendar, {
      weekday: "short", day: "numeric", month: "short", year: "numeric",
    }).format(end);
    return `${startLabel} – ${endLabel}`;
  }, [view, anchor, dtLocale, calendar]);

  const todayRows = useMemo(() => filtered.filter((r) => r.date === TODAY), [filtered]);
  const covers = todayRows
    .filter((r) => r.status !== "Cancelled" && r.status !== "No-show")
    .reduce((sum, r) => sum + r.partySize, 0);
  const confirmedCount = todayRows.filter((r) => r.status === "Confirmed").length;
  const seatedCount = todayRows.filter((r) => r.status === "Seated").length;
  const noShowCount = todayRows.filter((r) => r.status === "No-show").length;
  const upcoming = [...todayRows]
    .filter((r) => r.status === "Confirmed" && r.startMinutes > NOW_MINUTES)
    .sort((a, b) => a.startMinutes - b.startMinutes)
    .slice(0, 5);

  const updateStatus = (id: string, status: ReservationStatus) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("reservations.calendar.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("reservations.calendar.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden items-center gap-1.5 text-[11.5px] text-[var(--octo-text-muted)] md:flex">
            <Clock size={13} />
            {t(updatedJustNow ? "reservations.calendar.updatedJustNow" : "reservations.calendar.live")}
          </span>

          <button
            type="button"
            aria-label={t("common.refresh")}
            title={t("common.refresh")}
            onClick={handleRefresh}
            className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : undefined} />
          </button>

          <Button variant="primary" icon={<Plus size={13} />} onClick={() => setCreateOpen(true)}>
            {t("reservations.newReservation")}
          </Button>
        </div>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t("reservations.calendar.previous")}
            onClick={goPrev}
            className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <ChevronLeft size={14} className="rtl:rotate-180" />
          </button>
          <Button variant="secondary" size="sm" onClick={goToday}>
            {t("reservations.calendar.today")}
          </Button>
          <button
            type="button"
            aria-label={t("reservations.calendar.next")}
            onClick={goNext}
            className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <ChevronRight size={14} className="rtl:rotate-180" />
          </button>
        </div>

        <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{rangeLabel}</span>

        <div className="ms-auto flex flex-wrap items-center gap-2">
          <Segmented
            options={[
              { id: "day", label: t("reservations.calendar.view.day") },
              { id: "week", label: t("reservations.calendar.view.week") },
              { id: "month", label: t("reservations.calendar.view.month") },
            ]}
            value={view}
            onChange={(id) => setView(id as ViewMode)}
          />
          <Segmented
            options={[
              { id: "gregorian", label: t("reservations.calendar.calendar.gregorian") },
              { id: "hijri", label: t("reservations.calendar.calendar.hijri") },
            ]}
            value={calendar}
            onChange={(id) => setCalendar(id as CalendarMode)}
          />
          <Select className="w-[170px]" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="all">{t("reservations.calendar.branch.all")}</option>
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("reservations.calendar.rail.todayTitle")}</h2>
            <span className="text-[11px] text-[var(--octo-text-muted)]">{t("reservations.calendar.today")}</span>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <RailStat label={t("reservations.calendar.rail.covers")} value={covers} />
            <RailStat label={t("reservations.calendar.rail.confirmed")} value={confirmedCount} />
            <RailStat label={t("reservations.calendar.rail.seated")} value={seatedCount} />
            <RailStat label={t("reservations.calendar.rail.noShow")} value={noShowCount} />
          </dl>

          <div className="mt-4 border-t border-[var(--octo-divider)] pt-3">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("reservations.calendar.rail.upcoming")}
            </h3>
            {upcoming.length > 0 ? (
              <ul className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {upcoming.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className="flex w-full items-center justify-between gap-2 rounded-[9px] border border-[var(--octo-divider)] px-2.5 py-2 text-start transition-colors hover:bg-[var(--octo-hover)]"
                    >
                      <span>
                        <span className="block text-[12px] font-medium text-[var(--octo-text-primary)]">{r.guest}</span>
                        <span className="block text-[11px] text-[var(--octo-text-muted)]">
                          {formatClock(r.startMinutes)} · {r.table} · {r.partySize}
                        </span>
                      </span>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: TONE[r.status].dot }} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12px] text-[var(--octo-text-muted)]">{t("reservations.calendar.rail.noUpcoming")}</p>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          {view === "day" && <DayGrid date={anchor} reservations={filtered} onSelect={setSelectedId} />}
          {view === "week" && (
            <WeekGrid
              start={getWeekStart(anchor)}
              reservations={filtered}
              onSelect={setSelectedId}
              dtLocale={dtLocale}
              calendar={calendar}
            />
          )}
          {view === "month" && (
            <MonthGrid
              anchor={anchor}
              reservations={filtered}
              onSelect={setSelectedId}
              onShowMore={(date) => { setAnchor(date); setView("day"); }}
              dtLocale={dtLocale}
              calendar={calendar}
            />
          )}
        </section>
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
              {t("reservations.modal.title")}
            </span>
            <button
              type="button"
              aria-label={t("common.cancel")}
              onClick={() => setCreateOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
            >
              <X size={15} />
            </button>
          </div>
        }
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button size="sm" onClick={createReservation} disabled={!form.guest.trim()}>
              {t("reservations.modal.add")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            label={t("reservations.modal.guest")}
            value={form.guest}
            onChange={(e) => setForm((f) => ({ ...f, guest: e.target.value }))}
          />
          <Input
            label={t("reservations.modal.phone")}
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min={1}
              label={t("reservations.modal.partySize")}
              value={form.partySize}
              onChange={(e) => setForm((f) => ({ ...f, partySize: e.target.value }))}
            />
            <Input
              label={t("reservations.modal.table")}
              value={form.table}
              onChange={(e) => setForm((f) => ({ ...f, table: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="date"
              label={t("reservations.modal.date")}
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
            <Input
              type="time"
              label={t("reservations.modal.time")}
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
            />
          </div>
          <Select
            label={t("reservations.modal.branch")}
            value={form.branch}
            onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value as Branch }))}
          >
            {branches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </Select>
        </div>
      </Modal>

      <ReservationDrawer
        reservation={selected}
        onClose={() => setSelectedId(null)}
        onUpdateStatus={updateStatus}
        dtLocale={dtLocale}
        calendar={calendar}
      />
    </div>
  );
}

function RailStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</dt>
      <dd className="mt-0.5 text-[20px] font-bold text-[var(--octo-text-primary)]">{value}</dd>
    </div>
  );
}

function ReservationBlock({
  reservation,
  onSelect,
  dense,
}: {
  reservation: LaidOutReservation;
  onSelect: (id: string) => void;
  dense: boolean;
}) {
  const top = ((reservation.startMinutes - TIME_START) / ROW_MINUTES) * ROW_HEIGHT;
  const height = Math.max((reservation.durationMinutes / ROW_MINUTES) * ROW_HEIGHT - 2, 18);
  const tone = TONE[reservation.status];
  const cancelled = reservation.status === "Cancelled";
  const width = `calc(${100 / reservation.cols}% - 4px)`;
  const insetInlineStart = `calc(${(100 / reservation.cols) * reservation.col}% + 2px)`;
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={() => onSelect(reservation.id)}
      className={clsx(
        "absolute overflow-hidden rounded-[6px] border px-1.5 py-1 text-start shadow-sm transition-opacity hover:opacity-90",
        cancelled ? "bg-[var(--octo-track)]" : tone.bg
      )}
      style={{
        top,
        height,
        width,
        insetInlineStart,
        borderColor: cancelled ? "var(--octo-border-input)" : tone.dot,
        backgroundImage: cancelled
          ? "repeating-linear-gradient(45deg, var(--octo-border-input) 0, var(--octo-border-input) 3px, var(--octo-track) 3px, var(--octo-track) 7px)"
          : undefined,
      }}
    >
      <span className={clsx("block truncate text-[10.5px] font-semibold", cancelled ? "text-[var(--octo-text-secondary)]" : tone.text)}>
        {formatClock(reservation.startMinutes)} · {reservation.guest}
      </span>
      {!dense && (
        <span className="block truncate text-[10px] text-[var(--octo-text-secondary)]">
          {t("reservations.calendar.partyUnit").replace("{n}", String(reservation.partySize))} · {reservation.table}
        </span>
      )}
    </button>
  );
}

function DayGrid({
  date,
  reservations,
  onSelect,
}: {
  date: Date;
  reservations: Reservation[];
  onSelect: (id: string) => void;
}) {
  const { t } = useI18n();
  const dayRows = reservations.filter((r) => r.date === toISO(date));
  const laidOut = layoutDay(dayRows);
  const hourMarks = Array.from({ length: ROWS + 1 }, (_, i) => TIME_START + i * ROW_MINUTES).filter((m) => m % 60 === 0);

  return (
    <div className="octo-scroll max-h-[640px] overflow-y-auto">
      <div className="flex">
        <div className="relative w-[52px] shrink-0" style={{ height: ROWS * ROW_HEIGHT }}>
          {hourMarks.map((m) => (
            <span
              key={m}
              className="absolute -translate-y-1/2 text-[10.5px] text-[var(--octo-text-faint)]"
              style={{ top: ((m - TIME_START) / ROW_MINUTES) * ROW_HEIGHT }}
            >
              {formatClock(m)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 border-s border-[var(--octo-divider)]" style={{ height: ROWS * ROW_HEIGHT }}>
          {Array.from({ length: ROWS }, (_, i) => (
            <div
              key={i}
              className={`absolute inset-x-0 border-t ${(TIME_START + i * ROW_MINUTES) % 60 === 0 ? "border-[var(--octo-border-card)]" : "border-dashed border-[var(--octo-row-border)]"}`}
              style={{ top: i * ROW_HEIGHT }}
            />
          ))}
          {laidOut.length === 0 && (
            <p className="absolute inset-x-0 top-8 text-center text-[12px] text-[var(--octo-text-muted)]">
              {t("reservations.calendar.emptyDay")}
            </p>
          )}
          {laidOut.map((r) => (
            <ReservationBlock key={r.id} reservation={r} onSelect={onSelect} dense={false} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WeekGrid({
  start,
  reservations,
  onSelect,
  dtLocale,
  calendar,
}: {
  start: Date;
  reservations: Reservation[];
  onSelect: (id: string) => void;
  dtLocale: string;
  calendar: CalendarMode;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const hourMarks = Array.from({ length: ROWS + 1 }, (_, i) => TIME_START + i * ROW_MINUTES).filter((m) => m % 60 === 0);
  const dayLabel = makeDt(dtLocale, calendar, { weekday: "short" });
  const dayNum = makeDt(dtLocale, calendar, { day: "numeric" });

  return (
    <div className="octo-scroll max-h-[640px] overflow-auto">
      <div className="flex min-w-[760px]">
        <div className="relative w-[52px] shrink-0" style={{ height: ROWS * ROW_HEIGHT + 34 }}>
          <div style={{ height: 34 }} />
          {hourMarks.map((m) => (
            <span
              key={m}
              className="absolute -translate-y-1/2 text-[10.5px] text-[var(--octo-text-faint)]"
              style={{ top: 34 + ((m - TIME_START) / ROW_MINUTES) * ROW_HEIGHT }}
            >
              {formatClock(m)}
            </span>
          ))}
        </div>
        {days.map((day) => {
          const iso = toISO(day);
          const dayRows = reservations.filter((r) => r.date === iso);
          const laidOut = layoutDay(dayRows);
          const isToday = iso === TODAY;
          return (
            <div key={iso} className="min-w-0 flex-1 border-s border-[var(--octo-divider)]">
              <div
                className={`flex flex-col items-center justify-center border-b border-[var(--octo-divider)] text-[11px] ${isToday ? "bg-info/10 font-semibold text-[#0D6EFD]" : "text-[var(--octo-text-secondary)]"}`}
                style={{ height: 34 }}
              >
                <span>{dayLabel.format(day)}</span>
                <span>{dayNum.format(day)}</span>
              </div>
              <div className="relative" style={{ height: ROWS * ROW_HEIGHT }}>
                {Array.from({ length: ROWS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0 border-t border-dashed border-[var(--octo-row-border)]"
                    style={{ top: i * ROW_HEIGHT }}
                  />
                ))}
                {laidOut.map((r) => (
                  <ReservationBlock key={r.id} reservation={r} onSelect={onSelect} dense />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthGrid({
  anchor,
  reservations,
  onSelect,
  onShowMore,
  dtLocale,
  calendar,
}: {
  anchor: Date;
  reservations: Reservation[];
  onSelect: (id: string) => void;
  onShowMore: (date: Date) => void;
  dtLocale: string;
  calendar: CalendarMode;
}) {
  const { t } = useI18n();
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = getWeekStart(firstOfMonth);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weekdayLabel = makeDt(dtLocale, calendar, { weekday: "short" });
  const dayNum = makeDt(dtLocale, calendar, { day: "numeric" });
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => weekdayLabel.format(addDays(gridStart, i)));

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 pb-1.5 text-center text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">
        {weekdayLabels.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const iso = toISO(day);
          const dayRows = reservations.filter((r) => r.date === iso).sort((a, b) => a.startMinutes - b.startMinutes);
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = iso === TODAY;
          const visible = dayRows.slice(0, 3);
          const extra = dayRows.length - visible.length;
          return (
            <div
              key={iso}
              className={`min-h-[104px] rounded-[9px] border p-1.5 ${inMonth ? "border-[var(--octo-divider)] bg-[var(--octo-card)]" : "border-[var(--octo-row-border)] bg-[var(--octo-row-hover)]"}`}
            >
              <span
                className={
                  isToday
                    ? "grid h-5 w-5 place-items-center rounded-full bg-[#0D6EFD] text-[11px] font-medium text-white"
                    : `text-[11px] font-medium ${inMonth ? "text-[var(--octo-text-primary)]" : "text-[var(--octo-text-faint)]"}`
                }
              >
                {dayNum.format(day)}
              </span>
              <div className="mt-1 flex flex-col gap-1">
                {visible.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelect(r.id)}
                    className={clsx("truncate rounded-[4px] px-1 py-0.5 text-start text-[10px] font-medium", TONE[r.status].bg, TONE[r.status].text)}
                  >
                    {formatClock(r.startMinutes)} {r.guest}
                  </button>
                ))}
                {extra > 0 && (
                  <button
                    type="button"
                    onClick={() => onShowMore(day)}
                    className="text-start text-[10px] font-medium text-[#0D6EFD] hover:underline"
                  >
                    {t("reservations.calendar.moreChip").replace("{n}", String(extra))}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DrawerField({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11.5px] font-medium text-[var(--octo-text-muted)]">{label}</dt>
      <dd className="mt-1 flex items-center gap-2 rounded-[9px] bg-[var(--octo-track)] px-3 py-2 text-[13px] text-[var(--octo-text-primary)]">
        <span className="text-[var(--octo-text-faint)]">{icon}</span>
        {value}
      </dd>
    </div>
  );
}

function DrawerBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11.5px] font-medium text-[var(--octo-text-muted)]">{label}</dt>
      <dd className="mt-1 rounded-[9px] bg-[var(--octo-track)] px-3 py-2 text-[12.5px] text-[var(--octo-text-secondary)]">
        {children}
      </dd>
    </div>
  );
}

function ReservationDrawer({
  reservation,
  onClose,
  onUpdateStatus,
  dtLocale,
  calendar,
}: {
  reservation: Reservation | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: ReservationStatus) => void;
  dtLocale: string;
  calendar: CalendarMode;
}) {
  const { t } = useI18n();
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const open = Boolean(reservation);

  useEffect(() => {
    setConfirmMsg(null);
  }, [reservation?.id]);

  const locked =
    reservation &&
    (reservation.status === "Cancelled" || reservation.status === "Completed" || reservation.status === "No-show");

  const formattedDateTime = useMemo(() => {
    if (!reservation) return "";
    const dateFmt = makeDt(dtLocale, calendar, { year: "numeric", month: "short", day: "numeric" });
    return `${dateFmt.format(new Date(`${reservation.date}T00:00:00`))} / ${formatClock(reservation.startMinutes)}`;
  }, [reservation, dtLocale, calendar]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
            {t("reservations.calendar.drawer.title")}
          </span>
          <button
            type="button"
            aria-label={t("common.cancel")}
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <X size={15} />
          </button>
        </div>
      }
      footer={
        <div className="flex w-full flex-col gap-2.5">
          <Button
            className="w-full justify-center"
            icon={<CheckCircle2 size={15} />}
            disabled={Boolean(locked) || reservation?.status === "Seated"}
            onClick={() => {
              if (!reservation) return;
              onUpdateStatus(reservation.id, "Seated");
              setConfirmMsg(t("reservations.calendar.drawer.seatedConfirm"));
            }}
          >
            {t("reservations.calendar.drawer.seatNow")}
          </Button>
          <div className="grid grid-cols-2 gap-2.5">
            <Button
              variant="ghost"
              icon={<XCircle size={15} />}
              disabled={Boolean(locked)}
              className="justify-center border-0 bg-error/10 text-[#dc2626] hover:bg-error/20"
              onClick={() => {
                if (!reservation) return;
                onUpdateStatus(reservation.id, "Cancelled");
                setConfirmMsg(t("reservations.calendar.drawer.cancelConfirm"));
              }}
            >
              {t("reservations.calendar.drawer.cancel")}
            </Button>
            <Button
              variant="secondary"
              icon={<AlertCircle size={15} />}
              disabled={Boolean(locked)}
              className="justify-center"
              onClick={() => {
                if (!reservation) return;
                onUpdateStatus(reservation.id, "No-show");
                setConfirmMsg(t("reservations.calendar.drawer.noShowConfirm"));
              }}
            >
              {t("reservations.calendar.drawer.markNoShow")}
            </Button>
          </div>
        </div>
      }
    >
      {reservation && (
        <>
          {confirmMsg && (
            <div className="mb-3 rounded-[9px] bg-success/10 px-3 py-2 text-center text-[11.5px] font-medium text-[#16a34a]">
              {confirmMsg}
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3">
            <DrawerField icon={<User size={13} />} label={t("reservations.calendar.drawer.customerName")} value={reservation.guest} />
            <DrawerField icon={<Phone size={13} />} label={t("reservations.calendar.drawer.phone")} value={reservation.phone} />
            <DrawerField icon={<MapPin size={13} />} label={t("reservations.col.branch")} value={reservation.branch} />
            <DrawerField icon={<Utensils size={13} />} label={t("reservations.calendar.drawer.table")} value={reservation.table} />
            <DrawerField
              icon={<CalendarDays size={13} />}
              label={t("reservations.calendar.drawer.dateTime")}
              value={formattedDateTime}
            />
            <DrawerField icon={<LayoutGrid size={13} />} label={t("reservations.calendar.drawer.source")} value={t(SOURCE_KEY[reservation.source])} />
          </dl>

          <div className="mt-3 grid grid-cols-2 gap-3 text-[11.5px] text-[var(--octo-text-faint)]">
            <span className="flex items-center gap-1.5">
              <Users size={12} /> {t("reservations.calendar.drawer.party")}: {reservation.partySize}
            </span>
            <Badge tone={STATUS_TONE[reservation.status]}>{t(STATUS_KEY[reservation.status])}</Badge>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <DrawerBlock label={t("reservations.calendar.drawer.notes")}>
              {reservation.notes ?? t("reservations.calendar.drawer.noNotes")}
            </DrawerBlock>

            <DrawerBlock label={t("reservations.calendar.drawer.allergies")}>
              {reservation.allergyTags && reservation.allergyTags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {reservation.allergyTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-[#c2660a]"
                    >
                      <AlertTriangle size={10} /> {tag}
                    </span>
                  ))}
                </div>
              ) : (
                t("reservations.calendar.drawer.noAllergies")
              )}
            </DrawerBlock>
          </div>
        </>
      )}
    </Modal>
  );
}
