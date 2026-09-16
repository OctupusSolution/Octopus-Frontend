// apps/merchant/src/pages/orders-list/_shared/wastage-form.tsx
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Checkbox, Select, Textarea } from "@ui/primitives";
import type { OrderItem } from "./types";

export interface WastagePayload {
  items: { name: string; qty: number }[];
  reason: string;
  note: string;
}

export function WastageForm({
  title,
  selectLabel,
  items,
  reasonPlaceholder,
  reasonOptions,
  noteLabel,
  notePlaceholder,
  submitLabel,
  accent,
  onSubmit,
}: {
  title: string;
  selectLabel: string;
  items: readonly OrderItem[];
  reasonPlaceholder: string;
  reasonOptions: readonly { value: string; label: string }[];
  noteLabel: string;
  notePlaceholder: string;
  submitLabel: string;
  accent: string;
  onSubmit: (payload: WastagePayload) => void;
}) {
  const [selected, setSelected] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((item) => [item.name, 0]))
  );
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  function toggle(name: string) {
    setSelected((prev) => ({ ...prev, [name]: prev[name] > 0 ? 0 : 1 }));
  }

  function setQty(name: string, qty: number) {
    setSelected((prev) => ({ ...prev, [name]: Math.max(0, qty) }));
  }

  const selectedItems = items
    .filter((item) => selected[item.name] > 0)
    .map((item) => ({ name: item.name, qty: selected[item.name] }));

  return (
    <div>
      <h2 className="text-[17px] font-bold text-[var(--octo-text-primary)]">{title}</h2>

      <p className="mt-4 text-[12px] font-semibold text-[var(--octo-text-secondary)]">{selectLabel}</p>
      <div className="mt-2 rounded-[10px] border border-[var(--octo-border-input)] p-1">
        {items.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2">
            <Checkbox label={item.name} checked={selected[item.name] > 0} onChange={() => toggle(item.name)} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQty(item.name, (selected[item.name] || 1) - 1)}
                className="grid h-6 w-6 place-items-center rounded-full border border-[var(--octo-border-input)] text-[var(--octo-text-secondary)]"
              >
                <Minus size={12} />
              </button>
              <span className="w-4 text-center text-[12.5px]">{selected[item.name] || 1}</span>
              <button
                type="button"
                onClick={() => setQty(item.name, selected[item.name] > 0 ? selected[item.name] + 1 : 1)}
                className="grid h-6 w-6 place-items-center rounded-full text-white"
                style={{ backgroundColor: accent }}
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <Select value={reason} onChange={(event) => setReason(event.target.value)}>
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
        <Textarea
          label={noteLabel}
          placeholder={notePlaceholder}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <button
        type="button"
        disabled={selectedItems.length === 0 || !reason}
        onClick={() => onSubmit({ items: selectedItems, reason, note })}
        className="mt-5 w-full rounded-[9px] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        style={{ backgroundColor: accent }}
      >
        {submitLabel}
      </button>
    </div>
  );
}
