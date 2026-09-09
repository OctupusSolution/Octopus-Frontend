// Task 11: the guest card — avatar, name and WhatsApp-flagged phone number —
// shared by the reservation detail dialog and the cancel dialog. Lifted
// verbatim out of reservation-detail-modal.tsx (Task 10 built it inline on
// purpose so this extraction would have something clean to lift from); do
// not change how it renders here, both callers depend on it looking exactly
// as before.
import { MessageCircle } from "lucide-react";
import type { Reservation } from "@/shared/api/mock-reservations";
import { GuestAvatar } from "./guest-avatar";

export interface GuestCardProps {
  reservation: Reservation;
}

export function GuestCard({ reservation }: GuestCardProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-[9px] bg-[var(--octo-track)] px-3 py-2.5">
      <GuestAvatar name={reservation.guest} size={36} />
      <div>
        <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{reservation.guest}</p>
        <p className="inline-flex items-center gap-1.5 text-[12px] text-[var(--octo-text-secondary)]">
          <MessageCircle size={12} className="text-[#25D366]" />
          {/* dir="ltr" (fix round 4, finding 18) — same bidi reversal the
              row and meta row have for a phone number in an RTL container. */}
          <span dir="ltr">{reservation.phone}</span>
        </p>
      </div>
    </div>
  );
}
