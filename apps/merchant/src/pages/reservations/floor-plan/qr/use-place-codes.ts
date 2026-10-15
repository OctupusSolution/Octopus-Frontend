// The Table QR page's server state: the place-code floor that matches the
// drawn plan, its rows joined to plan tables, counts, attention and the last
// print. Every mutation goes through `run`, which refetches afterwards.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  listPlaceCodeFloors,
  listPlaceCodes,
  type PlaceCodeAttention,
  type PlaceCodeCounts,
  type PlaceCodeLastPrint,
  type PlaceCodeListResponse,
  type PlaceCodeRow,
} from "@octopus/api-client";
import type { FloorPlanDoc, FloorTable } from "@/entities/floor-plan";
import { useAuth } from "@/app/providers/auth-provider";
import { useI18n } from "@/app/providers/i18n-provider";
import { classifyLoadError, errorKey, joinRows, MAX_BATCH, toQrStatus } from "./place-codes-model";
import type { QrStatus } from "./qr-store";

export type Notify = (text: string, tone?: "success" | "error" | "info") => void;

export interface PlaceCodesState {
  phase: "loading" | "ready" | "notEnabled" | "forbidden" | "notPublished" | "failed";
  floorId: string | null;
  /** Key = FloorTable.id. */
  rows: Map<string, PlaceCodeRow>;
  counts: PlaceCodeCounts | null;
  attention: PlaceCodeAttention[];
  lastPrint: PlaceCodeLastPrint | null;
  statusOf: (t: FloorTable) => QrStatus;
  refresh: () => Promise<void>;
  /** Runs a mutation; on failure it toasts the translated error, refetches
   *  when the server's state moved on, and rethrows. */
  run: <T>(fn: (businessId: string) => Promise<T>) => Promise<T>;
  businessId: string;
}

/** Errors after which what the page shows is out of date. */
const REFETCH_ON = new Set([
  "menu.place-code.stale",
  "menu.place-code.not-found",
  "menu.place-code.revoked",
  "menu.place-code.confirm-count-mismatch",
  "menu.place-code.relink-target-taken",
]);

export function usePlaceCodes(doc: FloorPlanDoc, notify: Notify): PlaceCodesState {
  const { activeBusinessId } = useAuth();
  const { t } = useI18n();
  const businessId = activeBusinessId ?? "";
  const tables = useMemo(() => doc.tables.filter((tb) => tb.visible), [doc.tables]);
  const [phase, setPhase] = useState<PlaceCodesState["phase"]>("loading");
  const [floorId, setFloorId] = useState<string | null>(null);
  const [list, setList] = useState<PlaceCodeListResponse | null>(null);
  const seq = useRef(0);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    const mine = ++seq.current;
    try {
      const { floors } = await listPlaceCodeFloors(businessId);
      if (floors.length === 0) {
        if (mine === seq.current) setPhase("notPublished");
        return;
      }
      // The floor whose rows overlap the drawn plan most; one floor is the usual case.
      let best = floors[0].floorId;
      let res = await listPlaceCodes(businessId, { floorId: best, pageSize: MAX_BATCH });
      let bestHits = joinRows(tables, res.items).size;
      for (const f of floors.slice(1)) {
        const r = await listPlaceCodes(businessId, { floorId: f.floorId, pageSize: MAX_BATCH });
        const hits = joinRows(tables, r.items).size;
        if (hits > bestHits) {
          best = f.floorId;
          res = r;
          bestHits = hits;
        }
      }
      if (mine !== seq.current) return;
      setFloorId(best);
      setList(res);
      setPhase("ready");
    } catch (e) {
      if (mine === seq.current) setPhase(classifyLoadError(e));
    }
  }, [businessId, tables]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const rows = useMemo(() => joinRows(tables, list?.items ?? []), [tables, list]);
  const statusOf = useCallback(
    (tb: FloorTable): QrStatus => {
      const r = rows.get(tb.id);
      return r ? toQrStatus(r.status) : "notGenerated";
    },
    [rows]
  );

  const run = useCallback(
    async <T,>(fn: (businessId: string) => Promise<T>): Promise<T> => {
      try {
        const out = await fn(businessId);
        await refresh();
        return out;
      } catch (e) {
        notify(t(errorKey(e)), "error");
        if (e instanceof ApiError && REFETCH_ON.has(e.problem?.errorCode ?? "")) await refresh();
        throw e;
      }
    },
    [businessId, refresh, notify, t]
  );

  return {
    phase,
    floorId,
    rows,
    counts: list?.counts ?? null,
    attention: list?.attention ?? [],
    lastPrint: list?.lastPrint ?? null,
    statusOf,
    refresh,
    run,
    businessId,
  };
}
