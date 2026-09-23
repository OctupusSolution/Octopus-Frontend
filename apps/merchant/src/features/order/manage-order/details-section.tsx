// Who the order is for (PUT /contact) and the details that don't change what
// is owed (PATCH /{id}). Both replace every field they carry, so each form
// starts from the order's current values.
import { useState } from "react";
import { Pencil } from "lucide-react";
import { setOrderContact, updateOrderDetails, type OrderResponse } from "@octopus/api-client";
import {
  isOrderOpen,
  OrderButton,
  OrderField,
  orderInputClass,
  OrderSection,
  useOrderText,
  type OrderWorkspace,
} from "@/entities/order";

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 py-[3px] text-[13px]">
      <span className="text-[var(--octo-text-muted)]">{label}</span>
      <span className="text-end font-medium text-[var(--octo-text-primary)]">{value || "—"}</span>
    </div>
  );
}

export function DetailsSection({ ws, order }: { ws: OrderWorkspace; order: OrderResponse }) {
  const { tx } = useOrderText();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [attendees, setAttendees] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [tags, setTags] = useState("");
  const open = isOrderOpen(order.status);
  const busy = ws.busy !== null;

  function startEditing() {
    setName(order.customer.name ?? "");
    setPhone(order.customer.phone ?? "");
    setEmail(order.customer.email ?? "");
    setExternalRef(order.customer.externalRef ?? "");
    setAttendees(order.attendeeCount != null ? String(order.attendeeCount) : "");
    setDeliveryAddress(order.deliveryAddress ?? "");
    setCustomerNote(order.customerNote ?? "");
    setInternalNote(order.internalNote ?? "");
    setTags(order.tags.join(", "));
    setEditing(true);
  }

  const orNull = (value: string) => (value.trim() === "" ? null : value.trim());

  async function save() {
    const contactChanged =
      orNull(name) !== order.customer.name ||
      orNull(phone) !== order.customer.phone ||
      orNull(email) !== order.customer.email ||
      orNull(externalRef) !== order.customer.externalRef;
    if (contactChanged) {
      const ok = await ws.run("contact", (ctx) =>
        setOrderContact(ctx.businessId, ctx.orderId, {
          name: orNull(name),
          phone: orNull(phone),
          email: orNull(email),
          externalRef: orNull(externalRef),
          expectedVersion: ctx.version,
        })
      );
      if (!ok) return;
    }
    // Details are refused once the order is finished; contact is not.
    if (open) {
      const tagList = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag !== "");
      const ok = await ws.run("details", (ctx) =>
        updateOrderDetails(ctx.businessId, ctx.orderId, {
          attendeeCount: attendees ? Math.max(1, Math.floor(Number(attendees))) : null,
          deliveryAddress: orNull(deliveryAddress),
          customerNote: orNull(customerNote),
          internalNote: orNull(internalNote),
          tags: tagList.length > 0 ? tagList : null,
          expectedVersion: ctx.version,
        })
      );
      if (!ok) return;
    }
    setEditing(false);
  }

  return (
    <OrderSection
      title={tx("details.title")}
      aside={
        !editing && (
          <OrderButton icon={<Pencil size={12} />} onClick={startEditing}>
            {tx("common.edit")}
          </OrderButton>
        )
      }
    >
      {!editing ? (
        <>
          <Row label={tx("contact.name")} value={order.customer.name} />
          <Row label={tx("contact.phone")} value={order.customer.phone} />
          <Row label={tx("contact.email")} value={order.customer.email} />
          <Row label={tx("details.attendees")} value={order.attendeeCount != null ? String(order.attendeeCount) : null} />
          <Row label={tx("details.fulfilment")} value={order.fulfilmentCode} />
          <Row label={tx("details.deliveryAddress")} value={order.deliveryAddress} />
          <Row label={tx("details.customerNote")} value={order.customerNote} />
          <Row label={tx("details.internalNote")} value={order.internalNote} />
          <Row label={tx("details.tags")} value={order.tags.join(", ")} />
          {order.capacityWarning && (
            <p className="mt-2 text-[12px] text-[#D97706]">
              {tx("details.capacityWarning")
                .replace("{party}", String(order.capacityWarning.attendeeCount))
                .replace("{capacity}", String(order.capacityWarning.capacity))}
            </p>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <OrderField label={tx("contact.name")}>
            <input value={name} onChange={(event) => setName(event.target.value)} className={orderInputClass} />
          </OrderField>
          <OrderField label={tx("contact.phone")}>
            <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={orderInputClass} />
          </OrderField>
          <OrderField label={tx("contact.email")}>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={orderInputClass} />
          </OrderField>
          <OrderField label={tx("contact.externalRef")}>
            <input value={externalRef} onChange={(event) => setExternalRef(event.target.value)} className={orderInputClass} />
          </OrderField>
          {open && (
            <>
              <OrderField label={tx("details.attendees")}>
                <input
                  type="number"
                  min={1}
                  value={attendees}
                  onChange={(event) => setAttendees(event.target.value)}
                  className={orderInputClass}
                />
              </OrderField>
              <OrderField label={tx("details.tags")}>
                <input value={tags} onChange={(event) => setTags(event.target.value)} className={orderInputClass} />
              </OrderField>
              <OrderField label={tx("details.deliveryAddress")} className="sm:col-span-2">
                <input
                  value={deliveryAddress}
                  onChange={(event) => setDeliveryAddress(event.target.value)}
                  className={orderInputClass}
                />
              </OrderField>
              <OrderField label={tx("details.customerNote")}>
                <input value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} className={orderInputClass} />
              </OrderField>
              <OrderField label={tx("details.internalNote")}>
                <input value={internalNote} onChange={(event) => setInternalNote(event.target.value)} className={orderInputClass} />
              </OrderField>
            </>
          )}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <OrderButton onClick={() => setEditing(false)}>{tx("common.cancel")}</OrderButton>
            <OrderButton tone="primary" disabled={busy} onClick={() => void save()}>
              {tx("common.save")}
            </OrderButton>
          </div>
        </div>
      )}
    </OrderSection>
  );
}
