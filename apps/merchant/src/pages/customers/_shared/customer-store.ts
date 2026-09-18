// apps/merchant/src/pages/customers/_shared/customer-store.ts
// Session-scoped, in-memory store for the CRM module (no backend yet). The
// list page, the detail page and the Send Message wizard all read the same
// customers and saved segments, so an edit on one screen is still there
// after navigating to another. A reload starts again from the mock data.
import { useSyncExternalStore } from "react";
import { customerRecords } from "./mock-data";
import type { ListFilters } from "./list-filter";
import type { CustomerRecord } from "./types";

export interface SavedSegment {
  id: string;
  name: string;
  filters: ListFilters;
  createdAt: string; // ISO datetime
}

interface State {
  customers: CustomerRecord[];
  segments: SavedSegment[];
}

let state: State = { customers: [...customerRecords], segments: [] };
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
