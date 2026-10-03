import { useState } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import { dashboardLiveOrders, type DashboardOrderStatus } from "@/shared/api/mock-dashboard";
import { ShellIcon } from "@/shared/ui/shell-icon";

// The frame's status colours. The pill behind each is the same colour mixed
// thin, which lands on the frame's pastels in light mode and still reads on a
// dark card.
const STATUS_STYLE: Record<DashboardOrderStatus, string> = {
  preparing: "#de9000",
  ready: "#009a39",
  outForDelivery: "#6c4dff",
  completed: "#0d6efd",
  cancelled: "#d30202",
};

const COLUMNS = ["orderId", "customer", "branch", "channel", "items", "total", "status", "createdAt"] as const;

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-US", {
    numberingSystem: "latn",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

const boxClass = "block h-[13px] w-[13px] cursor-pointer rounded-[2px] accent-[#0D6EFD]";

export function LiveOrders({ branches }: { branches: string[] }) {
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = dashboardLiveOrders.filter((o) => branches.length === 0 || branches.includes(o.branch));
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.key));

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-center gap-2 text-[var(--octo-text-primary)]">
        <ShellIcon name="clipboard-text.svg" />
        <h2 className="text-[20px] font-semibold leading-[20px]">{t("dashboard.liveOrders")}</h2>
      </div>

      <div className="overflow-x-auto rounded-[14.5px] border-[0.8px] border-[#e2e8f0] bg-[var(--octo-card)] [[data-theme=dark]_&]:border-[var(--octo-border-card)]">
        <table className="w-full min-w-[900px] text-[12px] leading-[12px]">
          <thead>
            <tr className="h-9 bg-[#f8fafc] text-[var(--octo-text-primary)] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]">
              <th className="w-[41px] ps-[14px]">
                <input
                  type="checkbox"
                  aria-label={t("common.selectAll")}
                  className={boxClass}
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.key)))}
                />
              </th>
              {COLUMNS.map((c) => (
                <th key={c} className="px-2 font-semibold capitalize">{t(`dashboard.col.${c}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="py-8 text-center text-[var(--octo-text-muted)]">
                  {t("dashboard.liveOrders.empty")}
                </td>
              </tr>
            ) : (
              rows.map((o) => {
                const color = STATUS_STYLE[o.status];
                return (
                  <tr
                    key={o.key}
                    className="h-10 border-t-[0.8px] border-[#f1f5f9] text-center text-[var(--octo-text-primary)] [[data-theme=dark]_&]:border-[var(--octo-border-card)]"
                  >
                    <td className="ps-[14px] text-start">
                      <input
                        type="checkbox"
                        aria-label={o.id}
                        className={boxClass}
                        checked={selected.has(o.key)}
                        onChange={() => toggle(o.key)}
                      />
                    </td>
                    <td className="px-1" dir="ltr">{o.id}</td>
                    <td className="px-1">{o.customer}</td>
                    <td className="px-1">{t(`dashboard.branch.${o.branch}`)}</td>
                    <td className="px-1">{t(o.channelKey)}</td>
                    <td className="px-1">{o.items}</td>
                    <td className="px-1">{o.total}</td>
                    <td className="px-1">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium"
                        style={{ color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
                      >
                        <span className="h-[5px] w-[5px] rounded-full" style={{ background: color }} />
                        {t(`status.${o.status}`)}
                      </span>
                    </td>
                    <td className="px-1">{formatDate(o.createdAt, locale)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
