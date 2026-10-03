// apps/merchant/src/pages/orders-list/_shared/wastage-form.tsx
import { useState } from "react";
import clsx from "clsx";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { FLOW_FIELD_BORDER, FLOW_TEXTAREA_CLASS, FieldLabel, FlowSelect, PrimaryButton } from "./form-bits";
import type { OrderItem } from "./types";

export interface WastagePayload {
  items: { name: string; qty: number }[];
  reason: string;
  note: string;
}

function QtyStepper({
  qty,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
}: {
  qty: number;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
}) {
  return (
    <div className={`flex shrink-0 items-center gap-6 rounded-[4px] ${FLOW_FIELD_BORDER} px-3 py-1`}>
      <button
        type="button"
        onClick={onDecrement}
        aria-label={decrementLabel}
        className="grid h-6 w-6 place-items-center rounded-full bg-[#f1f5f9] text-[#687280] transition-opacity hover:opacity-80 [[data-theme=dark]_&]:bg-[var(--octo-hover)] [[data-theme=dark]_&]:text-[var(--octo-text-secondary)]"
      >
        <ShellIcon name="ord-flow-minus.svg" size={24} />
      </button>
      <span className="min-w-[9px] text-center text-[14px] leading-[14px] text-[var(--octo-text-primary)]">{qty}</span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label={incrementLabel}
        className="grid h-6 w-6 place-items-center rounded-full bg-[#0D6EFD] text-white transition-opacity hover:opacity-90"
      >
        <ShellIcon name="ord-flow-plus.svg" size={24} />
      </button>
    </div>
  );
}

/** The body of the Wastage form step. The dialog title is drawn by the
 *  surrounding `Modal` so it stays put while this body scrolls. */
export function WastageForm({
  selectLabel,
  itemsPlaceholder,
  items,
  reasonLabel,
  reasonPlaceholder,
  reasonOptions,
  noteLabel,
  notePlaceholder,
  submitLabel,
  decrementLabel,
  incrementLabel,
  onSubmit,
}: {
  selectLabel: string;
  itemsPlaceholder: string;
  items: readonly OrderItem[];
  reasonLabel: string;
  reasonPlaceholder: string;
  reasonOptions: readonly { value: string; label: string }[];
  noteLabel: string;
  notePlaceholder: string;
  submitLabel: string;
  decrementLabel: string;
  incrementLabel: string;
  onSubmit: (payload: WastagePayload) => void;
}) {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState<Record<number, number>>(() =>
    Object.fromEntries(items.map((_, index) => [index, 0]))
  );
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  function toggle(index: number) {
    setSelected((prev) => ({ ...prev, [index]: prev[index] > 0 ? 0 : 1 }));
  }

  function setQty(index: number, qty: number, maxQty: number) {
    setSelected((prev) => ({ ...prev, [index]: Math.min(Math.max(0, qty), maxQty) }));
  }

  const selectedItems = items
    .map((item, index) => ({ name: item.name, qty: selected[index] }))
    .filter((entry) => entry.qty > 0);
  const triggerText = selectedItems.map((entry) => entry.name).join(" , ");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <FieldLabel required className="mb-3">
          {selectLabel}
        </FieldLabel>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className={`flex h-10 w-full items-center justify-between gap-3 rounded-[12px] ${FLOW_FIELD_BORDER} bg-[var(--octo-card)] px-2 text-start text-[14px] font-medium leading-[14px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/25`}
        >
          <span className={clsx("truncate py-1", triggerText ? "text-[var(--octo-text-primary)]" : "font-normal text-[var(--octo-text-secondary)]")}>
            {triggerText || itemsPlaceholder}
          </span>
          <ShellIcon
            name="ord-flow-arrow-thin.svg"
            size={24}
            className={open ? "-scale-y-100 text-[#0D6EFD]" : "text-[var(--octo-text-primary)]"}
          />
        </button>

        {open && (
          <div className="mt-2 flex flex-col gap-3 rounded-[12px] border border-[#0D6EFD] p-2">
            {items.map((item, index) => {
              const checked = selected[index] > 0;
              return (
                <div key={index} className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggle(index)}
                    className="flex min-w-0 items-center gap-2 text-start text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)]"
                  >
                    {/* The frames draw the unticked box as the same filled tick, in grey. */}
                    <ShellIcon
                      name="form-checkbox-on.svg"
                      size={24}
                      className={checked ? "text-[#0D6EFD]" : "text-[#cbd5e1] [[data-theme=dark]_&]:text-[var(--octo-border-input)]"}
                    />
                    <span className="truncate py-1">{item.name}</span>
                  </button>
                  <QtyStepper
                    qty={selected[index] || 1}
                    decrementLabel={decrementLabel}
                    incrementLabel={incrementLabel}
                    onDecrement={() => setQty(index, (selected[index] || 1) - 1, item.qty)}
                    onIncrement={() => setQty(index, selected[index] > 0 ? selected[index] + 1 : 1, item.qty)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <FieldLabel required>{reasonLabel}</FieldLabel>
        <FlowSelect value={reason} onChange={setReason} ariaLabel={reasonLabel}>
          <option value="" disabled>
            {reasonPlaceholder}
          </option>
          {reasonOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </FlowSelect>
      </div>

      <div>
        <FieldLabel>{noteLabel}</FieldLabel>
        <textarea
          className={FLOW_TEXTAREA_CLASS}
          placeholder={notePlaceholder}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-label={noteLabel}
        />
      </div>

      <PrimaryButton
        label={submitLabel}
        disabled={selectedItems.length === 0 || !reason}
        onClick={() => onSubmit({ items: selectedItems, reason, note })}
      />
    </div>
  );
}
