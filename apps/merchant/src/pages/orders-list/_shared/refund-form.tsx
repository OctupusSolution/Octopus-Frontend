// apps/merchant/src/pages/orders-list/_shared/refund-form.tsx
import { useState } from "react";
import { Checkbox, Input, Select, Textarea } from "@ui/primitives";
import { formatSar } from "@octopus/api-client";
import { RadioCardGroup } from "./radio-card";
import { FieldLabel, PrimaryButton, SummaryRow } from "./form-bits";
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
  cashAmountPlaceholder,
  maxAmountLabel,
  amountFieldLabel,
  amountSummaryLabel,
  selectedSummaryLabel,
  reasonLabel,
  reasonPlaceholder,
  reasonOptions,
  noteLabel,
  notePlaceholder,
  submitLabel,
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
  cashAmountPlaceholder: string;
  maxAmountLabel: string;
  amountFieldLabel: string;
  amountSummaryLabel: string;
  selectedSummaryLabel: string;
  reasonLabel: string;
  reasonPlaceholder: string;
  reasonOptions: readonly { value: string; label: string }[];
  noteLabel: string;
  notePlaceholder: string;
  submitLabel: string;
  onSubmit: (payload: RefundPayload) => void;
}) {
  const max = maxRefundableSar(order);
  const [type, setType] = useState<"full" | "partial">("full");
  const [method, setMethod] = useState<"items" | "amount">("amount");
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [amountInput, setAmountInput] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  function toggleItem(index: number) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  const itemsTotal = selectedItemsTotalSar(order.items, selectedIndices);
  const amountSar =
    type === "full" ? max : isCash || method === "amount" ? clampAmountSar(amountInput, max) : itemsTotal;
  const canSubmit =
    type === "full" || (!isCash && method === "items" ? selectedIndices.size > 0 : amountSar > 0);
  // Cash refunds are always an amount in hand — the frames drop the
  // Items/Amount choice for them entirely.
  const showItemPicker = !isCash && method === "items";

  function submit() {
    onSubmit({
      type,
      method: isCash ? "amount" : method,
      selectedItems: Array.from(selectedIndices).map((index) => order.items[index].name),
      amountSar,
      reason,
      note,
    });
  }

  return (
    <div>
      <div className="mt-5">
        <FieldLabel>{typeLabel}</FieldLabel>
        <RadioCardGroup
          name="refund-type"
          options={[
            { value: "full", label: typeFullLabel },
            { value: "partial", label: typePartialLabel },
          ]}
          value={type}
          onChange={(value) => setType(value as "full" | "partial")}
        />
      </div>

      {isCash ? (
        <>
          <div className="mt-4">
            <SummaryRow label={maxAmountLabel} value={formatSar(max)} />
          </div>
          <div className="mt-4">
            <FieldLabel>{amountFieldLabel}</FieldLabel>
            <Input
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder={cashAmountPlaceholder}
              inputMode="decimal"
              aria-label={amountFieldLabel}
            />
          </div>
        </>
      ) : (
        <>
          <div className="mt-4">
            <FieldLabel>{methodLabel}</FieldLabel>
            <RadioCardGroup
              name="refund-method"
              options={[
                { value: "items", label: methodItemsLabel },
                { value: "amount", label: methodAmountLabel },
              ]}
              value={method}
              onChange={(value) => setMethod(value as "items" | "amount")}
            />
          </div>

          {showItemPicker ? (
            <div className="mt-2 rounded-[10px] border-[1.5px] border-[#0D6EFD] p-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between gap-3 px-2 py-1.5">
                  <Checkbox
                    label={item.name}
                    className="text-[13px]"
                    checked={selectedIndices.has(index)}
                    onChange={() => toggleItem(index)}
                  />
                  <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">
                    {formatSar(item.priceSar * item.qty)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2">
              <Input
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                placeholder={amountPlaceholder}
                inputMode="decimal"
                aria-label={amountFieldLabel}
              />
            </div>
          )}
        </>
      )}

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

      {!isCash && (
        <div className="mt-4">
          <SummaryRow
            label={
              showItemPicker ? selectedSummaryLabel.replace("{n}", String(selectedIndices.size)) : amountSummaryLabel
            }
            value={formatSar(amountSar)}
          />
        </div>
      )}

      <PrimaryButton className="mt-5" label={submitLabel} disabled={!canSubmit || !reason} onClick={submit} />
    </div>
  );
}
