import { useNavigate } from "react-router-dom";
import { aiInsight, topOpportunity } from "@/shared/api/mock-dashboard";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";

const RING = 62;
const RING_STROKE = 6;
const RING_R = (RING - RING_STROKE) / 2;
const RING_CIRC = 2 * Math.PI * RING_R;

// The frame's card outline, falling back to the theme's own in dark mode.
const LINE = "border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-card)]";

export function AiInsightsPanel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <section className={`flex min-h-[362px] flex-col gap-4 rounded-[12px] border bg-[var(--octo-card)] p-3 ${LINE}`}>
      <div className="flex items-center gap-2">
        <ShellIcon name="ai-sparkle.svg" size={15} className="text-[#8b7cf0]" />
        <h2 className="text-[16px] font-semibold leading-[16px] text-[var(--octo-text-primary)]">{t("dashboard.aiInsights")}</h2>
      </div>

      <div className="flex flex-col gap-4 pt-3">
        <div
          className={`flex flex-col gap-4 rounded-[12px] border bg-[#f5f9ff] p-3 [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#0D6EFD_8%,var(--octo-card))] ${LINE}`}
        >
          <div className="flex items-start gap-2">
            <ShellIcon name="insight-check.svg" size={16} className="mt-px text-[#8b7cf0]" />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <p className="text-[14px] font-bold leading-[1.2] text-[var(--octo-text-primary)]">
                {t("dashboard.aiHeadlinePrefix")}{" "}
                <bdi dir="ltr" className="text-[#4a3ce6] [[data-theme=dark]_&]:text-[#8b7cf0]">
                  {aiInsight.headlineValue}
                </bdi>
              </p>
              <p className="text-[12px] leading-[12px] text-[var(--octo-text-secondary)]">{t("dashboard.aiBody")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/finance/payments")}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-[8px] border border-[#0d6efd] bg-[var(--octo-card)] px-2.5 text-[14px] font-bold leading-[14px] text-[#0d6efd] transition-colors hover:bg-[#0d6efd]/[0.06]"
          >
            {t("dashboard.viewFullAnalysis")}
            <ShellIcon name="arrow-right.svg" className="rtl:rotate-180" />
          </button>
        </div>

        <div className={`flex items-center gap-3 rounded-[12px] border p-3 ${LINE}`}>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-[14px] font-bold leading-[14px] text-[var(--octo-text-primary)]">{t("dashboard.topOpportunity")}</p>
            <p className="pt-1 text-[12px] leading-[1.5] text-[var(--octo-text-muted)]">{t("dashboard.topOpportunityBody")}</p>
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
            <span className="absolute text-[13px] font-bold leading-[19.5px] text-[var(--octo-text-primary)]">{topOpportunity.percent}%</span>
          </div>
        </div>
      </div>
    </section>
  );
}
