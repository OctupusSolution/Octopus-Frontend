// apps/merchant/src/pages/orders-list/_shared/order-row.tsx
import { Ban, ChevronDown, RotateCcw, Trash2, XCircle } from "lucide-react";
import { formatSar } from "@octopus/api-client";
import { TD, TR } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { Stepper } from "./stepper";
import type { OrderAction } from "./theme";
import type { OrderRecord } from "./types";

const PAYMENT_LABEL_KEY: Record<OrderRecord["payment"], string> = {
  "Paid Online": "orders.payment.online",
  "Paid Cash": "orders.payment.cash",
  Unpaid: "orders.payment.unpaid",
  "Partially Paid": "orders.payment.partial",
};

const SOURCE_LABEL_KEY: Record<OrderRecord["source"], string> = {
  "QR Code": "orders.source.qrCode",
  "POS Order": "orders.source.pos",
  "KIOSK Order": "orders.source.kiosk",
  "Phone Order": "orders.source.phone",
};

const ACTION_BUTTONS: readonly {
  action: OrderAction;
  labelKey: string;
  className: string;
  largeClassName: string;
  icon: typeof Ban;
}[] = [
  {
    action: "void",
    labelKey: "orders.action.void",
    className: "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)]",
    largeClassName: "border-[var(--octo-border-input)] bg-[var(--octo-hover)] text-[var(--octo-text-secondary)]",
    icon: Ban,
  },
  {
    action: "refund",
    labelKey: "orders.action.refund",
    className: "border-[#A16207]/30 bg-[#A16207]/10 text-[#A16207]",
    largeClassName: "border-[#A16207]/30 bg-[#A16207]/10 text-[#A16207]",
    icon: RotateCcw,
  },
  {
    action: "wastage",
    labelKey: "orders.action.wastage",
    className: "border-[#7C3AED]/30 bg-[#7C3AED]/10 text-[#7C3AED]",
    largeClassName: "border-[#7C3AED]/30 bg-[#7C3AED]/10 text-[#7C3AED]",
    icon: Trash2,
  },
  {
    action: "cancel",
    labelKey: "orders.action.cancel",
    className: "border-[#DC2626]/30 bg-[#DC2626]/10 text-[#DC2626]",
    largeClassName: "border-[#DC2626]/30 bg-[#DC2626]/10 text-[#DC2626]",
    icon: XCircle,
  },
];

export function OrderActionButtons({
  order,
  onAction,
  className,
  variant = "compact",
}: {
  order: OrderRecord;
  onAction: (action: OrderAction, order: OrderRecord) => void;
  className?: string;
  /** "compact" is the row/card treatment (small pill buttons). "large" is the
   *  Order Details modal's full-width, icon-bearing button row. */
  variant?: "compact" | "large";
}) {
  const { t } = useI18n();

  if (variant === "large") {
    return (
      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-4 ${className ?? ""}`}>
        {ACTION_BUTTONS.map(({ action, labelKey, largeClassName, icon: Icon }) => (
          <button
            key={action}
            type="button"
            onClick={() => onAction(action, order)}
            className={`flex items-center justify-center gap-2 rounded-[10px] border py-3 text-[13.5px] font-semibold transition-opacity hover:opacity-80 ${largeClassName}`}
          >
            <Icon size={15} />
            {t(labelKey)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      {ACTION_BUTTONS.map(({ action, labelKey, className: btnClassName }) => (
        <button
          key={action}
          type="button"
          onClick={() => onAction(action, order)}
          className={`rounded-[8px] border px-2.5 py-[5px] text-[11.5px] font-medium transition-opacity hover:opacity-80 ${btnClassName}`}
        >
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}

export function OrderTableRow({
  order,
  onOpenDetails,
  onAction,
}: {
  order: OrderRecord;
  onOpenDetails: (order: OrderRecord) => void;
  onAction: (action: OrderAction, order: OrderRecord) => void;
}) {
  const { t } = useI18n();

  return (
    <TR>
      <TD className="align-top">
        <button type="button" onClick={() => onOpenDetails(order)} className="font-semibold text-[#0D6EFD] hover:underline">
          {order.id}
        </button>
        <div className="mt-0.5 text-[11.5px] text-[var(--octo-text-faint)]">{order.date}</div>
        <div className="mt-0.5 text-[11px] text-[var(--octo-text-muted)]">{t(SOURCE_LABEL_KEY[order.source])}</div>
      </TD>
      <TD className="align-top">
        {order.table && <div>{order.table}</div>}
        {order.guests != null && (
          <div className="text-[11.5px] text-[var(--octo-text-muted)]">
            {t("orders.row.guests").replace("{n}", String(order.guests))}
          </div>
        )}
      </TD>
      <TD className="align-top">
        <div className="font-medium text-[var(--octo-text-primary)]">{formatSar(order.totalSar)}</div>
        <div className="text-[11.5px] text-[var(--octo-text-muted)]">{t(PAYMENT_LABEL_KEY[order.payment])}</div>
      </TD>
      <TD className="align-top">
        <Stepper order={order} />
      </TD>
      <TD className="align-top">
        <OrderActionButtons order={order} onAction={onAction} />
      </TD>
    </TR>
  );
}

export function OrderCard({
  order,
  expanded,
  onToggle,
  onOpenDetails,
  onAction,
}: {
  order: OrderRecord;
  expanded: boolean;
  onToggle: () => void;
  onOpenDetails: (order: OrderRecord) => void;
  onAction: (action: OrderAction, order: OrderRecord) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="py-2.5">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-center justify-between gap-3 text-start">
        <span className="flex items-baseline gap-2 truncate">
          <span
            role="link"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDetails(order);
            }}
            className="text-[12.5px] font-semibold text-[#0D6EFD] hover:underline"
          >
            {order.id}
          </span>
          <span className="truncate text-[11.5px] text-[var(--octo-text-secondary)]">{order.date}</span>
        </span>
        <ChevronDown size={15} className={`shrink-0 text-[var(--octo-text-faint)] transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="mt-2 flex flex-col gap-2 text-[12px]">
          <div className="flex items-center justify-between text-[var(--octo-text-secondary)]">
            <span>{order.table ?? t(SOURCE_LABEL_KEY[order.source])}</span>
            <span className="font-medium text-[var(--octo-text-primary)]">{formatSar(order.totalSar)}</span>
          </div>
          <Stepper order={order} />
          <OrderActionButtons order={order} onAction={onAction} className="mt-1" />
        </div>
      )}
    </div>
  );
}
