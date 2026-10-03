// Shared building blocks of the Order Details page: the card shell, the
// label/value row, the 32px action button and the status chips.
import { useMemo, type ReactNode } from "react";
import type { OrderAdminStatus, OrderLineStatus, OrderResponse } from "@octopus/api-client";
import { useOrderText, type OrderTextKey } from "@/entities/order";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { useAuth } from "@/app/providers/auth-provider";

export const LINE_COLOR = "border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-card)]";
export const CARD_CLASS = `flex flex-col gap-3 rounded-[16px] border p-3 ${LINE_COLOR}`;
const SOFT_BLUE = "bg-[#f5f9ff] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#0d6efd_12%,var(--octo-card))]";
const SOFT_GRAY = "bg-[#f1f5f9] [[data-theme=dark]_&]:bg-[var(--octo-soft-bg)]";

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[14px] font-bold leading-[14px] text-[var(--octo-text-primary)]">{children}</h2>;
}

export function InfoRow({ label, value, valueClassName }: { label: string; value: ReactNode; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 font-medium">
      <dt className="shrink-0 text-[10px] leading-[10px] text-[var(--octo-text-secondary)]">{label}</dt>
      <dd className={`min-w-0 break-words text-end text-[12px] leading-[12px] ${valueClassName ?? "text-[var(--octo-text-primary)]"}`}>
        {value}
      </dd>
    </div>
  );
}

export type ButtonTone = "blue" | "neutral" | "refund" | "danger" | "purple" | "blueSubtle" | "soft";

// The light values are the frame's; the dark ones rebuild each pastel as a
// tint over the card surface.
const BUTTON_TONE: Record<ButtonTone, string> = {
  blue: `${SOFT_BLUE} border-[#abcdff] text-[#0058da] [[data-theme=dark]_&]:border-[#60a5fa]/30 [[data-theme=dark]_&]:text-[#60a5fa]`,
  neutral: `${SOFT_GRAY} ${LINE_COLOR} text-[var(--octo-text-primary)]`,
  refund:
    "bg-[#fffee3] border-[#d6d5b9] text-[#878533] [[data-theme=dark]_&]:border-[#e0dc5a]/30 [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#e0dc5a_12%,var(--octo-card))] [[data-theme=dark]_&]:text-[#e0dc5a]",
  danger:
    "bg-[#fef0f0] border-[#f8c1c1] text-[#d30202] [[data-theme=dark]_&]:border-[#f87171]/30 [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#ef4444_12%,var(--octo-card))] [[data-theme=dark]_&]:text-[#f87171]",
  purple:
    "bg-[#f8e9ff] border-[#ebc0ff] text-[#7600b1] [[data-theme=dark]_&]:border-[#c77dff]/30 [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#c77dff_12%,var(--octo-card))] [[data-theme=dark]_&]:text-[#c77dff]",
  blueSubtle: `${SOFT_GRAY} border-[#abcdff] text-[#0058da] [[data-theme=dark]_&]:border-[#60a5fa]/30 [[data-theme=dark]_&]:text-[#60a5fa]`,
  soft: `${SOFT_GRAY} border-[#e2e8f0] text-[var(--octo-text-primary)] [[data-theme=dark]_&]:border-[var(--octo-border-input)]`,
};

export function SmallButton({
  tone,
  children,
  onClick,
  disabled,
  title,
  className,
}: {
  tone: ButtonTone;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Says why a disabled button is disabled. */
  title?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`flex h-8 min-w-0 items-center justify-center rounded-[8px] border p-2 text-[14px] font-medium leading-[14px] transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_TONE[tone]} ${className ?? ""}`}
    >
      <span className="truncate">{children}</span>
    </button>
  );
}

/** The tinted strip that carries a card's headline figure. */
export function HighlightRow({
  label,
  value,
  tone,
  rounded = "rounded-[4px]",
}: {
  label: string;
  value: string;
  tone: "blue" | "green" | "red";
  rounded?: string;
}) {
  const surface =
    tone === "blue"
      ? SOFT_BLUE
      : tone === "green"
        ? "bg-[#f5fff9] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#22c55e_12%,var(--octo-card))]"
        : "bg-[#fef0f0] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#ef4444_12%,var(--octo-card))]";
  const labelColor =
    tone === "blue" ? "text-[var(--octo-text-secondary)]" : tone === "green" ? GREEN_TEXT : RED_TEXT;
  const valueColor = tone === "blue" ? "text-[#0d6efd] [[data-theme=dark]_&]:text-[#60a5fa]" : tone === "green" ? GREEN_TEXT : RED_TEXT;
  return (
    <div className={`flex items-center justify-between gap-3 p-2 ${rounded} ${surface}`}>
      <span className={`text-[12px] font-medium leading-[12px] ${labelColor}`}>{label}</span>
      <span className={`text-[16px] font-bold leading-[16px] ${valueColor}`} dir="ltr">
        {value}
      </span>
    </div>
  );
}

