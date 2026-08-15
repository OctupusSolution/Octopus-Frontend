import { Sparkles, CircleCheck, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { aiInsight, topOpportunity } from "@/shared/api/mock-dashboard";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const RING = 62;
const RING_STROKE = 5;
const RING_R = (RING - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

export function AiInsightsPanel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <section className="flex flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-[#8b7cf0]" />
        <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("dashboard.aiInsights")}</h2>
      </div>

      <div
        className="mt-3 rounded-xl border border-[var(--octo-ai-border)] p-3.5"
        style={{ background: "var(--octo-ai-gradient)" }}
      >
        <div className="flex gap-2.5">
          <CircleCheck size={16} className="mt-px shrink-0 text-[#8b7cf0]" strokeWidth={2.2} />
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold leading-snug text-[var(--octo-text-primary)]">
              {t(labelKey(aiInsight.headlinePrefix))}{" "}
              <span className="text-[#6d4df0]">{aiInsight.headlineValue}</span>
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-[var(--octo-text-muted)]">{t(labelKey(aiInsight.body))}</p>
            <button
              type="button"
              onClick={() => navigate("/reports/sales")}
              className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-[var(--octo-ai-border)] bg-[var(--octo-card)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-ai-cta-hover)]"
            >
              {t(labelKey(aiInsight.cta))}
              <ArrowRight size={12} className="rtl:rotate-180" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl bg-[var(--octo-soft-bg)] p-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t(labelKey(topOpportunity.title))}</p>
          <p className="mt-1 text-[11.5px] leading-snug text-[var(--octo-text-muted)]">{t(labelKey(topOpportunity.body))}</p>
        </div>

        <div className="relative grid shrink-0 place-items-center" style={{ width: RING, height: RING }}>
          <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`} aria-hidden="true">
            <circle
              cx={RING / 2} cy={RING / 2} r={RING_R}
              fill="none" stroke="var(--octo-track-ring-2)" strokeWidth={RING_STROKE}
            />
            <circle
              cx={RING / 2} cy={RING / 2} r={RING_R}
              fill="none" stroke="#22c55e" strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${RING_CIRC * (topOpportunity.percent / 100)} ${RING_CIRC}`}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          </svg>
          <span className="absolute text-[13px] font-bold text-[var(--octo-text-primary)]">
            {topOpportunity.percent}%
          </span>
        </div>
      </div>
    </section>
  );
}
