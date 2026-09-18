// apps/merchant/src/pages/customers/_shared/bulk-action-bar.tsx
import type { ReactNode } from "react";
import { CopyPlus, Link2, Tag, Trash2, Share } from "lucide-react";
import { Checkbox } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { ActionButton } from "./action-button";
import { ACTION_TINT, type ActionTint } from "./theme";
import { WhatsAppGlyph } from "./whatsapp-glyph";

/** CRM-selected.png: an inline row (no card) — "N Selected" with a checked
 *  box that clears the selection, then seven tinted/outlined actions. */
export function BulkActionBar({
  count,
  onClearSelection,
  onSendWhatsapp,
  onSendEmail,
  onPaymentLink,
  onAddTag,
  onMerge,
  onExport,
  onDelete,
}: {
  count: number;
  onClearSelection: () => void;
  onSendWhatsapp: () => void;
  onSendEmail: () => void;
  onPaymentLink: () => void;
  onAddTag: () => void;
  onMerge: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const actions: { label: string; icon: ReactNode; tint?: ActionTint; onClick: () => void }[] = [
    { label: t("customers.bulk.sendWhatsapp"), icon: <WhatsAppGlyph size={18} />, tint: ACTION_TINT.whatsapp, onClick: onSendWhatsapp },
    { label: t("customers.bulk.sendEmail"), icon: <Share size={17} />, tint: ACTION_TINT.email, onClick: onSendEmail },
    { label: t("customers.bulk.paymentLink"), icon: <Link2 size={16} />, tint: ACTION_TINT.paymentLink, onClick: onPaymentLink },
    { label: t("customers.bulk.addTag"), icon: <Tag size={17} />, onClick: onAddTag },
    { label: t("customers.bulk.merge"), icon: <CopyPlus size={17} />, onClick: onMerge },
    { label: t("customers.bulk.export"), icon: <Share size={17} />, onClick: onExport },
    { label: t("customers.bulk.delete"), icon: <Trash2 size={17} />, tint: ACTION_TINT.danger, onClick: onDelete },
  ];

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2.5" role="toolbar" aria-label={t("customers.bulk.selected").replace("{count}", String(count))}>
      <span className="inline-flex items-center gap-1.5 pe-1 text-[14px] font-medium text-[var(--octo-text-primary)]">
        <Checkbox
          checked
          onChange={onClearSelection}
          aria-label={t("customers.bulk.clearSelection")}
          className="[&_input]:h-5 [&_input]:w-5 [&>span:first-child]:h-5 [&>span:first-child]:w-5"
        />
        {t("customers.bulk.selected").replace("{count}", String(count))}
      </span>
      {actions.map((action) => (
        <ActionButton key={action.label} size="md" icon={action.icon} label={action.label} tint={action.tint} onClick={action.onClick} />
      ))}
    </div>
  );
}
