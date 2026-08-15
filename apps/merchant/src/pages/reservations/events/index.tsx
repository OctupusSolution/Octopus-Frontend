import { useEffect, useMemo, useState } from "react";
import { CalendarRange, ChefHat, Monitor, Phone, StickyNote, Users, X } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Button, Checkbox, Modal, Segmented } from "@ui/primitives";
import {
  eventStats,
  eventBookings,
  TODAY,
  type EventBooking,
  type DepositStatus,
  type EventStatus,
} from "@/shared/api/mock-reservations";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const DEPOSIT_TONE: Record<DepositStatus, "success" | "warning" | "neutral"> = {
  "Deposit Paid": "success",
  Pending: "warning",
  Refunded: "neutral",
};

const DEPOSIT_KEY: Record<DepositStatus, string> = {
  "Deposit Paid": "reservations.events.deposit.paid",
  Pending: "reservations.events.deposit.pending",
  Refunded: "reservations.events.deposit.refunded",
};

const STATUS_TONE: Record<EventStatus, "success" | "error" | "warning" | "info" | "neutral"> = {
  Confirmed: "info",
  "Reminder Sent": "warning",
  Completed: "success",
  Cancelled: "error",
};

const STATUS_KEY: Record<EventStatus, string> = {
  Confirmed: "reservations.events.status.confirmed",
  "Reminder Sent": "reservations.events.status.reminderSent",
  Completed: "reservations.events.status.completed",
  Cancelled: "reservations.events.status.cancelled",
};

type Period = "Upcoming" | "This Month" | "Past";

function money(n: number, locale: string): string {
  return `SAR ${new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", {
    numberingSystem: "latn",
    maximumFractionDigits: 0,
  }).format(n)}`;
}

function matchesPeriod(dateISO: string, period: Period): boolean {
  if (period === "Upcoming") return dateISO >= TODAY;
  if (period === "Past") return dateISO < TODAY;
  return dateISO.slice(0, 7) === TODAY.slice(0, 7);
}

export function PrivateEventsPage() {
  const { t, locale } = useI18n();
  const [period, setPeriod] = useState<Period>("Upcoming");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventBooking[]>(() =>
    eventBookings.map((evt) => ({ ...evt, avRequirements: evt.avRequirements?.map((r) => ({ ...r })) }))
  );

  const dtLocale = locale === "ar" ? "ar" : "en";
  const filtered = useMemo(() => events.filter((evt) => matchesPeriod(evt.date, period)), [events, period]);
  const selected = events.find((evt) => evt.id === selectedId) ?? null;

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(dtLocale, { day: "numeric", month: "short", year: "numeric", numberingSystem: "latn" }).format(
      new Date(`${iso}T00:00:00`)
    );

  const updateStatus = (id: string, status: EventStatus) => {
    setEvents((prev) => prev.map((evt) => (evt.id === id ? { ...evt, status } : evt)));
  };

  const toggleAv = (id: string, label: string) => {
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === id
          ? { ...evt, avRequirements: evt.avRequirements?.map((r) => (r.label === label ? { ...r, enabled: !r.enabled } : r)) }
          : evt
      )
    );
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("reservations.events.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("reservations.events.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {eventStats.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Segmented
          options={[
            { id: "Upcoming", label: t("reservations.events.filter.upcoming") },
            { id: "This Month", label: t("reservations.events.filter.thisMonth") },
            { id: "Past", label: t("reservations.events.filter.past") },
          ]}
          value={period}
          onChange={(id) => setPeriod(id as Period)}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((evt) => (
          <EventCard key={evt.id} event={evt} formatDate={formatDate} onSelect={() => setSelectedId(evt.id)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="mt-6 text-center text-[12.5px] text-[var(--octo-text-muted)]">{t("reservations.events.emptyDescription")}</p>
      )}

      <EventDrawer
        event={selected}
        formatDate={formatDate}
        onClose={() => setSelectedId(null)}
        onUpdateStatus={updateStatus}
        onToggleAv={toggleAv}
      />
    </div>
  );
}

function EventCard({
  event,
  formatDate,
  onSelect,
}: {
  event: EventBooking;
  formatDate: (iso: string) => string;
  onSelect: () => void;
}) {
  const { t, locale } = useI18n();
  const paidPct = Math.min(100, Math.round((event.paid / event.total) * 100));

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px] text-start transition-colors hover:bg-[var(--octo-row-hover)]"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[13.5px] font-semibold leading-tight text-[var(--octo-text-primary)]">{event.name}</h2>
        <Badge tone={DEPOSIT_TONE[event.depositStatus]} className="shrink-0">
          {t(DEPOSIT_KEY[event.depositStatus])}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[var(--octo-text-secondary)]">
        <span className="flex items-center gap-1">
          <CalendarRange size={12} /> {t(labelKey(event.room))} · {formatDate(event.date)} · {event.time}
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} /> {t("reservations.events.guests").replace("{n}", String(event.guestCount))}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11.5px]">
        <span className="text-[var(--octo-text-muted)]">{t("reservations.events.organiser")}</span>
        <span className="font-medium text-[var(--octo-text-primary)]">{event.organiser}</span>
      </div>
      <div className="-mt-2 flex items-center justify-between text-[11px] text-[var(--octo-text-faint)]">
        <span className="flex items-center gap-1">
          <Phone size={11} /> {event.organiserPhone}
        </span>
        <Badge tone={STATUS_TONE[event.status]}>{t(STATUS_KEY[event.status])}</Badge>
      </div>

      <div className="flex items-center justify-between text-[11.5px]">
        <span className="text-[var(--octo-text-muted)]">{t("reservations.events.package")}</span>
        <span className="font-medium text-[var(--octo-text-primary)]">{t(labelKey(event.package))}</span>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px] text-[var(--octo-text-muted)]">
          <span>{t("reservations.events.paidOfTotal").replace("{paid}", money(event.paid, locale)).replace("{total}", money(event.total, locale))}</span>
          <span>{paidPct}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--octo-track)]">
          <div className="h-full rounded-full bg-[#0D6EFD]" style={{ width: `${paidPct}%` }} />
        </div>
      </div>
    </button>
  );
}

