// The Menu API's business-level catalog — items, modifier groups, offers and
// labels shared across every menu — plus the menu-level reads that have no
// place in the builder's diff-and-push save (preview, timeline, versions).
//
// The builder still edits one local Menu and `pushMenu` reconciles it. What is
// here acts on the server directly, for things a local draft cannot express:
// reusing an existing item or group, copying or deleting it for every menu at
// once, moving a placement between sections without re-creating it.
import {
  ApiError,
  accessCodeImageUrl,
  createLabel,
  deleteCatalogItem,
  deleteLabel,
  deleteModifierGroup,
  duplicateCatalogItem,
  duplicateOffer,
  getCatalogSettings,
  getMenuVersion,
  getModifierGroup,
  getOffer,
  listBranchProfiles,
  listBulkOperations,
  listCatalogItems,
  listFactTypes,
  listLabels,
  listModifierGroups,
  listOffers,
  listSchedulePresets,
  listThemePresets,
  movePlacement,
  placeItemInSections,
  placeSectionEntries,
  previewAvailabilityTimeline,
  previewMenuDraft,
  quoteOfferPrice,
  saveBuilderProgress,
  updateLabel,
  upsertBranchProfile,
  type AccessCodeImageFormat,
  type BranchProfileResponse,
  type BulkOperationSummaryResponse,
  type CatalogItemSummaryResponse,
  type FactTypeResponse,
  type LabelKind,
  type LabelResponse,
  type LocalizedMap,
  type MenuBuilderStep,
  type ModifierGroupSummaryResponse,
  type OfferPriceQuoteResponse,
  type OfferSummaryResponse,
  type SchedulePresetResponse,
  type ThemePresetsResponse,
} from "@octopus/api-client";
import { isServerId, loadItem, nutritionFieldOf, toGroup } from "./menu-sync";
import { ruleOf, toOffer } from "./offers-sync";
import type { Item, ModifierGroup, Offer } from "./menu";

const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const loc = (s: string): LocalizedMap => ({ en: s, ar: s });

/** The message a screen shows for a failed call: the server's detail or
 *  error code when it sent one, otherwise the fallback. */
export function describeApiError(err: unknown, fallback = "Request failed"): string {
  if (err instanceof ApiError) return err.problem?.detail ?? err.problem?.errorCode ?? err.message;
  return err instanceof Error ? err.message : fallback;
}

export function errorCodeOf(err: unknown): string | null {
  return err instanceof ApiError ? (err.problem?.errorCode ?? null) : null;
}

export { isServerId, nutritionFieldOf };

// ---- items -------------------------------------------------------------------

export async function searchCatalogItems(
  businessId: string,
  params: { search?: string; unplaced?: boolean }
): Promise<CatalogItemSummaryResponse[]> {
  const res = await listCatalogItems(businessId, {
    search: params.search?.trim() || undefined,
    unplaced: params.unplaced || undefined,
    pageSize: 100,
  });
  return res.data;
}

export { loadItem };

/** Copies a saved item on the server (Draft, SKU cleared) and reads the copy
 *  back in the builder's shape. */
export async function duplicateItemOnServer(businessId: string, item: Item): Promise<Item> {
  const copy = await duplicateCatalogItem(
    businessId,
    item.id,
    { businessId, itemId: item.id, name: loc(`${item.name} (copy)`) },
    key()
  );
  return loadItem(businessId, copy.id);
}

/** Deletes the item from the catalog and so from every section of every menu.
 *  Still refused (409 menu.item.in-use-by-offer) while an offer contains it. */
export function deleteItemEverywhere(businessId: string, itemId: string): Promise<void> {
  return deleteCatalogItem(businessId, itemId, { removeFromSections: true });
}

/** Places the same item — not a copy — in more sections. */
export function placeItemInMoreSections(businessId: string, itemId: string, sectionIds: string[]): Promise<void> {
  return placeItemInSections(businessId, itemId, { sectionIds });
}

/** Moves an item's placement from one section to another in a single call,
 *  keeping the placement rather than removing and re-adding it. */
