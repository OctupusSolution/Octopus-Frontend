// apps/merchant/src/pages/customers/_shared/customer-row.tsx
import { CalendarDays, Link2, Mail, MoreVertical, SquarePen } from "lucide-react";
import { Checkbox } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { ActionButton } from "./action-button";
import { Avatar } from "./avatar";
import { customerName, formatDate, formatSarWhole } from "./format";
import { TagChips } from "./tag-chips";
import { ACTION_TINT } from "./theme";
import { WhatsAppGlyph } from "./whatsapp-glyph";
import type { CustomerRecord } from "./types";

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
    <div className="flex flex-wrap items-stretch rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] xl:grid xl:grid-cols-[48px_minmax(212px,265fr)_minmax(92px,116fr)_repeat(3,minmax(124px,156fr))_auto]">
      <div className="flex w-12 shrink-0 items-center justify-center border-e border-[var(--octo-divider)]">
        <Checkbox checked={selected} onChange={onToggleSelect} aria-label={name} className="[&_input]:h-[18px] [&_input]:w-[18px] [&>span]:h-[18px] [&>span]:w-[18px]" />
      </div>

      <div className="flex min-w-[212px] flex-1 items-start gap-2 border-e border-[var(--octo-divider)] px-2.5 xl:min-w-0">
        <Avatar name={name} photo={customer.avatarUrl} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-semibold text-[var(--octo-text-primary)]">{name}</div>
          <TagChips tags={customer.tags} blocked={customer.isBlocked} className="mt-1 !gap-1" />
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--octo-text-secondary)]">
            <WhatsAppGlyph size={11} /> <span dir="ltr">{customer.phone}</span>
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-[var(--octo-text-secondary)]">
            <Mail size={11} className="shrink-0" /> <span className="truncate">{customer.email}</span>
          </div>
        </div>
      </div>

      <RowStat label={t("customers.row.visits")} value={String(customer.visits)} />
      <RowStat label={t("customers.row.totalSpend")} value={formatSarWhole(customer.totalSpendSar)} />
      <RowStat label={t("customers.row.lastVisit")} value={formatDate(customer.lastVisit, locale)} />
      <RowStat
        label={t("customers.row.upcoming")}
        value={customer.upcomingReservation ? formatDate(customer.upcomingReservation, locale) : "—"}
        valueClassName={customer.upcomingReservation ? "text-[#0D6EFD]" : undefined}
      />

      <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5 ps-4 pe-3 xl:flex-nowrap">
        <ActionButton className={ROW_BUTTON} icon={<SquarePen size={16} />} label={t("customers.row.edit")} tint={ACTION_TINT.edit} onClick={onEdit} />
        <ActionButton className={ROW_BUTTON} icon={<CalendarDays size={16} />} label={t("customers.row.newReservations")} tint={ACTION_TINT.newReservations} onClick={onNewReservation} />
        <ActionButton className={ROW_BUTTON} icon={<Link2 size={16} />} label={t("customers.row.paymentLink")} tint={ACTION_TINT.paymentLink} onClick={onOpenPaymentLink} />
        <button
          type="button"
          onClick={(event) => onOpenRowActions(event.currentTarget)}
          className="grid h-8 w-7 shrink-0 place-items-center rounded-[8px] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
          aria-label={t("customers.aria.moreActions")}
          aria-haspopup="menu"
          data-row-kebab
        >
          <MoreVertical size={18} />
        </button>
      </div>
    </div>
  );
}

// Columns follow the frame's proportions (customer 265 : Visits 116 :
// 156 each for the other stats) and grow together on wider screens; the
// action buttons keep their natural width at the end of the row.
const ROW_BUTTON = "!h-8 !px-2.5 !text-[13.5px] !font-normal";

function RowStat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className={`flex min-w-[92px] flex-col items-center justify-center border-e border-[var(--octo-divider)] px-2 text-center`}>
      <div className="text-[12px] text-[var(--octo-text-secondary)]">{label}</div>
      <div className={`mt-1.5 whitespace-nowrap text-[16px] text-[var(--octo-text-primary)] ${valueClassName ?? ""}`}>{value}</div>
    </div>
  );
}
