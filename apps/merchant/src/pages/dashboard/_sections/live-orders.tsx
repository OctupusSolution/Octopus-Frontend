import { useState } from "react";
import { NotepadText } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { dashboardLiveOrders, type DashboardOrderStatus } from "@/shared/api/mock-dashboard";

const STATUS_STYLE: Record<DashboardOrderStatus, string> = {
  preparing: "#E8A400",
  ready: "#16A34A",
  outForDelivery: "#7C5CF0",
  completed: "#0D6EFD",
  cancelled: "#DC2626",
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

const boxClass = "h-4 w-4 cursor-pointer rounded border-[var(--octo-border-input)] accent-[#0D6EFD]";

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
    <section>
      <div className="flex items-center gap-2.5">
        <NotepadText size={24} strokeWidth={1.6} className="text-[var(--octo-text-primary)]" />
        <h2 className="text-[21px] font-medium text-[var(--octo-text-primary)]">{t("dashboard.liveOrders")}</h2>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)]">
        <table className="w-full min-w-[900px] text-[13px]">
          <thead>
            <tr className="bg-[var(--octo-soft-bg)] text-[13px] font-semibold text-[var(--octo-text-primary)]">
              <th className="w-[44px] py-3 ps-4">
                <input
                  type="checkbox"
                  aria-label={t("common.selectAll")}
                  className={boxClass}
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.key)))}
                />
              </th>
              {COLUMNS.map((c) => (
                <th key={c} className="px-3 py-3 font-semibold">{t(`dashboard.col.${c}`)}</th>
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
                  <tr key={o.key} className="border-t border-[var(--octo-border-card)] text-center text-[var(--octo-text-primary)]">
                    <td className="py-[11px] ps-4 text-start">
                      <input
                        type="checkbox"
                        aria-label={o.id}
                        className={boxClass}
                        checked={selected.has(o.key)}
                        onChange={() => toggle(o.key)}
                      />
                    </td>
                    <td className="px-3" dir="ltr">{o.id}</td>
                    <td className="px-3">{o.customer}</td>
                    <td className="px-3">{t(`dashboard.branch.${o.branch}`)}</td>
                    <td className="px-3">{t(o.channelKey)}</td>
                    <td className="px-3">{o.items}</td>
                    <td className="px-3">{o.total}</td>
                    <td className="px-3">
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[13px]"
                        style={{ color, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                        {t(`status.${o.status}`)}
                      </span>
                    </td>
                    <td className="px-3">{formatDate(o.createdAt, locale)}</td>
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
