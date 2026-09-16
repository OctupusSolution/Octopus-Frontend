// The reservations list, held above any one page. Adding a reservation is its
// own route now (/reservations/new), so the rows can't live in the list page's
// component state: they'd reset to the fixture the moment the new page
// navigated back. Kept in memory — like the rest of this mock module nothing
// is persisted, but the rows now survive moving between the module's pages.
import { useSyncExternalStore } from "react";
import { reservations as fixture, type Reservation } from "@/shared/api/mock-reservations";

type Updater = Reservation[] | ((prev: Reservation[]) => Reservation[]);

let rows: Reservation[] = fixture;
const listeners = new Set<() => void>();

export function getReservations(): Reservation[] {
  return rows;
}

export function setReservations(next: Updater): void {
  rows = typeof next === "function" ? next(rows) : next;
  listeners.forEach((listener) => listener());
}

export function subscribeReservations(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Same shape as `useState`, so the list page swapped over without changes
 *  to any of its handlers. */
export function useReservations(): [Reservation[], typeof setReservations] {
  const current = useSyncExternalStore(subscribeReservations, getReservations, getReservations);
  return [current, setReservations];
}
