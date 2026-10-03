// apps/merchant/src/pages/customers/_shared/customer-row.tsx
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { ActionButton } from "./action-button";
import { Avatar } from "./avatar";
import { CrmCheckbox } from "./crm-checkbox";
import { customerName, formatDate, formatSarWhole } from "./format";
import { TagChips } from "./tag-chips";
import { ACTION_TINT } from "./theme";
import type { CustomerRecord } from "./types";

// The frame's #cbd5e1 hairline, swapped for the card-border token on dark.
const LINE = "border-[#cbd5e1] [[data-theme=dark]_&]:border-[var(--octo-border-card)]";

export function CustomerRow({
  customer,
  selected,
  onToggleSelect,
  onEdit,
  onNewReservation,
  onOpenPaymentLink,
  onOpenRowActions,
}: {
  customer: CustomerRecord;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onNewReservation: () => void;
  onOpenPaymentLink: () => void;
  onOpenRowActions: (anchor: HTMLElement) => void;
}) {
  const { t, locale } = useI18n();
  const name = customerName(customer);

  return (
    <div className={`flex flex-wrap items-center gap-y-3 rounded-[12px] border bg-[var(--octo-card)] px-2 py-4 shadow-[0_0_6px_rgba(0,0,0,0.12)] ${LINE}`}>
      <div className={`flex h-[60px] shrink-0 items-center justify-center border-e px-2 ${LINE}`}>
        <CrmCheckbox checked={selected} onChange={onToggleSelect} aria-label={name} />
      </div>

      <div className={`flex min-h-[60px] min-w-[200px] flex-1 items-center border-e px-2 ${LINE}`}>
        <div className="flex w-full min-w-0 items-start gap-1">
          <Avatar name={name} photo={customer.avatarUrl} size={32} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="truncate text-[12px] font-semibold leading-[12px] text-[var(--octo-text-primary)]">{name}</div>
            <TagChips tags={customer.tags} blocked={customer.isBlocked} className="!gap-1" />
          </div>
        </div>
      </div>

      <RowStat label={t("customers.row.visits")} value={String(customer.visits)} width="min-w-[92px]" />
      <RowStat label={t("customers.row.totalSpend")} value={formatSarWhole(customer.totalSpendSar)} />
      <RowStat label={t("customers.row.lastVisit")} value={formatDate(customer.lastVisit, locale)} />
      <RowStat
        label={t("customers.row.upcoming")}
        value={customer.upcomingReservation ? formatDate(customer.upcomingReservation, locale) : "—"}
        valueClassName={customer.upcomingReservation ? "text-[#0058da] [[data-theme=dark]_&]:text-[#5b9dff]" : undefined}
      />

      <div className="ms-auto flex min-h-[60px] flex-wrap items-center justify-end gap-2 px-2">
        <ActionButton icon={<ShellIcon name="crm-edit.svg" size={16} />} label={t("customers.row.edit")} tint={ACTION_TINT.edit} onClick={onEdit} />
        <ActionButton icon={<ShellIcon name="crm-calendar.svg" size={16} />} label={t("customers.row.newReservations")} tint={ACTION_TINT.newReservations} onClick={onNewReservation} />
        <ActionButton icon={<ShellIcon name="crm-link.svg" size={16} />} label={t("customers.row.paymentLink")} tint={ACTION_TINT.paymentLink} onClick={onOpenPaymentLink} />
        <button
          type="button"
          onClick={(event) => onOpenRowActions(event.currentTarget)}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-[6px] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
          aria-label={t("customers.aria.moreActions")}
          aria-haspopup="menu"
          data-row-kebab
        >
          <ShellIcon name="crm-more.svg" size={24} />
        </button>
      </div>
    </div>
  );
}

// Widths are minimums rather than the frame's fixed 92/124px so a longer
// localised date or amount widens its cell instead of spilling over the rule.
function RowStat({ label, value, valueClassName, width = "min-w-[124px]" }: { label: string; value: string; valueClassName?: string; width?: string }) {
  return (
    <div className={`flex h-[60px] shrink-0 flex-col items-center justify-center gap-2 whitespace-nowrap border-e px-2 text-center font-medium ${width} ${LINE}`}>
      <div className="text-[12px] leading-[12px] text-[var(--octo-text-secondary)]">{label}</div>
      <div className={`text-[16px] leading-[16px] ${valueClassName ?? "text-[var(--octo-text-primary)]"}`}>{value}</div>
    </div>
  );
}
