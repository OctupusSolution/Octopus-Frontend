// The businesses this account owns, and the one the console is working in.
//
// Source of truth is now the backend: GET /v1/businesses lists the account's
// businesses, and the ACTIVE one is whichever business the session holds a
// business token for (auth-provider's `activeBusinessId`, minted by
// POST /v1/auth/business-session). Picking a business therefore does two
// things at once — it changes what the sidebar shows AND what every
// tenant-scoped request is authorised for.
//
// What the backend does NOT give us yet, and how this file fills the gap (each
// is a known mismatch, not a silent guess):
//   - modules: the local catalog (14 modules from the Restaurants SRS) and the
//     backend's (GET /v1/businesses/{id} moduleCodes) are different taxonomies.
//     Only the codes in PURCHASABLE_MODULE have a local counterpart, so only
//     those hide a module when not purchased; every other local module stays
//     enabled and the backend still enforces entitlements per request (403
//     `entitlements.feature-disabled`). See FRONTEND_INTEGRATION_GAPS.md 2.2.
//   - branch count: no branch concept in the Businesses API yet — always 1.
//   - restaurant type: only the two restaurant variants the backend seeds map
//     onto a local type (fine-dining -> T1, quick-service -> T3).
// `price` and `updateModules` stay local: they drive the mock pricing UI only.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, getBusiness, listBusinesses, type BusinessSummaryResponse } from "@octopus/api-client";
import {
  baseModuleIds,
  catalogModules,
  computePrice,
  type ModuleId,
  type PriceBreakdown,
  type TypeCode,
  type VerticalId,
} from "@/shared/catalog";
import { useAuth } from "@/app/providers/auth-provider";

export interface TenantConfig {
  /** The real business GUID (BusinessSummaryResponse.businessId). */
  id: string;
  vertical: VerticalId;
  businessType: TypeCode;
  enabledModules: ModuleId[];
  branchCount: number;
  businessName: string;
  createdAt: string;
}

interface TenantConfigContextValue {
  /** Every Active business this account owns. */
  businesses: TenantConfig[];
  /** The business currently driving the sidebar and module gating. */
  activeBusiness: TenantConfig | null;
  activeTenantId: string | null;
  /** True once the account has at least one Active business. */
  isProvisioned: boolean;
  /** True while the business list is being fetched. */
  loading: boolean;
  /** Set when the list could not be loaded; cleared by the next reload. */
  error: string | null;
  isModuleEnabled: (id: ModuleId) => boolean;
  price: PriceBreakdown;
  /** Re-reads the list from the backend (e.g. after a setup finishes). */
  reload: () => Promise<void>;
  /** Makes `id` the active business: mints its business token, then it drives
   *  the console. Throws ApiError if the business is not accessible. */
  switchBusiness: (id: string) => Promise<void>;
  /** Kept for the onboarding wizard's call sites; creation itself now happens
   *  through the Business Setup API, so this only refreshes the list. */
  createBusiness: (config: Omit<TenantConfig, "id" | "createdAt">) => void;
  updateModules: (modules: ModuleId[]) => void;
  resetConfig: () => void;
}

const TenantConfigContext = createContext<TenantConfigContextValue | null>(null);

const ALL_MODULE_IDS: ModuleId[] = catalogModules.map((m) => m.id);

// Backend module code -> the local module it gates.
const PURCHASABLE_MODULE: Record<string, ModuleId> = {
  staff: "hr",
  loyalty: "loyalty",
};

const VARIANT_TO_TYPE: Record<string, TypeCode> = {
  "fine-dining": "T1",
  "quick-service": "T3",
};

function toTenantConfig(business: BusinessSummaryResponse): TenantConfig {
  return {
    id: business.businessId,
    vertical: business.businessTypeCode === "restaurant" ? "restaurants" : "other",
    // Anything the local catalog has no picture for falls back to "casual" —
    // only restaurant variants are surfaced by the UI today.
    businessType: VARIANT_TO_TYPE[business.businessVariantCode] ?? "T2",
    enabledModules: ALL_MODULE_IDS,
    branchCount: 1,
    businessName: business.name,
    createdAt: business.activatedAtUtc ?? business.createdAtUtc,
  };
}

