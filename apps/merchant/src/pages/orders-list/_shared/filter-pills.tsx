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
      <PillButton
        active={selected === null}
        onClick={() => onSelect(null)}
        tone="#0D6EFD"
        label={t("orders.pill.all")}
        count={countAll}
      />
      {FILTER_PILL_STATES.map((state) => (
        <PillButton
          key={state}
          active={selected === state}
          onClick={() => onSelect(state)}
          tone={STATE_STYLE[state].dot}
          label={t(STATE_LABEL_KEY[state])}
          count={countByState(state)}
        />
      ))}
    </div>
  );
}

// Every pill carries its own state's colour as a tint — a 10%-alpha fill with
// the full-strength colour on the dot and the label — and the selected pill
// inverts to that colour solid with white text.
function PillButton({
  active,
  onClick,
  tone,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  tone: string;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center gap-1.5 rounded-full px-3 py-[7px] text-[12.5px] font-medium transition-opacity hover:opacity-85"
      style={{
        backgroundColor: active ? tone : `${tone}1A`,
        color: active ? "#FFFFFF" : tone,
      }}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: active ? "#FFFFFF" : tone }}
      />
      {label}
      <span
        className="rounded-full px-1.5 py-px text-[10.5px] font-semibold"
        style={{
          backgroundColor: active ? "rgba(255,255,255,0.22)" : `${tone}26`,
          color: active ? "#FFFFFF" : tone,
        }}
      >
        {count}
      </span>
    </button>
  );
}
