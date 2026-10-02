// apps/merchant/src/pages/customers/_shared/customer-store.ts
// Session-scoped, in-memory store for the CRM module. The list page, the
// detail page and the Send Message wizard all read the same customers and
// saved segments, so an edit on one screen is still there after navigating to
// another. It starts from the mock data and is replaced by the business's real
// customers once they load (see useCustomerSync); from then on customerActions
// sends every edit to the API.
import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/app/providers/auth-provider";
import {
  addCustomerNote,
  addCustomersTag,
  createCustomer,
  deleteCustomers,
  estimateAudience,
  exportCustomers,
  loadCustomer,
  loadCustomers,
  loadSegments,
  loadStats,
  mergeCustomerRecords,
  saveSegment,
  sendMessage,
  saveCustomerPreferences,
  saveCustomerReferredBy,
  setCustomerBlocked,
  type CustomerStats,
  type PreferenceValues,
  type SendMessageInput,
} from "./crm-api";
import type { CrmCustomerCriteriaDto } from "@octopus/api-client";
import type { AudienceFilters } from "./send-message-wizard/audience";
import { mergeCustomers } from "./merge";
import { customerRecords } from "./mock-data";
import { EMPTY_LIST_FILTERS, type ListFilters } from "./list-filter";
import type { CustomerRecord } from "./types";

export interface SavedSegment {
  id: string;
  name: string;
  filters: ListFilters;
  /** The segment as the server stores it; absent on the mock data. */
  criteria?: CrmCustomerCriteriaDto;
  createdAt: string; // ISO datetime
}

interface State {
  customers: CustomerRecord[];
  segments: SavedSegment[];
  /** The stat cards' real figures; null while the mock ones are shown. */
  stats: CustomerStats | null;
}

let state: State = { customers: [...customerRecords], segments: [], stats: null };
// The business whose customers the store holds, or null while it holds the mock data.
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

export function useCustomers(): CustomerRecord[] {
  return useSyncExternalStore(subscribe, () => state.customers);
}

export function useSavedSegments(): SavedSegment[] {
  return useSyncExternalStore(subscribe, () => state.segments);
}

export function useCustomerStats(): CustomerStats | null {
  return useSyncExternalStore(subscribe, () => state.stats);
}

/** The stat cards and the saved segments. Each is its own permission or
 *  feature on the server, so one being refused does not hold back the other. */
async function refreshExtras(businessId: string): Promise<void> {
  const [stats, segments] = await Promise.allSettled([loadStats(businessId), loadSegments(businessId)]);
  if (loadedFor !== businessId) return;
  emit({
    ...state,
    stats: stats.status === "fulfilled" ? stats.value : state.stats,
    segments:
      segments.status === "fulfilled" && segments.value
        ? segments.value.map((s) => ({ id: s.id, name: s.name, filters: EMPTY_LIST_FILTERS, criteria: s.criteria, createdAt: "" }))
        : state.segments,
  });
}

export const customerStore = {
  get: () => state,
  setCustomers(updater: (prev: CustomerRecord[]) => CustomerRecord[]) {
    emit({ ...state, customers: updater(state.customers) });
  },
  updateCustomer(id: string, patch: Partial<CustomerRecord> | ((c: CustomerRecord) => Partial<CustomerRecord>)) {
    this.setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...(typeof patch === "function" ? patch(c) : patch) } : c)));
  },
  addSegment(name: string, filters: ListFilters): SavedSegment {
    const segment: SavedSegment = { id: `SEG-${Date.now()}-${state.segments.length}`, name, filters, createdAt: new Date().toISOString() };
    emit({ ...state, segments: [...state.segments, segment] });
    return segment;
  },
};

/** Fills the store with the active business's customers, and with the full
 *  profile of `customerId` when one is given (the detail page). A business that
 *  CRM is not available to keeps the mock data. */
