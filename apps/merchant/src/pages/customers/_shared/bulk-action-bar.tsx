// apps/merchant/src/pages/customers/_shared/bulk-action-bar.tsx
import { Checkbox } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";

export function BulkActionBar({
  count,
  onSendWhatsapp,
  onSendEmail,
  onPaymentLink,
  onAddTag,
  onMerge,
  onExport,
  onDelete,
}: {
  count: number;
  onSendWhatsapp: () => void;
  onSendEmail: () => void;
  onPaymentLink: () => void;
  onAddTag: () => void;
  onMerge: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const actions: { label: string; onClick: () => void; danger?: boolean }[] = [
    { label: t("customers.bulk.sendWhatsapp"), onClick: onSendWhatsapp },
    { label: t("customers.bulk.sendEmail"), onClick: onSendEmail },
    { label: t("customers.bulk.paymentLink"), onClick: onPaymentLink },
    { label: t("customers.bulk.addTag"), onClick: onAddTag },
    { label: t("customers.bulk.merge"), onClick: onMerge },
    { label: t("customers.bulk.export"), onClick: onExport },
    { label: t("customers.bulk.delete"), onClick: onDelete, danger: true },
  ];

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-3 py-2">
      <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--octo-text-primary)]">
        <Checkbox checked readOnly /> {t("customers.bulk.selected").replace("{count}", String(count))}
      </span>
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className={`rounded-[8px] border px-3 py-1.5 text-[12px] font-medium transition-colors hover:bg-[var(--octo-hover)] ${
            action.danger ? "border-[#EF4444]/30 text-[#EF4444]" : "border-[var(--octo-border-input)] text-[var(--octo-text-secondary)]"
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
