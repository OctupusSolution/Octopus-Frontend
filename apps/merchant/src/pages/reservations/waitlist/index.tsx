import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { CalendarDays, CircleX, Plus, RefreshCw, Send, SearchX, X } from "lucide-react";
import {
  DEFAULT_FILTERS,
  computeStats,
  estimatedSeatingMinutes,
  filterEntries,
  formatJoined,
  fullName,
  isActive,
  sortEntries,
  startOfDay,
  waitedMinutes,
  type WaitlistEntry,
  type WaitlistFilters,
  type WaitlistSort,
} from "@/entities/waitlist-entry";
import { useI18n } from "@/app/providers/i18n-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { downloadCsv } from "@/pages/reports/_shared/export";
import { openExternal } from "@/pages/reservations/_shared/download";
import { whatsappHref } from "@/pages/reservations/_shared/guest-actions";
import { ConfirmModal } from "@/pages/reservations/floor-plan/_shared/confirm-modal";
import { ToastBanner, useToast } from "@/pages/reservations/floor-plan/_shared/toast";
import { useNow } from "@/pages/reservations/floor-plan/_shared/use-floor-plan";
import { EmptyWaitlistIllustration } from "./_shared/glyphs";
import { CHANNEL_KEY, SOURCE_KEY, STATUS_KEY, fill } from "./_shared/labels";
import { waitlistSeatPath } from "./_shared/paths";
import { useAreas, useSeatingFloor, useWaitlist } from "./_shared/use-waitlist";
import { GuestFormModal } from "./guest-form-modal";
import { HistoryModal } from "./history-modal";
import { WaitlistStatCards } from "./stat-cards";
import { WaitlistToolbar } from "./toolbar";
import { WaitlistTable, type RowHandlers } from "./waitlist-table";

type Confirm = { kind: "remove"; entries: WaitlistEntry[] } | null;

