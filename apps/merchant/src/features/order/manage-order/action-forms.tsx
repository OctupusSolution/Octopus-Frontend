// Inline forms for the approval-gated writes: discounts and line reversals.
// Each collects the business's own reason code (the backend refuses any
// other), an optional note and an optional manager PIN (sent as the step-up
// approval; left blank, none is sent).
import { useState } from "react";
import type { ApprovalDto, OrderDiscountKind } from "@octopus/api-client";
import {
  ApprovalPinField,
  approvalFrom,
  OrderButton,
  OrderField,
  orderInputClass,
  ReasonSelect,
  useOrderText,
} from "@/entities/order";

export interface DiscountInput {
  kind: OrderDiscountKind;
  value: number;
  reasonCode: string;
  note: string | null;
  approval: ApprovalDto | null;
}

export function DiscountForm({
  reasonCodes,
  accountId,
  currency,
  busy,
  approvalNeeded,
  onSubmit,
  onCancel,
}: {
  reasonCodes: readonly string[];
  accountId: string | null;
  currency: string;
  busy: boolean;
  approvalNeeded: boolean;
  onSubmit: (input: DiscountInput) => void;
  onCancel: () => void;
}) {
  const { tx } = useOrderText();
  const [kind, setKind] = useState<OrderDiscountKind>("Percent");
  const [value, setValue] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");
  const numeric = Number(value);
  const valid = value !== "" && numeric > 0 && (kind === "Amount" || numeric <= 100) && reasonCode !== "";

  return (
    <div className="mt-2 rounded-[10px] bg-[var(--octo-hover)] p-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <OrderField label={tx("discount.kind")}>
          <div className="flex gap-1.5">
            {(["Percent", "Amount"] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={kind === option}
                onClick={() => setKind(option)}
                className={`h-10 flex-1 rounded-[9px] border text-[12.5px] font-medium ${
                  kind === option
                    ? "border-[#0D6EFD] bg-[#0D6EFD]/10 text-[#0D6EFD]"
                    : "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)]"
                }`}
              >
                {option === "Percent" ? tx("discount.percent") : tx("discount.amount").replace("{currency}", currency)}
              </button>
            ))}
          </div>
        </OrderField>
        <OrderField label={tx("discount.value")}>
          <input
            type="number"
            min={0}
            max={kind === "Percent" ? 100 : undefined}
            step="0.01"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className={orderInputClass}
          />
        </OrderField>
        <OrderField label={tx("reason.label")}>
          <ReasonSelect codes={reasonCodes} value={reasonCode} onChange={setReasonCode} />
        </OrderField>
        <OrderField label={tx("reason.note")}>
          <input value={note} onChange={(event) => setNote(event.target.value)} className={orderInputClass} />
        </OrderField>
        <ApprovalPinField value={pin} onChange={setPin} required={approvalNeeded} />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <OrderButton onClick={onCancel}>{tx("common.cancel")}</OrderButton>
        <OrderButton
          tone="primary"
          disabled={!valid || busy}
          onClick={() =>
            onSubmit({ kind, value: numeric, reasonCode, note: note.trim() || null, approval: approvalFrom(pin, accountId) })
          }
        >
          {tx("discount.apply")}
        </OrderButton>
      </div>
    </div>
  );
}

export interface ReversalInput {
  reasonCode: string;
  note: string | null;
  approval: ApprovalDto | null;
}

export function ReversalForm({
  title,
  reasonCodes,
  accountId,
  busy,
  approvalNeeded,
  confirmLabel,
  onSubmit,
  onCancel,
}: {
  title: string;
  reasonCodes: readonly string[];
  accountId: string | null;
  busy: boolean;
  approvalNeeded: boolean;
  confirmLabel: string;
  onSubmit: (input: ReversalInput) => void;
  onCancel: () => void;
}) {
  const { tx } = useOrderText();
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState("");

  return (
    <div className="mt-2 rounded-[10px] bg-[#DC2626]/[0.05] p-3">
      <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{title}</p>
      <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <OrderField label={tx("reason.label")}>
          <ReasonSelect codes={reasonCodes} value={reasonCode} onChange={setReasonCode} />
        </OrderField>
        <OrderField label={tx("reason.note")}>
          <input value={note} onChange={(event) => setNote(event.target.value)} className={orderInputClass} />
        </OrderField>
        <ApprovalPinField value={pin} onChange={setPin} required={approvalNeeded} />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <OrderButton onClick={onCancel}>{tx("common.cancel")}</OrderButton>
        <OrderButton
          tone="danger"
          disabled={!reasonCode || busy}
          onClick={() => onSubmit({ reasonCode, note: note.trim() || null, approval: approvalFrom(pin, accountId) })}
        >
          {confirmLabel}
        </OrderButton>
      </div>
    </div>
  );
}
