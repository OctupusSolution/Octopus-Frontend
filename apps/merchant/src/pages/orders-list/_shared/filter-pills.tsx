// apps/merchant/src/pages/orders-list/_shared/filter-pills.tsx
import { useI18n } from "@/app/providers/i18n-provider";
import { STATE_STYLE } from "./theme";
import { STATE_LABEL_KEY } from "./stepper";
import { FILTER_PILL_STATES, type OrderState } from "./types";

export function OrderFilterPills({
  selected,
  onSelect,
  countAll,
  countByState,
}: {
  selected: OrderState | null;
  onSelect: (state: OrderState | null) => void;
  countAll: number;
  countByState: (state: OrderState) => number;
}) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillButton active={selected === null} onClick={() => onSelect(null)} dotColor="#0D6EFD" label={t("orders.pill.all")} count={countAll} />
      {FILTER_PILL_STATES.map((state) => (
        <PillButton
          key={state}
          active={selected === state}
          onClick={() => onSelect(state)}
          dotColor={STATE_STYLE[state].dot}
          label={t(STATE_LABEL_KEY[state])}
          count={countByState(state)}
        />
      ))}
    </div>
  );
}

function PillButton({
  active,
  onClick,
  dotColor,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  dotColor: string;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-[7px] text-[12px] font-medium transition-colors ${
        active
          ? "border-[#0D6EFD] bg-[#0D6EFD] text-white"
          : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? "#fff" : dotColor }} />
      {label}
      <span className={`rounded-full px-1.5 py-px text-[10.5px] ${active ? "bg-white/20" : "bg-[var(--octo-track)] text-[var(--octo-text-muted)]"}`}>
        {count}
      </span>
    </button>
  );
}