export function WaitlistPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeBusiness } = useTenantConfig();
  const waitlist = useWaitlist();
  const { entries } = waitlist;
  const { doc: floor } = useSeatingFloor();
  const areas = useAreas();
  const clock = useNow();
  const [refreshedAt, setRefreshedAt] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const now = Math.max(clock, refreshedAt);
  const { toast, notify: showToast } = useToast();

  const [filters, setFilters] = useState<WaitlistFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<WaitlistSort>("joinedLatest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);

  // The Seat Guest screen hands its confirmation back through router state.
  useEffect(() => {
    const message = (location.state as { toast?: string } | null)?.toast;
    if (!message) return;
    showToast(message);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate, showToast]);

  const stats = useMemo(() => computeStats(entries, now), [entries, now]);
  const rows = useMemo(() => sortEntries(filterEntries(entries, filters), sort, now), [entries, filters, sort, now]);
  const dayStart = startOfDay(now);
  const hasQueue = entries.some((e) => isActive(e) || (e.status === "left" && (e.leftAt ?? 0) >= dayStart));

  // Selection only ever refers to rows the merchant can still see.
  useEffect(() => {
    setSelected((current) => {
      const visible = new Set(rows.map((r) => r.id));
      const next = new Set([...current].filter((id) => visible.has(id)));
      return next.size === current.size ? current : next;
    });
  }, [rows]);

  const editing = editingId ? entries.find((e) => e.id === editingId) ?? null : null;
  const historyEntry = historyId ? entries.find((e) => e.id === historyId) ?? null : null;
  const selectedEntries = rows.filter((r) => selected.has(r.id));
  const selectedActive = selectedEntries.filter(isActive);

  function notifyGuest(entry: WaitlistEntry) {
    waitlist.notify(entry.id);
    const restaurant = activeBusiness?.businessName?.trim() || "Octopus";
    const message = fill(t("waitlist.message.tableReady"), { name: entry.firstName, restaurant });
    if (entry.channel === "whatsapp") openExternal(whatsappHref(entry.phone, message));
    showToast(fill(t("waitlist.toast.notified"), { name: fullName(entry), channel: t(CHANNEL_KEY[entry.channel]) }));
  }

  const handlers: RowHandlers = {
    onSeat: (entry) => navigate(waitlistSeatPath(entry.id)),
    onCall: (entry) => {
      waitlist.call(entry.id);
      window.location.assign(`tel:${entry.phone}`);
    },
    onNotify: notifyGuest,
    onRemove: (entry) => setConfirm({ kind: "remove", entries: [entry] }),
    onEdit: (entry) => {
      setEditingId(entry.id);
      setFormOpen(true);
    },
    onMoveUp: (entry) => {
      waitlist.moveUp(entry.id);
      showToast(fill(t("waitlist.toast.movedUp"), { name: fullName(entry) }), "info");
    },
    onHistory: (entry) => setHistoryId(entry.id),
  };

  function exportCsv() {
    const headers = ["guest", "phone", "partySize", "joined", "waittime", "estSeating", "area", "source", "channel", "status", "note"].map((key) =>
      t(key === "phone" ? "waitlist.form.phone" : key === "source" ? "waitlist.form.source" : key === "channel" ? "waitlist.form.channel" : key === "note" ? "waitlist.form.note" : `waitlist.table.${key}`)
    );
    const data = rows.map((e) => {
      const est = estimatedSeatingMinutes(entries, e, now);
      return [
        fullName(e),
        e.phone,
        e.partySize,
        formatJoined(e.joinedAt, locale, t("waitlist.at")),
        waitedMinutes(e, now),
        est ?? "",
        e.areaPreference,
        t(SOURCE_KEY[e.source]),
        t(CHANNEL_KEY[e.channel]),
        t(STATUS_KEY[e.status]),
        e.note,
      ];
    });
    const day = new Date(now).toISOString().slice(0, 10);
    downloadCsv(`waitlist-${day}.csv`, headers, data);
    showToast(fill(t("waitlist.toast.exported"), { n: data.length }));
  }

  function refresh() {
    setRefreshedAt(Date.now());
    setSpinning(true);
    window.setTimeout(() => setSpinning(false), 700);
  }

  const dateLabel = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", { weekday: "short", month: "short", day: "numeric", year: "numeric", numberingSystem: "latn" }).format(now);

  const openAdd = () => {
    setEditingId(null);
    setFormOpen(true);
  };

  return (
    <div className="px-4 pb-10 pt-5 sm:px-8 sm:pt-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[26px]">{t("waitlist.title")}</h1>
          <p className="mt-1.5 text-[14px] text-[var(--octo-text-secondary)] sm:text-[15px]">{t("waitlist.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex h-10 items-center gap-2.5 rounded-lg bg-[var(--octo-track)] px-3 text-[15px] text-[var(--octo-text-primary)]">
            <CalendarDays size={22} strokeWidth={1.5} className="text-[var(--octo-text-secondary)]" />
            {dateLabel}
          </span>
          <button
            type="button"
            onClick={refresh}
            aria-label={t("waitlist.refresh")}
            title={t("waitlist.refresh")}
            className="grid h-12 w-12 place-items-center rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <RefreshCw size={22} strokeWidth={1.6} className={clsx(spinning && "animate-spin")} />
          </button>
          <button type="button" onClick={openAdd} className="inline-flex h-12 items-center gap-2.5 rounded-[10px] bg-[#0D6EFD] px-4 text-[17px] font-semibold text-white transition-opacity hover:opacity-90">
            <Plus size={22} strokeWidth={2} />
            {t("waitlist.add")}
          </button>
        </div>
      </header>

      {!hasQueue ? (
        <section className="mx-auto flex max-w-[430px] flex-col items-center py-16 text-center sm:py-24">
          <EmptyWaitlistIllustration className="w-[250px] max-w-full text-[var(--octo-text-primary)]" />
          <h2 className="mt-5 text-[26px] font-medium text-[var(--octo-text-primary)]">{t("waitlist.empty.title")}</h2>
          <p className="mt-1 text-[15px] text-[var(--octo-text-secondary)]">{t("waitlist.empty.body")}</p>
          <button type="button" onClick={openAdd} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-[10px] bg-[#0D6EFD] text-[18px] font-semibold text-white transition-opacity hover:opacity-90">
            <Plus size={22} strokeWidth={2} />
            {t("waitlist.add")}
          </button>
        </section>
      ) : (
        <>
          <div className="mt-8">
            <WaitlistStatCards stats={stats} />
          </div>

          <div className="mt-8">
            <WaitlistToolbar
              filters={filters}
              onFiltersChange={setFilters}
              sort={sort}
              onSortChange={setSort}
              areas={areas}
              onExport={exportCsv}
              exportDisabled={rows.length === 0}
            />
          </div>

          {selectedEntries.length > 0 && (
            <div role="region" aria-label={t("waitlist.bulk.label")} className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--octo-tone-info-border)] bg-[var(--octo-tone-info-bg)] px-4 py-2.5">
              <span className="text-[14px] font-medium text-[var(--octo-tone-info-text)]">{fill(t("waitlist.bulk.selected"), { n: selectedEntries.length })}</span>
              <span className="flex-1" />
              <button
                type="button"
                disabled={selectedActive.length === 0}
                onClick={() => {
                  selectedActive.forEach((entry) => waitlist.notify(entry.id));
                  showToast(fill(t("waitlist.toast.bulkNotified"), { n: selectedActive.length }));
                  setSelected(new Set());
                }}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--octo-card)] px-3 text-[13.5px] font-medium text-[var(--octo-text-primary)] shadow-sm hover:bg-[var(--octo-hover)] disabled:opacity-50"
              >
                <Send size={16} className="text-[#D97706]" />
                {t("waitlist.bulk.notify")}
              </button>
              <button
                type="button"
                disabled={selectedActive.length === 0}
                onClick={() => setConfirm({ kind: "remove", entries: selectedActive })}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--octo-card)] px-3 text-[13.5px] font-medium text-[var(--octo-tone-danger-text)] shadow-sm hover:bg-[var(--octo-hover)] disabled:opacity-50"
              >
                <CircleX size={16} />
                {t("waitlist.bulk.remove")}
              </button>
              <button type="button" onClick={() => setSelected(new Set())} aria-label={t("waitlist.bulk.clear")} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--octo-tone-info-text)] hover:bg-[var(--octo-card)]">
                <X size={16} />
              </button>
            </div>
          )}

          <div className="mt-5">
            {rows.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-14 text-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[var(--octo-track)] text-[var(--octo-text-muted)]">
                  <SearchX size={22} />
                </span>
                <p className="mt-3 text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("waitlist.noMatches.title")}</p>
                <p className="mt-1 text-[13px] text-[var(--octo-text-muted)]">{t("waitlist.noMatches.body")}</p>
                <button type="button" onClick={() => setFilters(DEFAULT_FILTERS)} className="mt-4 rounded-lg border border-[var(--octo-border-input)] px-4 py-2 text-[13.5px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]">
                  {t("waitlist.noMatches.clear")}
                </button>
              </div>
            ) : (
              <WaitlistTable
                rows={rows}
                allEntries={entries}
                now={now}
                selected={selected}
                onSelectedChange={setSelected}
                openMenuId={openMenuId}
                onOpenMenuChange={setOpenMenuId}
                handlers={handlers}
              />
            )}
          </div>
        </>
      )}

      <GuestFormModal
        open={formOpen}
        editing={editing}
        entries={entries}
        floor={floor}
        onClose={() => setFormOpen(false)}
        onSubmit={(input) => {
          if (editing) {
            waitlist.update(editing.id, input);
            showToast(fill(t("waitlist.toast.updated"), { name: `${input.firstName} ${input.lastName}`.trim() }));
          } else {
            waitlist.add(input);
            showToast(fill(t("waitlist.toast.added"), { name: `${input.firstName} ${input.lastName}`.trim() }));
          }
          setFormOpen(false);
        }}
      />

      <HistoryModal entry={historyEntry} now={now} onClose={() => setHistoryId(null)} />

      {confirm && (
        <ConfirmModal
          open
          tone="danger"
          icon={<CircleX size={20} />}
          onClose={() => setConfirm(null)}
          title={confirm.entries.length === 1 ? fill(t("waitlist.confirmRemove.title"), { name: fullName(confirm.entries[0]) }) : fill(t("waitlist.confirmRemove.titleMany"), { n: confirm.entries.length })}
          body={t("waitlist.confirmRemove.body")}
          actions={[
            { label: t("waitlist.form.cancel"), variant: "secondary", onClick: () => setConfirm(null) },
            {
              label: t("waitlist.confirmRemove.confirm"),
              variant: "danger",
              onClick: () => {
                confirm.entries.forEach((entry) => waitlist.leave(entry.id));
                showToast(confirm.entries.length === 1 ? fill(t("waitlist.toast.removed"), { name: fullName(confirm.entries[0]) }) : fill(t("waitlist.toast.removedMany"), { n: confirm.entries.length }), "info");
                setSelected(new Set());
                setConfirm(null);
              },
            },
          ]}
        />
      )}

      <ToastBanner toast={toast} />
    </div>
  );
}
