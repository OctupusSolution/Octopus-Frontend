// What can be sold right now, for a channel (GET /catalog, /catalog/{id}).
import { useEffect, useState } from "react";
import {
  getSellableCatalog,
  listSellableCatalogs,
  type SellableCatalogResponse,
  type SellableCatalogSummaryResponse,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { orderErrorMessage } from "./order-model";

interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

export function useSellableCatalogs(sourceCode: string | null): AsyncState<readonly SellableCatalogSummaryResponse[]> {
  const { activeBusinessId } = useAuth();
  const [state, setState] = useState<AsyncState<readonly SellableCatalogSummaryResponse[]>>({
    data: [],
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!activeBusinessId || !sourceCode) return;
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    listSellableCatalogs(activeBusinessId, { sourceCode })
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((err: unknown) => !cancelled && setState({ data: [], loading: false, error: orderErrorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, sourceCode]);

  return state;
}

export function useSellableCatalog(
  catalogId: string | null,
  sourceCode: string | null
): AsyncState<SellableCatalogResponse | null> {
  const { activeBusinessId } = useAuth();
  const [state, setState] = useState<AsyncState<SellableCatalogResponse | null>>({
    data: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!activeBusinessId || !catalogId) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState({ data: null, loading: true, error: null });
    getSellableCatalog(activeBusinessId, catalogId, { sourceCode: sourceCode ?? undefined })
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((err: unknown) => !cancelled && setState({ data: null, loading: false, error: orderErrorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, catalogId, sourceCode]);

  return state;
}
