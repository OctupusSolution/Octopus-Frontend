import { useState } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import type { DistributionCard as DistributionCardData } from "@/shared/api/mock-dashboard";
import { ShellIcon } from "@/shared/ui/shell-icon";

type View = "branch" | "channel";

export function DistributionCard({ data, branches }: { data: DistributionCardData; branches: string[] }) {
  const { t } = useI18n();
  const [view, setView] = useState<View>("branch");

  const rows =
    view === "branch"
      ? data.branchRows.filter((r) => branches.length === 0 || (r.branch && branches.includes(r.branch)))
      : data.channelRows;

  return (
    <section className="flex min-h-[227px] flex-col gap-4 rounded-[12px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2 text-[var(--octo-text-primary)]">
          <ShellIcon name={data.id === "revenue" ? "status-up.svg" : "menu-board.svg"} />
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="text-[14px] font-bold leading-[14px]">{t(data.titleKey)}</h2>
            <p className="text-[12px] leading-[12px] text-[var(--octo-text-secondary)]">{t("dashboard.distributionSubtitle")}</p>
          </div>
        </div>
        <div role="tablist" className="flex shrink-0 items-center rounded-[12px] bg-[#f5f9ff] p-1 [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]">
          {(["branch", "channel"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={clsx(
                "rounded-[8px] px-3 py-1 text-[12px] font-medium leading-[12px] transition-colors",
                view === v
                  ? "bg-[#0d6efd] text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
                  : "text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]"
              )}
            >
              {t(`dashboard.view.${v}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-start justify-between gap-3 border-b border-[var(--octo-divider)] pb-2">
          <span className="text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)]">{t(data.titleKey)}</span>
          <span className="text-[18px] font-bold leading-[18px] text-[#0d6efd]">{data.total}</span>
        </div>

        {rows.length === 0 ? (
          <p className="mt-6 text-center text-[13px] text-[var(--octo-text-muted)]">{t("dashboard.distribution.empty")}</p>
        ) : (
          <div className="flex flex-col gap-3 pt-3">
            {rows.map((row) => (
              <div key={row.labelKey} className="flex flex-col gap-2">
                <div className="flex h-[17px] items-center justify-between gap-3">
                  <span className="truncate text-[12px] leading-[12px] text-[var(--octo-text-secondary)]">{t(row.labelKey)}</span>
                  <span className="whitespace-nowrap text-[16px] font-medium leading-[16px] text-[var(--octo-text-primary)]">{row.amount}</span>
                </div>
                <div className="h-5 overflow-hidden rounded-[6px] bg-[#f2f2f4] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]">
                  <div
                    className="flex h-full min-w-[46px] items-center justify-end rounded-[6px] pe-2 text-[10.5px] font-semibold leading-[15.75px] text-white"
                    style={{ width: `${row.percent}%`, background: data.color }}
                  >
                    {row.percent}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
