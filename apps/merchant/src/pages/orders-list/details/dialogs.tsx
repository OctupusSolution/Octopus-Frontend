// The two small dialogs the summary card's buttons open: write the internal
// note (PATCH /{id}) and email the receipt (POST /{id}/receipt).
import { useEffect, useMemo, useState } from "react";
import { Modal } from "@ui/primitives";
import { sendOrderReceipt, updateOrderDetails, type OrderResponse } from "@octopus/api-client";
import { OrderButton, OrderErrorNote, OrderField, orderInputClass, useOrderText, type OrderWorkspace } from "@/entities/order";
import { useI18n } from "@/app/providers/i18n-provider";

export function NoteDialog({ open, ws, order, onClose }: { open: boolean; ws: OrderWorkspace; order: OrderResponse; onClose: () => void }) {
  const { t } = useI18n();
  const { tx } = useOrderText();
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open) setNote(order.internalNote ?? "");
    // Only when the dialog opens — a background refresh must not wipe typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function save() {
    // PATCH replaces every field it carries, so the rest go back unchanged.
    const ok = await ws.run("note", (ctx) =>
      updateOrderDetails(ctx.businessId, ctx.orderId, {
        attendeeCount: ctx.order.attendeeCount,
        deliveryAddress: ctx.order.deliveryAddress,
        customerNote: ctx.order.customerNote,
        internalNote: note.trim() === "" ? null : note.trim(),
        tags: ctx.order.tags.length > 0 ? ctx.order.tags : null,
        expectedVersion: ctx.version,
      })
    );
    if (ok) onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title={t("orders.detailPage.action.writeNote")} className="max-w-md">
      <OrderField label={tx("details.internalNote")}>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          placeholder={t("orders.notePlaceholder")}
          className={`${orderInputClass} h-auto py-2`}
        />
      </OrderField>
      <OrderErrorNote message={ws.actionError?.message ?? null} onDismiss={ws.clearError} />
      <div className="mt-4 flex justify-end gap-2">
        <OrderButton onClick={onClose}>{tx("common.cancel")}</OrderButton>
        <OrderButton tone="primary" disabled={ws.busy !== null} onClick={() => void save()}>
          {tx("common.save")}
        </OrderButton>
      </div>
    </Modal>
  );
}

export function ReceiptDialog({ open, ws, order, onClose }: { open: boolean; ws: OrderWorkspace; order: OrderResponse; onClose: () => void }) {
  const { tx } = useOrderText();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  // The receipt write is idempotent: one key per (order version, address).
  const receiptKey = useMemo(() => crypto.randomUUID(), [order.version, email]);

  useEffect(() => {
    if (!open) return;
    setEmail(order.customer.email ?? "");
    setSent(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function send() {
    const ok = await ws.run("receipt", (ctx) =>
      sendOrderReceipt(
        ctx.businessId,
        ctx.orderId,
        { businessId: ctx.businessId, orderId: ctx.orderId, email: email.trim() || null, expectedVersion: ctx.version },
        receiptKey
      )
    );
    if (ok) setSent(true);
  }

  return (
    <Modal open={open} onClose={onClose} title={tx("receipt.send")} className="max-w-md">
      <OrderField label={tx("receipt.email")}>
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setSent(false);
          }}
          placeholder={tx("receipt.emailPlaceholder")}
          className={orderInputClass}
        />
      </OrderField>
      <OrderErrorNote message={ws.actionError?.message ?? null} onDismiss={ws.clearError} />
      {sent && <p className="mt-3 text-[12px] text-[#16A34A]">{tx("receipt.queued")}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <OrderButton onClick={onClose}>{tx("common.cancel")}</OrderButton>
        <OrderButton tone="primary" disabled={ws.busy !== null || sent} onClick={() => void send()}>
          {tx("receipt.submit")}
        </OrderButton>
      </div>
    </Modal>
  );
}
