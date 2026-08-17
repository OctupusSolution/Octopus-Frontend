// What this tenant actually bought — the vertical, business type, enabled
// modules and branch count chosen during onboarding.
//
// This is the entitlement source of truth: the sidebar and route guards read
// it to decide what exists for this merchant. A cloud kitchen genuinely has
// no Reservations section, rather than a greyed-out one.
//
// An account can hold more than one business (e.g. a restaurant and a salon)
// — `businesses` is the full list, `activeTenantId` picks which one drives
// the sidebar and module gating right now. Only name/vertical/type/modules
// change on switch; every other page still reads the same shared mock data
// regardless of which business is active (see docs/superpowers/specs/
// 2026-08-17-multi-business-switcher-design.md).
//
// MOCK PERSISTENCE — the backend does not exist yet, so config is written to
// localStorage, mirroring auth-provider. Swap for GET /tenants + GET
// /tenants/active later.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  baseModuleIds,
  catalogModules,
  computePrice,
  type ModuleId,
  type PriceBreakdown,
  type TypeCode,
  type VerticalId,
} from "@/shared/catalog";

const TENANTS_KEY = "octopus.tenants";
const ACTIVE_ID_KEY = "octopus.activeTenantId";
const LEGACY_SINGLE_KEY = "octopus.tenant";

export interface TenantConfig {
  id: string;
  vertical: VerticalId;
  businessType: TypeCode;
  enabledModules: ModuleId[];
  branchCount: number;
  businessName: string;
  createdAt: string;
}

interface TenantConfigContextValue {
  /** Every business this account owns, most recently created last. */
  businesses: TenantConfig[];
  /** The business currently driving the sidebar and module gating. */
  activeBusiness: TenantConfig | null;
  activeTenantId: string | null;
  /** True once onboarding has produced at least one business. */
  isProvisioned: boolean;
  isModuleEnabled: (id: ModuleId) => boolean;
  price: PriceBreakdown;
  /** Adds a new business, generating its id, and makes it the active one. */
  createBusiness: (config: Omit<TenantConfig, "id" | "createdAt">) => void;
  switchBusiness: (id: string) => void;
  updateModules: (modules: ModuleId[]) => void;
  resetConfig: () => void;
}

const TenantConfigContext = createContext<TenantConfigContextValue | null>(null);

/**
 * Every module, used as the fallback when no business exists. An
 * unprovisioned session — an existing user from before onboarding shipped,
 * or someone landing on a deep link — must see the full console, never an
 * empty one.
 */
const ALL_MODULE_IDS: ModuleId[] = catalogModules.map((m) => m.id);

function generateTenantId(): string {
  return `tenant-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** A stored business with no modules would lock the merchant out of their
 * own console, so it is treated as corrupt and dropped rather than trusted. */
function isValidTenant(value: unknown): value is TenantConfig {
  const t = value as Partial<TenantConfig> | null;
  return !!t && typeof t.id === "string" && Array.isArray(t.enabledModules) && t.enabledModules.length > 0;
}

/** Wraps a pre-multi-business session (a single `octopus.tenant` object)
 * into the list shape, so existing demo sessions keep working unchanged. */
function migrateLegacyTenant(): TenantConfig[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_SINGLE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Omit<TenantConfig, "id"> & { id?: string };
    if (!Array.isArray(parsed.enabledModules) || parsed.enabledModules.length === 0) return [];
    return [{ ...parsed, id: parsed.id ?? generateTenantId() }];
  } catch {
    return [];
  }
}

function readState(): { businesses: TenantConfig[]; activeTenantId: string | null } {
  if (typeof window === "undefined") return { businesses: [], activeTenantId: null };

  try {
    const raw = window.localStorage.getItem(TENANTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown[];
      const businesses = parsed.filter(isValidTenant);
      const storedActiveId = window.localStorage.getItem(ACTIVE_ID_KEY);
      const activeTenantId = businesses.some((b) => b.id === storedActiveId)
        ? storedActiveId
        : businesses[0]?.id ?? null;
      return { businesses, activeTenantId };
    }
  } catch {
    // fall through to the legacy migration below
  }

  const migrated = migrateLegacyTenant();
  return { businesses: migrated, activeTenantId: migrated[0]?.id ?? null };
}

export function TenantConfigProvider({ children }: { children: ReactNode }) {
  // Read once — readState() migrates the legacy single-tenant session by
  // generating a fresh id, so calling it twice (once per useState below)
  // would mint two different ids and leave activeTenantId pointing at a
  // business that was never actually added to the list.
  const [initial] = useState(readState);
  const [businesses, setBusinesses] = useState<TenantConfig[]>(initial.businesses);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(initial.activeTenantId);

  useEffect(() => {
    if (businesses.length > 0) {
      window.localStorage.setItem(TENANTS_KEY, JSON.stringify(businesses));
      window.localStorage.removeItem(LEGACY_SINGLE_KEY);
    } else {
      window.localStorage.removeItem(TENANTS_KEY);
    }
  }, [businesses]);

  useEffect(() => {
    if (activeTenantId) {
      window.localStorage.setItem(ACTIVE_ID_KEY, activeTenantId);
    } else {
      window.localStorage.removeItem(ACTIVE_ID_KEY);
    }
  }, [activeTenantId]);

  const activeBusiness = useMemo(
    () => businesses.find((b) => b.id === activeTenantId) ?? null,
    [businesses, activeTenantId]
  );

  const activeModules = useMemo<ModuleId[]>(() => {
    if (!activeBusiness) return ALL_MODULE_IDS;
    // Base modules are part of the subscription and can never be missing,
    // even if a stale stored config somehow omits them.
    return Array.from(new Set([...baseModuleIds, ...activeBusiness.enabledModules]));
  }, [activeBusiness]);

  const isModuleEnabled = useCallback(
    (id: ModuleId) => activeModules.includes(id),
    [activeModules]
  );

  const price = useMemo(
    () => computePrice(activeModules, activeBusiness?.branchCount ?? 1),
    [activeModules, activeBusiness?.branchCount]
  );

  const createBusiness = useCallback((config: Omit<TenantConfig, "id" | "createdAt">) => {
    const next: TenantConfig = { ...config, id: generateTenantId(), createdAt: new Date().toISOString() };
    setBusinesses((prev) => [...prev, next]);
    setActiveTenantId(next.id);
  }, []);

  const switchBusiness = useCallback((id: string) => {
    setActiveTenantId(id);
  }, []);

  const updateModules = useCallback((modules: ModuleId[]) => {
    setBusinesses((prev) =>
      prev.map((b) => (b.id === activeTenantId ? { ...b, enabledModules: modules } : b))
    );
  }, [activeTenantId]);

  const resetConfig = useCallback(() => {
    setBusinesses([]);
    setActiveTenantId(null);
  }, []);

  const value: TenantConfigContextValue = {
    businesses,
    activeBusiness,
    activeTenantId,
    isProvisioned: businesses.length > 0,
    isModuleEnabled,
    price,
    createBusiness,
    switchBusiness,
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
