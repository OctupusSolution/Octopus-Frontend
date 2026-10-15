// The "that time is taken — here are the nearest free ones" strip, shown by
// the create page and the edit dialog when the server refuses a slot
// (GET /availability/alternatives). Picking a chip only moves the draft's
// time; the host still saves explicitly.
import { ShellIcon } from "@/shared/ui/shell-icon";
import type { AlternativeSlot } from "./reservations-api";
import { clock12 } from "./model";
import { useReservationsExtraText } from "./extra-text";
import { BORDER_300, SURFACE_BRAND_LIGHT, SURFACE_WHITE, TEXT_BRAND, TEXT_ERROR, TEXT_PRIMARY, TEXT_SECONDARY } from "./theme";

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
    <div className={`flex flex-col gap-3 rounded-[12px] border ${BORDER_300} ${SURFACE_WHITE} px-3 py-3`}>
      <p className={`text-[14px] font-semibold leading-[14px] ${TEXT_PRIMARY}`}>{text.slotTaken}</p>
      <p className={`text-[12px] font-medium leading-3 ${TEXT_SECONDARY}`}>{text.alternativesTitle}</p>
      {state.kind === "loading" && <p className={`text-[14px] leading-[14px] ${TEXT_SECONDARY}`}>{text.alternativesLoading}</p>}
      {state.kind === "error" && <p className={`text-[14px] leading-[14px] ${TEXT_ERROR}`}>{text.alternativesFailed}</p>}
      {state.kind === "ready" &&
        (state.slots.length === 0 ? (
          <p className={`text-[14px] leading-[14px] ${TEXT_SECONDARY}`}>{text.alternativesNone}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {state.slots.map((slot) => (
              <button
                key={`${slot.date}-${slot.minutes}`}
                type="button"
                onClick={() => onPick(slot)}
                className={`inline-flex h-10 items-center gap-1 rounded-[12px] border border-[#0d6efd] ${SURFACE_BRAND_LIGHT} px-3 py-2 text-[14px] font-semibold leading-[14px] ${TEXT_BRAND} transition-opacity hover:opacity-85`}
              >
                <ShellIcon name="rsv-add-time-16.svg" size={16} />
                {clock12(slot.minutes)}
              </button>
            ))}
          </div>
        ))}
    </div>
  );
}
