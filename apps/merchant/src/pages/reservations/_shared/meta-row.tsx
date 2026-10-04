// Task 11: the guests / date / time / table meta row shared by the
// reservation detail dialog and the cancel dialog. Lifted out of
// reservation-detail-modal.tsx along with its local date formatter (Task 10
// built it inline on purpose so this extraction would have something clean
// to lift from). Sizes, colours and icons are the dialog frames' own; both
// callers depend on it looking the same.
import { useI18n } from "@/app/providers/i18n-provider";
import type { Reservation } from "@/shared/api/mock-reservations";
import { ShellIcon } from "@/shared/ui/shell-icon";
import { clock12, guestsText, tableLabel } from "./model";
import { TEXT_SECONDARY } from "./theme";

// Same "ISO date -> Aug 8, 2026" formatting reservation-row.tsx uses for a
// date outside today/tomorrow.
function formatDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    numberingSystem: "latn",
  }).format(new Date(`${date}T00:00:00`));
}

export interface MetaRowProps {
  reservation: Reservation;
}

const ITEM_CLASS = "inline-flex items-center gap-1";

export function MetaRow({ reservation }: MetaRowProps) {
  const { t, locale } = useI18n();

  return (
    <div className={`flex flex-wrap items-start gap-x-4 gap-y-2 px-1 text-[12px] font-medium leading-3 ${TEXT_SECONDARY}`}>
      <span className={ITEM_CLASS}>
        <ShellIcon name="rsv-modal-people.svg" size={16} />
        {guestsText(t, reservation.partySize)}
      </span>
      <span className={ITEM_CLASS}>
        <ShellIcon name="rsv-modal-calendar.svg" size={16} />
        {formatDate(reservation.date, locale)}
      </span>
      {/* dir="ltr" (fix round 4, finding 18) — same bidi reversal as the
          row's time cell in an RTL container. */}
      <span className={ITEM_CLASS}>
        <ShellIcon name="rsv-modal-time.svg" size={16} />
        <span dir="ltr">{clock12(reservation.startMinutes)}</span>
      </span>
      <span className={ITEM_CLASS}>
        {/* The frame's table glyph is 14.33 x 12.33 inside a 16px slot. */}
        <span className="grid size-4 shrink-0 place-items-center">
          <ShellIcon name="rsv-modal-table.svg" size={14.33} />
        </span>
        {reservation.area} - {reservation.table ? tableLabel(reservation.table) : t("reservations.form.tableAny")}
      </span>
    </div>
  );
}
