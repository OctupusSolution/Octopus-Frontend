// apps/merchant/src/pages/orders-list/_shared/order-row.tsx
import { Ban, ChevronDown, CreditCard, RotateCcw, Trash2, User, XCircle } from "lucide-react";
import { formatSar } from "@octopus/api-client";
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

// Each payment state carries its own colour in the frames: blue for an online
// card payment, green for cash in hand, amber for a part-payment, and plain
// muted grey for nothing collected yet.
const PAYMENT_TONE: Record<OrderRecord["payment"], string> = {
  "Paid Online": "#0D6EFD",
  "Paid Cash": "#16A34A",
  Unpaid: "var(--octo-text-muted)",
  "Partially Paid": "#D97706",
};

const ACTION_BUTTONS: readonly {
  action: OrderAction;
  labelKey: string;
  className: string;
  largeClassName: string;
  icon: typeof Ban;
}[] = [
  {
    action: "payment",
    labelKey: "orders.action.recordPayment",
    className: "border-[#16A34A]/30 bg-[#16A34A]/10 text-[#16A34A]",
    largeClassName: "border-[#16A34A]/30 bg-[#16A34A]/10 text-[#16A34A]",
    icon: CreditCard,
  },
  {
    action: "void",
    labelKey: "orders.action.void",
    className: "border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)]",
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
  /** "compact" is the row/card treatment (small pill buttons). "large" is the
   *  Order Details modal's full-width, icon-bearing button row. */
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
    <div className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}>
      {ACTION_BUTTONS.map(({ action, labelKey, className: btnClassName, icon: Icon }) => (
        <button
          key={action}
          type="button"
          onClick={() => onAction(action, order)}
          className={`flex items-center gap-1.5 rounded-[8px] border px-2.5 py-[6px] text-[12px] font-medium transition-opacity hover:opacity-80 ${btnClassName}`}
        >
          <Icon size={13} />
          {t(labelKey)}
        </button>
      ))}
    </div>
  );
}

function OrderIdBlock({ order, onOpenDetails }: { order: OrderRecord; onOpenDetails: (order: OrderRecord) => void }) {
  const { t } = useI18n();

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenDetails(order)}
        className="text-[14px] font-bold text-[#0D6EFD] hover:underline"
      >
        {order.id}
      </button>
      <div className="mt-0.5 text-[12px] text-[var(--octo-text-secondary)]">{order.date}</div>
      <div className="mt-0.5 text-[12px] text-[#0D6EFD]">{t(SOURCE_LABEL_KEY[order.source])}</div>
    </>
  );
}

/** One order as its own bordered card, split into five divider-separated
 *  column groups — the frames show no table chrome and no column headers. */
export function OrderRowCard({
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
    <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="w-[128px] shrink-0">
          <OrderIdBlock order={order} onOpenDetails={onOpenDetails} />
        </div>

        <div className="w-[118px] shrink-0 border-s border-[var(--octo-divider)] ps-4">
          {order.table && (
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
              <span className="text-[var(--octo-text-muted)]">
                <TableGlyph />
              </span>
              {order.table}
            </div>
          )}
          {order.guests != null && (
            <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-[var(--octo-text-secondary)]">
              <User size={13} className="text-[var(--octo-text-muted)]" />
              {t("orders.row.guests").replace("{n}", String(order.guests))}
            </div>
          )}
        </div>

        <div className="w-[130px] shrink-0 border-s border-[var(--octo-divider)] ps-4">
          <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
            <CreditCard size={13} className="text-[var(--octo-text-muted)]" />
            {formatSar(order.totalSar)}
          </div>
          <div className="mt-1 text-[12px]" style={{ color: PAYMENT_TONE[order.payment] }}>
            {t(PAYMENT_LABEL_KEY[order.payment])}
          </div>
        </div>

        <div className="min-w-[260px] flex-1 border-s border-[var(--octo-divider)] ps-4">
          <Stepper order={order} />
        </div>

        <div className="shrink-0 border-s border-[var(--octo-divider)] ps-4">
          <OrderActionButtons order={order} onAction={onAction} />
        </div>
      </div>
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
    <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3.5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <OrderIdBlock order={order} onOpenDetails={onOpenDetails} />
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={t("orders.details.summary")}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--octo-text-faint)] transition-colors hover:bg-[var(--octo-hover)]"
        >
          <ChevronDown size={15} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {order.table && (
          <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
            <span className="text-[var(--octo-text-muted)]">
              <TableGlyph />
            </span>
            {order.table}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--octo-text-primary)]">
          <CreditCard size={13} className="text-[var(--octo-text-muted)]" />
          {formatSar(order.totalSar)}
        </span>
        <span className="text-[12px]" style={{ color: PAYMENT_TONE[order.payment] }}>
          {t(PAYMENT_LABEL_KEY[order.payment])}
        </span>
      </div>

      {expanded && (
        <div className="mt-3 flex flex-col gap-3">
          <Stepper order={order} />
          <OrderActionButtons order={order} onAction={onAction} />
        </div>
      )}
    </div>
  );
}
