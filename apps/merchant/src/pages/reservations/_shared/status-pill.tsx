import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import type { Reservation } from "@/shared/api/mock-reservations";
import { displayState, STATE_LABEL_KEY, type DisplayState } from "./model";

// Named export: Task 6's Status dropdown, the list's status filter and the
// calendar all reuse this instead of restating a twelve-entry colour map
// (fix round 4, finding 13). Every tone reads off the `--octo-tone-*`
// tokens in index.css rather than a literal hex, so dark mode's contrast
// fix (fix round 4, finding 27) lives in exactly one place — light stays
// byte-identical to what was sampled from the frames, dark swaps to a
// lighter text shade automatically via the token.
// The dot uses each tone's own `-dot` var where the frame sampled it as a
// distinct (brighter) shade from `-text` (re-review fix: collapsing them
// onto one value lost e.g. Pending's #F59E0B dot vs its #B45309 text) —
// falls back to `-text` only for the tones where the frame really did use
// the same hex for both (info, slate).
export const TONE: Record<DisplayState, { dot: string; text: string; bg: string }> = {
  Pending: { dot: "var(--octo-tone-warning-dot)", text: "text-[var(--octo-tone-warning-text)]", bg: "bg-[var(--octo-tone-warning-bg)]" },
  // Sampled from the frame: this state is gold/olive, not green (fix round 1).
  Confirmed: { dot: "var(--octo-tone-gold-dot)", text: "text-[var(--octo-tone-gold-text)]", bg: "bg-[var(--octo-tone-gold-bg)]" },
  Arrived: { dot: "var(--octo-tone-info-text)", text: "text-[var(--octo-tone-info-text)]", bg: "bg-[var(--octo-tone-info-bg)]" },
  Seated: { dot: "var(--octo-tone-violet-dot)", text: "text-[var(--octo-tone-violet-text)]", bg: "bg-[var(--octo-tone-violet-bg)]" },
  // Sampled from the frame: green belongs here, not to Confirmed (fix round 1).
  // Its own "completed" tone, not "success" (re-review fix) — the frame's
  // Completed green (#009A39 dot / #00832F text) is a different shade from
  // the "success" tone used elsewhere for Paid/Confirmed/Full-refund
  // (#16A34A / #15803D), which was already correct and stays untouched.
  Completed: { dot: "var(--octo-tone-completed-dot)", text: "text-[var(--octo-tone-completed-text)]", bg: "bg-[var(--octo-tone-completed-bg)]" },
  // Sampled from the frame: this state is slate-grey, not violet (fix round 1).
  "No-show": { dot: "var(--octo-tone-slate-text)", text: "text-[var(--octo-tone-slate-text)]", bg: "bg-[var(--octo-tone-slate-bg)]" },
  Cancelled: { dot: "var(--octo-tone-danger-dot)", text: "text-[var(--octo-tone-danger-text)]", bg: "bg-[var(--octo-tone-danger-bg)]" },
  "Link Sent": { dot: "var(--octo-tone-info-text)", text: "text-[var(--octo-tone-info-text)]", bg: "bg-[var(--octo-tone-info-bg)]" },
  // Frame-exact literal, unconditional across themes — this is exactly
  // what commit c2f45e1 already had; re-review fix restores it (it had
  // drifted to var(--octo-text-muted), a subtly different grey).
  Expired: { dot: "#9CA3AF", text: "text-[var(--octo-text-muted)]", bg: "bg-[var(--octo-track)]" },
  Failed: { dot: "var(--octo-tone-warning-dot)", text: "text-[var(--octo-tone-warning-text)]", bg: "bg-[var(--octo-tone-warning-bg)]" },
  Refunded: { dot: "var(--octo-tone-danger-dot)", text: "text-[var(--octo-tone-danger-text)]", bg: "bg-[var(--octo-tone-danger-bg)]" },
  // Fix round 4, finding 26 — the guest backed out of paying a deposit
  // link; the reservation itself is still live. Neutral grey, same shape
  // as Expired, since there's no frame for this either.
  "Payment Cancelled": { dot: "var(--octo-text-secondary)", text: "text-[var(--octo-text-secondary)]", bg: "bg-[var(--octo-track)]" },
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
      {t(STATE_LABEL_KEY[state])}
    </span>
  );
}
