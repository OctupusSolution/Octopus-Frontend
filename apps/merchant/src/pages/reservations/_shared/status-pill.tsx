import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import type { Reservation } from "@/shared/api/mock-reservations";
import { displayState, type DisplayState } from "./model";

// Named export: Task 6's Status dropdown reuses this instead of restating
// an eleven-entry colour map.
export const TONE: Record<DisplayState, { dot: string; text: string; bg: string }> = {
  Pending: { dot: "#F59E0B", text: "text-[#B45309]", bg: "bg-[#F59E0B]/10" },
  Confirmed: { dot: "#16A34A", text: "text-[#15803D]", bg: "bg-[#16A34A]/10" },
  Arrived: { dot: "#0D6EFD", text: "text-[#0D6EFD]", bg: "bg-[#0D6EFD]/10" },
  Seated: { dot: "#7C3AED", text: "text-[#6D28D9]", bg: "bg-[#7C3AED]/10" },
  Completed: { dot: "#16A34A", text: "text-[#15803D]", bg: "bg-[#16A34A]/10" },
  "No-show": { dot: "#8B5CF6", text: "text-[#7C3AED]", bg: "bg-[#8B5CF6]/10" },
  Cancelled: { dot: "#EF4444", text: "text-[#DC2626]", bg: "bg-[#EF4444]/10" },
  "Link Sent": { dot: "#0D6EFD", text: "text-[#0D6EFD]", bg: "bg-[#0D6EFD]/10" },
  Expired: { dot: "#9CA3AF", text: "text-[var(--octo-text-muted)]", bg: "bg-[var(--octo-track)]" },
  Failed: { dot: "#F59E0B", text: "text-[#B45309]", bg: "bg-[#F59E0B]/10" },
  Refunded: { dot: "#EF4444", text: "text-[#DC2626]", bg: "bg-[#EF4444]/10" },
};

const LABEL_KEY: Record<DisplayState, string> = {
  Pending: "reservations.state.pending",
  Confirmed: "reservations.state.confirmed",
  Arrived: "reservations.state.arrived",
  Seated: "reservations.state.seated",
  Completed: "reservations.state.completed",
  "No-show": "reservations.state.noShow",
  Cancelled: "reservations.state.cancelled",
  "Link Sent": "reservations.state.linkSent",
  Expired: "reservations.state.expired",
  Failed: "reservations.state.failed",
  Refunded: "reservations.state.refunded",
};

export interface StatusPillProps {
  reservation: Reservation;
}

export function StatusPill({ reservation }: StatusPillProps) {
  const { t } = useI18n();
  const state = displayState(reservation);
  const tone = TONE[state];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        tone.bg,
        tone.text
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tone.dot }} />
      {t(LABEL_KEY[state])}
    </span>
  );
}
