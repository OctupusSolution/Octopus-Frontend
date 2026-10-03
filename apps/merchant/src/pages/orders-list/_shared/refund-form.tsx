// apps/merchant/src/pages/orders-list/_shared/refund-form.tsx
import { useState } from "react";
import { formatSar } from "@octopus/api-client";
import {
  REFUND_INPUT_CLASS,
  REFUND_SUBMIT_CLASS,
  REFUND_TEXTAREA_CLASS,
  RefundCheckRow,
  RefundFieldLabel,
  RefundRadioCards,
  RefundSelect,
  RefundSummaryBar,
} from "./refund-controls";
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
  // Items/Amount choice for them entirely (and, with it, the required marks).
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <RefundFieldLabel required={!isCash}>{typeLabel}</RefundFieldLabel>
        <RefundRadioCards
          name="refund-type"
          ariaLabel={typeLabel}
          options={[
            { value: "full", label: typeFullLabel },
            { value: "partial", label: typePartialLabel },
          ]}
          value={type}
          onChange={setType}
        />
      </div>

      {isCash ? (
        <div className="flex flex-col gap-3">
          <RefundSummaryBar label={maxAmountLabel} value={formatSar(max)} strongLabel />
          <div className="flex flex-col gap-2">
            <RefundFieldLabel>{amountFieldLabel}</RefundFieldLabel>
            <input
              className={REFUND_INPUT_CLASS}
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              placeholder={cashAmountPlaceholder}
              inputMode="decimal"
              aria-label={amountFieldLabel}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <RefundFieldLabel required>{methodLabel}</RefundFieldLabel>
          <div className="flex flex-col gap-2">
            <RefundRadioCards
              name="refund-method"
              ariaLabel={methodLabel}
              options={[
                { value: "items", label: methodItemsLabel },
                { value: "amount", label: methodAmountLabel },
              ]}
              value={method}
              onChange={setMethod}
            />

            {showItemPicker ? (
              <div className="flex flex-col gap-3 rounded-[12px] border border-[#0D6EFD] p-2">
                {order.items.map((item, index) => (
                  <RefundCheckRow
                    key={index}
                    label={item.name}
                    value={formatSar(item.priceSar * item.qty)}
                    checked={selectedIndices.has(index)}
                    onChange={() => toggleItem(index)}
                  />
                ))}
              </div>
            ) : (
              <input
                className={REFUND_INPUT_CLASS}
                value={amountInput}
                onChange={(event) => setAmountInput(event.target.value)}
                placeholder={amountPlaceholder}
                inputMode="decimal"
                aria-label={amountFieldLabel}
              />
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <RefundFieldLabel required={!isCash}>{reasonLabel}</RefundFieldLabel>
        <RefundSelect value={reason} onChange={setReason} ariaLabel={reasonLabel}>
          <option value="" disabled>
            {reasonPlaceholder}
          </option>
          {reasonOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </RefundSelect>
      </div>

      <div className="flex flex-col gap-2">
        <RefundFieldLabel>{noteLabel}</RefundFieldLabel>
        <textarea
          className={REFUND_TEXTAREA_CLASS}
          placeholder={notePlaceholder}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-label={noteLabel}
        />
      </div>

      {!isCash && (
        <RefundSummaryBar
          label={showItemPicker ? selectedSummaryLabel.replace("{n}", String(selectedIndices.size)) : amountSummaryLabel}
          value={formatSar(amountSar)}
        />
      )}
      {/* The frame sets the button 12px under the summary strip, inside this
          24px-gap column — hence the negative margin on the online form. */}
      <button
        type="button"
        disabled={!canSubmit || !reason}
        onClick={submit}
        className={`${REFUND_SUBMIT_CLASS}${isCash ? "" : " -mt-3"}`}
      >
        {submitLabel}
      </button>
    </div>
  );
}
