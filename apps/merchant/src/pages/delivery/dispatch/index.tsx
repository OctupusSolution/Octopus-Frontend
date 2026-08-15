import { useMemo, useState } from "react";
import { Package, MapPin, ChevronRight, UserRound } from "lucide-react";
import { Badge } from "@ui/primitives";
import {
  dispatchOrders as initialDispatchOrders,
  dispatchStageOrder,
  drivers,
  type DispatchOrder,
  type DispatchStage,
} from "@/shared/api/mock-delivery";
import { useI18n } from "@/app/providers/i18n-provider";

const NEXT_STAGE: Record<DispatchStage, DispatchStage | null> = {
  Unassigned: "Assigned",
  Assigned: "Picked Up",
  "Picked Up": "On the Way",
  "On the Way": "Delivered",
  Delivered: null,
};

const ACTION_KEY: Record<Exclude<DispatchStage, "Delivered">, string> = {
  Unassigned: "delivery.dispatch.action.assign",
  Assigned: "delivery.dispatch.action.markPickedUp",
  "Picked Up": "delivery.dispatch.action.markOnTheWay",
  "On the Way": "delivery.dispatch.action.markDelivered",
};

const COLUMN_KEY: Record<DispatchStage, string> = {
  Unassigned: "delivery.dispatch.column.unassigned",
  Assigned: "delivery.dispatch.column.assigned",
  "Picked Up": "delivery.dispatch.column.pickedUp",
  "On the Way": "delivery.dispatch.column.onTheWay",
  Delivered: "delivery.dispatch.column.delivered",
};

const AVATAR_PALETTE = ["#2ec9c0", "#5b8def", "#8b7cf0", "#fb923c", "#22c9d9", "#a3e635", "#f472b6"];

function avatarColor(name: string): string {
  const sum = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function timerClass(minutes: number, stage: DispatchStage): string {
  if (stage === "Delivered") return "text-[var(--octo-text-faint)]";
  if (minutes < 15) return "text-[#16a34a]";
  if (minutes <= 30) return "text-[#c2660a]";
  return "text-[#dc2626]";
}

function money(n: number, locale: string): string {
  return `SAR ${new Intl.NumberFormat(locale === "ar" ? "ar" : "en-US", { numberingSystem: "latn" }).format(n)}`;
}

const UNASSIGNED_DRIVER_POOL = drivers.filter((d) => d.status === "Online").map((d) => d.name);

export function DeliveryDispatchPage() {
  const { t } = useI18n();
  const [orders, setOrders] = useState<DispatchOrder[]>(() => [...initialDispatchOrders]);

  const advance = (id: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== id) return order;
        const next = NEXT_STAGE[order.stage];
        if (!next) return order;
        const driver =
          order.stage === "Unassigned" && !order.driver
            ? UNASSIGNED_DRIVER_POOL[Math.abs(id.charCodeAt(id.length - 1)) % UNASSIGNED_DRIVER_POOL.length]
            : order.driver;
        return { ...order, stage: next, driver, elapsedMinutes: next === "Delivered" ? order.elapsedMinutes : 0 };
      })
    );
  };

  const activeCount = orders.length;
  const lateCount = useMemo(
    () => orders.filter((o) => o.stage !== "Delivered" && o.elapsedMinutes > 30).length,
    [orders]
  );
  const driversOnlineCount = useMemo(
    () => drivers.filter((d) => d.status === "Online" || d.status === "On Delivery").length,
    []
  );

  const columns = useMemo(() => {
    const map = new Map<DispatchStage, DispatchOrder[]>();
    for (const stage of dispatchStageOrder) map.set(stage, []);
    for (const order of orders) map.get(order.stage)?.push(order);
    return map;
  }, [orders]);

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("delivery.dispatch.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("delivery.dispatch.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-[9px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2 text-[12px] font-medium text-[var(--octo-text-primary)]">
        <span>{t("delivery.dispatch.activeCount").replace("{n}", String(activeCount))}</span>
        <span className="text-[var(--octo-text-faint)]">·</span>
        <span className={lateCount > 0 ? "text-[#dc2626]" : ""}>
          {t("delivery.dispatch.lateCount").replace("{n}", String(lateCount))}
        </span>
        <span className="text-[var(--octo-text-faint)]">·</span>
        <span>{t("delivery.dispatch.driversOnlineCount").replace("{n}", String(driversOnlineCount))}</span>
      </div>

      <div className="octo-scroll mt-3 flex gap-3 overflow-x-auto pb-2">
        {dispatchStageOrder.map((stage) => {
          const rows = columns.get(stage) ?? [];
          return (
            <div key={stage} className="flex w-[280px] shrink-0 flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-hover)]">
              <div className="flex items-center justify-between border-b border-[var(--octo-border-card)] px-3 py-2.5">
                <h2 className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t(COLUMN_KEY[stage])}</h2>
                <Badge tone="neutral">{rows.length}</Badge>
              </div>

              <div className="octo-scroll flex max-h-[calc(100vh-320px)] min-h-[120px] flex-col gap-2 overflow-y-auto p-2.5">
                {rows.map((order) => (
                  <DispatchCard key={order.id} order={order} onAdvance={() => advance(order.id)} />
                ))}
                {rows.length === 0 && (
                  <p className="px-2 py-6 text-center text-[11.5px] text-[var(--octo-text-faint)]">
                    {t("delivery.dispatch.columnEmpty")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DispatchCard({ order, onAdvance }: { order: DispatchOrder; onAdvance: () => void }) {
  const { t, locale } = useI18n();
  const nextStage = NEXT_STAGE[order.stage];

  return (
    <article className="flex flex-col gap-2 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{order.orderNumber}</span>
        <span className={`flex items-center gap-1 text-[11px] font-semibold ${timerClass(order.elapsedMinutes, order.stage)}`}>
          {t("delivery.dispatch.elapsed").replace("{n}", String(order.elapsedMinutes))}
        </span>
      </div>

      <p className="text-[12px] font-medium text-[var(--octo-text-primary)]">{order.customer}</p>

      <div className="flex items-center gap-1 text-[11px] text-[var(--octo-text-muted)]">
        <MapPin size={11} />
        {order.zone}
      </div>

      <div className="flex items-center gap-1.5">
        {order.driver ? (
          <>
            <span
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
              style={{ backgroundColor: avatarColor(order.driver) }}
            >
              {order.driver.charAt(0)}
            </span>
            <span className="truncate text-[11.5px] text-[var(--octo-text-secondary)]">{order.driver}</span>
          </>
        ) : (
          <span className="flex items-center gap-1 text-[11.5px] text-[var(--octo-text-faint)]">
            <UserRound size={12} />
            {t("delivery.dispatch.unassignedDriver")}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--octo-divider)] pt-2 text-[11.5px] text-[var(--octo-text-secondary)]">
        <span className="flex items-center gap-1">
          <Package size={11} />
          {t("delivery.dispatch.itemCount").replace("{n}", String(order.itemCount))}
        </span>
        <span className="font-semibold text-[var(--octo-text-primary)]">{money(order.total, locale)}</span>
      </div>

      {nextStage && (
        <button
          type="button"
          onClick={onAdvance}
          className="mt-1 flex items-center justify-center gap-1 rounded-[8px] bg-[#0D6EFD] px-2.5 py-[7px] text-[11.5px] font-semibold text-white transition-colors hover:opacity-90"
        >
          {t(ACTION_KEY[order.stage as Exclude<DispatchStage, "Delivered">])}
          <ChevronRight size={12} className="rtl:rotate-180" />
        </button>
      )}
    </article>
  );
}
