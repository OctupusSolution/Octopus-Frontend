// apps/merchant/src/pages/customers/segments/segments-store.ts
// The segment screens' data. It talks to the CRM segments API directly rather
// than through _shared/crm-api.ts, whose loadSegments keeps only id, name and
// criteria and drops the stats and trend these screens are made of.
import { useEffect, useSyncExternalStore } from "react";
import {
  ApiError,
  createCrmSegment,
  estimateCrmAudience,
  listCrmCustomers,
  listCrmSegments,
  type CrmCustomerCriteriaDto,
  type CrmSegmentStatsDto,
  type ListCrmCustomersParams,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { mockAudienceEstimate, mockPreviewMembers, mockSegments } from "./mock-segments";
import type { SegmentMemberPreview, SegmentTrendPoint, SegmentView } from "./segment-model";

const PAGE_SIZE = 100;
const PREVIEW_SIZE = 5;

interface State {
  /** null while the first answer for this business is still on its way. */
  segments: SegmentView[] | null;
  /** "mock" when the segments API is not available to the business. */
  source: "server" | "mock";
}

let state: State = { segments: null, source: "server" };
let loadedFor: string | null = null;
const listeners = new Set<() => void>();

function emit(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function toView(row: {
  id: string;
  name: string;
  criteria: CrmCustomerCriteriaDto;
  stats: CrmSegmentStatsDto | null;
  trend: SegmentTrendPoint[];
}): SegmentView {
  return {
    id: row.id,
    name: row.name,
    criteria: row.criteria,
    members: row.stats?.members ?? null,
    ofBasePercent: row.stats?.ofBasePercent ?? null,
    avgSpendSar: row.stats?.avgSpend?.amount ?? null,
    trend: row.trend ?? [],
  };
}

// The same reading as crm-api.ts: no CRM feature or permission (403), or a
// backend without the module (404).
function unavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 403 || err.status === 404);
}

async function fetchSegments(businessId: string): Promise<SegmentView[] | null> {
  try {
    const out: SegmentView[] = [];
    for (let page = 1; ; page += 1) {
      const list = await listCrmSegments(businessId, { page, pageSize: PAGE_SIZE });
      for (const row of list.data) out.push(toView(row));
      if (list.data.length < PAGE_SIZE) return out;
    }
  } catch (err) {
    if (unavailable(err)) return null;
    throw err;
  }
}

async function refresh(businessId: string): Promise<void> {
  if (loadedFor !== businessId) {
    loadedFor = businessId;
    emit({ segments: null, source: "server" });
  } else if (state.source === "mock" && state.segments) {
    // Already known to be unavailable; asking again would wipe segments created on the sample data.
    return;
  }
  try {
    const segments = await fetchSegments(businessId);
    if (loadedFor !== businessId) return;
    emit(segments ? { segments, source: "server" } : { segments: [...mockSegments], source: "mock" });
  } catch (err) {
    console.error("Loading segments failed", err);
    if (loadedFor === businessId && state.segments === null) emit({ segments: [...mockSegments], source: "mock" });
  }
}

/** The business's segments, refreshed every time a segment screen opens. */
export function useSegments(): State {
  const { activeBusinessId } = useAuth();
  const snapshot = useSyncExternalStore(subscribe, () => state);
  useEffect(() => {
    if (activeBusinessId) void refresh(activeBusinessId);
  }, [activeBusinessId]);
  return snapshot;
}

/** The list endpoint's own filters for these criteria, or null when they need
 *  more than it can express (a Match Any of several rules, a field it has no
 *  filter for). There is no "members of a segment" endpoint to ask instead. */
function previewParams(criteria: CrmCustomerCriteriaDto): ListCrmCustomersParams | null {
  if (criteria.match !== "All" && criteria.conditions.length > 1) return null;
  const params: ListCrmCustomersParams = {};
  for (const { field, operator, value } of criteria.conditions) {
    if (field === "tags" && operator === "ContainsAny" && value.kind === "ids" && value.ids && !params.tagIds) {
      params.tagIds = value.ids;
      continue;
    }
    if (operator !== "Gte" && operator !== "Lte") return null;
    const min = operator === "Gte";
    if (field === "visit_count" && value.kind === "int" && value.int !== undefined) {
      if (min) params.visitsMin = value.int;
      else params.visitsMax = value.int;
    } else if (field === "total_spend" && value.kind === "money" && value.amount !== undefined) {
      if (min) params.spendMin = value.amount;
      else params.spendMax = value.amount;
    } else if (field === "last_visit_at" && value.kind === "date" && value.date) {
      if (min) params.lastVisitFrom = value.date;
      else params.lastVisitTo = value.date;
    } else if (field === "customer_since" && value.kind === "date" && value.date) {
      if (min) params.customerSinceFrom = value.date;
      else params.customerSinceTo = value.date;
    } else {
      return null;
    }
  }
  return params;
}

export const segmentActions = {
  async create(name: string, criteria: CrmCustomerCriteriaDto): Promise<SegmentView> {
    const created: SegmentView =
      state.source === "server" && loadedFor
        ? toView(await createCrmSegment(loadedFor, { name, criteria }))
        : { id: `seg-local-${Date.now()}`, name, criteria, members: null, ofBasePercent: null, avgSpendSar: null, trend: [] };
    emit({ ...state, segments: [...(state.segments ?? []), created] });
    return created;
  },

  /** Changes a segment's rules. Only the sample data can be edited: the API has
   *  no endpoint that updates a saved segment, so on real data this is false. */
  updateCriteria(id: string, criteria: CrmCustomerCriteriaDto): boolean {
    if (state.source !== "mock" || !state.segments) return false;
    emit({ ...state, segments: state.segments.map((s) => (s.id === id ? { ...s, criteria } : s)) });
    return true;
  },

  /** How many customers these criteria match right now. */
  async estimate(criteria: CrmCustomerCriteriaDto): Promise<number> {
    if (state.source !== "server" || !loadedFor) return mockAudienceEstimate.estimatedCount;
    return (await estimateCrmAudience(loadedFor, { criteria })).estimatedCount;
  },

  /** The segment's biggest spenders, or null when they cannot be listed. */
  async previewMembers(criteria: CrmCustomerCriteriaDto): Promise<SegmentMemberPreview[] | null> {
    if (state.source !== "server" || !loadedFor) return [...mockPreviewMembers];
    const params = previewParams(criteria);
    if (!params) return null;
    const list = await listCrmCustomers(loadedFor, { ...params, sort: "totalSpend", sortDirection: "desc", pageSize: PREVIEW_SIZE });
    return list.data.map((row) => ({
      id: row.id,
      name: `${row.firstName} ${row.lastName}`.trim(),
      visits: row.visits,
      totalSpendSar: row.totalSpend.amount,
    }));
  },
};
