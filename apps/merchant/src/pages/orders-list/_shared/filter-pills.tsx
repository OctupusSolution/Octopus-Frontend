// apps/merchant/src/pages/orders-list/_shared/filter-pills.tsx
import { useI18n } from "@/app/providers/i18n-provider";
import { ALL_PILL_TINT, PILL_TINT, TINT_CLASS, tintVars, type Tint } from "./theme";
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

  // `contents` lets the pills wrap in the same line box as the filter icon
  // beside them instead of dropping below it as one block.
  return (
    <div className="contents">
      <PillButton
        active={selected === null}
        onClick={() => onSelect(null)}
        tint={ALL_PILL_TINT}
        label={t("orders.pill.all")}
        count={countAll}
      />
      {FILTER_PILL_STATES.map((state) => (
        <PillButton
          key={state}
          active={selected === state}
          onClick={() => onSelect(state)}
          tint={PILL_TINT[state]}
          label={t(STATE_LABEL_KEY[state])}
          count={countByState(state)}
        />
      ))}
    </div>
  );
}

// Every pill carries its own state's colour as a pastel fill with the
// full-strength colour on the dot, label and count; the selected pill inverts
// to that colour solid with white text, as the frame's "All Orders" does.
function PillButton({
  active,
  onClick,
  tint,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  tint: Tint;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-[42px] items-center gap-1 whitespace-nowrap rounded-[4px] p-2 text-[14px] font-medium leading-[14px] transition-[filter] hover:brightness-[0.97] ${
        active ? "bg-[var(--tint-fg)] text-white" : TINT_CLASS
      }`}
      style={tintVars(tint)}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-current" />
      <span className="flex items-center gap-2">
        {label}
        <span className="grid h-[26px] min-w-[26px] place-items-center rounded-full bg-white p-1 text-[10px] leading-[10px] text-[color:var(--tint-fg)] [[data-theme=dark]_&]:bg-[var(--octo-card)] [[data-theme=dark]_&]:text-[color:color-mix(in_srgb,var(--tint-fg)_55%,white)]">
          {count}
        </span>
      </span>
    </button>
  );
}
