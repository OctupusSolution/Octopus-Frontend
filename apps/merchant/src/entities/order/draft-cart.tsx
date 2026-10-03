// The cart of a not-yet-sent order (or of lines about to be added).
import { Minus, Plus, Trash2 } from "lucide-react";
import { draftEstimate, setDraftQuantity, type DraftLine } from "./order-draft";
import { useOrderText } from "./order-text";

export function DraftCart({
  lines,
  currency,
  onChange,
}: {
  lines: readonly DraftLine[];
  currency: string;
  onChange: (lines: DraftLine[]) => void;
}) {
  const { tx } = useOrderText();

  if (lines.length === 0) {
    return <p className="py-4 text-center text-[12.5px] text-[var(--octo-text-muted)]">{tx("cart.empty")}</p>;
  }

  return (
    <div>
      <ul className="flex flex-col divide-y divide-[var(--octo-divider)]">
        {lines.map((line) => (
          <li key={line.key} className="flex items-start justify-between gap-3 py-2">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{line.name}</p>
              {line.optionNames.length > 0 && (
                <p className="text-[11.5px] text-[var(--octo-text-muted)]">{line.optionNames.join("، ")}</p>
              )}
              {line.note && <p className="text-[11.5px] text-[#D97706]">{line.note}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                aria-label="-"
                onClick={() => onChange(setDraftQuantity(lines, line.key, line.quantity - 1))}
                className="grid h-7 w-7 place-items-center rounded-full text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
              >
                <Minus size={13} />
              </button>
              <span className="w-6 text-center text-[13px] font-semibold tabular-nums">{line.quantity}</span>
              <button
                type="button"
                aria-label="+"
                onClick={() => onChange(setDraftQuantity(lines, line.key, line.quantity + 1))}
                className="grid h-7 w-7 place-items-center rounded-full text-[var(--octo-text-secondary)] hover:bg-[var(--octo-hover)]"
              >
                <Plus size={13} />
              </button>
              <button
                type="button"
                aria-label={tx("cart.remove")}
                onClick={() => onChange(setDraftQuantity(lines, line.key, 0))}
                className="grid h-7 w-7 place-items-center rounded-full text-[#DC2626] hover:bg-[#DC2626]/10"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center justify-between border-t border-[var(--octo-divider)] pt-2 text-[13px]">
        <span className="text-[var(--octo-text-muted)]">{tx("cart.estimate")}</span>
        <span className="font-bold text-[#0D6EFD]">
          {currency} {draftEstimate(lines).toFixed(2)}
        </span>
      </div>
    </div>
  );
}
