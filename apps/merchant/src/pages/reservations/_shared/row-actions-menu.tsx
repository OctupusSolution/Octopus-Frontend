import clsx from "clsx";
import { MoreVertical } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import { useDismiss } from "./use-dismiss";

export interface RowActionsMenuProps {
  onDuplicate: () => void;
  /** Opens the edit form straight onto its Notes tab. */
  onAddNote: () => void;
  /** Opens WhatsApp with a pre-written reminder addressed to the guest. */
  onSendReminder: () => void;
  /** Downloads the booking as an .ics file for any calendar app. */
  onExportCalendar: () => void;
  onSharePaymentLink: () => void;
  onCancel: () => void;
  /** Toggles `isHidden` — keeps the record but drops it out of the general list. */
  onToggleHidden: () => void;
  hidden: boolean;
  canShareLink: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ITEM = "flex w-full items-center rounded-[9px] px-2.5 py-1.5 text-start text-[12px] transition-colors";
const ITEM_ENABLED = "text-[var(--octo-text-primary)] hover:bg-[var(--octo-hover)]";
const ITEM_DISABLED = "text-[var(--octo-text-faint)] disabled:cursor-not-allowed";

export function RowActionsMenu({
  onDuplicate,
  onAddNote,
  onSendReminder,
  onExportCalendar,
  onSharePaymentLink,
  onCancel,
  onToggleHidden,
  hidden,
  canShareLink,
  open,
  onOpenChange,
}: RowActionsMenuProps) {
  const { t } = useI18n();
  const ref = useDismiss(open, () => onOpenChange(false));
  // Disabled Share Payment Link means "no deposit on this reservation to
  // share a link for" — a different reason from View Logs, which has no
  // history data behind it at all — so the two titles differ.
  const noDeposit = t("reservations.list.actions.noDepositToShare");

  // Every enabled item runs its action and then closes the menu.
  const run = (action: () => void) => () => {
    action();
    onOpenChange(false);
  };

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
          <button type="button" role="menuitem" onClick={run(onDuplicate)} className={clsx(ITEM, ITEM_ENABLED)}>
            {t("reservations.list.actions.duplicate")}
          </button>
          <button type="button" role="menuitem" onClick={run(onAddNote)} className={clsx(ITEM, ITEM_ENABLED)}>
            {t("reservations.list.actions.addNote")}
          </button>
          <button type="button" role="menuitem" onClick={run(onSendReminder)} className={clsx(ITEM, ITEM_ENABLED)}>
            {t("reservations.list.actions.sendReminder")}
          </button>
          {/* No activity history is recorded anywhere yet, so there is
              nothing honest to show — rendered, disabled, and titled. */}
          <button
            type="button"
            role="menuitem"
            disabled
            title={t("reservations.list.actions.noBackend")}
            className={clsx(ITEM, ITEM_DISABLED)}
          >
            {t("reservations.list.actions.viewLogs")}
          </button>
          <button type="button" role="menuitem" onClick={run(onExportCalendar)} className={clsx(ITEM, ITEM_ENABLED)}>
            {t("reservations.list.actions.exportCalendar")}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!canShareLink}
            title={canShareLink ? undefined : noDeposit}
            onClick={canShareLink ? run(onSharePaymentLink) : undefined}
            className={clsx(ITEM, canShareLink ? ITEM_ENABLED : ITEM_DISABLED)}
          >
            {t("reservations.list.actions.sharePaymentLink")}
          </button>
          <button type="button" role="menuitem" onClick={run(onToggleHidden)} className={clsx(ITEM, ITEM_ENABLED)}>
            {t(hidden ? "reservations.list.actions.unhide" : "reservations.list.actions.hide")}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={run(onCancel)}
            className="mt-1 flex w-full items-center rounded-[9px] border-t border-[var(--octo-divider)] px-2.5 pb-1.5 pt-2 text-start text-[12px] text-[#EF4444] transition-colors hover:bg-[var(--octo-hover)]"
          >
            {t("reservations.list.actions.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}
