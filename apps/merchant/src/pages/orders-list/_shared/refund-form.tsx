// apps/merchant/src/pages/orders-list/_shared/refund-form.tsx
import { useState } from "react";
import { Checkbox, Input, Select, Textarea } from "@ui/primitives";
import { formatSar } from "@octopus/api-client";
import { RadioCardGroup } from "./radio-card";
import { clampAmountSar, maxRefundableSar, selectedItemsTotalSar } from "./refund-amount";
import type { OrderRecord } from "./types";

export interface RefundPayload {
  type: "full" | "partial";
  method: "items" | "amount";
  selectedItems: string[];
  amountSar: number;
  reason: string;
  note: string;
}

export function RefundForm({
  order,
  isCash,
  typeLabel,
  typeFullLabel,
  typePartialLabel,
  methodLabel,
  methodItemsLabel,
  methodAmountLabel,
  amountPlaceholder,
  maxAmountLabel,
  amountFieldLabel,
  amountSummaryLabel,
  selectedSummaryLabel,
  reasonPlaceholder,
  reasonOptions,
  noteLabel,
  notePlaceholder,
  submitLabel,
  accent,
  onSubmit,
}: {
  order: OrderRecord;
  isCash: boolean;
  typeLabel: string;
  typeFullLabel: string;
  typePartialLabel: string;
  methodLabel: string;
  methodItemsLabel: string;
  methodAmountLabel: string;
  amountPlaceholder: string;
  maxAmountLabel: string;
  amountFieldLabel: string;
  amountSummaryLabel: string;
  selectedSummaryLabel: string;
  reasonPlaceholder: string;
  reasonOptions: readonly { value: string; label: string }[];
  noteLabel: string;
  notePlaceholder: string;
  submitLabel: string;
  accent: string;
  onSubmit: (payload: RefundPayload) => void;
}) {
  const max = maxRefundableSar(order);
  const [type, setType] = useState<"full" | "partial">("full");
  const [method, setMethod] = useState<"items" | "amount">("amount");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  function toggleItem(name: string) {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const itemsTotal = selectedItemsTotalSar(order.items, selectedItems);
  const amountSar = type === "full" ? max : method === "items" ? itemsTotal : clampAmountSar(amountInput, max);
  const canSubmit = type === "full" || (method === "items" ? selectedItems.size > 0 : amountSar > 0);

  function submit() {
    onSubmit({
      type,
      method: isCash ? "amount" : method,
      selectedItems: Array.from(selectedItems),
      amountSar,
      reason,
      note,
    });
  }

  return (
    <div>
      <p className="text-[12px] font-semibold text-[var(--octo-text-secondary)]">{typeLabel}</p>
      <RadioCardGroup
        name="refund-type"
        options={[
          { value: "full", label: typeFullLabel },
          { value: "partial", label: typePartialLabel },
        ]}
        value={type}
        onChange={(value) => setType(value as "full" | "partial")}
        className="mt-2"
      />

      {type === "partial" && !isCash && (
        <>
          <p className="mt-4 text-[12px] font-semibold text-[var(--octo-text-secondary)]">{methodLabel}</p>
          <RadioCardGroup
            name="refund-method"
            options={[
              { value: "items", label: methodItemsLabel },
              { value: "amount", label: methodAmountLabel },
            ]}
            value={method}
            onChange={(value) => setMethod(value as "items" | "amount")}
            className="mt-2"
          />
        </>
      )}

      {type === "partial" && (isCash || method === "amount") && (
        <div className="mt-4">
          {isCash && (
            <div className="mb-3 flex items-center justify-between rounded-[10px] bg-[var(--octo-hover)] px-3 py-2 text-[12.5px]">
              <span className="text-[var(--octo-text-muted)]">{maxAmountLabel}</span>
              <span className="font-semibold text-[#0D6EFD]">{formatSar(max)}</span>
            </div>
          )}
          <Input
            label={isCash ? amountFieldLabel : undefined}
            value={amountInput}
            onChange={(event) => setAmountInput(event.target.value)}
            placeholder={amountPlaceholder}
            inputMode="decimal"
          />
        </div>
      )}

      {type === "partial" && !isCash && method === "items" && (
        <div className="mt-4 rounded-[10px] border border-[var(--octo-border-input)] p-1">
          {order.items.map((item) => (
            <label key={item.name} className="flex items-center justify-between gap-2 rounded-[8px] px-2.5 py-2">
              <Checkbox label={item.name} checked={selectedItems.has(item.name)} onChange={() => toggleItem(item.name)} />
              <span className="text-[12.5px] text-[var(--octo-text-secondary)]">{formatSar(item.priceSar * item.qty)}</span>
            </label>
          ))}
        </div>
      )}

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

      <div className="mt-4 flex items-center justify-between rounded-[10px] bg-[var(--octo-hover)] px-3 py-2 text-[12.5px]">
        <span className="text-[var(--octo-text-muted)]">
          {type === "partial" && !isCash && method === "items"
            ? selectedSummaryLabel.replace("{n}", String(selectedItems.size))
            : amountSummaryLabel}
        </span>
        <span className="font-semibold text-[#0D6EFD]">{formatSar(amountSar)}</span>
      </div>

      <button
        type="button"
        disabled={!canSubmit || !reason}
        onClick={submit}
        className="mt-5 w-full rounded-[9px] bg-[#0D6EFD] py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </div>
  );
}
