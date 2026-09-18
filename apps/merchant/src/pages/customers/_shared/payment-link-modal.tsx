// apps/merchant/src/pages/customers/_shared/payment-link-modal.tsx
import { useState } from "react";
import { Mail, MessageCircle, QrCode } from "lucide-react";
import { Modal, Segmented, Select, Textarea } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { customerName } from "./format";
import { Avatar } from "./avatar";
import { TAG_STYLE, DEFAULT_TAG_STYLE, TAG_LABEL_KEY } from "./theme";
import type { CustomerRecord, CustomerTag } from "./types";

type RequestType = "deposit" | "balance" | "custom";
type Method = "link" | "whatsapp" | "sms";

export function PaymentLinkModal({
  customer,
  onClose,
  onSent,
}: {
  customer: CustomerRecord | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const { t } = useI18n();
  const [requestType, setRequestType] = useState<RequestType>("deposit");
  const [reservationIndex, setReservationIndex] = useState(0);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<Method>("link");
  const [message, setMessage] = useState("");

  if (!customer) return null;
  const name = customerName(customer);
  const canSend = amount.trim() !== "" && description.trim() !== "";

  function reset() {
    setRequestType("deposit");
    setReservationIndex(0);
    setAmount("");
    setDescription("");
    setMethod("link");
    setMessage("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal open onClose={handleClose} title={t("customers.paymentLink.title")} className="max-w-[560px]">
      <div className="flex items-center gap-3 rounded-xl border border-[var(--octo-divider)] p-3">
        <Avatar name={name} size={44} />
        <div>
          <div className="font-semibold text-[var(--octo-text-primary)]">{name}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {customer.tags.map((tag) => {
              const style = TAG_STYLE[tag as CustomerTag] ?? DEFAULT_TAG_STYLE;
              const labelKey = TAG_LABEL_KEY[tag as CustomerTag];
              return (
                <span key={tag} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: style.text, backgroundColor: style.bg }}>
                  {labelKey ? t(labelKey) : tag}
                </span>
              );
            })}
          </div>
          <div className="mt-1 text-[11.5px] text-[var(--octo-text-muted)]">{customer.phone} · {customer.email}</div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
          {t("customers.paymentLink.requestType")} <span className="text-[#EF4444]">*</span>
        </p>
        <Segmented
          className="mt-1.5"
          options={[
            { id: "deposit", label: t("customers.paymentLink.deposit") },
            { id: "balance", label: t("customers.paymentLink.balance") },
            { id: "custom", label: t("customers.paymentLink.customAmount") },
          ]}
          value={requestType}
          onChange={(id) => setRequestType(id as RequestType)}
        />
      </div>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.paymentLink.reservation")}</span>
        <Select value={reservationIndex} onChange={(event) => setReservationIndex(Number(event.target.value))}>
          <option value={-1}>{t("customers.paymentLink.reservationPlaceholder")}</option>
          {customer.recentReservations.map((res, index) => (
            <option key={res.date} value={index}>{res.date} · {res.table}</option>
          ))}
        </Select>
      </label>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
          {t("customers.paymentLink.amount")} <span className="text-[#EF4444]">*</span>
        </span>
        <div className="flex items-stretch rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/30">
          <span className="flex items-center border-e border-[var(--octo-border-input)] px-3 text-[12.5px] text-[var(--octo-text-muted)]">SAR</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
            placeholder={t("customers.paymentLink.amountPlaceholder")}
            className="w-full flex-1 rounded-e-[9px] bg-transparent px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-faint)]"
          />
        </div>
      </label>

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
          {t("customers.paymentLink.description")} <span className="text-[#EF4444]">*</span>
        </span>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("customers.paymentLink.descriptionPlaceholder")}
          rows={3}
          className="w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 py-2 text-[12.5px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/30 focus:border-[#0D6EFD] disabled:cursor-not-allowed disabled:opacity-50"
        />
      </label>

      <div className="mt-4">
        <p className="text-[12.5px] font-semibold text-[var(--octo-text-primary)]">{t("customers.paymentLink.method")}</p>
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {(
            [
              { id: "link", icon: QrCode, title: t("customers.paymentLink.methodLink"), desc: t("customers.paymentLink.methodLinkDesc") },
              { id: "whatsapp", icon: MessageCircle, title: t("customers.paymentLink.methodWhatsapp"), desc: t("customers.paymentLink.methodWhatsappDesc") },
              { id: "sms", icon: Mail, title: t("customers.paymentLink.methodSms"), desc: t("customers.paymentLink.methodSmsDesc") },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setMethod(opt.id)}
              className={`flex flex-col items-center gap-1 rounded-[9px] border px-2 py-3 text-center transition-colors ${
                method === opt.id ? "border-[#0D6EFD] bg-[#0D6EFD]/5" : "border-[var(--octo-border-input)]"
              }`}
            >
              <opt.icon size={18} className="text-[var(--octo-text-secondary)]" />
              <span className="text-[11.5px] font-semibold text-[var(--octo-text-primary)]">{opt.title}</span>
              <span className="text-[10.5px] text-[var(--octo-text-muted)]">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Textarea
          label={`${t("customers.paymentLink.message")} ${t("customers.paymentLink.optional")}`}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("customers.paymentLink.messagePlaceholder")}
          rows={2}
        />
      </div>

      <button
        type="button"
        disabled={!canSend}
        onClick={() => { onSent(); reset(); onClose(); }}
        className="mt-5 w-full rounded-[10px] bg-[#0D6EFD] py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("customers.paymentLink.send")}
      </button>
    </Modal>
  );
}
