import { Building2, ArrowUp } from "lucide-react";
import { contribution } from "@/shared/api/mock-dashboard";
import { useI18n } from "@/app/providers/i18n-provider";
import { labelKey } from "@/shared/lib/labels";

const SIZE = 196;
const STROKE = 16;
const R = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * R;

export function OrderChannelDonut() {
  const { t } = useI18n();
  return (
    <section className="flex flex-col rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
      <div className="flex items-center gap-2">
        <Building2 size={15} className="text-[var(--octo-text-muted)]" />
        <h2 className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("dashboard.revenueContribution")}</h2>
      </div>

      <div className="relative mx-auto my-auto grid place-items-center py-4">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <defs>
            <linearGradient id="contrib-arc" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#4c35d4" />
              <stop offset="50%" stopColor="#5b8def" />
              <stop offset="100%" stopColor="#2ec9c0" />
            </linearGradient>
          </defs>
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none" stroke="var(--octo-track-ring)" strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R}
            fill="none" stroke="url(#contrib-arc)" strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${CIRC * contribution.filled} ${CIRC}`}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>

        <div className="absolute flex flex-col items-center">
          <span className="text-[11.5px] text-[var(--octo-text-muted)]">{t("common.total")}</span>
          <span className="text-[26px] font-bold leading-tight text-[var(--octo-text-primary)]">
            {contribution.total}
          </span>
          <span className="text-[11px] text-[var(--octo-text-faint)]">{t(labelKey(contribution.target))}</span>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-5 gap-1 pt-2">
        {contribution.items.map((item) => (
          <div key={item.label} className="flex flex-col items-center text-center">
            <ArrowUp size={11} style={{ color: item.color }} strokeWidth={3} />
            <span className="mt-0.5 text-[11px] font-semibold text-[var(--octo-text-primary)]">{item.value}</span>
            <span className="text-[9.5px] leading-tight text-[var(--octo-text-faint)]">{t(labelKey(item.label))}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
