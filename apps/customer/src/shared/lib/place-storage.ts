// Per-code browser storage for the place-code flow: the cart (sessionStorage, through
// OrderingSessionProvider) and the confirmations sent from this phone (localStorage).
// A storage that is missing, full or blocked never breaks the flow.
import type { PlaceOrdering, ScanOrderConfirmation } from "./place-order";

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

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function readJson<T>(storage: Pick<Storage, "getItem"> | null, key: string, ok: (v: unknown) => boolean): T | null {
  if (!storage) return null;
  try {
    const v: unknown = JSON.parse(storage.getItem(key) ?? "null");
    return v !== null && ok(v) ? (v as T) : null;
  } catch {
    return null;
  }
}

function writeJson(storage: Store | null, key: string, value: unknown) {
  try {
    storage?.setItem(key, JSON.stringify(value));
  } catch {
    // Full or blocked: nothing to remember, the flow still works.
  }
}

const isObject = (v: unknown) => typeof v === "object" && !Array.isArray(v);

/** The scan's ordering the cart was filled from: menu refs are renumbered on every republish,
 *  so a stored cart is only readable against the ordering that named its lines. */
export const cartOrderingKey = (key: string) => `octo.placeCartBasis.${key}`;
export const readCartOrdering = (storage: Pick<Storage, "getItem"> | null, key: string) =>
  readJson<PlaceOrdering>(storage, cartOrderingKey(key), (v) => isObject(v) && typeof (v as PlaceOrdering).basis === "string");
export const writeCartOrdering = (storage: Store | null, key: string, ordering: PlaceOrdering) =>
  writeJson(storage, cartOrderingKey(key), ordering);

/** The Idempotency-Key of a send not yet confirmed: a retry after a dropped connection — even
 *  from a reloaded page — replays the same order instead of placing a second one. */
export const pendingSendKey = (key: string) => `octo.placeIdem.${key}`;
export const readPendingSend = (storage: Pick<Storage, "getItem"> | null, key: string) =>
  readJson<{ signature: string; key: string }>(storage, pendingSendKey(key), (v) => isObject(v) && typeof (v as { key: unknown }).key === "string");
export const writePendingSend = (storage: Store | null, key: string, value: { signature: string; key: string }) =>
  writeJson(storage, pendingSendKey(key), value);
export function clearPendingSend(storage: Store | null, key: string) {
  try {
    storage?.removeItem(pendingSendKey(key));
  } catch {
    // Blocked storage: nothing was kept either.
  }
}

/** `window.sessionStorage`, or null where it is unavailable. */
export function safeSessionStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
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
