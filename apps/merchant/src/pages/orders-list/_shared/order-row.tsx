// apps/merchant/src/pages/orders-list/_shared/order-row.tsx
import { Ban, ChevronDown, CreditCard, RotateCcw, Trash2, XCircle } from "lucide-react";
import { formatSar } from "@octopus/api-client";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { Stepper } from "./stepper";
import { ACTION_TINT, LINE, PAYMENT_TINT, SOURCE_TINT, TINT_CLASS, tintVars, type OrderAction, type Tint } from "./theme";
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
  largeClassName: string;
  /** The frame's 16px glyph for the row button. */
  glyph: string;
  icon: typeof Ban;
}[] = [
  {
    action: "payment",
    labelKey: "orders.action.recordPayment",
    largeClassName: "border-[#16A34A]/30 bg-[#16A34A]/10 text-[#16A34A]",
    glyph: "ord-money.svg",
    icon: CreditCard,
  },
  {
    action: "void",
    labelKey: "orders.action.void",
    largeClassName: "border-[var(--octo-border-input)] bg-[var(--octo-hover)] text-[var(--octo-text-secondary)]",
    glyph: "ord-void.svg",
    icon: Ban,
  },
  {
    action: "refund",
    labelKey: "orders.action.refund",
    largeClassName: "border-[#A16207]/30 bg-[#A16207]/10 text-[#A16207]",
    glyph: "ord-refund.svg",
    icon: RotateCcw,
  },
  {
    action: "wastage",
    labelKey: "orders.action.wastage",
    largeClassName: "border-[#7C3AED]/30 bg-[#7C3AED]/10 text-[#7C3AED]",
    glyph: "ord-wastage.svg",
    icon: Trash2,
  },
  {
    action: "cancel",
    labelKey: "orders.action.cancel",
    largeClassName: "border-[#DC2626]/30 bg-[#DC2626]/10 text-[#DC2626]",
    glyph: "ord-cancel.svg",
    icon: XCircle,
  },
];

// The frames draw four row actions and no "Record Payment" (it has no frame at
// all). A settled order's payment flow only reports "already paid", so the row
// offers it just for orders that still owe money, which keeps a paid row at
// the frame's four buttons.
function owesPayment(order: OrderRecord): boolean {
  return order.payment === "Unpaid" || order.payment === "Partially Paid";
}

function rowActions(order: OrderRecord) {
  return owesPayment(order) ? ACTION_BUTTONS : ACTION_BUTTONS.filter((button) => button.action !== "payment");
}

/** The pedestal-table glyph the frames put before a table number — lucide has
 *  no equivalent (its `Table` is a data grid). */
export function TableGlyph({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M2.5 4.75h11" />
      <path d="M8 4.75v6.5" />
      <path d="M5.5 11.75h5" />
    </svg>
  );
}

export function OrderActionButtons({
  order,
  onAction,
  className,
  variant = "compact",
}: {
  order: OrderRecord;
  onAction: (action: OrderAction, order: OrderRecord) => void;
  className?: string;
  /** "compact" is the row/card treatment (small tinted buttons). "large" is
   *  the Order Details modal's full-width, icon-bearing button row. */
  variant?: "compact" | "large";
}) {
  const { t } = useI18n();

  if (variant === "large") {
    return (
      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-5 ${className ?? ""}`}>
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
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      {rowActions(order).map(({ action, labelKey, glyph }) => (
        <button
          key={action}
          type="button"
          onClick={() => onAction(action, order)}
          className={`inline-flex h-8 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-[8px] border border-[var(--tint-border)] px-2 text-[14px] font-medium leading-[14px] transition-[filter] hover:brightness-[0.97] [[data-theme=dark]_&]:border-[color:color-mix(in_srgb,var(--tint-fg)_40%,var(--octo-card))] ${TINT_CLASS}`}
          style={{ ...tintVars(ACTION_TINT[action]), ["--tint-border" as string]: ACTION_TINT[action].border }}
        >
          <ShellIcon name={glyph} size={16} />
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}

function Chip({ tint, children }: { tint: Tint; children: string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-medium leading-[12px] ${TINT_CLASS}`}
      style={tintVars(tint)}
    >
      {children}
    </span>
  );
}

