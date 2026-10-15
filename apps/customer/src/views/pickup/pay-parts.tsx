"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/app/providers";
import { TableIcon, TableModal, TableMoney, TableRadio } from "@/shared/ui/table";
import { DetailRow, MethodLogo, ModalHead } from "../table/pay-options-view";

/** The ways an order placed ahead can be paid — online only: there is no
 *  cashier or table QR to settle at before it is collected. */
export const PICKUP_METHODS = [
  { id: "mada", labelKey: "store.table.methodMada", nameKey: "store.table.nameMada" },
  { id: "apple_pay", labelKey: "store.table.methodApplePay", nameKey: "store.table.nameApplePay" },
  { id: "stc_pay", labelKey: "store.table.methodStcPay", nameKey: "store.table.nameStcPay" },
  { id: "card", labelKey: "store.table.methodCard", nameKey: "store.table.nameCard" },
  { id: "tamara", labelKey: "store.table.methodTamara", nameKey: "store.table.methodTamara" },
  { id: "tabby", labelKey: "store.table.methodTabby", nameKey: "store.table.methodTabby" },
] as const;
export type PickupMethodId = (typeof PICKUP_METHODS)[number]["id"];

// Payment capture is local-only for this MVP — no gateway call happens here.
// The eventual backend step charges through Moyasar/Tap using the chosen method.
export const PROCESSING_MS = 2500;

export interface CardForm {
  number: string;
  holder: string;
  expiry: string;
  cvv: string;
}
export const EMPTY_CARD: CardForm = { number: "", holder: "", expiry: "", cvv: "" };
export type CardErrors = Partial<Record<keyof CardForm, true>>;

const digits = (value: string): string => value.replace(/\D/g, "");

/** "4242 4242 4242 4242" */
export const formatCardNumber = (value: string): string =>
  digits(value).slice(0, 19).replace(/(.{4})(?=.)/g, "$1 ");

/** "08/27" */
export function formatExpiry(value: string): string {
  const raw = digits(value).slice(0, 4);
  return raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw;
}

