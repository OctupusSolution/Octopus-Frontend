import { useNavigate } from "react-router-dom";
import { BarChart3, Banknote, CalendarCheck, ClipboardList, PieChart, type LucideIcon } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { dashboardKpis, type DashboardKpi, type DashboardKpiTone } from "@/shared/api/mock-dashboard";

// The tint is mixed into the card token rather than hardcoded, so dark mode
// gets a dark card with a hint of the same hue instead of a pastel slab.
const TONES: Record<DashboardKpiTone, { icon: string; tint: string }> = {
  blue: { icon: "#0D6EFD", tint: "color-mix(in srgb, #0D6EFD 7%, var(--octo-card))" },
  purple: { icon: "#7B2FF2", tint: "color-mix(in srgb, #7B2FF2 7%, var(--octo-card))" },
  green: { icon: "#16A34A", tint: "color-mix(in srgb, #16A34A 8%, var(--octo-card))" },
  amber: { icon: "#D98A06", tint: "color-mix(in srgb, #F5B400 9%, var(--octo-card))" },
};

const ICONS: Record<DashboardKpi["id"], LucideIcon> = {
  orders: ClipboardList,
  reservations: CalendarCheck,
  revenue: Banknote,
  "avg-value": PieChart,
};

export function KpiCards() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-[25px] sm:grid-cols-2 xl:grid-cols-4">
      {dashboardKpis.map((kpi) => {
        const tone = TONES[kpi.tone];
        const Icon = ICONS[kpi.id];
        return (
          <button
            key={kpi.id}
            type="button"
            onClick={() => navigate(kpi.route)}
            style={{ background: tone.tint }}
            className="flex flex-col rounded-xl px-4 pb-4 pt-4 text-start shadow-[0_4px_14px_-6px_rgba(15,23,42,0.18)] transition-shadow hover:shadow-[0_8px_22px_-8px_rgba(15,23,42,0.28)]"
          >
            <span className="grid h-[50px] w-[50px] place-items-center rounded-[10px] text-white" style={{ background: tone.icon }}>
              <Icon size={26} strokeWidth={1.8} />
            </span>
            <span className="mt-4 whitespace-nowrap text-[34px] font-bold leading-none tracking-[-0.01em] text-[var(--octo-text-primary)]">
              {kpi.value}
            </span>
            <span className="mt-2 text-[15px] text-[var(--octo-text-secondary)]">{t(kpi.labelKey)}</span>
            <span className="mt-2.5 flex items-center gap-1.5">
              <BarChart3 size={17} className="text-[#16A34A]" />
              <span className="text-[15px] font-medium text-[#16A34A]">{kpi.delta}</span>
              <span className="ms-1 text-[11px] text-[var(--octo-text-secondary)]">{t("dashboard.sinceLastMonth")}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
