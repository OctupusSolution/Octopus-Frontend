// Per-code browser storage for the place-code flow: the cart (sessionStorage, through
// OrderingSessionProvider) and the confirmations sent from this phone (localStorage).
// A storage that is missing, full or blocked never breaks the flow.
import type { ScanOrderConfirmation } from "./place-order";

const MAX_SENT = 20;

export const cartStorageKey = (key: string) => `octo.placeCart.${key}`;
export const sentOrdersKey = (key: string) => `octo.placeOrders.${key}`;

export function readSentOrders(storage: Pick<Storage, "getItem"> | null, key: string): ScanOrderConfirmation[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(sentOrdersKey(key)) ?? "[]");
    return Array.isArray(parsed) ? (parsed as ScanOrderConfirmation[]) : [];
  } catch {
    return [];
  }
}

export function appendSentOrder(
  storage: Pick<Storage, "getItem" | "setItem"> | null,
  key: string,
  confirmation: ScanOrderConfirmation
): void {
  if (!storage) return;
  try {
    const next = [confirmation, ...readSentOrders(storage, key)].slice(0, MAX_SENT);
    storage.setItem(sentOrdersKey(key), JSON.stringify(next));
  } catch {
    // Full or blocked: the confirmation screen still shows this order from memory.
  }
}

/** `window.localStorage`, or null where it is unavailable (server, private mode, blocked). */
export function safeLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}
