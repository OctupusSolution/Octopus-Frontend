import clsx from "clsx";
import { MoreVertical } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { useDismiss } from "./use-dismiss";

export interface RowActionsMenuProps {
  onDuplicate: () => void;
  onSharePaymentLink: () => void;
  onCancel: () => void;
  canShareLink: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RowActionsMenu({
  onDuplicate,
  onSharePaymentLink,
  onCancel,
  canShareLink,
  open,
  onOpenChange,
}: RowActionsMenuProps) {
  const { t } = useI18n();
  const ref = useDismiss(open, () => onOpenChange(false));
  const noBackend = t("reservations.list.actions.noBackend");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("reservations.list.row.more")}
        onClick={() => onOpenChange(!open)}
        className="grid h-8 w-8 place-items-center rounded-[9px] text-[var(--octo-text-muted)] transition-colors hover:bg-[var(--octo-hover)]"
      >
        <MoreVertical size={15} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 z-20 mt-1 w-52 rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onDuplicate();
              onOpenChange(false);
            }}
            className="flex w-full items-center rounded-[9px] px-2.5 py-1.5 text-start text-[12px] text-[var(--octo-text-primary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            {t("reservations.list.actions.duplicate")}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled
            title={noBackend}
            className="flex w-full items-center rounded-[9px] px-2.5 py-1.5 text-start text-[12px] text-[var(--octo-text-faint)] disabled:cursor-not-allowed"
          >
            {t("reservations.list.actions.addNote")}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled
            title={noBackend}
            className="flex w-full items-center rounded-[9px] px-2.5 py-1.5 text-start text-[12px] text-[var(--octo-text-faint)] disabled:cursor-not-allowed"
          >
            {t("reservations.list.actions.sendReminder")}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled
            title={noBackend}
            className="flex w-full items-center rounded-[9px] px-2.5 py-1.5 text-start text-[12px] text-[var(--octo-text-faint)] disabled:cursor-not-allowed"
          >
            {t("reservations.list.actions.viewLogs")}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled
            title={noBackend}
            className="flex w-full items-center rounded-[9px] px-2.5 py-1.5 text-start text-[12px] text-[var(--octo-text-faint)] disabled:cursor-not-allowed"
          >
            {t("reservations.list.actions.exportCalendar")}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canShareLink}
            title={canShareLink ? undefined : noBackend}
            onClick={() => {
              if (!canShareLink) return;
              onSharePaymentLink();
              onOpenChange(false);
            }}
            className={clsx(
              "flex w-full items-center rounded-[9px] px-2.5 py-1.5 text-start text-[12px] transition-colors",
              canShareLink
                ? "text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]"
                : "text-[var(--octo-text-faint)] disabled:cursor-not-allowed"
            )}
          >
            {t("reservations.list.actions.sharePaymentLink")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onCancel();
              onOpenChange(false);
            }}
            className="mt-1 flex w-full items-center rounded-[9px] border-t border-[var(--octo-divider)] px-2.5 pb-1.5 pt-2 text-start text-[12px] text-[#EF4444] transition-colors hover:bg-[var(--octo-hover)]"
          >
            {t("reservations.list.actions.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}