export async function moveItemBetweenSections(
  businessId: string,
  menuId: string,
  fromSectionId: string,
  toSectionId: string,
  itemId: string
): Promise<void> {
  // The API has no GET-one-section; an empty placement call returns it whole.
  const from = await placeSectionEntries(businessId, menuId, fromSectionId, { entries: [], expectedVersion: null });
  const placement = from.placements.find((p) => p.targetId === itemId);
  if (!placement) throw new Error("menu.placement.target-not-found");
  await movePlacement(businessId, menuId, { fromSectionId, placementId: placement.id, toSectionId });
}

// ---- modifier groups -------------------------------------------------------------

export async function listReusableGroups(businessId: string): Promise<ModifierGroupSummaryResponse[]> {
  return (await listModifierGroups(businessId)).data;
}

export async function loadGroup(businessId: string, groupId: string): Promise<ModifierGroup> {
  return toGroup(await getModifierGroup(businessId, groupId));
}

/** Deletes the group for good, detaching it from every item that uses it.
 *  Groups version as `contentVersion`, which is what the delete compares. */
export function deleteGroupEverywhere(businessId: string, group: ModifierGroupSummaryResponse): Promise<void> {
  return deleteModifierGroup(businessId, group.id, { detachFromItems: true, expectedVersion: group.contentVersion });
}

// ---- offers ----------------------------------------------------------------------

export async function listAllOffers(businessId: string): Promise<OfferSummaryResponse[]> {
  return (await listOffers(businessId)).data;
}

export async function loadOffer(businessId: string, offerId: string): Promise<Offer> {
  return toOffer(businessId, await getOffer(businessId, offerId));
}

/** The server copy starts inactive with a generated slug. What the API has no
 *  field for (per-item prices, VAT, "customer can change") is carried over. */
export async function duplicateOfferOnServer(businessId: string, offer: Offer): Promise<Offer> {
  const copy = await duplicateOffer(
    businessId,
    offer.id,
    { businessId, offerId: offer.id, name: loc(`${offer.name} (copy)`), slug: null },
    key()
  );
  return toOffer(businessId, copy, { ...offer, id: copy.id });
}

/** The platform's own price for the offer as currently edited, or null when
 *  it cannot be quoted yet (no items, or items not saved to the server). */
export async function quoteOffer(
  businessId: string,
  offer: Offer,
  currency: string
): Promise<OfferPriceQuoteResponse | null> {
  const components = offer.entries.map((e) => ({ catalogItemId: e.itemId, quantity: e.qty }));
  if (components.length === 0 || !components.every((c) => isServerId(c.catalogItemId))) return null;
  return quoteOfferPrice(businessId, { components, pricingRule: ruleOf(offer, currency) });
}

/** The business's catalog currency (the offer quote needs one). */
export async function menuCurrency(businessId: string): Promise<string> {
  return (await getCatalogSettings(businessId)).currency ?? "SAR";
}

// ---- labels and facts ------------------------------------------------------------

/** Every label, seeded ones first (100 is the API's page ceiling). */
export async function listAllLabels(businessId: string): Promise<LabelResponse[]> {
  return (await listLabels(businessId, { pageSize: 100 })).data;
}

/** A merchant-typed name as a label code: ^[a-z][a-z0-9-]{1,40}$. */
export function labelCodeFor(name: string): string {
  let code = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!/^[a-z]/.test(code)) code = `l-${code}`.replace(/-+$/, "");
  if (code.length < 2) code = `${code}-${Date.now().toString(36).slice(-4)}`;
  return code.slice(0, 41).replace(/-+$/, "");
}

export function createNamedLabel(
  businessId: string,
  kind: LabelKind,
  label: LocalizedMap,
  code?: string
): Promise<LabelResponse> {
  const name = label.en || label.ar || Object.values(label)[0] || "";
  return createLabel(businessId, { businessId, kind, code: code || labelCodeFor(name), label }, key());
}

export function renameLabel(businessId: string, labelId: string, label: LocalizedMap): Promise<LabelResponse> {
  return updateLabel(businessId, labelId, { label });
}

