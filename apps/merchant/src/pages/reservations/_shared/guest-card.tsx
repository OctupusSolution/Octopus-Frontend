// Task 11: the guest card — avatar, name and WhatsApp-flagged phone number —
// shared by the reservation detail dialog and the cancel dialog. Lifted
// out of reservation-detail-modal.tsx (Task 10 built it inline on purpose so
// this extraction would have something clean to lift from). Sizes, colours
// and the WhatsApp badge are the dialog frames' own; both callers depend on
// it looking the same.
import type { Reservation } from "@/shared/api/mock-reservations";
import { GuestAvatar } from "./guest-avatar";
import { SURFACE_100, TEXT_PRIMARY, TEXT_SECONDARY } from "./theme";

// Multi-colour (green badge, white glyph), so it's an <img> rather than a
// ShellIcon mask — a mask would flatten it to one colour.
const WHATSAPP_BADGE = new URL("../../../../../assets/Dashboard/icons/rsv-modal-whatsapp.svg", import.meta.url).href;

export interface GuestCardProps {
  reservation: Reservation;
}

export function GuestCard({ reservation }: GuestCardProps) {
  return (
    <div className={`flex items-center gap-1 rounded-[12px] px-3 py-2 ${SURFACE_100}`}>
      <GuestAvatar name={reservation.guest} size={32} />
      <div className="flex min-w-0 flex-col items-start gap-1">
        <p className={`max-w-full truncate text-[16px] font-semibold leading-4 ${TEXT_PRIMARY}`}>{reservation.guest}</p>
        <p className={`inline-flex items-center gap-[2px] text-[12px] font-normal leading-3 ${TEXT_SECONDARY}`}>
          <img src={WHATSAPP_BADGE} alt="" width={16} height={16} className="block size-4 shrink-0" />
          {/* dir="ltr" (fix round 4, finding 18) — same bidi reversal the
              row and meta row have for a phone number in an RTL container. */}
          <span dir="ltr">{reservation.phone}</span>
        </p>
      </div>
    </div>
  );
}
