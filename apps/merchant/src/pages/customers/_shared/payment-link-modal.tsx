// apps/merchant/src/pages/customers/_shared/payment-link-modal.tsx
import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { Mail, MessageSquareText, QrCode } from "lucide-react";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { CRM_MODAL_CLASS } from "./action-button";
import { Avatar } from "./avatar";
import { Field } from "./form-field";
import { PRIMARY_SUBMIT_CLASS, SelectBox, TEXTAREA_CLASS } from "./form-controls";
import { customerName, formatReservationDateTime } from "./format";
import { TagChips } from "./tag-chips";
import { WhatsAppGlyph } from "./whatsapp-glyph";
import type { CustomerRecord } from "./types";

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
  const { t, locale } = useI18n();
  const [requestType, setRequestType] = useState<RequestType>("deposit");
  const [reservationIndex, setReservationIndex] = useState(-1);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<Method>("link");
  const [message, setMessage] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  if (!customer) return null;
  const name = customerName(customer);
  const amountValid = amount.trim() !== "" && Number(amount) > 0;
  const descriptionValid = description.trim() !== "";

  function reset() {
    setRequestType("deposit");
    setReservationIndex(-1);
    setAmount("");
    setDescription("");
    setMethod("link");
    setMessage("");
    setShowErrors(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSend() {
    if (!amountValid || !descriptionValid) {
      setShowErrors(true);
      return;
    }
    onSent();
    reset();
    onClose();
  }

  const methods: { id: Method; icon: ReactNode; title: string; desc: string }[] = [
    { id: "link", icon: <QrCode size={30} strokeWidth={1.75} className="text-[var(--octo-text-primary)]" />, title: t("customers.paymentLink.methodLink"), desc: t("customers.paymentLink.methodLinkDesc") },
    { id: "whatsapp", icon: <WhatsAppGlyph size={26} />, title: t("customers.paymentLink.methodWhatsapp"), desc: t("customers.paymentLink.methodWhatsappDesc") },
    { id: "sms", icon: <MessageSquareText size={26} strokeWidth={1.75} className="text-[var(--octo-text-primary)]" />, title: t("customers.paymentLink.methodSms"), desc: t("customers.paymentLink.methodSmsDesc") },
  ];

  return (
    <Modal open onClose={handleClose} title={t("customers.paymentLink.title")} className={`max-w-[760px] max-h-[94vh] overflow-y-auto octo-scroll ${CRM_MODAL_CLASS}`}>
      <div className="flex items-center gap-4 rounded-xl border border-[var(--octo-border-card)] p-3">
        <Avatar name={name} photo={customer.avatarUrl} size={80} />
        <div className="min-w-0">
          <div className="text-[16px] font-medium text-[var(--octo-text-primary)]">{name}</div>
          <TagChips tags={customer.tags} blocked={customer.isBlocked} className="mt-1.5" />
          <div className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[var(--octo-text-primary)]">
            <WhatsAppGlyph size={12} /> <span dir="ltr">{customer.phone}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[var(--octo-text-primary)]">
            <Mail size={12} /> {customer.email}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[15px] font-medium text-[var(--octo-text-primary)]">
          {t("customers.paymentLink.requestType")} <span className="text-[#EF4444]">*</span>
        </p>
        <div role="radiogroup" className="mt-2 flex flex-wrap gap-2">
          {(
            [
              { id: "deposit", label: t("customers.paymentLink.deposit") },
              { id: "balance", label: t("customers.paymentLink.balance") },
              { id: "custom", label: t("customers.paymentLink.customAmount") },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={requestType === opt.id}
              onClick={() => setRequestType(opt.id)}
              className={clsx(
                "h-10 rounded-[8px] border px-3 text-[15px] font-medium transition-colors",
                requestType === opt.id ? "border-[#0D6EFD] bg-[#0D6EFD]/[0.04] text-[#0D6EFD]" : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)]"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Field label={t("customers.paymentLink.reservation")} className="mt-4">
        <SelectBox value={String(reservationIndex)} onChange={(v) => setReservationIndex(Number(v))} placeholderShown={reservationIndex === -1} ariaLabel={t("customers.paymentLink.reservation")}>
          <option value="-1">{t("customers.paymentLink.reservationPlaceholder")}</option>
          {customer.recentReservations.map((res, index) => (
            <option key={res.date} value={index}>
              {formatReservationDateTime(res.date, locale)} · {res.table}
            </option>
          ))}
        </SelectBox>
      </Field>

      <Field
        label={t("customers.paymentLink.amount")}
        required
        className="mt-4"
        error={showErrors && !amountValid ? t("customers.validation.amount") : undefined}
      >
        <div className="flex h-10 items-center rounded-[8px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 focus-within:border-[#0D6EFD] focus-within:ring-2 focus-within:ring-[#0D6EFD]/25">
          <span className="text-[14px] text-[var(--octo-text-primary)]">SAR</span>
          <input
            value={amount}
            inputMode="decimal"
            aria-label={t("customers.paymentLink.amount")}
            onChange={(event) => setAmount(event.target.value.replace(/[^\d.]/g, ""))}
            placeholder={t("customers.paymentLink.amountPlaceholder")}
            className="h-full w-full flex-1 bg-transparent px-3 text-[14px] text-[var(--octo-text-primary)] outline-none placeholder:text-[var(--octo-text-muted)]"
          />
        </div>
      </Field>

      <Field
        label={t("customers.paymentLink.description")}
        required
        className="mt-4"
        error={showErrors && !descriptionValid ? t("customers.validation.required") : undefined}
      >
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t("customers.paymentLink.descriptionPlaceholder")}
          aria-label={t("customers.paymentLink.description")}
          rows={3}
          className={TEXTAREA_CLASS}
        />
      </Field>

      <Field label={t("customers.paymentLink.method")} className="mt-4">
        <div role="radiogroup" className="flex flex-wrap gap-4">
          {methods.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={method === opt.id}
              onClick={() => setMethod(opt.id)}
              className={clsx(
                "flex w-[140px] flex-col items-center gap-1 rounded-[8px] border px-2 py-2.5 text-center transition-colors",
                method === opt.id ? "border-[#0D6EFD] bg-[#0D6EFD]/[0.04]" : "border-[var(--octo-border-input)]"
              )}
            >
              <span className="grid h-8 place-items-center">{opt.icon}</span>
              <span className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{opt.title}</span>
              <span className="text-[11.5px] text-[var(--octo-text-secondary)]">{opt.desc}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("customers.paymentLink.message")} optional={t("customers.paymentLink.optional")} className="mt-4">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={t("customers.paymentLink.messagePlaceholder")}
          aria-label={t("customers.paymentLink.message")}
          rows={3}
          className={TEXTAREA_CLASS}
        />
      </Field>

      <button type="button" onClick={handleSend} className={PRIMARY_SUBMIT_CLASS}>
        {t("customers.paymentLink.send")}
      </button>
    </Modal>
  );
}