export function removeLabel(businessId: string, labelId: string): Promise<void> {
  return deleteLabel(businessId, labelId);
}

/** Display text in `locale`, or null when the label has none (seeded labels
 *  come back with an empty map — the caller falls back to its own copy). */
export function labelText(label: LabelResponse, locale: string): string | null {
  return label.label[locale] || label.label.en || label.label.ar || Object.values(label.label)[0] || null;
}

export function listFacts(businessId: string): Promise<FactTypeResponse[]> {
  return listFactTypes(businessId);
}

// ---- branches ----------------------------------------------------------------------

export async function listBranchTimeZones(businessId: string): Promise<BranchProfileResponse[]> {
  return (await listBranchProfiles(businessId, 1, 100)).data;
}

export function setBranchTimeZone(businessId: string, branchId: string, timeZoneId: string): Promise<BranchProfileResponse> {
  return upsertBranchProfile(businessId, branchId, { timeZoneId });
}

// ---- menus ---------------------------------------------------------------------------

const STEP: Record<string, MenuBuilderStep> = {
  sections: "Sections",
  items: "Items",
  theme: "Theme",
  review: "Review",
};

/** Records where the owner is in the builder (the step only — completeness is
 *  derived server-side from the content). */
// Concurrent writes to the same menu row 409/500 on the backend's row version,
// so progress saves are chained per menu and a repeat of the last step is skipped.
const builderSteps = new Map<string, { step: string; job: Promise<unknown> }>();

export function saveBuilderStep(businessId: string, menuId: string, step: string): Promise<unknown> {
  const s = STEP[step];
  if (!s || !isServerId(menuId)) return Promise.resolve();
  const last = builderSteps.get(menuId);
  if (last?.step === s) return last.job;
  const job = (last?.job ?? Promise.resolve())
    .catch(() => undefined)
    .then(() => saveBuilderProgress(businessId, menuId, { step: s }));
  builderSteps.set(menuId, { step: s, job });
  job.catch(() => {
    if (builderSteps.get(menuId)?.job === job) builderSteps.delete(menuId);
  });
  return job;
}

export function previewDraft(businessId: string, menuId: string, lang?: string) {
  return previewMenuDraft(businessId, menuId, lang ? { lang } : {});
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** When the saved schedule actually serves the menu over the next `days` days. */
export function servingTimeline(businessId: string, menuId: string, days = 7) {
  const from = new Date();
  const to = new Date(from);
  to.setDate(to.getDate() + days - 1);
  return previewAvailabilityTimeline(businessId, menuId, { from: ymd(from), to: ymd(to) });
}

export function listScheduleCodes(businessId: string): Promise<SchedulePresetResponse[]> {
  return listSchedulePresets(businessId);
}

export function listThemeChoices(businessId: string): Promise<ThemePresetsResponse> {
  return listThemePresets(businessId);
}

export function readMenuVersion(businessId: string, menuId: string, version: number) {
  return getMenuVersion(businessId, menuId, version);
}

export async function recentBulkOperations(businessId: string): Promise<BulkOperationSummaryResponse[]> {
  return (await listBulkOperations(businessId, 1, 20)).data;
}

// ---- access code image -------------------------------------------------------------

/** The QR image as a Blob. The route is authenticated (pipeline permission +
 *  `menu:access-codes` feature), so it is fetched with the session's bearer
 *  token rather than used as a bare <img src>. `/api` is the base path
 *  session-bridge configures for every api-client call. */
export async function fetchAccessCodeImage(
  businessId: string,
  codeId: string,
  format: AccessCodeImageFormat,
  token: string | null
): Promise<Blob> {
  const res = await fetch(`/api${accessCodeImageUrl(businessId, codeId, { format, size: format === "png" ? 16 : undefined })}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let problem = null;
    try {
      problem = await res.json();
    } catch {
      // Not problem+json (a proxy page, say) — leave it null.
    }
    throw new ApiError(res.status, problem);
  }
  return res.blob();
}
