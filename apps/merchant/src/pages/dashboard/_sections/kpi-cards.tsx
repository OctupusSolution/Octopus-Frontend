import { useNavigate } from "react-router-dom";
import { useI18n } from "@/app/providers/i18n-provider";
import { dashboardKpis, type DashboardKpi, type DashboardKpiTone } from "@/shared/api/mock-dashboard";
import { ShellIcon } from "@/shared/ui/shell-icon";

// The tint is mixed into the card token rather than hardcoded, so dark mode
// gets a dark card with a hint of the same hue instead of a pastel slab. On
// the light card the mixes land on the frame's own pastels.
const TONES: Record<DashboardKpiTone, { icon: string; tint: string }> = {
  blue: { icon: "#0063f6", tint: "color-mix(in srgb, #0063f6 6%, var(--octo-card))" },
  purple: { icon: "#7900f3", tint: "color-mix(in srgb, #7900f3 5%, var(--octo-card))" },
  green: { icon: "#01a036", tint: "color-mix(in srgb, #00d955 7%, var(--octo-card))" },
  amber: { icon: "#c27c00", tint: "color-mix(in srgb, #ffb400 6%, var(--octo-card))" },
};

const ICONS: Record<DashboardKpi["id"], string> = {
  orders: "kpi-orders.svg",
  reservations: "kpi-reservations.svg",
  revenue: "kpi-revenue.svg",
  "avg-value": "kpi-avg-value.svg",
};

export function KpiCards() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {dashboardKpis.map((kpi) => {
        const tone = TONES[kpi.tone];
        return (
          <button
            key={kpi.id}
            type="button"
            onClick={() => navigate(kpi.route)}
            style={{ background: tone.tint }}
            className="flex flex-col gap-3 rounded-[12px] border-2 border-[var(--octo-card)] p-4 text-start drop-shadow-[0_4px_2.5px_rgba(0,0,0,0.05)] transition-[filter] hover:drop-shadow-[0_6px_6px_rgba(0,0,0,0.1)]"
          >
            <span className="flex flex-col gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-[12px] text-white" style={{ background: tone.icon }}>
                <ShellIcon name={ICONS[kpi.id]} size={32} />
              </span>
              <span className="flex flex-col gap-2">
                <span className="whitespace-nowrap text-[32px] font-bold leading-[32px] text-[var(--octo-text-primary)]">{kpi.value}</span>
                <span className="text-[14px] font-medium leading-[14px] text-[var(--octo-text-secondary)]">{t(kpi.labelKey)}</span>
              </span>
            </span>
            <span className="flex items-end gap-2">
              <span className="flex items-end gap-1 text-[14px] font-medium leading-[14px] text-[#04783a] [[data-theme=dark]_&]:text-[#22c55e]">
                <ShellIcon name="delta-up.svg" size={16} />
                {kpi.delta}
              </span>
              <span className="text-[10px] leading-[10px] text-[var(--octo-text-secondary)]">{t("dashboard.sinceLastMonth")}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
