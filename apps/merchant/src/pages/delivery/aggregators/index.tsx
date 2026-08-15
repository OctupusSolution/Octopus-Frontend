import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CircleCheck, Clock3, RefreshCcw, Percent, Wallet, Timer } from "lucide-react";
import { Badge, Button } from "@ui/primitives";
import { aggregatorPartners, type AggregatorPartner, type AggregatorStatus, type MenuSyncStatus } from "@/shared/api/mock-delivery";
import { useI18n } from "@/app/providers/i18n-provider";

const STATUS_TONE: Record<AggregatorStatus, "success" | "error" | "neutral" | "info"> = {
  Connected: "success",
  Error: "error",
  "Not Connected": "neutral",
  Syncing: "info",
};

const STATUS_KEY: Record<AggregatorStatus, string> = {
  Connected: "delivery.aggregators.status.connected",
  Error: "delivery.aggregators.status.error",
  "Not Connected": "delivery.aggregators.status.notConnected",
  Syncing: "delivery.aggregators.status.syncing",
};

const MENU_SYNC_KEY: Record<MenuSyncStatus, string> = {
  Synced: "delivery.aggregators.menuSync.synced",
  Syncing: "delivery.aggregators.status.syncing",
  "Out of Sync": "delivery.aggregators.menuSync.outOfSync",
};

const MENU_SYNC_TONE: Record<MenuSyncStatus, "success" | "info" | "warning"> = {
  Synced: "success",
  Syncing: "info",
  "Out of Sync": "warning",
};

function money(n: number, locale: string): string {
  const digits = (value: number) =>
    new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", { numberingSystem: "latn", maximumFractionDigits: 0 }).format(value);
  if (n >= 1_000_000) return `SAR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `SAR ${(n / 1_000).toFixed(1)}K`;
  return `SAR ${digits(n)}`;
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-[#0D6EFD]" : "bg-[var(--octo-switch-off)]"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--octo-knob)] shadow transition-all ${
          checked ? "start-[18px]" : "start-0.5"
        }`}
      />
    </button>
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

