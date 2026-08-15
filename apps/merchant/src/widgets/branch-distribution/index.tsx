import { useState } from "react";
import { FileBarChart } from "lucide-react";
import {
  distributionColumns,
  channelDistributionColumns,
  type DistributionColumn,
} from "@/shared/api/mock-dashboard";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const VIEWS = ["Branch", "Channel"] as const;

export function BranchDistribution({ branches }: { branches?: readonly string[] }) {
  const [view, setView] = useState<(typeof VIEWS)[number]>("Branch");
  const { t } = useI18n();

  const activeBranches = branches && branches.length > 0 ? branches : undefined;
  const columns = view === "Channel" ? channelDistributionColumns : distributionColumns;
  const visible = activeBranches
    ? columns.map((col) => ({
        ...col,
        rows: col.rows.filter((row) => !row.branch || activeBranches.includes(row.branch)),
      }))
    : columns;

  const hasVisibleRows = visible.some((col) => col.rows.length > 0);

  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileBarChart size={15} className="text-[var(--octo-text-muted)]" />
            <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
              {t("dashboard.distribution")}
            </h2>
          </div>
          <p className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">
            {t("dashboard.distributionSubtitle")}
          </p>
        </div>

        <div className="flex shrink-0 items-center rounded-[9px] bg-[var(--octo-seg-bg)] p-[3px]">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={
                view === v
                  ? "rounded-[7px] bg-[var(--octo-card)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--octo-text-primary)] shadow-sm"
                  : "rounded-[7px] px-3 py-1.5 text-[11.5px] font-medium text-[var(--octo-text-muted)]"
              }
            >
              {t(labelKey(v))}
            </button>
          ))}
        </div>
      </div>

      {hasVisibleRows ? (
        <div className="mt-4 grid grid-cols-2 gap-x-6">
          {visible.map((col) => (
            <Column key={col.title} column={col} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-center text-[11.5px] text-[var(--octo-text-muted)]">
          {t("dashboard.distribution.empty")}
        </p>
      )}
    </section>
  );
}

function Column({ column }: { column: DistributionColumn }) {
  const { t } = useI18n();
  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-[var(--octo-divider)] pb-2">
        <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t(labelKey(column.title))}</span>
        <span className="text-[12px] font-semibold text-[var(--octo-text-primary)]">{column.total}</span>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {column.rows.map((row) => (
          <div key={row.label}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-[11.5px] text-[var(--octo-text-secondary)]">{row.label}</span>
              <span className="shrink-0 text-[11.5px] font-medium text-[var(--octo-text-primary)]">
                {row.amount}
              </span>
            </div>

            <div className="mt-1.5 h-5 w-full overflow-hidden rounded-md bg-[var(--octo-track)]">
              <div
                className="flex h-full items-center justify-end rounded-md pe-2"
                style={{ width: `${row.percent}%`, backgroundColor: column.color }}
              >
                <span className="text-[10.5px] font-semibold text-[var(--octo-text-primary)]">{row.percent}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
