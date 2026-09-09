// Task 11: the guests / date / time / table meta row shared by the
// reservation detail dialog and the cancel dialog. Lifted verbatim out of
// reservation-detail-modal.tsx along with its local date formatter (Task 10
// built it inline on purpose so this extraction would have something clean
// to lift from); do not change how it renders here, both callers depend on
// it looking exactly as before.
import { Calendar, Clock, Users, Utensils } from "lucide-react";
import { useI18n } from "@/app/providers/i18n-provider";
import type { Reservation } from "@/shared/api/mock-reservations";
import { clock12, guestsText, tableLabel } from "./model";

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

export function MetaRow({ reservation }: MetaRowProps) {
  const { t, locale } = useI18n();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-[var(--octo-text-secondary)]">
      <span className="inline-flex items-center gap-1.5">
        <Users size={13} className="shrink-0" />
        {guestsText(t, reservation.partySize)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Calendar size={13} className="shrink-0" />
        {formatDate(reservation.date, locale)}
      </span>
      {/* dir="ltr" (fix round 4, finding 18) — same bidi reversal as the
          row's time cell in an RTL container. */}
      <span className="inline-flex items-center gap-1.5">
        <Clock size={13} className="shrink-0" />
        <span dir="ltr">{clock12(reservation.startMinutes)}</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Utensils size={13} className="shrink-0" />
        {reservation.area} - {reservation.table ? tableLabel(reservation.table) : t("reservations.form.tableAny")}
      </span>
    </div>
  );
}
