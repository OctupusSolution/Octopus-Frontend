// State of the business-setup wizard. The wizard's draft lives ON THE SERVER as
// a BusinessSetup resource (POST /v1/business-setups), so this hook is a thin,
// serialised client for it rather than a local reducer:
//
//   - Entry first asks GET /v1/business-setups?status=open for an unfinished
//     setup and, if there is one, loads it and flags it as `resumed` so the
//     wizard can say "welcome back" (and offer to start over). With none, it
//     POSTs start-or-resume (201 new / 200 existing open one) — so closing the
//     tab and coming back continues where they were, with no local persistence.
//   - Every write carries `expectedVersion` (optimistic concurrency), and each
//     response is the new truth: the next write must use ITS version. Writes are
//     therefore run strictly one after another (`run` below) — two in flight
//     would send the same version and the second would 409.
//   - Catalog reads (types, variants, offerings) are static per session, so
//     they are cached per key.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  cancelBusinessSetup,
  cancelCheckout,
  checkout,
  confirmCheckout,
  getBusinessSetup,
  getBusinessTypes,
  getBusinessVariants,
  getVariantOfferings,
  listBusinessSetups,
  quotePreview,
  readSetupProblem,
  setBusinessName,
  setBusinessType,
  setBusinessVariant,
  setIntegrationAddOns,
  setModules,
  startBusinessSetup,
  type AddOnSelection,
  type BusinessSetupResponse,
  type BusinessSetupSummaryResponse,
  type BusinessTypeResponse,
  type BusinessVariantResponse,
  type QuoteResponse,
  type SetupIssueResponse,
  type VariantOfferingsResponse,
} from "@octopus/api-client";

export function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.problem?.errorCode ?? err.message;
  return fallback;
}

// ---- Catalog (read-only, cached) -------------------------------------------

const catalogCache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let hit = catalogCache.get(key) as Promise<T> | undefined;
  if (!hit) {
    hit = load().catch((err) => {
      // A failed load must not be cached, or Retry would replay the failure.
      catalogCache.delete(key);
      throw err;
    });
    catalogCache.set(key, hit);
  }
  return hit;
}

export interface Loadable<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

