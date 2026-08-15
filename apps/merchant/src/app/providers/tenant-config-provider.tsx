// What this tenant actually bought — the vertical, business type, enabled
// modules and branch count chosen during onboarding.
//
// This is the entitlement source of truth: the sidebar and route guards read
// it to decide what exists for this merchant. A cloud kitchen genuinely has
// no Reservations section, rather than a greyed-out one.
//
// MOCK PERSISTENCE — the backend does not exist yet, so config is written to
// localStorage, mirroring auth-provider. Swap for GET /tenant/config later.
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

const STORAGE_KEY = "octopus.tenant";

export interface TenantConfig {
  vertical: VerticalId;
  businessType: TypeCode;
  enabledModules: ModuleId[];
  branchCount: number;
  businessName: string;
  createdAt: string;
}

interface TenantConfigContextValue {
  /** null until the merchant completes onboarding. */
  config: TenantConfig | null;
  /** True once onboarding has produced a config. */
  isProvisioned: boolean;
  isModuleEnabled: (id: ModuleId) => boolean;
  price: PriceBreakdown;
  saveConfig: (config: Omit<TenantConfig, "createdAt">) => void;
  updateModules: (modules: ModuleId[]) => void;
  resetConfig: () => void;
}

const TenantConfigContext = createContext<TenantConfigContextValue | null>(null);

/**
 * Every module, used as the fallback when no config exists. An unprovisioned
 * session — an existing user from before onboarding shipped, or someone
 * landing on a deep link — must see the full console, never an empty one.
 */
const ALL_MODULE_IDS: ModuleId[] = catalogModules.map((m) => m.id);

function readConfig(): TenantConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TenantConfig;
    // A config with no modules would lock the merchant out of their own
    // console, so treat it as absent rather than trusting it.
    if (!Array.isArray(parsed.enabledModules) || parsed.enabledModules.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function TenantConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<TenantConfig | null>(readConfig);

  useEffect(() => {
    if (config) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [config]);

  const activeModules = useMemo<ModuleId[]>(() => {
    if (!config) return ALL_MODULE_IDS;
    // Base modules are part of the subscription and can never be missing,
    // even if a stale stored config somehow omits them.
    return Array.from(new Set([...baseModuleIds, ...config.enabledModules]));
  }, [config]);

  const isModuleEnabled = useCallback(
    (id: ModuleId) => activeModules.includes(id),
    [activeModules]
  );

  const price = useMemo(
    () => computePrice(activeModules, config?.branchCount ?? 1),
    [activeModules, config?.branchCount]
  );

  const saveConfig = useCallback((next: Omit<TenantConfig, "createdAt">) => {
    setConfig({ ...next, createdAt: new Date().toISOString() });
  }, []);

  const updateModules = useCallback((modules: ModuleId[]) => {
    setConfig((prev) => (prev ? { ...prev, enabledModules: modules } : prev));
  }, []);

  const resetConfig = useCallback(() => setConfig(null), []);

  const value: TenantConfigContextValue = {
    config,
    isProvisioned: config !== null,
    isModuleEnabled,
    price,
    saveConfig,
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
