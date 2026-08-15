import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Bike, ClipboardList, MapPinned, Smartphone } from "lucide-react";
import { dispatchOrders, dispatchStageOrder, drivers, type DispatchStage } from "@/shared/api/mock-delivery";
import { useI18n } from "@/app/providers/i18n-provider";

function SimpleStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warning" }) {
  return (
    <article className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">{label}</p>
      <p className={`mt-2 text-[24px] font-bold leading-none tracking-[-0.01em] ${tone === "warning" ? "text-[#c2660a]" : "text-[var(--octo-text-primary)]"}`}>
        {value}
      </p>
    </article>
  );
}

const QUICK_LINKS = [
  {
    id: "dispatch",
    path: "/delivery/dispatch",
    icon: ClipboardList,
    titleKey: "delivery.hub.quick.dispatch",
    descKey: "delivery.hub.quick.dispatchDesc",
  },
  {
    id: "zones",
    path: "/delivery/zones",
    icon: MapPinned,
    titleKey: "delivery.hub.quick.zones",
    descKey: "delivery.hub.quick.zonesDesc",
  },
  {
    id: "drivers",
    path: "/delivery/drivers",
    icon: Bike,
    titleKey: "delivery.hub.quick.drivers",
    descKey: "delivery.hub.quick.driversDesc",
  },
  {
    id: "aggregators",
    path: "/delivery/aggregators",
    icon: Smartphone,
    titleKey: "delivery.hub.quick.aggregators",
    descKey: "delivery.hub.quick.aggregatorsDesc",
  },
];

const COLUMN_KEY: Record<DispatchStage, string> = {
  Unassigned: "delivery.dispatch.column.unassigned",
  Assigned: "delivery.dispatch.column.assigned",
  "Picked Up": "delivery.dispatch.column.pickedUp",
  "On the Way": "delivery.dispatch.column.onTheWay",
  Delivered: "delivery.dispatch.column.delivered",
};

export function DeliveryPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const active = dispatchOrders.length;
  const driversOnline = useMemo(
    () => drivers.filter((d) => d.status === "Online" || d.status === "On Delivery").length,
    []
  );
  const avgTime = useMemo(
    () => Math.round(drivers.reduce((sum, d) => sum + d.avgTimeMin, 0) / drivers.length),
    []
  );
  const late = useMemo(
    () => dispatchOrders.filter((o) => o.stage !== "Delivered" && o.elapsedMinutes > 30).length,
    []
  );

  const columnCounts = useMemo(() => {
    const map = new Map<DispatchStage, number>();
    for (const stage of dispatchStageOrder) map.set(stage, 0);
    for (const order of dispatchOrders) map.set(order.stage, (map.get(order.stage) ?? 0) + 1);
    return map;
  }, []);

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("delivery.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("delivery.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SimpleStat label={t("delivery.kpi.active")} value={String(active)} />
        <SimpleStat label={t("delivery.kpi.drivers")} value={String(driversOnline)} />
        <SimpleStat label={t("delivery.kpi.avgTime")} value={t("delivery.minuteUnit").replace("{n}", String(avgTime))} />
        <SimpleStat label={t("delivery.kpi.late")} value={String(late)} tone="warning" />
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("delivery.hub.boardTitle")}</h2>
          <button
            type="button"
            onClick={() => navigate("/delivery/dispatch")}
            className="flex items-center gap-1 text-[11.5px] font-medium text-[#0D6EFD] transition-colors hover:underline"
          >
            {t("delivery.hub.quick.dispatch")}
            <ArrowUpRight size={12} className="rtl:-scale-x-100" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {dispatchStageOrder.map((stage) => (
            <button
              key={stage}
              type="button"
              onClick={() => navigate("/delivery/dispatch")}
              className="rounded-[9px] border border-[var(--octo-divider)] bg-[var(--octo-track)] px-3 py-2.5 text-start transition-colors hover:bg-[var(--octo-hover)]"
            >
              <span className="block text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                {t(COLUMN_KEY[stage])}
              </span>
              <span className="mt-0.5 block text-[22px] font-bold leading-none text-[var(--octo-text-primary)]">
                {columnCounts.get(stage)}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] text-[var(--octo-text-muted)]">
          {t("delivery.dispatch.activeCount").replace("{n}", String(active))} ·{" "}
          {t("delivery.dispatch.driversOnlineCount").replace("{n}", String(driversOnline))}
        </p>
      </section>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("delivery.hub.quickTitle")}</h2>
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