function describe(err: unknown): string {
  return err instanceof ApiError ? err.problem?.errorCode ?? err.message : "businesses.load-failed";
}

export function TenantConfigProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, activeBusinessId, selectBusiness } = useAuth();
  const [businesses, setBusinesses] = useState<TenantConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = user?.email ?? null;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listBusinesses();
      // A business is only usable once provisioning has finished; Provisioning
      // ones would fail business-session, so they are not offered.
      setBusinesses(result.items.filter((b) => b.status === "Active").map(toTenantConfig));
    } catch (err) {
      setError(describe(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Load on sign-in (and when a different account signs in); clear on sign-out.
  useEffect(() => {
    if (!isAuthenticated) {
      setBusinesses([]);
      setError(null);
      return;
    }
    void reload();
    // Keyed on the account, not the tokens: tokens rotate every ~15 minutes and
    // a refetch (which would drop local module edits) is not wanted for that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, email]);

  // What the active business actually purchased. Null until loaded (or if the
  // read fails), in which case nothing is hidden.
  const [purchasedModuleCodes, setPurchasedModuleCodes] = useState<string[] | null>(null);

  useEffect(() => {
    setPurchasedModuleCodes(null);
    if (!isAuthenticated || !activeBusinessId) return;
    let cancelled = false;
    getBusiness(activeBusinessId)
      .then((business) => {
        if (!cancelled) setPurchasedModuleCodes(business.moduleCodes);
      })
      .catch(() => {
        // Keep everything visible; the backend still gates each request.
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, activeBusinessId]);

  const activeBusiness = useMemo(() => {
    const business = businesses.find((b) => b.id === activeBusinessId) ?? null;
    if (!business || !purchasedModuleCodes) return business;
    const notPurchased = new Set(
      Object.entries(PURCHASABLE_MODULE)
        .filter(([code]) => !purchasedModuleCodes.includes(code))
        .map(([, moduleId]) => moduleId)
    );
    return { ...business, enabledModules: business.enabledModules.filter((id) => !notPurchased.has(id)) };
  }, [businesses, activeBusinessId, purchasedModuleCodes]);

  const activeModules = useMemo<ModuleId[]>(() => {
    if (!activeBusiness) return ALL_MODULE_IDS;
    // Base modules are part of the subscription and can never be missing.
    return Array.from(new Set([...baseModuleIds, ...activeBusiness.enabledModules]));
  }, [activeBusiness]);

  const isModuleEnabled = useCallback((id: ModuleId) => activeModules.includes(id), [activeModules]);

  const price = useMemo(
    () => computePrice(activeModules, activeBusiness?.branchCount ?? 1),
    [activeModules, activeBusiness?.branchCount]
  );

  const switchBusiness = useCallback((id: string) => selectBusiness(id), [selectBusiness]);

  const createBusiness = useCallback(() => {
    void reload();
  }, [reload]);

  const updateModules = useCallback(
    (modules: ModuleId[]) => {
      setBusinesses((prev) => prev.map((b) => (b.id === activeBusinessId ? { ...b, enabledModules: modules } : b)));
    },
    [activeBusinessId]
  );

  const resetConfig = useCallback(() => setBusinesses([]), []);

  const value: TenantConfigContextValue = {
    businesses,
    activeBusiness,
    activeTenantId: activeBusinessId,
    isProvisioned: businesses.length > 0,
    loading,
    error,
    isModuleEnabled,
    price,
    reload,
    switchBusiness,
    createBusiness,
    updateModules,
    resetConfig,
  };

  return <TenantConfigContext.Provider value={value}>{children}</TenantConfigContext.Provider>;
}

export function useTenantConfig(): TenantConfigContextValue {
  const ctx = useContext(TenantConfigContext);
  if (!ctx) throw new Error("useTenantConfig must be used within TenantConfigProvider");
  return ctx;
}
