// A not-yet-taken order ("the cart"): pure functions from a sellable catalog
// to the exact TakeOrderRequest / AddOrderLinesRequest the backend binds.
// Shared by the orders-list "New order" flow and, later, the POS terminal.
//
// Prices here are an ESTIMATE for display only — the server never accepts a
// price and re-prices every line from the published catalog (plus tax and
// service charge), so the order that comes back is the one to show.
import type {
  DuplicateOrderTemplateResponse,
  OrderLineRequest,
  SellableCatalogResponse,
  SellableEntryResponse,
  SellableOptionGroupResponse,
  TakeOrderRequest,
} from "@octopus/api-client";

export interface DraftLine {
  /** Stable identity of "this entry with these options and this note". */
  key: string;
  catalogId: string;
  entryId: string;
  name: string;
  /** Base price plus option deltas, major units; null when the catalog has
   *  no price for the entry (the server decides). */
  unitPrice: number | null;
  optionIds: string[];
  optionNames: string[];
  quantity: number;
  note: string | null;
}

/** OrderLine.MaxQuantity / PlatformDefaults.MaxLines are enforced server-side;
 *  the UI only keeps quantities positive. */
export function draftLineKey(entryId: string, optionIds: readonly string[], note: string | null): string {
  return `${entryId}|${[...optionIds].sort().join(",")}|${note ?? ""}`;
}

export function addDraftLine(lines: readonly DraftLine[], line: Omit<DraftLine, "key">): DraftLine[] {
  const key = draftLineKey(line.entryId, line.optionIds, line.note);
  const existing = lines.find((candidate) => candidate.key === key);
  if (existing) {
    return lines.map((candidate) =>
      candidate.key === key ? { ...candidate, quantity: candidate.quantity + line.quantity } : candidate
    );
  }
  return [...lines, { ...line, key }];
}

/** Sets a line's quantity; zero or less removes it. */
export function setDraftQuantity(lines: readonly DraftLine[], key: string, quantity: number): DraftLine[] {
  if (quantity <= 0) return lines.filter((line) => line.key !== key);
  return lines.map((line) => (line.key === key ? { ...line, quantity: Math.floor(quantity) } : line));
}

export function draftItemCount(lines: readonly DraftLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function draftEstimate(lines: readonly DraftLine[]): number {
  return lines.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.quantity, 0);
}

export function toOrderLineRequests(lines: readonly DraftLine[]): OrderLineRequest[] {
  return lines.map((line) => ({
    catalogId: line.catalogId,
    entryId: line.entryId,
    quantity: line.quantity,
    optionIds: line.optionIds.length > 0 ? line.optionIds : null,
    note: line.note,
  }));
}

// ---- Options ------------------------------------------------------------------

export function groupsForEntry(
  catalog: Pick<SellableCatalogResponse, "optionGroups">,
  entry: Pick<SellableEntryResponse, "optionGroupIds">
): SellableOptionGroupResponse[] {
  return entry.optionGroupIds
    .map((groupId) => catalog.optionGroups.find((group) => group.groupId === groupId))
    .filter((group): group is SellableOptionGroupResponse => group !== undefined);
}

/** The options a fresh pick starts with: each group's available defaults. */
export function defaultOptionIds(groups: readonly SellableOptionGroupResponse[]): string[] {
  return groups.flatMap((group) =>
    group.options.filter((option) => option.isDefault && option.isAvailableNow).map((option) => option.optionId)
  );
}

/** Toggles an option respecting single-choice groups. */
export function toggleOption(
  groups: readonly SellableOptionGroupResponse[],
  selected: readonly string[],
  groupId: string,
  optionId: string
): string[] {
  const group = groups.find((candidate) => candidate.groupId === groupId);
  if (!group) return [...selected];
  const inGroup = new Set(group.options.map((option) => option.optionId));
  if (selected.includes(optionId)) return selected.filter((id) => id !== optionId);
  if (!group.multiple) return [...selected.filter((id) => !inGroup.has(id)), optionId];
  const countInGroup = selected.filter((id) => inGroup.has(id)).length;
  if (group.maxSelected != null && countInGroup >= group.maxSelected) return [...selected];
  return [...selected, optionId];
}

/** The first group whose min/max the selection breaks, or null when valid. */
export function invalidOptionGroup(
  groups: readonly SellableOptionGroupResponse[],
  selected: readonly string[]
): SellableOptionGroupResponse | null {
  for (const group of groups) {
    const count = group.options.filter((option) => selected.includes(option.optionId)).length;
    const min = group.multiple ? group.minSelected : Math.min(group.minSelected, 1);
    const max = group.multiple ? group.maxSelected : 1;
    if (count < min) return group;
    if (max != null && count > max) return group;
  }
  return null;
}

