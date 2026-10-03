// apps/merchant/src/pages/customers/_shared/bulk-action-bar.tsx
import type { ReactNode } from "react";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { ActionButton } from "./action-button";
import { CrmCheckbox } from "./crm-checkbox";
import { ACTION_TINT, type ActionTint } from "./theme";
import { WhatsAppGlyph } from "./whatsapp-glyph";

// The frame's outlined actions (and Delete) are roomier than the tinted ones.
const WIDE = "!gap-2 !px-4";

/** A glyph the frame draws smaller than its 24px slot. */
function SlotIcon({ name, size }: { name: string; size: number }) {
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center">
      <ShellIcon name={name} size={size} />
    </span>
  );
}

/** The selection row of the CRM frame: an inline row (no card) — "N Selected"
 *  with a checked box that clears the selection, then seven actions. */
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
  const selectedLabel = t("customers.bulk.selected").replace("{count}", String(count));
  const actions: { id: string; label: string; icon: ReactNode; tint?: ActionTint; className?: string; onClick: () => void }[] = [
    { id: "whatsapp", label: t("customers.bulk.sendWhatsapp"), icon: <WhatsAppGlyph size={24} />, tint: ACTION_TINT.whatsapp, onClick: onSendWhatsapp },
    { id: "email", label: t("customers.bulk.sendEmail"), icon: <ShellIcon name="crm-export.svg" size={24} />, tint: ACTION_TINT.email, onClick: onSendEmail },
    { id: "paymentLink", label: t("customers.bulk.paymentLink"), icon: <ShellIcon name="crm-link.svg" size={16} />, tint: ACTION_TINT.paymentLink, className: "!px-2", onClick: onPaymentLink },
    { id: "addTag", label: t("customers.bulk.addTag"), icon: <SlotIcon name="crm-tag.svg" size={21} />, className: WIDE, onClick: onAddTag },
    { id: "merge", label: t("customers.bulk.merge"), icon: <ShellIcon name="crm-merge.svg" size={24} />, className: WIDE, onClick: onMerge },
    { id: "export", label: t("customers.bulk.export"), icon: <ShellIcon name="crm-export.svg" size={24} />, className: WIDE, onClick: onExport },
    { id: "delete", label: t("customers.bulk.delete"), icon: <ShellIcon name="crm-trash.svg" size={24} />, tint: ACTION_TINT.danger, className: WIDE, onClick: onDelete },
  ];

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2" role="toolbar" aria-label={selectedLabel}>
      <CrmCheckbox
        checked
        onChange={onClearSelection}
        aria-label={t("customers.bulk.clearSelection")}
        label={<span className="whitespace-nowrap text-[14px] font-medium leading-[14px] text-[var(--octo-text-primary)]">{selectedLabel}</span>}
      />
      {actions.map((action) => (
        <ActionButton key={action.id} size="md" icon={action.icon} label={action.label} tint={action.tint} className={action.className} onClick={action.onClick} />
      ))}
    </div>
  );
}