function OrderIdBlock({ order, onOpenDetails }: { order: OrderRecord; onOpenDetails: (order: OrderRecord) => void }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => onOpenDetails(order)}
        className="whitespace-nowrap text-[18px] font-bold leading-[18px] text-[#004bb9] hover:underline [[data-theme=dark]_&]:text-[#5b9dff]"
      >
        {order.id}
      </button>
      <div className="flex flex-col items-start gap-1">
        <div className="whitespace-nowrap text-[14px] font-medium leading-[14px] text-[var(--octo-text-secondary)]">{order.date}</div>
        <Chip tint={SOURCE_TINT}>{t(SOURCE_LABEL_KEY[order.source])}</Chip>
      </div>
    </div>
  );
}

function IconLine({ icon, bold, children }: { icon: string; bold?: boolean; children: string }) {
  return (
    <div className={`flex items-center gap-1 whitespace-nowrap text-[12px] leading-[12px] text-[var(--octo-text-primary)] ${bold ? "font-bold" : "font-normal"}`}>
      <ShellIcon name={icon} size={16} />
      {children}
    </div>
  );
}

function TableAndGuests({ order }: { order: OrderRecord }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-start gap-1">
      {order.table && (
        <IconLine icon="ord-table.svg" bold>
          {order.table}
        </IconLine>
      )}
      {order.guests != null && <IconLine icon="ord-user.svg">{t("orders.row.guests").replace("{n}", String(order.guests))}</IconLine>}
    </div>
  );
}

function AmountAndPayment({ order }: { order: OrderRecord }) {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-start gap-1">
      <IconLine icon="ord-money.svg" bold>
        {formatSar(order.totalSar)}
      </IconLine>
      <Chip tint={PAYMENT_TINT[order.payment]}>{t(PAYMENT_LABEL_KEY[order.payment])}</Chip>
    </div>
  );
}

const CARD = `rounded-[12px] border bg-[var(--octo-card)] shadow-[0_0_6px_rgba(0,0,0,0.12)] ${LINE}`;

/** One order as its own bordered card, split into five rule-separated column
 *  groups — the frames show no table chrome and no column headers. Widths are
 *  the frame's as minimums, so a longer localised value widens its cell
 *  instead of spilling over the rule; below the frame's width the trailing
 *  groups wrap onto a second line. */
export function OrderRowCard({
  order,
  onOpenDetails,
  onAction,
}: {
  order: OrderRecord;
  onOpenDetails: (order: OrderRecord) => void;
  onAction: (action: OrderAction, order: OrderRecord) => void;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-1 gap-y-3 py-4 pe-2 ${CARD}`}>
      <div className={`min-w-[122px] flex-1 border-e px-2 ${LINE}`}>
        <OrderIdBlock order={order} onOpenDetails={onOpenDetails} />
      </div>

      <div className={`min-h-[36px] min-w-[120px] flex-1 border-e px-2 ${LINE}`}>
        <TableAndGuests order={order} />
      </div>

      <div className={`min-w-[120px] flex-1 border-e px-2 ${LINE}`}>
        <AmountAndPayment order={order} />
      </div>

      <div className={`flex min-h-[60px] flex-[3] flex-col justify-center border-e px-2 ${LINE}`}>
        <Stepper order={order} />
      </div>

      {/* Four buttons spread across the cell as in the frame; the fifth makes
          them wrap, where spreading would scatter them. */}
      <OrderActionButtons
        order={order}
        onAction={onAction}
        className="min-h-[60px] shrink-0 justify-end ps-1"
      />
    </div>
  );
}

/** Narrow screens get the same card, collapsed to a tap-to-expand summary —
 *  the five-column row cannot survive a phone width. */
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
    <div className={`p-4 ${CARD}`}>
      <div className="flex items-start justify-between gap-3">
        <OrderIdBlock order={order} onOpenDetails={onOpenDetails} />
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={t("orders.details.summary")}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
        >
          <ChevronDown size={18} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-3">
        <TableAndGuests order={order} />
        <AmountAndPayment order={order} />
      </div>

      {expanded && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="octo-scroll overflow-x-auto">
            <Stepper order={order} />
          </div>
          <OrderActionButtons order={order} onAction={onAction} />
        </div>
      )}
    </div>
  );
}
