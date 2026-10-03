// apps/merchant/src/pages/customers/segments/segment-card.tsx
import { useI18n } from "@/app/providers/i18n-provider";
import { formatSarWhole } from "../_shared/format";
import { describeCriteria, membersLine, segmentDisplayName, type SegmentView } from "./segment-model";
import { TrendSparkline } from "./trend-chart";

export function SegmentCard({
  segment,
  onEditRules,
  onCreateCampaign,
}: {
  segment: SegmentView;
  onEditRules: () => void;
  onCreateCampaign: () => void;
}) {
  const { t, locale } = useI18n();
  const rule = describeCriteria(segment.criteria, t, locale);
  return (
    <article className="flex min-w-0 flex-col rounded-[12px] border border-[#cbd5e1] bg-[var(--octo-card)] p-4 [[data-theme=dark]_&]:border-[var(--octo-border-input)]">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 truncate text-[18px] font-bold leading-[19px] text-[#0058da] [[data-theme=dark]_&]:text-[#0d6efd]">
          {segmentDisplayName(segment.name, t)}
        </h2>
        <p className="shrink-0 pt-[2px] text-[12px] font-medium leading-[12px] text-[#58606c] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]">
          {membersLine(segment, t)}
        </p>
      </div>

      <p
        title={rule}
        className="mt-2 truncate rounded-[8px] bg-[#f1f5f9] p-2 text-[12px] font-medium leading-[12px] text-[var(--octo-text-primary)] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]"
      >
        {rule}
      </p>

      {/* The frame stops this row 5px short of the card's inner edge. */}
      <div className="flex h-[42px] items-center justify-between gap-2 pe-[5px] pt-[10px]">
        <p className="min-w-0 truncate text-[12px] leading-[12px] text-[var(--octo-text-secondary)]">
          {t("customers.segments.avgSpend")}{" "}
          <span className="font-semibold text-[#0d6efd]">{segment.avgSpendSar === null ? "—" : formatSarWhole(segment.avgSpendSar)}</span>
        </p>
        <TrendSparkline trend={segment.trend} />
      </div>

      <div className="mt-2 flex items-center gap-2 border-t border-[var(--octo-divider)] pt-3">
        <button
          type="button"
          onClick={onEditRules}
          className="h-9 min-w-0 flex-1 truncate rounded-[9px] border border-[#cbd5e1] p-2 text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)] [[data-theme=dark]_&]:border-[var(--octo-border-input)]"
        >
          {t("customers.segments.editRules")}
        </button>
        <button
          type="button"
          onClick={onCreateCampaign}
          className="h-9 min-w-0 flex-1 truncate rounded-[9px] bg-[#f5f9ff] p-2 text-[14px] font-semibold leading-[14px] text-[#0d6efd] transition-[filter] hover:brightness-[0.97] [[data-theme=dark]_&]:bg-[#0d6efd]/15"
        >
          {t("customers.segments.createCampaign")}
        </button>
      </div>
    </article>
  );
}
