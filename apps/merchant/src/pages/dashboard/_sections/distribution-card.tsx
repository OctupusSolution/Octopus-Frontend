import { useState } from "react";
import { ChartNoAxesCombined, NotepadText } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import type { DistributionCard as DistributionCardData } from "@/shared/api/mock-dashboard";

type View = "branch" | "channel";

export function DistributionCard({ data, branches }: { data: DistributionCardData; branches: string[] }) {
  const { t } = useI18n();
  const [view, setView] = useState<View>("branch");
  const Icon = data.id === "revenue" ? ChartNoAxesCombined : NotepadText;

  const rows =
    view === "branch"
      ? data.branchRows.filter((r) => branches.length === 0 || (r.branch && branches.includes(r.branch)))
      : data.channelRows;

  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] pb-5 pt-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2.5">
          <Icon size={24} className="mt-0.5 shrink-0 text-[var(--octo-text-primary)]" strokeWidth={1.6} />
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t(data.titleKey)}</h2>
            <p className="mt-1 text-[12.5px] text-[var(--octo-text-secondary)]">{t("dashboard.distributionSubtitle")}</p>
          </div>
        </div>
        <div role="tablist" className="flex shrink-0 rounded-md bg-[var(--octo-soft-bg)] p-0.5">
          {(["branch", "channel"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={clsx(
                "rounded-md px-3 py-[3px] text-[12.5px] transition-colors",
                view === v ? "bg-[#0D6EFD] text-white" : "text-[var(--octo-text-secondary)] hover:text-[var(--octo-text-primary)]"
              )}
            >
              {t(`dashboard.view.${v}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3 border-b border-[var(--octo-border-card)] pb-3">
        <span className="text-[15px] text-[var(--octo-text-primary)]">{t(data.titleKey)}</span>
        <span className="text-[20px] font-bold text-[#0D6EFD]">{data.total}</span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-6 text-center text-[13px] text-[var(--octo-text-muted)]">{t("dashboard.distribution.empty")}</p>
      ) : (
        rows.map((row) => (
          <div key={row.labelKey} className="mt-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-[var(--octo-text-secondary)]">{t(row.labelKey)}</span>
              <span className="text-[17px] text-[var(--octo-text-primary)]">{row.amount}</span>
            </div>
            <div className="mt-1.5 h-5 overflow-hidden rounded-md bg-[var(--octo-soft-bg)]">
              <div
                className="flex h-full min-w-[46px] items-center justify-center rounded-md text-[11px] font-semibold text-white"
                style={{ width: `${row.percent}%`, background: data.color }}
              >
                {row.percent}%
              </div>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
