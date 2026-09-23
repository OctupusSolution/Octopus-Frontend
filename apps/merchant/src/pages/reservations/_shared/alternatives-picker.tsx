// The "that time is taken — here are the nearest free ones" strip, shown by
// the create page and the edit dialog when the server refuses a slot
// (GET /availability/alternatives). Picking a chip only moves the draft's
// time; the host still saves explicitly.
import { Clock } from "lucide-react";
import type { AlternativeSlot } from "./reservations-api";
import { clock12 } from "./model";
import { useReservationsExtraText } from "./extra-text";

export type AlternativesState =
  | { kind: "loading" }
  | { kind: "ready"; slots: AlternativeSlot[] }
  | { kind: "error" };

export function AlternativesPicker({
  state,
  onPick,
}: {
  state: AlternativesState;
  onPick: (slot: AlternativeSlot) => void;
}) {
  const text = useReservationsExtraText();
  return (
    <div className="rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-4 py-3">
      <p className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{text.slotTaken}</p>
      <p className="mt-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[var(--octo-text-faint)]">
        {text.alternativesTitle}
      </p>
      {state.kind === "loading" && (
        <p className="mt-1.5 text-[12px] text-[var(--octo-text-muted)]">{text.alternativesLoading}</p>
      )}
      {state.kind === "error" && <p className="mt-1.5 text-[12px] text-error">{text.alternativesFailed}</p>}
      {state.kind === "ready" &&
        (state.slots.length === 0 ? (
          <p className="mt-1.5 text-[12px] text-[var(--octo-text-muted)]">{text.alternativesNone}</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {state.slots.map((slot) => (
              <button
                key={`${slot.date}-${slot.minutes}`}
                type="button"
                onClick={() => onPick(slot)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#0D6EFD]/40 bg-[#0D6EFD]/[0.07] px-3 py-1.5 text-[12.5px] font-medium text-[#0D6EFD] transition-colors hover:bg-[#0D6EFD]/[0.12] [[data-theme=dark]_&]:text-[var(--octo-tone-info-text)]"
              >
                <Clock size={13} />
                {clock12(slot.minutes)}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}
