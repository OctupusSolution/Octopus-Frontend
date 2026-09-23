import { Sparkles, CircleCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { aiInsight, topOpportunity } from "@/shared/api/mock-dashboard";
import { useI18n } from "@/app/providers/i18n-provider";

const RING = 66;
const RING_STROKE = 6;
const RING_R = (RING - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

export function AiInsightsPanel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <section className="flex flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3.5 pb-8 pt-3">
      <div className="flex items-center gap-2">
        <Sparkles size={17} className="text-[#8b7cf0]" />
        <h2 className="text-[17px] font-medium text-[var(--octo-text-primary)]">{t("dashboard.aiInsights")}</h2>
      </div>

      <div className="mt-6 rounded-xl border border-[#0D6EFD]/20 bg-[color-mix(in_srgb,#0D6EFD_5%,var(--octo-card))] px-3.5 pb-3.5 pt-3.5">
        <div className="flex gap-2.5">
          <CircleCheck size={16} className="mt-0.5 shrink-0 text-[#8b7cf0]" strokeWidth={2} />
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold leading-snug text-[var(--octo-text-primary)]">
              {t("dashboard.aiHeadlinePrefix")} <bdi dir="ltr" className="text-[#6d4df0]">{aiInsight.headlineValue}</bdi>
            </p>
            <p className="mt-3.5 text-[12.5px] leading-tight text-[var(--octo-text-secondary)]">{t("dashboard.aiBody")}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/finance/payments")}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#0D6EFD] bg-[var(--octo-card)] py-2 text-[15px] font-semibold text-[#0D6EFD] transition-colors hover:bg-[#0D6EFD]/[0.06]"
        >
          {t("dashboard.viewFullAnalysis")}
          <ArrowRight size={17} className="rtl:rotate-180" />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-xl border border-[var(--octo-border-card)] px-3.5 py-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[var(--octo-text-primary)]">{t("dashboard.topOpportunity")}</p>
          <p className="mt-3 text-[12.5px] leading-[1.55] text-[var(--octo-text-muted)]">{t("dashboard.topOpportunityBody")}</p>
        </div>
        <div className="relative grid shrink-0 place-items-center" style={{ width: RING, height: RING }}>
          <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`} aria-hidden="true">
            <circle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none" stroke="var(--octo-track-ring-2)" strokeWidth={RING_STROKE} />
            <circle
              cx={RING / 2} cy={RING / 2} r={RING_R}
              fill="none" stroke="#22c55e" strokeWidth={RING_STROKE} strokeLinecap="round"
              strokeDasharray={`${RING_CIRC * (topOpportunity.percent / 100)} ${RING_CIRC}`}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          </svg>
          <span className="absolute text-[14px] font-bold text-[var(--octo-text-primary)]">{topOpportunity.percent}%</span>
        </div>
      </div>
    </section>
  );
}
