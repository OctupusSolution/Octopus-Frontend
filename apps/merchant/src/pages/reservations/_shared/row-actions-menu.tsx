import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { SURFACE_BRAND_LIGHT, SURFACE_RED_LIGHT, SURFACE_WHITE, TEXT_ERROR, TEXT_PRIMARY } from "./theme";
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

const ITEM = "flex w-full items-center whitespace-nowrap rounded-[4px] px-1 py-2 text-start text-[12px] font-semibold leading-[12px] transition-opacity";
const ITEM_ENABLED = clsx(SURFACE_BRAND_LIGHT, TEXT_PRIMARY, "hover:opacity-80");
const ITEM_DISABLED = clsx(SURFACE_BRAND_LIGHT, TEXT_PRIMARY, "opacity-50 disabled:cursor-not-allowed");

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
    <div ref={ref} className="relative flex">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("reservations.list.row.more")}
        onClick={() => onOpenChange(!open)}
        className={clsx("grid h-6 w-6 place-items-center rounded-[8px] transition-colors hover:bg-[var(--octo-hover)]", TEXT_PRIMARY)}
      >
        <ShellIcon name="rsv-row-more.svg" size={24} />
      </button>

      {open && (
        <div
          role="menu"
          className={clsx(
            "absolute end-0 top-full z-20 mt-[13px] flex min-w-[146px] flex-col gap-3 rounded-[16px] p-3 shadow-[0_0_12px_0_rgba(0,0,0,0.12)]",
            SURFACE_WHITE
          )}
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
            className={clsx(ITEM, SURFACE_RED_LIGHT, TEXT_ERROR, "hover:opacity-80")}
          >
            {t("reservations.list.actions.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}
