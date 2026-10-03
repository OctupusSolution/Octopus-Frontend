// Small presentational pieces every real-order screen shares (orders-list
// detail workspace, new-order flow, settings, KDS, and later POS), styled
// like orders-list's own modals (CSS-variable tokens, logical classes only).
import type { ReactNode } from "react";
import type { OrderLineStatus, OrderSettingsResponse } from "@octopus/api-client";
import { useOrderText, type OrderTextKey } from "./order-text";

export const orderInputClass =
  "h-10 w-full rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] px-3 text-[13px] text-[var(--octo-text-primary)] placeholder:text-[var(--octo-text-faint)] focus:border-[#0D6EFD] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD]/25";

export function OrderSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-3 rounded-xl border border-[var(--octo-border-card)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[14px] font-bold text-[var(--octo-text-primary)]">{title}</h3>
        {aside}
      </div>
      <div className="mt-3 border-t border-[var(--octo-divider)] pt-3">{children}</div>
    </section>
  );
}

export function OrderField({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{label}</span>
      {children}
    </label>
  );
}

type ButtonTone = "primary" | "neutral" | "danger" | "success" | "warning";

const TONE_CLASS: Record<ButtonTone, string> = {
  primary: "border-[#0D6EFD] bg-[#0D6EFD] text-white",
  neutral: "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]",
  danger: "border-[#DC2626]/30 bg-[#DC2626]/10 text-[#DC2626]",
  success: "border-[#16A34A]/30 bg-[#16A34A]/10 text-[#16A34A]",
  warning: "border-[#D97706]/30 bg-[#D97706]/10 text-[#D97706]",
};

export function OrderButton({
  children,
  onClick,
  tone = "neutral",
  disabled,
  icon,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: ButtonTone;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-[9px] border px-3 py-[7px] text-[12px] font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${TONE_CLASS[tone]} ${className ?? ""}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function OrderErrorNote({ message, onDismiss }: { message: string | null; onDismiss?: () => void }) {
  const { tx } = useOrderText();
  if (!message) return null;
  return (
    <div role="alert" className="mt-3 flex items-start justify-between gap-3 rounded-[9px] bg-[#EF4444]/10 px-3 py-2 text-[12.5px] text-[#DC2626]">
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="shrink-0 font-semibold hover:underline">
          {tx("common.dismiss")}
        </button>
      )}
    </div>
  );
}

export function OrderEmptyNote({ children }: { children: ReactNode }) {
  return <p className="py-2 text-[12.5px] text-[var(--octo-text-muted)]">{children}</p>;
}

const LINE_STATUS_STYLE: Record<OrderLineStatus, { text: string; bg: string }> = {
  Pending: { text: "var(--octo-text-secondary)", bg: "var(--octo-track)" },
  Preparing: { text: "#D97706", bg: "#D977061A" },
  Ready: { text: "#9333EA", bg: "#9333EA1A" },
  Served: { text: "#0D6EFD", bg: "#0D6EFD1A" },
  Cancelled: { text: "#DC2626", bg: "#DC26261A" },
  Voided: { text: "#6B7280", bg: "#6B72801A" },
  Wasted: { text: "#7C3AED", bg: "#7C3AED1A" },
};

export function LineStatusPill({ status }: { status: OrderLineStatus }) {
  const { tx } = useOrderText();
  const style = LINE_STATUS_STYLE[status];
  return (
    <span
      className="inline-flex shrink-0 rounded-full px-2 py-[2px] text-[11px] font-semibold"
      style={{ color: style.text, backgroundColor: style.bg }}
    >
      {tx(`lineStatus.${status}` as OrderTextKey)}
    </span>
  );
}

export type ReasonKind = "cancel" | "void" | "refund" | "wastage" | "discount";

const REASON_FIELD: Record<ReasonKind, keyof OrderSettingsResponse> = {
  cancel: "cancelReasonCodes",
  void: "voidReasonCodes",
  refund: "refundReasonCodes",
  wastage: "wastageReasonCodes",
  discount: "discountReasonCodes",
};

/** The business's own configured reasons for an action — the only values the
 *  backend accepts as `reasonCode`. */
export function reasonCodesFor(settings: OrderSettingsResponse | null, kind: ReasonKind): string[] {
  if (!settings) return [];
  const value = settings[REASON_FIELD[kind]];
  return Array.isArray(value) ? value : [];
}

export function humanizeCode(code: string): string {
  const spaced = code.replace(/[-_]/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function ReasonSelect({
  codes,
  value,
  onChange,
}: {
  codes: readonly string[];
  value: string;
  onChange: (code: string) => void;
}) {
  const { tx } = useOrderText();
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={orderInputClass}>
      <option value="">{codes.length === 0 ? tx("reason.none") : tx("reason.choose")}</option>
      {codes.map((code) => (
        <option key={code} value={code}>
          {humanizeCode(code)}
        </option>
      ))}
    </select>
  );
}

/** A manager PIN for step-up approval. Left blank, no approval is sent — the
 *  backend then answers 422 order.approval.needed only if policy needs one. */
export function ApprovalPinField({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (pin: string) => void;
  required?: boolean;
}) {
  const { tx } = useOrderText();
  return (
    <OrderField label={required ? tx("approval.pinRequired") : tx("approval.pinOptional")}>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={8}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
        className={orderInputClass}
        placeholder="••••"
      />
    </OrderField>
  );
}

/** Builds the ApprovalDto from a PIN field — null when left blank. */
export function approvalFrom(pin: string, accountId: string | null): { approverAccountId: string; pin: string } | null {
  return pin.trim() && accountId ? { approverAccountId: accountId, pin: pin.trim() } : null;
}
