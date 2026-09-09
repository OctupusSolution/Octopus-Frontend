// Shared "click outside or press Escape to close" behaviour for the Status
// and row-actions menus. The menus are controlled by the page (Task 7/8),
// so this hook closes by calling the caller's `close` rather than owning
// any open/closed state itself — that's what keeps "one menu open at a
// time" free: opening either menu sets page state that closes the other.
import { useEffect, useRef, type RefObject } from "react";

export function useDismiss(open: boolean, close: () => void): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        close();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Stop this Escape here (fix round 4, finding 22) — Modal (see
        // packages/ui/src/primitives/modal.tsx, not ours to edit) listens
        // on `window`, this hook listens on `document`; a bubbling keydown
        // reaches `document` before it reaches `window`, so without this
        // one Escape press would close the popover *and* the dialog behind
        // it in the same keystroke.
        event.stopPropagation();
        close();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, close]);

  return ref;
}
