// apps/merchant/src/pages/customers/_shared/list-filter.ts
import { customerName } from "./format";
import type { CustomerRecord } from "./types";

export interface RangeValue {
  from: string;
  to: string;
}

export interface ListFilters {
  search: string;
  tags: string[];
  visits: RangeValue;
  spend: RangeValue;
  lastVisit: RangeValue; // ISO dates
}

const EMPTY_RANGE: RangeValue = { from: "", to: "" };

export const EMPTY_LIST_FILTERS: ListFilters = {
  search: "",
  tags: [],
  visits: EMPTY_RANGE,
  spend: EMPTY_RANGE,
  lastVisit: EMPTY_RANGE,
};

function inRange(value: number, range: RangeValue): boolean {
  if (range.from !== "" && value < Number(range.from)) return false;
  if (range.to !== "" && value > Number(range.to)) return false;
  return true;
}

/** The Customer CRM list's search + filter-bar predicate. A customer with
 *  any one of the selected tags matches (OR), every range is inclusive. */
export function matchesListFilters(customer: CustomerRecord, filters: ListFilters): boolean {
  const query = filters.search.trim().toLowerCase();
  if (query) {
    const haystack = [customerName(customer).toLowerCase(), customer.phone, customer.email.toLowerCase()];
    if (!haystack.some((field) => field.includes(query))) return false;
  }
  if (filters.tags.length > 0 && !filters.tags.some((tag) => customer.tags.includes(tag))) return false;
  if (!inRange(customer.visits, filters.visits)) return false;
  if (!inRange(customer.totalSpendSar, filters.spend)) return false;
  if (filters.lastVisit.from && customer.lastVisit < filters.lastVisit.from) return false;
  if (filters.lastVisit.to && customer.lastVisit > filters.lastVisit.to) return false;
  return true;
}

export function hasActiveFilters(filters: ListFilters): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.tags.length > 0 ||
    [filters.visits, filters.spend, filters.lastVisit].some((r) => r.from !== "" || r.to !== "")
  );
}