function passesLuhn(number: string): boolean {
  let sum = 0;
  for (let i = 0; i < number.length; i += 1) {
    let digit = Number(number[number.length - 1 - i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

/** Which of the card's fields cannot be charged as typed. */
export function cardErrors(card: CardForm, now: Date = new Date()): CardErrors {
  const errors: CardErrors = {};
  const number = digits(card.number);
  if (number.length < 13 || !passesLuhn(number)) errors.number = true;
  if (card.holder.trim().length < 2) errors.holder = true;

  const [month, year] = card.expiry.split("/").map((part) => Number(part));
  const validMonth = Number.isInteger(month) && month >= 1 && month <= 12;
  const fullYear = 2000 + (year ?? NaN);
  const expired =
    fullYear < now.getFullYear() || (fullYear === now.getFullYear() && month < now.getMonth() + 1);
  if (card.expiry.length !== 5 || !validMonth || expired) errors.expiry = true;

  if (!/^\d{3,4}$/.test(card.cvv)) errors.cvv = true;
  return errors;
}

export const cardLast4 = (card: CardForm): string => digits(card.number).slice(-4);

interface CardFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  invalid: boolean;
  /** Card data is typed left to right whatever the page's direction. */
  ltr?: boolean;
  inputMode?: "text" | "numeric";
  autoComplete: string;
  maxLength?: number;
}

function CardField({
  label, value, onChange, placeholder, invalid, ltr, inputMode = "text", autoComplete, maxLength,
}: CardFieldProps) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-3">
      <span className="px-2 text-[14px] font-medium leading-none text-black">{label}</span>
      <input
        type="text"
        dir={ltr ? "ltr" : undefined}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-invalid={invalid}
        className={`h-12 w-full rounded-[24px] border bg-white px-3 py-1 text-[14px] leading-none text-gray-900 outline-none placeholder:text-[var(--octo-store-select-label)] focus:border-ocean-blue ${
          ltr ? "rtl:text-right" : ""
        } ${invalid ? "border-[var(--octo-store-danger)]" : "border-gray-300"}`}
      />
    </label>
  );
}

export interface PaymentMethodsProps {
  method: PickupMethodId;
  onMethod: (method: PickupMethodId) => void;
  card: CardForm;
  onCard: (card: CardForm) => void;
  /** Shown once a payment was attempted with the card as typed. */
  errors: CardErrors;
}

/** The payment options as the pickup and deposit screens list them: one outlined
 *  row each, the card's opening onto its four fields when it is the one chosen. */
export function PaymentMethods({ method, onMethod, card, onCard, errors }: PaymentMethodsProps) {
  const { t } = useI18n();

  return (
    <div role="radiogroup" aria-label={t("store.table.paymentOptions")} className="flex flex-col gap-3">
      {PICKUP_METHODS.map((option) => {
        const selected = method === option.id;
        return (
          <div
            key={option.id}
            className={`flex flex-col gap-4 rounded-[24px] border px-4 py-3 ${
              selected ? "border-ocean-blue bg-[var(--octo-store-select-soft)]" : "border-gray-300"
            }`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onMethod(option.id)}
              className="flex w-full items-start justify-between"
            >
              <span className="flex items-center gap-2">
                <MethodLogo id={option.id} selected={selected} />
                <span className="text-[14px] font-semibold leading-none text-gray-900">{t(option.labelKey)}</span>
              </span>
              <TableRadio checked={selected} />
            </button>

            {selected && option.id === "card" && (
              <>
                <CardField
                  label={t("store.pickup.cardNumber")}
                  placeholder={t("store.pickup.cardNumberPlaceholder")}
                  value={card.number}
                  onChange={(value) => onCard({ ...card, number: formatCardNumber(value) })}
                  invalid={errors.number === true}
                  ltr
                  inputMode="numeric"
                  autoComplete="cc-number"
                />
                <CardField
                  label={t("store.pickup.cardHolder")}
                  placeholder={t("store.pickup.cardHolderPlaceholder")}
                  value={card.holder}
                  onChange={(value) => onCard({ ...card, holder: value })}
                  invalid={errors.holder === true}
                  autoComplete="cc-name"
                />
                <div className="flex gap-4">
                  <CardField
                    label={t("store.pickup.cardExpiry")}
                    placeholder="MM/YY"
                    value={card.expiry}
                    onChange={(value) => onCard({ ...card, expiry: formatExpiry(value) })}
                    invalid={errors.expiry === true}
                    ltr
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    maxLength={5}
                  />
                  <CardField
                    label={t("store.pickup.cardCvv")}
                    placeholder="***"
                    value={card.cvv}
                    onChange={(value) => onCard({ ...card, cvv: digits(value).slice(0, 4) })}
                    invalid={errors.cvv === true}
                    ltr
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    maxLength={4}
                  />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** "Wait while the payment is processed": what is being charged, and how. */
export function ProcessingModal({
  open, amountSar, methodNameKey,
}: { open: boolean; amountSar: number; methodNameKey: string }) {
  const { t } = useI18n();

  return (
    <TableModal open={open} dim label={t("store.table.processingTitle")}>
      <div className="flex flex-col items-center gap-4">
        <ModalHead
          image="loading"
          title={t("store.table.processingTitle")}
          body={t("store.table.processingBody")}
          bodyClassName="text-[14px] leading-[1.4]"
        />
        <dl className="flex w-full flex-col gap-4 rounded-[20px] bg-gray-100 p-4">
          <DetailRow label={t("store.table.detailTotal")}>
            <TableMoney amount={amountSar} currencyClassName="text-[9.03px]" />
          </DetailRow>
          <DetailRow label={t("store.table.detailMethod")}>{t(methodNameKey)}</DetailRow>
        </dl>
      </div>
    </TableModal>
  );
}

/** A fact on a confirmation: its icon, what it is, and its value. */
export function ReceiptCard({ icon, label, children }: { icon: string; label: string; children: ReactNode }) {
  return (
    <div className="flex w-full items-start gap-2 rounded-[24px] bg-gray-100 p-2">
      <TableIcon name={icon} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 leading-none">
        <p className="text-[12px] font-medium text-[var(--octo-store-select-label)]">{label}</p>
        <p className="text-[14px] font-semibold text-black">{children}</p>
      </div>
    </div>
  );
}

/** "7:35 PM" with the hour padded and the half of the day spelled out —
 *  "07:35 مساءً" — as the confirmations set a time to collect at. */
export function formatClockTime(iso: string, am: string, pm: string): string {
  const date = new Date(iso);
  const hours = date.getHours();
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${pad(hour12)}:${pad(date.getMinutes())} ${hours < 12 ? am : pm}`;
}