/** Unit price estimate: the base, replaced by a fixed-price option, plus
 *  added options — the backend's pipeline step 1 (PriceEffectKind:
 *  FixedPrice replaces, AddAmount adds, anything without an amount is
 *  ignored). */
export function estimateUnitPrice(
  entry: Pick<SellableEntryResponse, "unitPrice">,
  groups: readonly SellableOptionGroupResponse[],
  selected: readonly string[]
): number | null {
  let base = entry.unitPrice;
  let delta = 0;
  for (const group of groups) {
    for (const option of group.options) {
      if (!selected.includes(option.optionId) || option.amount == null) continue;
      const kind = option.effectKind.toLowerCase();
      if (kind.includes("fixed")) base = option.amount;
      else delta += option.amount;
    }
  }
  return base == null ? null : base + delta;
}

export function optionNames(groups: readonly SellableOptionGroupResponse[], selected: readonly string[]): string[] {
  return groups.flatMap((group) =>
    group.options.filter((option) => selected.includes(option.optionId)).map((option) => option.name)
  );
}

// ---- Fulfilment ------------------------------------------------------------------

/** The Menu module's own fulfilment vocabulary (BACKEND_GAPS 2.18) — offered
 *  when every entry takes any fulfilment and so names none itself. */
export const DEFAULT_FULFILMENT_CODES: readonly string[] = ["on-site", "collection", "delivery"];

/** The fulfilment codes an order from this catalog could use: the union of
 *  what its available entries name, else the default vocabulary. */
export function fulfilmentChoices(catalog: Pick<SellableCatalogResponse, "entries">): string[] {
  const codes = new Set<string>();
  for (const entry of catalog.entries) for (const code of entry.fulfilmentCodes) codes.add(code);
  return codes.size > 0 ? [...codes] : [...DEFAULT_FULFILMENT_CODES];
}

export function entryOffersFulfilment(entry: Pick<SellableEntryResponse, "allFulfilment" | "fulfilmentCodes">, code: string): boolean {
  return entry.allFulfilment || entry.fulfilmentCodes.some((candidate) => candidate.toLowerCase() === code.toLowerCase());
}

// ---- Take order -------------------------------------------------------------------

export interface TakeOrderDraft {
  businessId: string;
  branchId: string | null;
  sourceCode: string;
  fulfilmentCode: string;
  place: { containerId: string; resourceId: string } | null;
  attendeeCount: number | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  deliveryAddress: string;
  customerNote: string;
  internalNote: string;
  lines: readonly DraftLine[];
}

const blankToNull = (value: string): string | null => (value.trim() === "" ? null : value.trim());

export function buildTakeOrderRequest(draft: TakeOrderDraft): TakeOrderRequest {
  return {
    businessId: draft.businessId,
    branchId: draft.branchId,
    sourceCode: draft.sourceCode,
    fulfilmentCode: draft.fulfilmentCode,
    resourceContainerId: draft.place?.containerId ?? null,
    resourceId: draft.place?.resourceId ?? null,
    visitSourceKey: null,
    visitCode: null,
    attendeeCount: draft.attendeeCount != null && draft.attendeeCount > 0 ? draft.attendeeCount : null,
    customerName: blankToNull(draft.customerName),
    customerPhone: blankToNull(draft.customerPhone),
    customerEmail: blankToNull(draft.customerEmail),
    customerExternalRef: null,
    deliveryAddress: blankToNull(draft.deliveryAddress),
    customerNote: blankToNull(draft.customerNote),
    internalNote: blankToNull(draft.internalNote),
    tags: null,
    lines: toOrderLineRequests(draft.lines),
  };
}

/** Rebuilds a cart from GET /{id}/duplicate, naming and pricing each line
 *  from the catalog it is re-taken from. Lines whose entry the catalog no
 *  longer has are dropped (the template already lists what it left out). */
export function draftFromTemplate(
  template: Pick<DuplicateOrderTemplateResponse, "lines">,
  catalog: SellableCatalogResponse
): DraftLine[] {
  let lines: DraftLine[] = [];
  for (const request of template.lines) {
    if (request.catalogId !== catalog.catalogId) continue;
    const entry = catalog.entries.find((candidate) => candidate.entryId === request.entryId);
    if (!entry) continue;
    const groups = groupsForEntry(catalog, entry);
    const selected = request.optionIds ?? [];
    lines = addDraftLine(lines, {
      catalogId: request.catalogId,
      entryId: request.entryId,
      name: entry.name,
      unitPrice: estimateUnitPrice(entry, groups, selected),
      optionIds: [...selected],
      optionNames: optionNames(groups, selected),
      quantity: request.quantity,
      note: request.note,
    });
  }
  return lines;
}