function EventDrawer({
  event,
  formatDate,
  onClose,
  onUpdateStatus,
  onToggleAv,
}: {
  event: EventBooking | null;
  formatDate: (iso: string) => string;
  onClose: () => void;
  onUpdateStatus: (id: string, status: EventStatus) => void;
  onToggleAv: (id: string, label: string) => void;
}) {
  const { t } = useI18n();
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const open = Boolean(event);

  useEffect(() => {
    setConfirmMsg(null);
  }, [event?.id]);

  const locked = event && (event.status === "Completed" || event.status === "Cancelled");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
            {t("reservations.events.drawer.title")}
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
        <div className="flex w-full flex-wrap items-center gap-2">
          <Button
            size="sm"
            disabled={Boolean(locked) || event?.status === "Confirmed"}
            onClick={() => {
              if (!event) return;
              onUpdateStatus(event.id, "Confirmed");
              setConfirmMsg(t("reservations.events.drawer.confirmedConfirm"));
            }}
          >
            {t("reservations.events.drawer.confirm")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={Boolean(locked)}
            onClick={() => {
              if (!event) return;
              onUpdateStatus(event.id, "Reminder Sent");
              setConfirmMsg(t("reservations.events.drawer.reminderConfirm"));
            }}
          >
            {t("reservations.events.drawer.reminder")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={Boolean(locked)}
            onClick={() => {
              if (!event) return;
              onUpdateStatus(event.id, "Completed");
              setConfirmMsg(t("reservations.events.drawer.completedConfirm"));
            }}
          >
            {t("reservations.events.drawer.completed")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={Boolean(locked)}
            onClick={() => {
              if (!event) return;
              onUpdateStatus(event.id, "Cancelled");
              setConfirmMsg(t("reservations.events.drawer.cancelledConfirm"));
            }}
          >
            {t("reservations.events.drawer.cancel")}
          </Button>
        </div>
      }
    >
      {event && (
        <div className="octo-scroll max-h-[60vh] overflow-y-auto pe-1">
          {confirmMsg && (
            <div className="mb-3 rounded-[9px] bg-success/10 px-3 py-2 text-center text-[11.5px] font-medium text-[#16a34a]">
              {confirmMsg}
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[16px] font-bold text-[var(--octo-text-primary)]">{event.name}</h3>
            <Badge tone={DEPOSIT_TONE[event.depositStatus]}>{t(DEPOSIT_KEY[event.depositStatus])}</Badge>
          </div>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">
            {t(labelKey(event.room))} · {formatDate(event.date)} · {event.time}
          </p>
          <p className="mt-2 text-[12.5px] text-[var(--octo-text-primary)]">
            {event.organiser} · {event.organiserPhone}
          </p>
          <div className="mt-2">
            <Badge tone={STATUS_TONE[event.status]}>{t(STATUS_KEY[event.status])}</Badge>
          </div>

          <div className="mt-4">
            <h4 className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              <ChefHat size={12} /> {t("reservations.events.drawer.menuPackage")}
            </h4>
            <p className="mt-1.5 text-[12.5px] text-[var(--octo-text-secondary)]">{t(labelKey(event.package))}</p>
          </div>

          <div className="mt-4">
            <h4 className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              <Monitor size={12} /> {t("reservations.events.drawer.avRequirements")}
            </h4>
            {event.avRequirements && event.avRequirements.length > 0 ? (
              <div className="mt-1.5 flex flex-col gap-1.5">
                {event.avRequirements.map((req) => (
                  <Checkbox
                    key={req.label}
                    label={t(labelKey(req.label))}
                    checked={req.enabled}
                    onChange={() => onToggleAv(event.id, req.label)}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-1.5 text-[12.5px] text-[var(--octo-text-secondary)]">{t("reservations.events.drawer.noAv")}</p>
            )}
          </div>

          <div className="mt-4">
            <h4 className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              <StickyNote size={12} /> {t("reservations.events.drawer.notes")}
            </h4>
            <p className="mt-1.5 text-[12.5px] text-[var(--octo-text-secondary)]">{event.notes ?? t("reservations.events.drawer.noNotes")}</p>
          </div>

          <div className="mt-4">
            <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t("reservations.events.drawer.timeline")}
            </h4>
            {event.timeline && event.timeline.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-2">
                {event.timeline.map((step, i) => (
                  <li key={i} className="flex items-center gap-2 text-[12px]">
                    <span className="w-[42px] shrink-0 font-semibold text-[var(--octo-text-primary)]">{step.time}</span>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0D6EFD]" />
                    <span className="text-[var(--octo-text-secondary)]">{t(labelKey(step.label))}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1.5 text-[12.5px] text-[var(--octo-text-muted)]">{t("reservations.events.drawer.noTimeline")}</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
