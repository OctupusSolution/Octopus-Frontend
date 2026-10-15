import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import type { Reservation, ReservationStatus } from "@/shared/api/mock-reservations";
import { displayState, STATE_LABEL_KEY, type DisplayState } from "./model";

export interface Tone {
  dot: string;
  text: string;
  bg: string;
}

// One colour per pill in the frame: the text and the dot share it, so the dot
// simply follows the text colour. Light is the frame's exact hex pair; dark
// keeps the hue but swaps to a translucent tint and a lighter text shade so
// the pill still reads on a dark card.
function tone(lightText: string, lightBg: string, darkText: string, darkBg: string): Tone {
  return { dot: "currentColor", text: clsx(lightText, darkText), bg: clsx(lightBg, darkBg) };
}

// The row's pill, as the list frame draws each state.
export const TONE: Record<DisplayState, Tone> = {
  Pending: tone("text-[#d97706]", "bg-[#fcf4eb]", "[[data-theme=dark]_&]:text-[#fbbf24]", "[[data-theme=dark]_&]:bg-[rgb(217_119_6_/_0.16)]"),
  Confirmed: tone("text-[#009a39]", "bg-[#dcffef]", "[[data-theme=dark]_&]:text-[#4ade80]", "[[data-theme=dark]_&]:bg-[rgb(0_154_57_/_0.16)]"),
  Arrived: tone("text-[#0d6efd]", "bg-[#f5f9ff]", "[[data-theme=dark]_&]:text-[#6ea8fe]", "[[data-theme=dark]_&]:bg-[rgb(13_110_253_/_0.18)]"),
  Seated: tone("text-[#6c4dff]", "bg-[#f7f4ff]", "[[data-theme=dark]_&]:text-[#a78bfa]", "[[data-theme=dark]_&]:bg-[rgb(108_77_255_/_0.18)]"),
  Completed: tone("text-[#009a39]", "bg-[#dcffef]", "[[data-theme=dark]_&]:text-[#4ade80]", "[[data-theme=dark]_&]:bg-[rgb(0_154_57_/_0.16)]"),
  "No-show": tone("text-[#9d00d7]", "bg-[#fcf4ff]", "[[data-theme=dark]_&]:text-[#d68bf5]", "[[data-theme=dark]_&]:bg-[rgb(157_0_215_/_0.18)]"),
  Cancelled: tone("text-[#d30202]", "bg-[#fef0f0]", "[[data-theme=dark]_&]:text-[#f87171]", "[[data-theme=dark]_&]:bg-[rgb(239_68_68_/_0.16)]"),
  "Link Sent": tone("text-[#4f46e5]", "bg-[#f0f0fc]", "[[data-theme=dark]_&]:text-[#a5b4fc]", "[[data-theme=dark]_&]:bg-[rgb(79_70_229_/_0.2)]"),
  Expired: tone("text-[#687280]", "bg-[#e2e8f0]", "[[data-theme=dark]_&]:text-[var(--octo-text-secondary)]", "[[data-theme=dark]_&]:bg-[var(--octo-track)]"),
  Failed: tone("text-[#ceca00]", "bg-[#fffee2]", "[[data-theme=dark]_&]:text-[#eab308]", "[[data-theme=dark]_&]:bg-[rgb(206_202_0_/_0.14)]"),
  Refunded: tone("text-[#ea580c]", "bg-[#fbf1ec]", "[[data-theme=dark]_&]:text-[#fb923c]", "[[data-theme=dark]_&]:bg-[rgb(234_88_12_/_0.16)]"),
  // Fix round 4, finding 26 — the guest backed out of paying a deposit
  // link; the reservation itself is still live. Neutral grey, same shape
  // as Expired, since there's no frame for this either.
  "Payment Cancelled": tone("text-[#687280]", "bg-[#e2e8f0]", "[[data-theme=dark]_&]:text-[var(--octo-text-secondary)]", "[[data-theme=dark]_&]:bg-[var(--octo-track)]"),
};

// The Status dropdown draws three of its entries in a different pair from
// the row's pill (Pending amber, Confirmed gold, No Show slate) — kept as
// the frame has them rather than unified with TONE.
export const MENU_TONE: Record<ReservationStatus, Tone> = {
  Pending: tone("text-[#ffb020]", "bg-[#fff5e4]", "[[data-theme=dark]_&]:text-[#fbbf24]", "[[data-theme=dark]_&]:bg-[rgb(255_176_32_/_0.16)]"),
  Confirmed: tone("text-[#af9303]", "bg-[#fef8d9]", "[[data-theme=dark]_&]:text-[#eab308]", "[[data-theme=dark]_&]:bg-[rgb(175_147_3_/_0.16)]"),
  Arrived: TONE.Arrived,
  Seated: TONE.Seated,
  Completed: TONE.Completed,
  "No-show": tone("text-[#58606c]", "bg-[#f1f5f9]", "[[data-theme=dark]_&]:text-[#9ca3af]", "[[data-theme=dark]_&]:bg-[rgb(88_96_108_/_0.2)]"),
  Cancelled: TONE.Cancelled,
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
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[12px] font-medium leading-[12px]",
        tone.bg,
        tone.text
      )}
    >
      <span className="h-[5px] w-[5px] shrink-0 rounded-full" style={{ backgroundColor: tone.dot }} />
      {t(STATE_LABEL_KEY[state])}
    </span>
  );
}