export function useCustomerSync(customerId?: string): void {
  const { activeBusinessId } = useAuth();
  useEffect(() => {
    if (!activeBusinessId) return;
    let cancelled = false;
    void (async () => {
      try {
        if (loadedFor !== activeBusinessId) {
          const customers = await loadCustomers(activeBusinessId);
          if (cancelled || !customers) return;
          loadedFor = activeBusinessId;
          emit({ ...state, customers, segments: [], stats: null });
          void refreshExtras(activeBusinessId);
        }
        if (!customerId) return;
        const base = state.customers.find((c) => c.id === customerId);
        const full = await loadCustomer(activeBusinessId, customerId, base);
        if (cancelled || !full) return;
        emit({
          ...state,
          customers: base ? state.customers.map((c) => (c.id === full.id ? full : c)) : [full, ...state.customers],
        });
      } catch (err) {
        console.error("Loading customers failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeBusinessId, customerId]);
}

function replace(customer: CustomerRecord) {
  customerStore.setCustomers((prev) => prev.map((c) => (c.id === customer.id ? customer : c)));
}

function remove(ids: string[]) {
  const gone = new Set(ids);
  customerStore.setCustomers((prev) => prev.filter((c) => !gone.has(c.id)));
}

const byId = (id: string) => state.customers.find((c) => c.id === id);
const today = () => new Date().toISOString().slice(0, 10);

/** What the screens do to customers. On a business's real customers each one is
 *  sent to the API first and rejects if the server refuses it, leaving the store
 *  as it was; on the mock data it only changes the store. */
export const customerActions = {
  async create(draft: CustomerRecord): Promise<void> {
    const customer = loadedFor ? await createCustomer(loadedFor, draft) : draft;
    customerStore.setCustomers((prev) => [customer, ...prev]);
    if (loadedFor) void refreshExtras(loadedFor);
  },

  async toggleBlocked(id: string): Promise<void> {
    const customer = byId(id);
    if (!customer) return;
    replace(loadedFor ? await setCustomerBlocked(loadedFor, customer, !customer.isBlocked) : { ...customer, isBlocked: !customer.isBlocked });
  },

  async remove(ids: string[]): Promise<void> {
    if (loadedFor) await deleteCustomers(loadedFor, ids);
    remove(ids);
    if (loadedFor) void refreshExtras(loadedFor);
  },

  async addNote(id: string, text: string): Promise<void> {
    const customer = byId(id);
    if (!customer) return;
    replace(loadedFor ? await addCustomerNote(loadedFor, customer, text) : { ...customer, notes: [...customer.notes, { date: today(), text }] });
  },

  async addTag(ids: string[], tag: string): Promise<void> {
    const businessId = loadedFor;
    if (!businessId) {
      customerStore.setCustomers((prev) => prev.map((c) => (ids.includes(c.id) && !c.tags.includes(tag) ? { ...c, tags: [...c.tags, tag] } : c)));
      return;
    }
    await addCustomersTag(businessId, ids, tag);
    // Read back rather than patched: the server owns the tag's stored name and the customers' new versions.
    const fresh = await Promise.all(ids.map((id) => loadCustomer(businessId, id, byId(id))));
    fresh.forEach((customer) => customer && replace(customer));
  },

  /** Merges the rest into the first and resolves with the surviving customer's id. */
  async merge(customers: CustomerRecord[]): Promise<string> {
    const [primary, ...rest] = customers;
    const merged = loadedFor ? await mergeCustomerRecords(loadedFor, customers.map((c) => c.id)) : mergeCustomers(customers);
    remove(rest.map((c) => c.id));
    replace({ ...merged, id: primary.id });
    return primary.id;
  },

  /** The About card. Only "referred by" is sent on real data: branch and
   *  area/table are ids on the server and the form holds free text. */
  async saveAbout(id: string, values: Pick<CustomerRecord, "preferredBranch" | "preferredAreaTable" | "referredBy">): Promise<void> {
    const customer = byId(id);
    if (!customer) return;
    replace(loadedFor ? await saveCustomerReferredBy(loadedFor, customer, values.referredBy) : { ...customer, ...values });
  },

  /** "Save Segment": the filter bar under a name. */
  async saveSegment(name: string, filters: ListFilters): Promise<void> {
    if (!loadedFor) {
      customerStore.addSegment(name, filters);
      return;
    }
    const saved = await saveSegment(loadedFor, name, filters);
    emit({ ...state, segments: [...state.segments, { id: saved.id, name: saved.name, filters, criteria: saved.criteria, createdAt: new Date().toISOString() }] });
  },

  /** The server's count for the wizard's audience, or null on the mock data
   *  (the wizard then counts the loaded customers itself). */
  async estimateAudience(filters: AudienceFilters): Promise<number | null> {
    return loadedFor ? estimateAudience(loadedFor, filters) : null;
  },

  /** Sends the wizard's message as campaigns. On the mock data nothing is sent. */
  async sendMessage(input: SendMessageInput): Promise<void> {
    if (loadedFor) await sendMessage(loadedFor, input);
  },

  /** The server's export of these customers, or null on the mock data (the
   *  page then builds the CSV itself). */
  async exportCustomers(ids: string[]): Promise<{ blob: Blob; fileName: string } | null> {
    return loadedFor ? exportCustomers(loadedFor, ids) : null;
  },

  async savePreferences(id: string, values: PreferenceValues): Promise<void> {
    const customer = byId(id);
    if (!customer) return;
    replace(loadedFor ? await saveCustomerPreferences(loadedFor, customer, values) : { ...customer, ...values });
  },
};