export function DeliveryAggregatorsPage() {
  const { t, locale } = useI18n();
  const [autoAccept, setAutoAccept] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(aggregatorPartners.map((p) => [p.id, p.autoAccept]))
  );
  const [statusOverride, setStatusOverride] = useState<Record<string, AggregatorStatus>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const partnerStatus = (id: string): AggregatorStatus =>
    statusOverride[id] ?? aggregatorPartners.find((p) => p.id === id)?.status ?? "Not Connected";

  const onPrimaryAction = (partner: AggregatorPartner) => {
    const isConnected = partnerStatus(partner.id) !== "Not Connected";
    if (isConnected) {
      setToast(t("delivery.aggregators.configureToast").replace("{name}", partner.name));
      return;
    }
    setStatusOverride((prev) => ({ ...prev, [partner.id]: "Connected" }));
    setToast(t("delivery.aggregators.connected").replace("{name}", partner.name));
  };

  const totalOrders = useMemo(() => aggregatorPartners.reduce((sum, p) => sum + p.ordersToday, 0), []);
  const totalRevenue = useMemo(() => aggregatorPartners.reduce((sum, p) => sum + p.revenueToday, 0), []);
  const totalCommission = useMemo(
    () => aggregatorPartners.reduce((sum, p) => sum + p.revenueToday * (p.commissionPercent / 100), 0),
    []
  );
  const netAfterCommission = totalRevenue - totalCommission;

  const toggleAutoAccept = (id: string) => {
    setAutoAccept((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("delivery.aggregators.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("delivery.aggregators.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SimpleStat label={t("delivery.aggregators.kpi.orders")} value={totalOrders.toLocaleString("en-US")} />
        <SimpleStat label={t("delivery.aggregators.kpi.revenue")} value={money(totalRevenue, locale)} />
        <SimpleStat label={t("delivery.aggregators.kpi.commission")} value={money(totalCommission, locale)} />
        <SimpleStat label={t("delivery.aggregators.kpi.net")} value={money(netAfterCommission, locale)} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {aggregatorPartners.map((partner) => (
          <AggregatorCard
            key={partner.id}
            partner={partner}
            status={partnerStatus(partner.id)}
            autoAccept={autoAccept[partner.id]}
            onToggleAutoAccept={() => toggleAutoAccept(partner.id)}
            onPrimaryAction={() => onPrimaryAction(partner)}
          />
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-5 end-5 z-50 flex items-center gap-2 rounded-[9px] border border-[#22C55E]/20 bg-[#22C55E]/10 px-4 py-2.5 text-[12.5px] font-medium text-[#16a34a] shadow-lg">
          <CircleCheck size={14} className="text-[#22C55E]" />
          {toast}
        </div>
      )}
    </div>
  );
}

function AggregatorCard({
  partner,
  status,
  autoAccept,
  onToggleAutoAccept,
  onPrimaryAction,
}: {
  partner: AggregatorPartner;
  status: AggregatorStatus;
  autoAccept: boolean;
  onToggleAutoAccept: () => void;
  onPrimaryAction: () => void;
}) {
  const { t, locale } = useI18n();
  const commission = partner.revenueToday * (partner.commissionPercent / 100);
  const net = partner.revenueToday - commission;
  const canConfigure = status !== "Not Connected";

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] font-bold text-white"
            style={{ backgroundColor: partner.brandColor }}
          >
            {partner.name.charAt(0)}
          </span>
          <div>
            <h2 className="text-[13.5px] font-semibold leading-tight text-[var(--octo-text-primary)]">{partner.name}</h2>
            <Badge tone={STATUS_TONE[status]} className="mt-0.5">
              {t(STATUS_KEY[status])}
            </Badge>
          </div>
        </div>
      </div>

      {partner.outOfSyncItems > 0 ? (
        <p className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#c2660a]">
          <RefreshCcw size={11} />
          {t("delivery.aggregators.itemsOutOfSync").replace("{n}", String(partner.outOfSyncItems))}
        </p>
      ) : (
        <p className="flex items-center gap-1.5 text-[11.5px] text-[var(--octo-text-muted)]">
          <Clock3 size={11} />
          {partner.lastSyncMinutesAgo != null
            ? t("delivery.aggregators.lastSync").replace("{n}", String(partner.lastSyncMinutesAgo))
            : t("delivery.aggregators.neverSynced")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 border-t border-[var(--octo-divider)] pt-3">
        <Stat label={t("delivery.aggregators.ordersToday")} value={partner.ordersToday.toLocaleString("en-US")} />
        <Stat label={t("delivery.aggregators.revenueToday")} value={money(partner.revenueToday, locale)} />
        <Stat
          label={t("delivery.aggregators.commissionPct")}
          value={partner.commissionPercent > 0 ? `${partner.commissionPercent}%` : "—"}
          icon={<Percent size={10} />}
        />
        <Stat label={t("delivery.aggregators.net")} value={money(net, locale)} icon={<Wallet size={10} />} />
        <Stat label={t("delivery.aggregators.avgPrep")} value={`${partner.avgPrepTimeMin}m`} icon={<Timer size={10} />} />
      </div>

      <div className="flex items-center justify-between border-t border-[var(--octo-divider)] pt-3">
        <span className="text-[11.5px] text-[var(--octo-text-secondary)]">{t("delivery.aggregators.autoAccept")}</span>
        <Switch checked={autoAccept} onChange={onToggleAutoAccept} label={t("delivery.aggregators.autoAccept")} />
      </div>

      <div className="flex items-center justify-between text-[11.5px]">
        <span className="text-[var(--octo-text-muted)]">{t("delivery.aggregators.menuSync")}</span>
        <Badge tone={MENU_SYNC_TONE[partner.menuSyncStatus]}>{t(MENU_SYNC_KEY[partner.menuSyncStatus])}</Badge>
      </div>

      <Button variant={canConfigure ? "secondary" : "primary"} size="sm" className="justify-center" onClick={onPrimaryAction}>
        {canConfigure ? t("delivery.aggregators.configure") : t("delivery.aggregators.connect")}
      </Button>
    </article>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.05em] text-[var(--octo-text-faint)]">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{value}</p>
    </div>
  );
}
