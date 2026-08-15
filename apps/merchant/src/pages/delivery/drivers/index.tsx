import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Star,
  Phone,
  Bike,
  Car,
  X,
  UserPlus,
  MessageCircle,
  History,
  Wallet,
  ChevronUp,
  ChevronDown,
  CircleCheck,
} from "lucide-react";
import { Badge, Button, EmptyState, Input, Modal, Select } from "@ui/primitives";
import { drivers, deliveryZones, type Driver, type DriverStatus, type VehicleType } from "@/shared/api/mock-delivery";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_TONE: Record<DriverStatus, "success" | "info" | "warning" | "neutral"> = {
  Online: "success",
  "On Delivery": "info",
  Break: "warning",
  Offline: "neutral",
};

const STATUS_KEY: Record<DriverStatus, string> = {
  Online: "delivery.drivers.status.online",
  "On Delivery": "delivery.drivers.status.onDelivery",
  Break: "delivery.drivers.status.break",
  Offline: "delivery.drivers.status.offline",
};

const VEHICLE_KEY: Record<VehicleType, string> = {
  Motorcycle: "delivery.drivers.vehicle.motorcycle",
  Car: "delivery.drivers.vehicle.car",
};

const STATUSES: DriverStatus[] = ["Online", "On Delivery", "Break", "Offline"];
const ZONE_NAMES = deliveryZones.map((z) => z.name);
const PAGE_SIZE = 10;

type SortKey = "deliveriesToday" | "avgTimeMin";
type SortDir = "asc" | "desc";

const HEADERS: Array<{ key: string; label: string; sortable?: boolean }> = [
  { key: "driver", label: "delivery.drivers.col.driver" },
  { key: "vehicle", label: "delivery.drivers.col.vehicle" },
  { key: "zone", label: "delivery.drivers.col.zone" },
  { key: "status", label: "delivery.drivers.col.status" },
  { key: "activeOrder", label: "delivery.drivers.col.activeOrder" },
  { key: "deliveriesToday", label: "delivery.drivers.col.deliveriesToday", sortable: true },
  { key: "avgTimeMin", label: "delivery.drivers.col.avgTime", sortable: true },
  { key: "rating", label: "delivery.drivers.col.rating" },
  { key: "actions", label: "delivery.drivers.col.actions" },
];

function money(n: number, locale: string): string {
  return `SAR ${new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", { numberingSystem: "latn" }).format(n)}`;
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={11} className={i < rounded ? "fill-[#F59E0B] text-[#F59E0B]" : "text-[var(--octo-text-faint)]"} />
      ))}
    </span>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter((p) => p.length > 0 && p !== "Al-")
    .slice(0, 2)
    .map((p) => p.charAt(0))
    .join("")
    .toUpperCase();
}

