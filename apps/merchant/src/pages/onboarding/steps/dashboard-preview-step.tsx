// Step 9 — a small, real dashboard rather than a screenshot, so it follows the
// active theme and reading direction. The figures are obviously sample data and
// are labelled as such; the module list and the summary are the merchant's own.
import { useState } from "react";
import { Info } from "lucide-react";
import { Tabs } from "@ui/primitives";
import { formatSar, getModule, type ModuleId } from "@/shared/catalog";
import { useI18n } from "@/app/providers/i18n-provider";
import { CatalogIcon } from "@/shared/lib/catalog-icon";
import { readableOn } from "../_shared/brand-catalog";
import { formatCount } from "../_shared/pricing";
import type { StepProps } from "../_shared/steps";

const SAMPLE_TILES: { labelKey: string; value: number; money: boolean }[] = [
  { labelKey: "dashboard.kpi.orders", value: 220, money: false },
  { labelKey: "dashboard.kpi.reservations", value: 48, money: false },
  { labelKey: "dashboard.kpi.revenue", value: 28000, money: true },
  { labelKey: "dashboard.kpi.avgOrder", value: 145, money: true },
];

export function DashboardPreviewStep({ draft }: StepProps) {
  const { t, locale } = useI18n();
  // The tab id is always a module id — the strip is built from `draft.enabled`.
  const [tab, setTab] = useState<ModuleId | null>(draft.enabled[0] ?? null);
  const { brand } = draft;
  const iconColor = readableOn(brand.primary);

  const tabs = draft.enabled
    .map((id) => getModule(id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m))
    .map((m) => ({ id: m.id, label: t(m.nameKey) }));

  // The tab strip is not decoration: picking a module names it and says what it
  // does, straight from the catalog. It does not pretend to be a per-module
  // dashboard — the figures below are the same labelled sample set throughout.
  const selectedModule = tab ? getModule(tab) : undefined;

  return (
    <section className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      {/* Ten-plus module tabs do not fit on a phone and the Tabs primitive
          neither wraps nor scrolls, so the strip scrolls inside its own
          container rather than pushing the page sideways. */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="w-max min-w-full">
          <Tabs items={tabs} value={tab ?? ""} onChange={(id) => setTab(id as ModuleId)} />
        </div>
      </div>

      {selectedModule && (
        <div className="mt-3">
          <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t(selectedModule.nameKey)}</p>
          <p className="mt-0.5 text-[11px] text-[var(--octo-text-muted)]">{t(selectedModule.descKey)}</p>
        </div>
      )}

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {SAMPLE_TILES.map((tile) => (
          <div key={tile.labelKey} className="rounded-[10px] border border-[var(--octo-border-card)] p-3">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
              {t(tile.labelKey)}
            </p>
            <p className="mt-1 text-[19px] font-bold text-[var(--octo-text-primary)]">
              {tile.money ? formatSar(tile.value, locale) : formatCount(tile.value, locale)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {draft.enabled.slice(0, 6).map((id) => {
          const module = getModule(id);
          return module ? (
            <div key={id} className="flex items-center gap-2.5 rounded-[10px] border border-[var(--octo-border-card)] px-3 py-2.5">
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px]"
                style={{ backgroundColor: brand.primary, color: iconColor }}
              >
                <CatalogIcon name={module.icon} size={14} />
              </span>
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-[var(--octo-text-primary)]">{t(module.nameKey)}</span>
                <span className="block truncate text-[10.5px] text-[var(--octo-text-muted)]">{t(module.descKey)}</span>
              </span>
            </div>
          ) : null;
        })}
      </div>

      <p className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--octo-hover)] px-2.5 py-1.5 text-[10.5px] text-[var(--octo-text-muted)]">
        <Info size={11} />
        {t("onboarding.dashboardPreview.sampleNote")}
      </p>
    </section>
  );
}
