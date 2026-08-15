import { useEffect, useMemo, useState } from "react";
import { CalendarClock, RotateCcw, X } from "lucide-react";
import { StatCard } from "@/widgets/sales-summary-chart";
import { Badge, Input, Select, Button, EmptyState } from "@ui/primitives";
import {
  subscriptionKpis,
  subscriptionPlans,
  subscribers,
  type Subscriber,
  type SubscriptionStatus,
  type SubscriptionPlanId,
} from "@/shared/api/mock-marketing";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const STATUS_TONE: Record<SubscriptionStatus, "success" | "warning" | "neutral" | "error"> = {
  Active: "success",
  "Past Due": "warning",
  Paused: "neutral",
  Cancelled: "error",
};

function money(n: number): string {
  return `SAR ${n.toLocaleString("en-US")}`;
}

const totalMrr = subscriptionPlans.reduce((sum, p) => sum + p.subscribers * p.priceSar, 0);

export function SubscriptionsPage() {
  const { t } = useI18n();
  const [planFilter, setPlanFilter] = useState<"All" | SubscriptionPlanId>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | SubscriptionStatus>("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return subscribers.filter((s) => {
      if (planFilter !== "All" && s.planId !== planFilter) return false;
      if (statusFilter !== "All" && s.status !== statusFilter) return false;
      if (query && !s.name.toLowerCase().includes(query.toLowerCase()) && !s.phone.includes(query)) return false;
      return true;
    });
  }, [planFilter, statusFilter, query]);

  const selected = subscribers.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-[26px] sm:pt-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-[var(--octo-text-primary)] sm:text-[21px]">
            {t("marketing.subscriptions.title")}
          </h1>
          <p className="mt-1 text-[12px] text-[var(--octo-text-muted)] sm:text-[12.5px]">
            {t("marketing.subscriptions.subtitle")}
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {subscriptionKpis.map((card) => (
          <StatCard key={card.id} data={card} />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {subscriptionPlans.map((plan) => {
          const mrr = plan.subscribers * plan.priceSar;
          const pct = totalMrr === 0 ? 0 : Math.round((mrr / totalMrr) * 100);
          return (
            <div key={plan.id} className="flex flex-col gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
              <div className="flex items-baseline justify-between">
                <h3 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{plan.name}</h3>
                <span className="text-[12.5px] font-bold text-[var(--octo-text-primary)]">{money(plan.priceSar)}<span className="text-[10.5px] font-normal text-[var(--octo-text-muted)]">/{t("marketing.subscriptions.perMonth")}</span></span>
              </div>
              <p className="text-[11.5px] text-[var(--octo-text-secondary)]">
                {t("marketing.subscriptions.subscriberCount").replace("{n}", plan.subscribers.toLocaleString())}
              </p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--octo-track)]">
                <div className="h-full rounded-full bg-[#0D6EFD]" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10.5px] text-[var(--octo-text-faint)]">{t("marketing.subscriptions.mrrShare").replace("{pct}", String(pct)).replace("{amount}", money(mrr))}</span>
              <ul className="mt-1 flex flex-col gap-1">
                {plan.benefits.map((b) => (
                  <li key={b} className="text-[11px] text-[var(--octo-text-secondary)]">• {b}</li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
        <div className="flex flex-wrap items-center gap-2">
          <Input className="min-w-[200px] flex-1" placeholder={t("common.search")} value={query} onChange={(e) => setQuery(e.target.value)} />
          <Select className="w-[170px]" value={planFilter} onChange={(e) => setPlanFilter(e.target.value as typeof planFilter)}>
            <option value="All">{t("marketing.subscriptions.filter.allPlans")}</option>
            {subscriptionPlans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
          <Select className="w-[150px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="All">{t("marketing.subscriptions.filter.allStatuses")}</option>
            {(["Active", "Past Due", "Paused", "Cancelled"] as SubscriptionStatus[]).map((s) => (
              <option key={s} value={s}>{t(labelKey(s))}</option>
            ))}
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            className="mt-4"
            title={t("marketing.subscriptions.empty.title")}
            description={t("marketing.subscriptions.empty.description")}
            action={<Button variant="secondary" onClick={() => { setPlanFilter("All"); setStatusFilter("All"); setQuery(""); }}>{t("marketing.giftCards.clearFilters")}</Button>}
          />
        ) : (
          <div className="octo-scroll mt-3 overflow-x-auto">
            <table className="w-full min-w-[960px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--octo-divider)] text-start">
                  {["marketing.subscriptions.col.subscriber", "marketing.subscriptions.col.plan", "marketing.subscriptions.col.started", "marketing.subscriptions.col.nextBilling", "marketing.subscriptions.col.cycle", "marketing.subscriptions.col.payment", "marketing.subscriptions.col.status", "marketing.subscriptions.col.ltv", "marketing.subscriptions.col.actions"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 text-start text-[10.5px] font-semibold uppercase tracking-wide text-[var(--octo-text-faint)]">{t(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 40).map((s) => {
                  const plan = subscriptionPlans.find((p) => p.id === s.planId)!;
                  return (
                    <tr key={s.id} className="cursor-pointer border-b border-[var(--octo-row-border)] last:border-0 hover:bg-[var(--octo-row-hover)]" onClick={() => setSelectedId(s.id)}>
                      <td className="whitespace-nowrap px-2 py-2.5">
                        <div className="font-semibold text-[var(--octo-text-primary)]">{s.name}</div>
                        <div className="text-[11px] text-[var(--octo-text-faint)]">{s.phone}</div>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{plan.name}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{s.started}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-faint)]">{s.nextBilling}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{t(labelKey(s.billingCycle))}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-[var(--octo-text-secondary)]">{s.paymentMethod}</td>
                      <td className="whitespace-nowrap px-2 py-2.5">
                        <Badge tone={STATUS_TONE[s.status]}>{t(labelKey(s.status))}</Badge>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 font-medium text-[var(--octo-text-primary)]">{money(s.ltvSar)}</td>
                      <td className="whitespace-nowrap px-2 py-2.5">
                        {s.status === "Past Due" && (
                          <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 rounded-[7px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-2 py-1 text-[11px] font-medium text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                          >
                            <RotateCcw size={11} /> {t("marketing.subscriptions.retryPayment")}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SubscriberDrawer subscriber={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function SubscriberDrawer({ subscriber, onClose }: { subscriber: Subscriber | null; onClose: () => void }) {
  const { t } = useI18n();
  const open = Boolean(subscriber);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const plan = subscriber ? subscriptionPlans.find((p) => p.id === subscriber.planId) : undefined;

  return (
    <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("marketing.subscriptions.drawer.title")}
        className={`absolute inset-y-0 end-0 flex w-full flex-col bg-[var(--octo-card)] shadow-xl transition-transform duration-200 sm:w-[420px] ${open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"}`}
      >
        {subscriber && plan && (
          <>
            <div className="flex items-center justify-between border-b border-[var(--octo-divider)] px-[18px] py-[15px]">
              <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("marketing.subscriptions.drawer.title")}</h2>
              <button type="button" aria-label={t("common.cancel")} onClick={onClose} className="grid h-7 w-7 place-items-center rounded-[7px] text-[var(--octo-text-muted)] hover:bg-[var(--octo-hover)]">
                <X size={15} />
              </button>
            </div>
            <div className="octo-scroll flex-1 overflow-y-auto px-[18px] py-[15px]">
              <h3 className="text-[16px] font-bold text-[var(--octo-text-primary)]">{subscriber.name}</h3>
              <p className="mt-1 text-[12px] text-[var(--octo-text-muted)]">{subscriber.phone}</p>
              <div className="mt-2">
                <Badge tone={STATUS_TONE[subscriber.status]}>{t(labelKey(subscriber.status))}</Badge>
              </div>

              <div className="mt-4 flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--octo-text-muted)]">{t("marketing.subscriptions.col.plan")}</span>
                <span className="font-medium text-[var(--octo-text-primary)]">{plan.name} · {money(plan.priceSar)}/{t("marketing.subscriptions.perMonth")}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--octo-text-muted)]">{t("marketing.subscriptions.col.started")}</span>
                <span className="text-[var(--octo-text-primary)]">{subscriber.started}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--octo-text-muted)]">{t("marketing.subscriptions.col.nextBilling")}</span>
                <span className="text-[var(--octo-text-primary)]">{subscriber.nextBilling}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--octo-text-muted)]">{t("marketing.subscriptions.col.payment")}</span>
                <span className="text-[var(--octo-text-primary)]">{subscriber.paymentMethod}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[12.5px]">
                <span className="text-[var(--octo-text-muted)]">{t("marketing.subscriptions.col.ltv")}</span>
                <span className="font-medium text-[var(--octo-text-primary)]">{money(subscriber.ltvSar)}</span>
              </div>

              <div className="mt-5">
                <h4 className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
                  <CalendarClock size={12} /> {t("marketing.subscriptions.drawer.billingHistory")}
                </h4>
                <ul className="mt-2 flex flex-col gap-2">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-center justify-between text-[12px]">
                      <span className="text-[var(--octo-text-secondary)]">{subscriber.started} + {i} {t("marketing.subscriptions.perMonth")}</span>
                      <span className="font-medium text-[var(--octo-text-primary)]">{money(plan.priceSar)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm">{t("marketing.subscriptions.actions.pause")}</Button>
                <Button variant="secondary" size="sm">{t("marketing.subscriptions.actions.resume")}</Button>
                <Button variant="danger" size="sm">{t("marketing.subscriptions.actions.cancel")}</Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
