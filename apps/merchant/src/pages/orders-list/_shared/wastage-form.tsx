// apps/merchant/src/pages/orders-list/_shared/wastage-form.tsx
import { useState } from "react";
import { ChevronDown, ChevronUp, Minus, Plus } from "lucide-react";
import { Checkbox, Select, Textarea } from "@ui/primitives";
import { FieldLabel, PrimaryButton } from "./form-bits";
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
    <div className="flex items-center gap-2 rounded-full bg-[var(--octo-hover)] p-1">
      <button
        type="button"
        onClick={onDecrement}
        aria-label={decrementLabel}
        className="grid h-6 w-6 place-items-center rounded-full bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:text-[var(--octo-text-primary)]"
      >
        <Minus size={12} />
      </button>
      <span className="w-4 text-center text-[13px] font-semibold text-[var(--octo-text-primary)]">{qty}</span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label={incrementLabel}
        className="grid h-6 w-6 place-items-center rounded-full bg-[#0D6EFD] text-white transition-opacity hover:opacity-90"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

export function WastageForm({
  title,
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
  title: string;
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
    <div>
      <h2 className="text-[22px] font-bold text-[var(--octo-text-primary)]">{title}</h2>

      <div className="mt-5">
        <FieldLabel>{selectLabel}</FieldLabel>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center justify-between gap-3 rounded-[10px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-4 py-3 text-start text-[13px] transition-colors hover:bg-[var(--octo-hover)]"
        >
          <span className={triggerText ? "text-[var(--octo-text-primary)]" : "text-[var(--octo-text-faint)]"}>
            {triggerText || itemsPlaceholder}
          </span>
          {open ? (
            <ChevronUp size={16} className="shrink-0 text-[#0D6EFD]" />
          ) : (
            <ChevronDown size={16} className="shrink-0 text-[var(--octo-text-muted)]" />
          )}
        </button>

        {open && (
          <div className="mt-2 rounded-[10px] border-[1.5px] border-[#0D6EFD] p-2">
            {items.map((item, index) => (
              <div key={index} className="flex items-center justify-between gap-3 px-2 py-1.5">
                <Checkbox
                  label={item.name}
                  className="text-[13px]"
                  checked={selected[index] > 0}
                  onChange={() => toggle(index)}
                />
                <QtyStepper
                  qty={selected[index] || 1}
                  decrementLabel={decrementLabel}
                  incrementLabel={incrementLabel}
                  onDecrement={() => setQty(index, (selected[index] || 1) - 1, item.qty)}
                  onIncrement={() => setQty(index, selected[index] > 0 ? selected[index] + 1 : 1, item.qty)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <FieldLabel>{reasonLabel}</FieldLabel>
        <Select value={reason} onChange={(event) => setReason(event.target.value)} aria-label={reasonLabel}>
          <option value="" disabled>
            {reasonPlaceholder}
          </option>
          {reasonOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="mt-4">
        <FieldLabel>{noteLabel}</FieldLabel>
        <Textarea
          placeholder={notePlaceholder}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-label={noteLabel}
        />
      </div>

      <PrimaryButton
        className="mt-5"
        label={submitLabel}
        disabled={selectedItems.length === 0 || !reason}
        onClick={() => onSubmit({ items: selectedItems, reason, note })}
      />
    </div>
  );
}