export function DeliveryDriversPage() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const onlineCount = useMemo(
    () => drivers.filter((d) => d.status === "Online" || d.status === "On Delivery").length,
    []
  );
  const onDeliveryCount = useMemo(() => drivers.filter((d) => d.status === "On Delivery").length, []);
  const avgRating = useMemo(
    () => (drivers.reduce((sum, d) => sum + d.rating, 0) / drivers.length).toFixed(1),
    []
  );
  const deliveriesToday = useMemo(() => drivers.reduce((sum, d) => sum + d.deliveriesToday, 0), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = drivers.filter((d) => {
      if (q && !d.name.toLowerCase().includes(q) && !d.phone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))) return false;
      if (zoneFilter !== "all" && d.zone !== zoneFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      return true;
    });
    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [query, zoneFilter, statusFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selected = drivers.find((d) => d.id === selectedId) ?? null;

  const clearFilters = () => {
    setQuery("");
    setZoneFilter("all");
    setStatusFilter("all");
    setSortKey(null);
    setSortDir("desc");
    setPage(1);
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("delivery.drivers.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("delivery.drivers.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SimpleStat label={t("delivery.drivers.kpi.online")} value={String(onlineCount)} />
        <SimpleStat label={t("delivery.drivers.kpi.onDelivery")} value={String(onDeliveryCount)} />
        <SimpleStat label={t("delivery.drivers.kpi.avgRating")} value={avgRating} />
        <SimpleStat label={t("delivery.drivers.kpi.deliveriesToday")} value={String(deliveriesToday)} />
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="min-w-[200px] flex-1"
            placeholder={t("delivery.drivers.searchPlaceholder")}
            icon={<Search size={13} />}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          />
          <Select className="w-[170px]" value={zoneFilter} onChange={(e) => { setZoneFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("delivery.drivers.filter.allZones")}</option>
            {ZONE_NAMES.map((z) => <option key={z} value={z}>{z}</option>)}
          </Select>
          <Select className="w-[150px]" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">{t("delivery.drivers.filter.allStatuses")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(STATUS_KEY[s])}</option>)}
          </Select>
        </div>

        <div className="octo-scroll mt-3 overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--octo-divider)] text-start">
                {HEADERS.map((h) => {
                  const active = sortKey === h.key;
                  const sortable = h.sortable ? (h.key as SortKey) : null;
                  return (
                    <th
                      key={h.key}
                      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                      className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]"
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(sortable)}
                          className={`inline-flex items-center gap-1 transition-colors hover:text-[var(--octo-text-primary)] ${active ? "text-[#0D6EFD]" : ""}`}
                        >
                          {t(h.label)}
                          {active ? (
                            sortDir === "asc" ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                          ) : (
                            <ChevronDown size={11} className="opacity-40" />
                          )}
                        </button>
                      ) : (
                        t(h.label)
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((driver) => (
                <tr key={driver.id} className="border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]">
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5" onClick={() => setSelectedId(driver.id)}>
                    <p className="font-semibold text-[var(--octo-text-primary)]">{driver.name}</p>
                    <p className="text-[11px] text-[var(--octo-text-muted)]">{driver.phone}</p>
                  </td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]" onClick={() => setSelectedId(driver.id)}>
                    <span className="flex items-center gap-1.5">
                      {driver.vehicle === "Motorcycle" ? <Bike size={13} /> : <Car size={13} />}
                      {t(VEHICLE_KEY[driver.vehicle])}
                    </span>
                  </td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]" onClick={() => setSelectedId(driver.id)}>{driver.zone}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5" onClick={() => setSelectedId(driver.id)}>
                    <Badge tone={STATUS_TONE[driver.status]}>{t(STATUS_KEY[driver.status])}</Badge>
                  </td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]" onClick={() => setSelectedId(driver.id)}>
                    {driver.activeOrder ?? "—"}
                  </td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-primary)]" onClick={() => setSelectedId(driver.id)}>{driver.deliveriesToday}</td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]" onClick={() => setSelectedId(driver.id)}>
                    {t("delivery.minuteUnit").replace("{n}", String(driver.avgTimeMin))}
                  </td>
                  <td className="cursor-pointer whitespace-nowrap px-2 py-2.5" onClick={() => setSelectedId(driver.id)}>
                    <span className="flex items-center gap-1">
                      <Stars rating={driver.rating} />
                      <span className="text-[11px] text-[var(--octo-text-muted)]">{driver.rating.toFixed(1)}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={driver.status !== "Online"}
                        aria-label={t("delivery.drivers.action.assign")}
                        title={t("delivery.drivers.action.assign")}
                        onClick={() => setToast(t("delivery.drivers.toast.assign").replace("{name}", driver.name))}
                        className="grid h-6 w-6 place-items-center rounded-[6px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)] disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <UserPlus size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label={t("delivery.drivers.action.message")}
                        title={t("delivery.drivers.action.message")}
                        onClick={() => setToast(t("delivery.drivers.toast.message").replace("{name}", driver.name))}
                        className="grid h-6 w-6 place-items-center rounded-[6px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
                      >
                        <MessageCircle size={13} />
                      </button>
                      <button
                        type="button"
                        aria-label={t("delivery.drivers.action.history")}
                        title={t("delivery.drivers.action.history")}
                        onClick={() => setSelectedId(driver.id)}
                        className="grid h-6 w-6 place-items-center rounded-[6px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
                      >
                        <History size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {pageRows.length === 0 && (
            <EmptyState
              icon={<Search size={18} />}
              title={t("delivery.drivers.emptyTitle")}
              description={t("delivery.drivers.emptyDescription")}
              action={
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  {t("delivery.drivers.clearFilters")}
                </Button>
              }
            />
          )}
        </div>

        {filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between text-[11.5px] text-[var(--octo-text-muted)]">
            <span>
              {t("delivery.drivers.showing")
                .replace("{from}", String((page - 1) * PAGE_SIZE + 1))
                .replace("{to}", String(Math.min(page * PAGE_SIZE, filtered.length)))
                .replace("{total}", String(filtered.length))}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-[7px] px-2 py-1 hover:bg-[var(--octo-hover)] disabled:opacity-30"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i + 1)}
                  className={`rounded-[7px] px-2 py-1 ${page === i + 1 ? "bg-info/10 font-semibold text-[#0D6EFD]" : "hover:bg-[var(--octo-hover)]"}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-[7px] px-2 py-1 hover:bg-[var(--octo-hover)] disabled:opacity-30"
              >
                ›
              </button>
            </div>
          </div>
        )}
      </section>

      <DriverDrawer
        driver={selected}
        onClose={() => setSelectedId(null)}
        onAction={(kind) => {
          if (!selected) return;
          setToast(t(`delivery.drivers.toast.${kind}`).replace("{name}", selected.name));
        }}
      />
      {toast && (
        <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-[9px] border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-2.5 text-[12.5px] font-medium text-[#16a34a] shadow-lg">
          <CircleCheck size={14} className="text-[#22C55E]" />
          {toast}
        </div>
      )}
    </div>
  );
}

function SimpleStat({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</p>
      <p className="mt-2 text-[24px] font-bold leading-none tracking-[-0.01em] text-[var(--octo-text-primary)]">{value}</p>
    </article>
  );
}

function DriverDrawer({
  driver,
  onClose,
  onAction,
}: {
  driver: Driver | null;
  onClose: () => void;
  onAction: (kind: "assign" | "message" | "history") => void;
}) {
  const { t, locale } = useI18n();
  const open = Boolean(driver);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-semibold text-[var(--octo-text-primary)]">
            {t("delivery.drivers.drawer.title")}
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
            variant="secondary"
            size="sm"
            icon={<UserPlus size={13} />}
            disabled={driver?.status !== "Online"}
            onClick={() => onAction("assign")}
            className="flex-1 justify-center"
          >
            {t("delivery.drivers.action.assign")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<MessageCircle size={13} />}
            onClick={() => onAction("message")}
            className="flex-1 justify-center"
          >
            {t("delivery.drivers.action.message")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<History size={13} />}
            onClick={() => onAction("history")}
            className="flex-1 justify-center"
          >
            {t("delivery.drivers.action.history")}
          </Button>
        </div>
      }
    >
      {driver && (
        <div className="octo-scroll max-h-[60vh] overflow-y-auto pe-1">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-info/10 text-[14px] font-bold text-[#0D6EFD]">
              {initials(driver.name)}
            </span>
            <div>
              <h3 className="text-[15px] font-bold text-[var(--octo-text-primary)]">{driver.name}</h3>
              <p className="flex items-center gap-1 text-[11.5px] text-[var(--octo-text-muted)]">
                <Phone size={11} /> {driver.phone}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <Badge tone={STATUS_TONE[driver.status]}>{t(STATUS_KEY[driver.status])}</Badge>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <DrawerStat label={t("delivery.drivers.drawer.vehicle")} value={`${t(VEHICLE_KEY[driver.vehicle])}`} />
            <DrawerStat label={t("delivery.drivers.col.zone")} value={driver.zone} />
            <DrawerStat label={t("delivery.drivers.drawer.totalDeliveries")} value={driver.totalDeliveries.toLocaleString()} />
            <DrawerStat label={t("delivery.drivers.col.avgTime")} value={t("delivery.minuteUnit").replace("{n}", String(driver.avgTimeMin))} />
          </div>

          <div className="mt-3 flex items-center justify-between rounded-[9px] bg-[var(--octo-hover)] px-3 py-2.5">
            <span className="text-[12.5px] text-[var(--octo-text-secondary)]">{t("delivery.drivers.col.rating")}</span>
            <span className="flex items-center gap-1.5">
              <Stars rating={driver.rating} />
              <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{driver.rating.toFixed(1)}</span>
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-[9px] bg-[var(--octo-hover)] px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--octo-text-secondary)]">
              <Wallet size={13} /> {t("delivery.drivers.drawer.earnings")}
            </span>
            <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{money(driver.earningsThisMonth, locale)}</span>
          </div>
        </div>
      )}
    </Modal>
  );
}

function DrawerStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[9px] border border-[var(--octo-divider)] px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.05em] text-[var(--octo-text-faint)]">{label}</p>
      <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{value}</p>
    </div>
  );
}