function useCatalog<T>(key: string | null, load: () => Promise<T>): Loadable<T> {
  const [state, setState] = useState<{ data: T | null; error: string | null; forKey: string | null }>({
    data: null,
    error: null,
    forKey: null,
  });
  const [attempt, setAttempt] = useState(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    cached(key, () => loadRef.current())
      .then((data) => !cancelled && setState({ data, error: null, forKey: key }))
      .catch((err) => !cancelled && setState({ data: null, error: describeError(err, "catalog.load-failed"), forKey: key }));
    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  // `forKey` guards against showing the previous key's data for one render
  // after the key changes (e.g. variants of the previously chosen type).
  const current = state.forKey === key;
  return {
    data: current ? state.data : null,
    loading: key !== null && !(current && (state.data !== null || state.error !== null)),
    error: current ? state.error : null,
    reload: () => setAttempt((n) => n + 1),
  };
}

export function useBusinessTypes(): Loadable<BusinessTypeResponse[]> {
  return useCatalog("types", () => getBusinessTypes().then((r) => [...r.items].sort((a, b) => a.sortOrder - b.sortOrder)));
}

export function useBusinessVariants(typeCode: string | null): Loadable<BusinessVariantResponse[]> {
  return useCatalog(typeCode ? `variants:${typeCode}` : null, () =>
    getBusinessVariants(typeCode as string).then((r) => [...r.items].sort((a, b) => a.sortOrder - b.sortOrder))
  );
}

export function useVariantOfferings(variantCode: string | null): Loadable<VariantOfferingsResponse> {
  return useCatalog(variantCode ? `offerings:${variantCode}` : null, () => getVariantOfferings(variantCode as string));
}

// ---- Live price preview -----------------------------------------------------

const PREVIEW_DEBOUNCE_MS = 450;

export interface QuotePreviewState {
  /** The last successful quote — kept while a newer one loads so the total
   *  does not flicker back to empty on every tick. */
  quote: QuoteResponse | null;
  loading: boolean;
  /** 422 onboarding.quote.selection-invalid: why the selection can't be priced. */
  issues: SetupIssueResponse[];
  error: string | null;
}

/**
 * Prices an UNSAVED selection (POST /v1/onboarding/quote-previews) while the
 * merchant ticks modules and add-ons. Debounced, and only the latest request's
 * answer is kept; identical selections are not re-sent — the endpoint is rate
 * limited (60/min per account). Nothing is persisted server-side.
 */
export function useQuotePreview(
  variantCode: string | null,
  moduleCodes: readonly string[],
  addOns: readonly AddOnSelection[]
): QuotePreviewState {
  const [state, setState] = useState<QuotePreviewState>({ quote: null, loading: false, issues: [], error: null });
  const lastKey = useRef<string | null>(null);
  const seq = useRef(0);

  // A stable key: order does not change the price.
  const key = variantCode
    ? JSON.stringify([
        variantCode,
        [...moduleCodes].sort(),
        addOns.map((a) => `${a.categoryCode}/${a.providerCode}`).sort(),
      ])
    : null;

  useEffect(() => {
    // Any answer still in flight is for an older selection from here on.
    const mine = ++seq.current;
    if (key === null || variantCode === null) {
      lastKey.current = null;
      setState({ quote: null, loading: false, issues: [], error: null });
      return;
    }
    if (key === lastKey.current) {
      // Back to the selection already on screen: nothing to fetch.
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    const request = { businessVariantCode: variantCode, moduleCodes: [...moduleCodes], addOns: [...addOns] };
    const handle = window.setTimeout(() => {
      quotePreview(request)
        .then((quote) => {
          if (mine !== seq.current) return;
          lastKey.current = key;
          setState({ quote, loading: false, issues: [], error: null });
        })
        .catch((err: unknown) => {
          if (mine !== seq.current) return;
          lastKey.current = null;
          const issues = err instanceof ApiError && err.status === 422 ? readSetupProblem(err).issues ?? [] : [];
          setState({ quote: null, loading: false, issues, error: describeError(err, "quote.preview-failed") });
        });
    }, PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
    // `key` captures variantCode/moduleCodes/addOns by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}

// ---- The setup resource -----------------------------------------------------

export type SetupLoadState = "loading" | "ready" | "error";

/** Loads the caller's unfinished setup if it has one, else starts a new one. */
async function openSetup(): Promise<{ setup: BusinessSetupResponse; resumed: BusinessSetupSummaryResponse | null }> {
  const open = await listBusinessSetups().catch((err: unknown) => {
    // Auth failures are real; anything else just means "ask start-or-resume",
    // which resumes server-side anyway.
    if (err instanceof ApiError && err.status === 401) throw err;
    return null;
  });
  const summary = open?.items[0] ?? null;
  if (summary) return { setup: await getBusinessSetup(summary.setupId), resumed: summary };
  return { setup: await startBusinessSetup(), resumed: null };
}

export interface BusinessSetupApi {
  setup: BusinessSetupResponse | null;
  state: SetupLoadState;
  error: string | null;
  retry: () => void;
  saveType: (code: string) => Promise<BusinessSetupResponse>;
  saveVariant: (code: string) => Promise<BusinessSetupResponse>;
  saveName: (name: string) => Promise<BusinessSetupResponse>;
  saveModules: (codes: string[]) => Promise<BusinessSetupResponse>;
  saveAddOns: (addOns: AddOnSelection[]) => Promise<BusinessSetupResponse>;
  /** Re-reads the setup (used while waiting for provisioning). */
  refresh: () => Promise<BusinessSetupResponse>;
  /** Starts checkout for the quote the merchant is looking at. Idempotent on
   *  the server: calling it again while AwaitingPayment just returns the setup. */
  startCheckout: () => Promise<BusinessSetupResponse>;
  /** Dev-only: the Fake gateway settles whatever attempt is in flight. */
  confirmPayment: () => Promise<BusinessSetupResponse>;
  /** AwaitingPayment -> Draft, so the merchant can edit again. */
  cancelCheckout: () => Promise<BusinessSetupResponse>;
  /** Cancels this setup and immediately starts a fresh, empty one. */
  cancelAndRestart: () => Promise<BusinessSetupResponse>;
  /** Set when entry found an unfinished setup and resumed it. */
  resumed: BusinessSetupSummaryResponse | null;
  dismissResumed: () => void;
}

export function useBusinessSetup(): BusinessSetupApi {
  const [setup, setSetup] = useState<BusinessSetupResponse | null>(null);
  const [state, setState] = useState<SetupLoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [resumed, setResumed] = useState<BusinessSetupSummaryResponse | null>(null);

  // The latest server copy, readable synchronously by the write queue.
  const latest = useRef<BusinessSetupResponse | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    setError(null);
    openSetup()
      .then(({ setup: s, resumed: r }) => {
        if (cancelled) return;
        latest.current = s;
        setSetup(s);
        setResumed(r);
        setState("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(describeError(err, "setup.start-failed"));
        setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const run = useCallback(
    (op: (current: BusinessSetupResponse) => Promise<BusinessSetupResponse>): Promise<BusinessSetupResponse> => {
      const next = queue.current.then(async () => {
        const current = latest.current;
        if (!current) throw new Error("setup not loaded");
        try {
          const result = await op(current);
          latest.current = result;
          setSetup(result);
          return result;
        } catch (err) {
          // Someone else (another tab) moved the setup on: pick up the current
          // version so the merchant's retry has a chance to succeed.
          if (err instanceof ApiError && err.status === 409) {
            const fresh = await getBusinessSetup(current.setupId).catch(() => null);
            if (fresh) {
              latest.current = fresh;
              setSetup(fresh);
            }
          }
          throw err;
        }
      });
      queue.current = next.catch(() => undefined);
      return next;
    },
    []
  );

  const withVersion = <T extends object>(body: T) => (s: BusinessSetupResponse) => ({ expectedVersion: s.version, ...body });

  return {
    setup,
    state,
    error,
    retry: () => setAttempt((n) => n + 1),
    saveType: (code) =>
      run((s) => setBusinessType(s.setupId, withVersion({ businessTypeCode: code })(s))),
    saveVariant: (code) =>
      run((s) => setBusinessVariant(s.setupId, withVersion({ businessVariantCode: code })(s))),
    saveName: (name) => run((s) => setBusinessName(s.setupId, withVersion({ businessName: name })(s))),
    saveModules: (codes) => run((s) => setModules(s.setupId, withVersion({ moduleCodes: codes })(s))),
    saveAddOns: (addOns) => run((s) => setIntegrationAddOns(s.setupId, withVersion({ addOns })(s))),
    refresh: () => run((s) => getBusinessSetup(s.setupId)),
    startCheckout: () =>
      run((s) =>
        checkout(s.setupId, { expectedVersion: s.version, expectedQuoteFingerprint: s.quote?.fingerprint ?? null })
      ),
    confirmPayment: () => run((s) => confirmCheckout(s.setupId)),
    cancelCheckout: () => run((s) => cancelCheckout(s.setupId)),
    cancelAndRestart: async () => {
      const fresh = await run(async (s) => {
        // Repeating cancel is an unchanged 200, so a retry after a failed
        // start is safe.
        if (s.status !== "Cancelled") await cancelBusinessSetup(s.setupId);
        return startBusinessSetup();
      });
      setResumed(null);
      return fresh;
    },
    resumed,
    dismissResumed: () => setResumed(null),
  };
}
