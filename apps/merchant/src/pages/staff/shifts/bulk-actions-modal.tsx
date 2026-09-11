import { useEffect, useState, type ReactNode } from "react";
import { CopyPlus, Send, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Modal } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { buttonClass } from "../_shared/buttons";

function ActionRow({
  icon,
  title,
  description,
  onClick,
  danger,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex w-full items-start gap-3 rounded-[12px] border px-3.5 py-3 text-start transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40 disabled:cursor-not-allowed disabled:opacity-50",
        danger
          ? "border-[var(--octo-border-card)] hover:border-[#DC2626]/40 hover:bg-[var(--octo-tone-danger-bg)]"
          : "border-[var(--octo-border-card)] hover:border-[#0D6EFD]/40 hover:bg-[var(--octo-selected)]"
      )}
    >
      <span
        aria-hidden
        className={clsx(
          "grid h-9 w-9 shrink-0 place-items-center rounded-[9px]",
          danger ? "bg-[var(--octo-tone-danger-bg)] text-[var(--octo-tone-danger-text)]" : "bg-[var(--octo-tone-info-bg)] text-[var(--octo-tone-info-text)]"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className={clsx("block text-[14px] font-semibold", danger ? "text-[var(--octo-tone-danger-text)]" : "text-[var(--octo-text-primary)]")}>{title}</span>
        <span className="block text-[13px] text-[var(--octo-text-secondary)]">{description}</span>
      </span>
    </button>
  );
}

export function BulkActionsModal({
  open,
  onClose,
  weekRange,
  staffCount,
  shiftCount,
  onPublish,
  onCopyForward,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  weekRange: string;
  staffCount: number;
  shiftCount: number;
  onPublish: () => void;
  onCopyForward: () => void;
  onClear: () => void;
}) {
  const { t } = useI18n();
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!open) setConfirmClear(false);
  }, [open]);

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t("staff.shiftsTab.bulkActionsTitle")} className="max-w-lg">
      <p className="-mt-1 mb-4 text-[13px] text-[var(--octo-text-secondary)]">
        {t("staff.shiftsTab.bulkActionsBody").replace("{range}", weekRange).replace("{count}", String(staffCount))}
      </p>

      {confirmClear ? (
        <div className="rounded-[12px] border border-[#DC2626]/30 bg-[var(--octo-tone-danger-bg)] p-4">
          <p className="text-[14px] font-semibold text-[var(--octo-tone-danger-text)]">{t("staff.shiftsTab.bulkClearConfirmTitle")}</p>
          <p className="mt-1 text-[13px] text-[var(--octo-text-primary)]">
            {t("staff.shiftsTab.bulkClearConfirmBody").replace("{count}", String(shiftCount)).replace("{range}", weekRange)}
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setConfirmClear(false)} className={buttonClass("secondary", "sm")}>{t("common.cancel")}</button>
            <button type="button" onClick={() => run(onClear)} className={buttonClass("danger", "sm")}>{t("staff.shiftsTab.bulkClear")}</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <ActionRow icon={<Send size={18} />} title={t("staff.shiftsTab.bulkPublish")} description={t("staff.shiftsTab.bulkPublishDescription")} onClick={() => run(onPublish)} disabled={shiftCount === 0} />
          <ActionRow icon={<CopyPlus size={18} />} title={t("staff.shiftsTab.bulkCopy")} description={t("staff.shiftsTab.bulkCopyDescription")} onClick={() => run(onCopyForward)} disabled={staffCount === 0} />
          <ActionRow icon={<Trash2 size={18} />} title={t("staff.shiftsTab.bulkClear")} description={t("staff.shiftsTab.bulkClearDescription")} onClick={() => setConfirmClear(true)} danger disabled={shiftCount === 0} />
        </div>
      )}
    </Modal>
  );
}
