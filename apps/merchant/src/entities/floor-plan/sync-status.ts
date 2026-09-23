// The last floor-plan sync failure, shared so any screen can show it. Local
// edits still hold when a sync fails; this is how the merchant finds out the
// server did not get them.
import { useSyncExternalStore } from "react";

let message: string | null = null;
const listeners = new Set<() => void>();

export function setSyncError(next: string | null) {
  message = next;
  for (const l of listeners) l();
}

export function useSyncError(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => message,
    () => null
  );
}
