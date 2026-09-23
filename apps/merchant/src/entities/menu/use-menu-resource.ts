// Business-level Menu reads that several screens share — labels, fact types,
// platform presets — cached per business so the item editor, the settings
// modal and the theme step do not each refetch the same list. `refresh` drops
// the cache for that key and every mounted reader re-renders with the new rows.
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import {
  describeApiError,
  listAllLabels,
  listBranchTimeZones,
  listFacts,
  listScheduleCodes,
  listThemeChoices,
  menuCurrency,
} from "./catalog-api";

export interface ResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

interface Entry {
  state: ResourceState<unknown>;
  fetcher: () => Promise<unknown>;
}

const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
const IDLE: ResourceState<unknown> = { data: null, error: null, loading: false };

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => void listeners.delete(l);
}

function load(cacheKey: string, fetcher: () => Promise<unknown>) {
  const prev = cache.get(cacheKey);
  const entry: Entry = { state: { data: prev?.state.data ?? null, error: null, loading: true }, fetcher };
  cache.set(cacheKey, entry);
  fetcher().then(
    (data) => {
      if (cache.get(cacheKey) === entry) cache.set(cacheKey, { state: { data, error: null, loading: false }, fetcher });
      emit();
    },
    (err) => {
      if (cache.get(cacheKey) === entry)
        cache.set(cacheKey, { state: { data: entry.state.data, error: describeApiError(err), loading: false }, fetcher });
      emit();
    }
  );
  emit();
}

/** Reads `fetcher(businessId)` once per business and key. `enabled: false`
 *  (e.g. a closed modal) holds the request back without dropping the cache. */
export function useMenuResource<T>(
  key: string,
  fetcher: (businessId: string) => Promise<T>,
  enabled = true
): ResourceState<T> & { refresh: () => void; businessId: string | null } {
  const { activeBusinessId } = useAuth();
  const cacheKey = activeBusinessId ? `${activeBusinessId}:${key}` : null;
  const state = useSyncExternalStore(
    subscribe,
    () => (cacheKey ? cache.get(cacheKey)?.state ?? IDLE : IDLE),
    () => IDLE
  ) as ResourceState<T>;

  useEffect(() => {
    if (!enabled || !cacheKey || !activeBusinessId || cache.has(cacheKey)) return;
    load(cacheKey, () => fetcher(activeBusinessId));
    // `fetcher` is expected to be a module-level function; re-running on a new
    // closure every render would refetch in a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, cacheKey, activeBusinessId]);

  const refresh = useCallback(() => {
    if (cacheKey && activeBusinessId) load(cacheKey, () => fetcher(activeBusinessId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, activeBusinessId]);

  return { ...state, loading: state.loading || (enabled && Boolean(cacheKey) && !cache.has(cacheKey!)), refresh, businessId: activeBusinessId };
}

/** Refetches a key for every business already holding it, so every mounted
 *  reader (not only the one that changed something) sees the new rows. */
export function invalidateMenuResource(key: string) {
  for (const [k, entry] of [...cache.entries()]) if (k.endsWith(`:${key}`)) load(k, entry.fetcher);
}

// ---- the shared reads ------------------------------------------------------------
// Module-level fetchers (see useMenuResource) — one cache key each.

export const useMenuLabels = (enabled = true) => useMenuResource("labels", listAllLabels, enabled);
export const useFactTypes = (enabled = true) => useMenuResource("facts", listFacts, enabled);
export const useSchedulePresets = (enabled = true) => useMenuResource("schedule-presets", listScheduleCodes, enabled);
export const useThemeChoices = (enabled = true) => useMenuResource("theme-presets", listThemeChoices, enabled);
export const useBranchTimeZones = (enabled = true) => useMenuResource("branches", listBranchTimeZones, enabled);
export const useMenuCurrency = (enabled = true) => useMenuResource("currency", menuCurrency, enabled);
