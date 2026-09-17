// apps/merchant/src/pages/customers/_shared/customer-row.tsx
import { Mail, MoreVertical, Pencil } from "lucide-react";
import { Checkbox } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { Avatar } from "./avatar";
import { customerName, formatDate } from "./format";
import { TAG_STYLE, BLOCKED_STYLE, ROW_ACTION_THEME, TAG_LABEL_KEY } from "./theme";
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
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3.5">
      <Checkbox checked={selected} onChange={onToggleSelect} aria-label={name} />

      <div className="flex min-w-[220px] flex-1 items-start gap-3">
        <Avatar name={name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 font-semibold text-[var(--octo-text-primary)]">{name}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {customer.isBlocked && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: BLOCKED_STYLE.text, backgroundColor: BLOCKED_STYLE.bg }}>
                {t("customers.tag.blocked")}
              </span>
            )}
            {customer.tags.map((tag) => (
              <span key={tag} className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ color: TAG_STYLE[tag].text, backgroundColor: TAG_STYLE[tag].bg }}>
                {t(TAG_LABEL_KEY[tag])}
              </span>
            ))}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-[var(--octo-text-muted)]">
            <WhatsAppGlyph size={12} /> {customer.phone}
          </div>
          <div className="flex items-center gap-1.5 text-[11.5px] text-[var(--octo-text-muted)]">
            <Mail size={12} /> {customer.email}
          </div>
        </div>
      </div>

      <RowStat label={t("customers.row.visits")} value={String(customer.visits)} />
      <RowStat label={t("customers.row.totalSpend")} value={`SAR ${customer.totalSpendSar}`} />
      <RowStat label={t("customers.row.lastVisit")} value={formatDate(customer.lastVisit, locale)} />
      <RowStat
        label={t("customers.row.upcoming")}
        value={customer.upcomingReservation ? formatDate(customer.upcomingReservation, locale) : "—"}
        valueClassName={customer.upcomingReservation ? "text-[#0D6EFD]" : undefined}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--octo-border-input)] px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
        >
          <Pencil size={12} /> {t("customers.row.edit")}
        </button>
        <button
          type="button"
          onClick={onNewReservation}
          className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-medium"
          style={{ color: ROW_ACTION_THEME.newReservations.text, backgroundColor: ROW_ACTION_THEME.newReservations.bg }}
        >
          {t("customers.row.newReservations")}
        </button>
        <button
          type="button"
          onClick={onOpenPaymentLink}
          className="inline-flex items-center gap-1 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-medium"
          style={{ color: ROW_ACTION_THEME.paymentLink.text, backgroundColor: ROW_ACTION_THEME.paymentLink.bg }}
        >
          {t("customers.row.paymentLink")}
        </button>
        <button
          type="button"
          onClick={(event) => onOpenRowActions(event.currentTarget)}
          className="grid h-7 w-7 place-items-center rounded-[8px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
          aria-label="More actions"
        >
          <MoreVertical size={15} />
        </button>
      </div>
    </div>
  );
}

function RowStat({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="min-w-[86px]">
      <div className="text-[10.5px] uppercase tracking-wide text-[var(--octo-text-faint)]">{label}</div>
      <div className={`mt-0.5 text-[12.5px] font-medium text-[var(--octo-text-primary)] ${valueClassName ?? ""}`}>{value}</div>
    </div>
  );
}