export const GREEN_TEXT = "text-[#009a39] [[data-theme=dark]_&]:text-[#22c55e]";
const RED_TEXT = "text-[#d30202] [[data-theme=dark]_&]:text-[#f87171]";

type ChipTone = "green" | "gray" | "amber" | "purple" | "blue" | "red";

const CHIP_TONE: Record<ChipTone, string> = {
  green: `bg-[#f2fff7] ${GREEN_TEXT} [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#22c55e_12%,var(--octo-card))]`,
  gray: `${SOFT_GRAY} text-[var(--octo-text-secondary)]`,
  amber: "bg-[#fff8ea] text-[#b45309] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#f59e0b_12%,var(--octo-card))] [[data-theme=dark]_&]:text-[#fbbf24]",
  purple: "bg-[#f8e9ff] text-[#7600b1] [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#c77dff_12%,var(--octo-card))] [[data-theme=dark]_&]:text-[#c77dff]",
  blue: `${SOFT_BLUE} text-[#0058da] [[data-theme=dark]_&]:text-[#60a5fa]`,
  red: `bg-[#fef0f0] ${RED_TEXT} [[data-theme=dark]_&]:bg-[color-mix(in_srgb,#ef4444_12%,var(--octo-card))]`,
};

const ORDER_STATUS_TONE: Record<OrderAdminStatus, ChipTone> = {
  New: "gray",
  Accepted: "purple",
  Preparing: "amber",
  Ready: "purple",
  Served: "blue",
  Completed: "green",
  Cancelled: "red",
  Voided: "gray",
};

// The frame draws a served line green, unlike the list's blue "Served" pill.
const LINE_STATUS_TONE: Record<OrderLineStatus, ChipTone> = {
  Pending: "gray",
  Preparing: "amber",
  Ready: "purple",
  Served: "green",
  Cancelled: "red",
  Voided: "gray",
  Wasted: "purple",
};

function Chip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-medium leading-[12px] ${CHIP_TONE[tone]}`}>
      {children}
    </span>
  );
}

export function OrderStatusChip({ status }: { status: OrderAdminStatus }) {
  const { tx } = useOrderText();
  return <Chip tone={ORDER_STATUS_TONE[status]}>{tx(`status.${status}` as OrderTextKey)}</Chip>;
}

export function LineStatusChip({ status }: { status: OrderLineStatus }) {
  const { tx } = useOrderText();
  return <Chip tone={LINE_STATUS_TONE[status]}>{tx(`lineStatus.${status}` as OrderTextKey)}</Chip>;
}

/** "T7, Table for 4 · Main Dining" — each part only when the order has it. */
export function PlaceLine({ order, guestsLabel }: { order: OrderResponse; guestsLabel: string | null }) {
  const place = order.resource ? order.resource.displayName || order.resource.code : null;
  const area = order.resource?.groupName ?? null;
  if (!place && !guestsLabel && !area) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[12px] font-medium leading-[12px] text-[var(--octo-text-secondary)]">
      {(place || guestsLabel) && (
        <span className="flex items-center gap-1">
          {/* Exported at its own 14×12 bounds, inset in the frame's 16px slot. */}
          <span className="grid h-4 w-4 place-items-center">
            <ShellIcon name="ord-detail-table.svg" size={14} />
          </span>
          <span>
            {place && <b className="font-bold text-[var(--octo-text-primary)]">{place}</b>}
            {place && guestsLabel ? " , " : ""}
            {guestsLabel}
          </span>
        </span>
      )}
      {area && (
        <span className="flex items-center gap-1">
          <ShellIcon name="ord-detail-location.svg" size={16} />
          {area}
        </span>
      )}
    </div>
  );
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const tag = locale === "ar" ? "ar-SA-u-ca-gregory" : "en-US";
  const day = date.toLocaleDateString(tag, { month: "short", day: "numeric", year: "numeric" });
  const time = date.toLocaleTimeString(tag, { hour: "2-digit", minute: "2-digit" });
  return `${day} - ${time}`;
}

export function formatTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" });
}

const OPAQUE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/i;

/** The activity log sometimes carries the actor's account id where a display
 *  name belongs. The signed-in account is shown by name; any other id is
 *  dropped rather than printed as a GUID. */
export function useReadableActivity<T extends { actorDisplay: string | null }>(activity: readonly T[]): T[] {
  const { user, activeAccountId } = useAuth();
  const ownName = user?.name ?? null;
  return useMemo(
    () =>
      activity.map((entry) =>
        !entry.actorDisplay || !OPAQUE_ID.test(entry.actorDisplay)
          ? entry
          : { ...entry, actorDisplay: entry.actorDisplay === activeAccountId ? ownName : null }
      ),
    [activity, activeAccountId, ownName]
  );
}
