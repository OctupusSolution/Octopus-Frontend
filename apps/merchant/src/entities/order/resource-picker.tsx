// Picks a place on the floor for an order (take order / transfer). The Order
// module resolves a place as (containerId = floor plan id, resourceId = spot
// id) against the LIVE floor (FloorPlanResourceDirectory), so this reads the
// same two ids from the Floor Plan client.
import { useEffect, useState } from "react";
import { listFloorPlans, listSpots, type FloorPlanSummaryResponse, type SpotResponse } from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { orderErrorMessage } from "./order-model";
import { OrderField, orderInputClass } from "./order-ui";
import { useOrderText } from "./order-text";

export interface PlaceChoice {
  containerId: string;
  resourceId: string;
  label: string;
}

export function ResourcePicker({
  value,
  onChange,
}: {
  value: PlaceChoice | null;
  onChange: (place: PlaceChoice | null) => void;
}) {
  const { tx } = useOrderText();
  const { activeBusinessId } = useAuth();
  const [plans, setPlans] = useState<readonly FloorPlanSummaryResponse[]>([]);
  const [planId, setPlanId] = useState<string>(value?.containerId ?? "");
  const [spots, setSpots] = useState<readonly SpotResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeBusinessId) return;
    let cancelled = false;
    listFloorPlans(activeBusinessId, { pageSize: 50 })
      .then((page) => {
        if (cancelled) return;
        const live = page.data.filter((plan) => plan.lastPublishedVersion > 0);
        setPlans(live);
        if (live.length === 1) setPlanId((prev) => prev || live[0].id);
      })
      .catch((err: unknown) => !cancelled && setError(orderErrorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId]);

  useEffect(() => {
    if (!activeBusinessId || !planId) {
      setSpots([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listSpots(activeBusinessId, planId, { pageSize: 200 })
      .then((page) => !cancelled && setSpots(page.data))
      .catch((err: unknown) => !cancelled && setError(orderErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, planId]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <OrderField label={tx("place.floor")}>
        <select
          value={planId}
          onChange={(event) => {
            setPlanId(event.target.value);
            onChange(null);
          }}
          className={orderInputClass}
        >
          <option value="">{plans.length === 0 ? tx("place.noFloors") : tx("place.chooseFloor")}</option>
          {plans.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.name}
            </option>
          ))}
        </select>
      </OrderField>
      <OrderField label={tx("place.table")}>
        <select
          value={value?.resourceId ?? ""}
          disabled={!planId || loading}
          onChange={(event) => {
            const spot = spots.find((candidate) => candidate.id === event.target.value);
            onChange(spot ? { containerId: planId, resourceId: spot.id, label: spot.displayName ?? spot.code } : null);
          }}
          className={orderInputClass}
        >
          <option value="">{loading ? tx("common.loading") : tx("place.noTable")}</option>
          {spots.map((spot) => (
            <option key={spot.id} value={spot.id}>
              {(spot.displayName ?? spot.code) + ` · ${spot.capacity}`}
            </option>
          ))}
        </select>
      </OrderField>
      {error && <p className="text-[12px] text-[#DC2626] sm:col-span-2">{error}</p>}
    </div>
  );
}
