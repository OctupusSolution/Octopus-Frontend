// The business's order settings and channel list (GET /settings,
// GET /settings/sources). Reason-code pickers across the order screens read
// their options from here — the backend refuses any reasonCode the business
// has not configured.
import { useCallback, useEffect, useState } from "react";
import {
  getOrderSettings,
  listOrderSources,
  type OrderSettingsResponse,
  type OrderSourceResponse,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { orderErrorMessage } from "./order-model";

export interface UseOrderSettingsResult {
  settings: OrderSettingsResponse | null;
  sources: readonly OrderSourceResponse[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useOrderSettings(enabled = true): UseOrderSettingsResult {
  const { activeBusinessId } = useAuth();
  const [settings, setSettings] = useState<OrderSettingsResponse | null>(null);
  const [sources, setSources] = useState<readonly OrderSourceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!enabled || !activeBusinessId) return;
    setLoading(true);
    setError(null);
    Promise.all([getOrderSettings(activeBusinessId), listOrderSources(activeBusinessId)])
      .then(([s, src]) => {
        setSettings(s);
        setSources([...src].sort((a, b) => a.sortOrder - b.sortOrder));
      })
      .catch((err: unknown) => setError(orderErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [activeBusinessId, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { settings, sources, loading, error, reload };
}
