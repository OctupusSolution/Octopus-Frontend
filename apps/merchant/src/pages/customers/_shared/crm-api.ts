// Bridge between the CRM API (US-017) and the module's `CustomerRecord` view model.
//
// The screens were built on one flat record per customer. The API splits that
// across the list row, the profile, the notes list and profile-defined
// attributes, so every server row is converted to that shape here, and the
// screens' events are converted back into API calls. Nothing else in the module
// talks to the API.
import {
  ApiError,
  addCrmCustomerNote,
  blockCrmCustomer,
  bulkDeleteCrmCustomers,
  bulkTagCrmCustomers,
  createCrmCampaignDraft,
  createCrmCustomer,
  createCrmSegment,
  createCrmTag,
  deleteCrmCampaignDraft,
  deleteCrmCustomer,
  estimateCrmAudience,
  exportCrmCustomers,
  getCrmCustomer,
  getCrmDashboard,
  listCrmCustomerActivities,
  listCrmCustomerNotes,
  listCrmCustomerTransactions,
  listCrmCustomers,
  listCrmSegments,
  listCrmTags,
  mergeCrmCustomers,
  sendCrmCampaign,
  unblockCrmCustomer,
  updateCrmCustomer,
  updateCrmCustomerPreferences,
  type CrmAttributeValueRequest,
  type CrmCampaignDeliveryDto,
  type CrmChannel,
  type CrmCriteriaConditionDto,
  type CrmCustomerActivityResponse,
  type CrmCustomerAttributeDto,
  type CrmCustomerConsentDto,
  type CrmCustomerCriteriaDto,
  type CrmCustomerListItemResponse,
  type CrmCustomerProfileResponse,
  type CrmCustomerTransactionResponse,
  type CrmDashboardResponse,
  type CrmNoteResponse,
} from "@octopus/api-client";
import type { ListFilters } from "./list-filter";
import type { AgeRange, AudienceFilters, VisitFrequency } from "./send-message-wizard/audience";
import type { SendTiming } from "./send-message-wizard/review-send-step";
import type {
  CommunicationChannel,
  CustomerRecord,
  MarketingConsent,
  OrderSummary,
  PaymentSummary,
  ReservationStatus,
  ReservationSummary,
} from "./types";

const LIST_PAGE_SIZE = 100;

// Every mutation needs the customer's current version, which the record has no
// field for, so it is remembered here from each response that carries one.
const versions = new Map<string, number>();

function versionOf(id: string): number {
  const version = versions.get(id);
  if (version === undefined) throw new Error(`Customer ${id} has not been loaded from the server.`);
  return version;
}

// The record's dates are plain yyyy-MM-dd; the API's instants are cut to their
// UTC day. A customer who never visited has no date at all (formatDate shows a dash).
const day = (instantUtc: string | null | undefined): string => (instantUtc ? instantUtc.slice(0, 10) : "");

/** "gluten-free" -> "Gluten free". The localized labels live on GET /attributes,
 *  which is not wired yet, so option keys are shown in this readable form. */
function label(optionKey: string): string {
  const words = optionKey.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The reverse of `label`: "Gluten free" -> "gluten-free". */
const optionKey = (text: string): string => text.trim().toLowerCase().replace(/\s+/g, "-");

function attribute(attributes: CrmCustomerAttributeDto[], key: string): CrmCustomerAttributeDto | undefined {
  return attributes.find((a) => a.key === key);
}

const options = (a: CrmCustomerAttributeDto | undefined): string[] => (a?.optionKeys ?? []).map(label);

// The record has one marketing flag; the API has one consent per channel. Any
// granted channel reads as opted in.
function toMarketingConsent(consent: CrmCustomerConsentDto): MarketingConsent {
  return [consent.email, consent.sms, consent.whatsApp].some((c) => c.status === "Granted") ? "Opted in" : "Opted out";
}

const CHANNELS: Record<string, CommunicationChannel> = { WhatsApp: "WhatsApp", Sms: "SMS", Email: "Email" };
const CHANNEL_CODES: Record<CommunicationChannel, string> = { WhatsApp: "WhatsApp", SMS: "Sms", Email: "Email" };

function toChannels(preferred: string[]): CommunicationChannel[] {
  return preferred.map((c) => CHANNELS[c]).filter((c): c is CommunicationChannel => c !== undefined);
}

/** A list row. The fields only the profile carries stay empty until
 *  `loadCustomer` fills them in when the detail page opens. */
export function toListRecord(row: CrmCustomerListItemResponse): CustomerRecord {
  return {
    id: row.id,
    firstName: row.firstName,
    lastName: row.lastName,
    gender: "Male",
    avatarUrl: row.avatar?.url,
    tags: row.tags.map((t) => t.name),
    phone: row.phoneE164,
    email: row.email ?? "",
    isBlocked: row.status === "Blocked",
    visits: row.visits,
    totalSpendSar: row.totalSpend.amount,
    lastVisit: day(row.lastVisitAtUtc),
    upcomingReservation: row.upcoming?.scheduledAtUtc,
    loyaltyPoints: 0,
    avgSpendSar: row.visits > 0 ? row.totalSpend.amount / row.visits : 0,
    customerSince: row.customerSince,
    firstVisit: "",
    preferredBranch: "",
    preferredAreaTable: "",
    marketingConsent: "Opted out",
    cuisinePreference: [],
    dietaryPreference: "",
    occasion: "",
    visitTime: "",
    communicationPreference: [],
    specialRequests: "",
    notes: [],
    recentReservations: [],
    recentOrders: [],
    recentPayments: [],
  };
}

/** The full record for the detail page. `base` is the list row's record, kept
 *  for the figures the profile leaves null until the projection has run. */
export function toProfileRecord(
  profile: CrmCustomerProfileResponse,
  notes: CrmNoteResponse[],
  base?: CustomerRecord
): CustomerRecord {
  const { customer, insights } = profile;
  const visits = insights?.visits ?? base?.visits ?? 0;
  const totalSpend = insights?.totalSpend.amount ?? base?.totalSpendSar ?? 0;
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    gender: customer.gender === "Female" ? "Female" : "Male",
    avatarUrl: customer.avatar?.url,
    dateOfBirth: customer.dateOfBirth ?? undefined,
    tags: customer.tags.map((t) => t.name),
    phone: customer.phoneE164,
    email: customer.email ?? "",
    isBlocked: customer.status === "Blocked",
    visits,
    totalSpendSar: totalSpend,
    lastVisit: day(insights?.lastVisitAtUtc) || base?.lastVisit || "",
    upcomingReservation: profile.upcoming?.scheduledAtUtc,
    loyaltyPoints: profile.loyaltyPoints ?? 0,
    avgSpendSar: insights?.avgSpend?.amount ?? (visits > 0 ? totalSpend / visits : 0),
    customerSince: customer.customerSince,
    firstVisit: day(insights?.firstVisitAtUtc),
    // The API holds the branch's id; branch names are not loaded here yet.
    preferredBranch: "",
    preferredAreaTable: attribute(customer.attributes, "preferred-location")?.locationLabel ?? "",
    vipSince: day(profile.vipSince) || undefined,
    referredBy: customer.referredBy ?? customer.sourceCode ?? undefined,
    marketingConsent: toMarketingConsent(customer.consent),
    cuisinePreference: options(attribute(customer.attributes, "cuisine")),
    dietaryPreference: options(attribute(customer.attributes, "dietary")).join(", "),
    occasion: options(attribute(customer.attributes, "occasion")).join(", "),
    visitTime: options(attribute(customer.attributes, "visit-time")).join(", "),
    communicationPreference: toChannels(customer.preferredChannels),
    specialRequests: attribute(customer.attributes, "special-requests")?.text ?? "",
    notes: notes.map((n) => ({ date: day(n.createdAtUtc), text: n.text })),
    // Filled from the activities and transactions lists by fetchCustomer.
    recentReservations: base?.recentReservations ?? [],
    recentOrders: base?.recentOrders ?? [],
    recentPayments: base?.recentPayments ?? [],
  };
}

/** A business without the CRM feature or the read permission (403), or a
 *  backend that does not have the module yet (404): the screens keep their
 *  sample data instead of failing. */
function unavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 403 || err.status === 404);
}

/** Every customer of the business, or null when CRM is not available to it. */
export async function loadCustomers(businessId: string): Promise<CustomerRecord[] | null> {
  try {
    const out: CustomerRecord[] = [];
    for (let page = 1; ; page += 1) {
      const list = await listCrmCustomers(businessId, { page, pageSize: LIST_PAGE_SIZE });
      for (const row of list.data) {
        versions.set(row.id, row.version);
        out.push(toListRecord(row));
      }
      if (list.data.length < LIST_PAGE_SIZE) return out;
    }
  } catch (err) {
    if (unavailable(err)) return null;
    throw err;
  }
}

async function fetchCustomer(businessId: string, customerId: string, base?: CustomerRecord): Promise<CustomerRecord> {
  const [profile, notes, history] = await Promise.all([
    getCrmCustomer(businessId, customerId),
    listCrmCustomerNotes(businessId, customerId, { pageSize: LIST_PAGE_SIZE }),
    fetchHistory(businessId, customerId),
  ]);
  versions.set(profile.customer.id, profile.customer.version);
  return { ...toProfileRecord(profile, notes.data, base), ...history };
}

/** One customer with their notes, or null when they cannot be read. */
export async function loadCustomer(
  businessId: string,
  customerId: string,
  base?: CustomerRecord
): Promise<CustomerRecord | null> {
  try {
    return await fetchCustomer(businessId, customerId, base);
  } catch (err) {
    if (unavailable(err)) return null;
    throw err;
  }
}

/** The message key for a refused action, by the server's error code. */
export function actionErrorKey(err: unknown): string {
  const code = err instanceof ApiError ? err.problem?.errorCode : undefined;
  switch (code) {
    case "crm.customer.phone-taken":
      return "customers.error.phoneTaken";
    case "crm.concurrency.stale":
      return "customers.error.stale";
    case "crm.attribute.value-invalid":
      return "customers.error.invalidPreference";
    case "crm.campaign.channel-unavailable":
      return "customers.error.channelUnavailable";
    case "crm.campaign.sending-disabled":
      return "customers.error.sendingDisabled";
    case "crm.campaign.quota-exceeded":
      return "customers.error.quotaExceeded";
    case "crm.criteria.invalid":
      return "customers.error.invalidFilters";
    case "crm.segment.name-taken":
      return "customers.error.segmentNameTaken";
    case "authorization.forbidden":
    case "entitlements.feature-disabled":
      return "customers.error.forbidden";
    default:
      return "customers.error.generic";
  }
}

// ---- actions ----------------------------------------------------------------
// Each one sends the change and resolves with the customer as the server now
// holds it, so the store never has to guess what a write did.

// Tags are attached by id; the screens work in names. A name the business does
// not have yet is created first, in the palette's neutral colour.
const NEW_TAG_COLOR = "slate";

/** The business's tag ids by lower-cased name (names are unique ignoring case). */
async function tagsByName(businessId: string): Promise<Map<string, string>> {
  const byName = new Map<string, string>();
  for (let page = 1; ; page += 1) {
    const list = await listCrmTags(businessId, { page, pageSize: LIST_PAGE_SIZE });
    for (const tag of list.data) byName.set(tag.name.toLowerCase(), tag.id);
    if (list.data.length < LIST_PAGE_SIZE) return byName;
  }
}

async function tagIdsFor(businessId: string, names: string[]): Promise<string[]> {
  if (names.length === 0) return [];
  const byName = await tagsByName(businessId);
  const ids: string[] = [];
  for (const name of names) {
    const existing = byName.get(name.toLowerCase());
    if (existing) {
      ids.push(existing);
      continue;
    }
    try {
      const created = await createCrmTag(businessId, { name, colorKey: NEW_TAG_COLOR });
      byName.set(name.toLowerCase(), created.id);
      ids.push(created.id);
    } catch (err) {
      // The name was taken since the list was read (another member of staff, or
      // the business's seeded tags appearing with its first command): use that tag.
      if (!(err instanceof ApiError) || err.problem?.errorCode !== "crm.tag.name-taken") throw err;
      const taken = (await tagsByName(businessId)).get(name.toLowerCase());
      if (!taken) throw err;
      ids.push(taken);
    }
  }
  return ids;
}

// The Add form's source dropdown, in the codes the restaurant profile seeds
// (GET /form-options is not wired yet). Anything else is kept as "referred by".
const SOURCE_CODES: Record<string, string> = {
  "Walk-in": "walk-in",
  Website: "website",
  Instagram: "social-media",
  Referral: "referral",
};

/** Saves the Add Customer form: the customer with its first note, then its tags.
 *  The tags follow in a second call because a business's seeded tags (VIP) only
 *  exist once its first command has run, and until then creating one by that
 *  name is refused as taken while the tag list still reads empty. */
export async function createCustomer(businessId: string, draft: CustomerRecord): Promise<CustomerRecord> {
  const sourceCode = draft.referredBy ? SOURCE_CODES[draft.referredBy] : undefined;
  const channels = draft.communicationPreference;
  const granted = (channel: CommunicationChannel) =>
    draft.marketingConsent === "Opted in" && channels.includes(channel) ? ("Granted" as const) : null;
  const created = await createCrmCustomer(
    businessId,
    {
      firstName: draft.firstName,
      lastName: draft.lastName,
      phone: draft.phone,
      email: draft.email || null,
      dateOfBirth: draft.dateOfBirth ?? null,
      gender: draft.gender,
      sourceCode: sourceCode ?? null,
      referredBy: sourceCode ? null : draft.referredBy ?? null,
      preferredChannels: channels.map((c) => CHANNEL_CODES[c]),
      // Consent is only ever Granted where staff switched marketing on for that channel.
      consent: { email: granted("Email"), sms: granted("SMS"), whatsApp: granted("WhatsApp") },
      note: draft.notes[0]?.text ?? null,
    },
    crypto.randomUUID()
  );
  if (draft.tags.length > 0) {
    await bulkTagCrmCustomers(businessId, {
      customerIds: [created.customer.id],
      addTagIds: await tagIdsFor(businessId, draft.tags),
    });
  }
  return fetchCustomer(businessId, created.customer.id);
}

export async function setCustomerBlocked(
  businessId: string,
  customer: CustomerRecord,
  blocked: boolean
): Promise<CustomerRecord> {
  const res = blocked
    ? await blockCrmCustomer(businessId, customer.id, versionOf(customer.id))
    : await unblockCrmCustomer(businessId, customer.id, versionOf(customer.id));
  versions.set(res.id, res.version);
  return { ...customer, isBlocked: res.status === "Blocked" };
}

/** Deletes one or many; many is all or nothing on the server. */
export async function deleteCustomers(businessId: string, ids: string[]): Promise<void> {
  if (ids.length === 1) {
    await deleteCrmCustomer(businessId, ids[0], versionOf(ids[0]));
  } else {
    await bulkDeleteCrmCustomers(businessId, {
      items: ids.map((customerId) => ({ customerId, expectedVersion: versionOf(customerId) })),
    });
  }
  ids.forEach((id) => versions.delete(id));
}

export async function addCustomerNote(businessId: string, customer: CustomerRecord, text: string): Promise<CustomerRecord> {
  const note = await addCrmCustomerNote(businessId, customer.id, text);
  return { ...customer, notes: [...customer.notes, { date: day(note.createdAtUtc), text: note.text }] };
}

export async function addCustomersTag(businessId: string, ids: string[], tag: string): Promise<void> {
  const [tagId] = await tagIdsFor(businessId, [tag]);
  await bulkTagCrmCustomers(businessId, { customerIds: ids, addTagIds: [tagId] });
}

/** Merges the rest into the first id and resolves with the merged customer. */
export async function mergeCustomerRecords(businessId: string, ids: string[]): Promise<CustomerRecord> {
  const [canonicalId, ...mergedIds] = ids;
  const result = await mergeCrmCustomers(businessId, {
    canonicalId,
    mergedIds,
    expectedVersions: Object.fromEntries(ids.map((id) => [id, versionOf(id)])),
  });
  mergedIds.forEach((id) => versions.delete(id));
  return fetchCustomer(businessId, result.canonicalCustomerId);
}

/** The About card's "referred by". The update is a full replace, so the rest of
 *  the customer is read first and sent back unchanged. */
export async function saveCustomerReferredBy(
  businessId: string,
  customer: CustomerRecord,
  referredBy: string | undefined
): Promise<CustomerRecord> {
  const { customer: current } = await getCrmCustomer(businessId, customer.id);
  const res = await updateCrmCustomer(businessId, customer.id, {
    expectedVersion: current.version,
    firstName: current.firstName,
    lastName: current.lastName,
    phone: current.phoneE164,
    email: current.email,
    dateOfBirth: current.dateOfBirth,
    gender: current.gender,
    preferredLanguage: current.preferredLanguage,
    sourceCode: current.sourceCode,
    referredBy: referredBy ?? null,
    preferredBranchId: current.preferredBranchId,
    preferredChannels: current.preferredChannels,
    customerSinceExplicit: current.customerSinceExplicit,
  });
  versions.set(res.id, res.version);
  return fetchCustomer(businessId, customer.id, customer);
}

export interface PreferenceValues {
  cuisinePreference: string[];
  dietaryPreference: string;
  occasion: string;
  visitTime: string;
  specialRequests: string;
}

const list = (text: string): string[] => text.split(",").map((s) => s.trim()).filter(Boolean);

/** The Preferences card. The form is free text and the API takes the profile's
 *  option keys, so a value the profile does not define is refused (422
 *  `crm.attribute.value-invalid`). */
export async function saveCustomerPreferences(
  businessId: string,
  customer: CustomerRecord,
  values: PreferenceValues
): Promise<CustomerRecord> {
  const select = (key: string, texts: string[]): CrmAttributeValueRequest => ({ key, optionKeys: texts.map(optionKey) });
  const res = await updateCrmCustomerPreferences(businessId, customer.id, {
    expectedVersion: versionOf(customer.id),
    values: [
      select("cuisine", values.cuisinePreference),
      select("dietary", list(values.dietaryPreference)),
      select("occasion", list(values.occasion)),
      select("visit-time", list(values.visitTime)),
      { key: "special-requests", text: values.specialRequests.trim() || null },
    ],
  });
  versions.set(res.id, res.version);
  return fetchCustomer(businessId, customer.id, customer);
}

// ---- history ----------------------------------------------------------------

const RECENT = 5;

// The record's three reservation states, from the engagement's own: anything
// that did not or will not happen reads as cancelled, an unconfirmed booking as
// pending, the rest as confirmed.
function toReservationStatus(state: string, statusCode: string): ReservationStatus {
  if (["Cancelled", "Missed", "NoShow", "Expired"].includes(state) || ["Cancelled", "NoShow", "Expired"].includes(statusCode)) return "Cancelled";
  return statusCode === "Pending" ? "Pending" : "Confirmed";
}

export function toReservations(activities: CrmCustomerActivityResponse[]): ReservationSummary[] {
  return activities.flatMap((a) =>
    a.engagement?.scheduledAtUtc
      ? [
          {
            date: a.engagement.scheduledAtUtc,
            table: a.engagement.locationLabel ?? a.engagement.reference,
            guests: a.engagement.attendeeCount ?? 0,
            status: toReservationStatus(a.engagement.state, a.engagement.statusCode),
          },
        ]
      : []
  );
}

export function toOrders(activities: CrmCustomerActivityResponse[]): OrderSummary[] {
  return activities.flatMap((a) =>
    a.purchase
      ? [{ id: a.purchase.reference, date: day(a.purchase.placedAtUtc), items: a.purchase.summary ?? "", totalSar: a.purchase.total?.amount ?? 0 }]
      : []
  );
}

/** Payments only; refunds are not part of the card. The API never returns card
 *  data, so the method code stands where the card number was. */
export function toPayments(transactions: CrmCustomerTransactionResponse[]): PaymentSummary[] {
  return transactions
    .filter((tx) => tx.kind === "Payment")
    .map((tx) => ({
      date: day(tx.occurredAtUtc),
      cardLast4: "",
      method: tx.methodCode ?? undefined,
      amountSar: tx.amount.amount,
      status: tx.state === "Paid" ? "PAID" : "PENDING",
    }));
}

/** The detail page's three history cards. They come from a projection the
 *  Worker builds, so a failure here leaves them empty rather than hiding the customer. */
async function fetchHistory(
  businessId: string,
  customerId: string
): Promise<Pick<CustomerRecord, "recentReservations" | "recentOrders" | "recentPayments">> {
  try {
    const [engagements, purchases, transactions] = await Promise.all([
      listCrmCustomerActivities(businessId, customerId, { kind: "Engagement", pageSize: RECENT }),
      listCrmCustomerActivities(businessId, customerId, { kind: "Purchase", pageSize: RECENT }),
      listCrmCustomerTransactions(businessId, customerId, { pageSize: RECENT }),
    ]);
    return {
      recentReservations: toReservations(engagements.data),
      recentOrders: toOrders(purchases.data),
      recentPayments: toPayments(transactions.data),
    };
  } catch (err) {
    console.error("Loading the customer's history failed", err);
    return { recentReservations: [], recentOrders: [], recentPayments: [] };
  }
}

// ---- dashboard --------------------------------------------------------------

export interface CustomerStats {
  total: { value: number; delta: string };
  active: { value: number; delta: string };
  newThisMonth: { value: number; delta: string };
  vip: { value: number; delta: string };
  returning: { value: number; delta: string };
  totalSpend: { display: string; delta: string };
}

// No baseline to compare with reads as a dash, not as 0%.
const delta = (percent: number | null): string => (percent === null ? "—" : `${percent}%`);

export function toStats(dashboard: CrmDashboardResponse): CustomerStats {
  const { kpis } = dashboard;
  const kpi = (k: { value: number; deltaPercent: number | null }) => ({ value: k.value, delta: delta(k.deltaPercent) });
  const spend = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(kpis.spendThisMonth.value.amount);
  return {
    total: kpi(kpis.totalCustomers),
    active: kpi(kpis.activeCustomers),
    newThisMonth: kpi(kpis.newThisMonth),
    vip: kpi(kpis.vipCustomers),
    returning: kpi(kpis.returningCustomers),
    // The API's spend figure is this month's, not all time.
    totalSpend: { display: `${kpis.spendThisMonth.value.currency} ${spend}`, delta: delta(kpis.spendThisMonth.deltaPercent) },
  };
}

/** The stat cards, or null when the caller may not read insights. */
export async function loadStats(businessId: string): Promise<CustomerStats | null> {
  try {
    return toStats(await getCrmDashboard(businessId));
  } catch (err) {
    if (unavailable(err)) return null;
    throw err;
  }
}

// ---- criteria ---------------------------------------------------------------
// The filter bar and the wizard's audience filters as Match All criteria. Field
// keys and operators are the core catalog's (GET /criteria-fields).

const int = (field: string, operator: "Gte" | "Lte", value: number): CrmCriteriaConditionDto => ({ field, operator, value: { kind: "int", int: value } });
const money = (field: string, operator: "Gte" | "Lte", amount: number): CrmCriteriaConditionDto => ({ field, operator, value: { kind: "money", amount } });
const date = (field: string, operator: "Gte" | "Lte", value: string): CrmCriteriaConditionDto => ({ field, operator, value: { kind: "date", date: value } });

async function tagCondition(businessId: string, names: string[]): Promise<CrmCriteriaConditionDto> {
  const byName = await tagsByName(businessId);
  const ids = names.map((name) => {
    const id = byName.get(name.toLowerCase());
    if (!id) throw new Error(`The business has no tag named "${name}".`);
    return id;
  });
  return { field: "tags", operator: "ContainsAny", value: { kind: "ids", ids } };
}

/** The list's filter bar. Search text is not part of a segment (FR-050). */
export async function listFiltersCriteria(businessId: string, filters: ListFilters): Promise<CrmCustomerCriteriaDto> {
  const conditions: CrmCriteriaConditionDto[] = [];
  if (filters.tags.length > 0) conditions.push(await tagCondition(businessId, filters.tags));
  if (filters.visits.from !== "") conditions.push(int("visit_count", "Gte", Number(filters.visits.from)));
  if (filters.visits.to !== "") conditions.push(int("visit_count", "Lte", Number(filters.visits.to)));
  if (filters.spend.from !== "") conditions.push(money("total_spend", "Gte", Number(filters.spend.from)));
  if (filters.spend.to !== "") conditions.push(money("total_spend", "Lte", Number(filters.spend.to)));
  if (filters.lastVisit.from) conditions.push(date("last_visit_at", "Gte", filters.lastVisit.from));
  if (filters.lastVisit.to) conditions.push(date("last_visit_at", "Lte", filters.lastVisit.to));
  return { match: "All", conditions };
}

const AGE_BOUNDS: Record<AgeRange, [number, number | null]> = {
  "18-24": [18, 24],
  "25-30": [25, 30],
  "31-40": [31, 40],
  "41-50": [41, 50],
  "51+": [51, null],
};

// The wizard's cadence buckets as visits in the last 30 days, the nearest the
// catalog offers to its lifetime average: weekly is 4 or more, monthly 1 to 3,
// occasional none recently but more than one ever, first-time at most one ever.
const RECENT_DAYS = 30;
function frequencyConditions(frequency: VisitFrequency): CrmCriteriaConditionDto[] {
  const recent = (operator: "Gte" | "Lte" | "Between", value: { min?: number; max?: number }): CrmCriteriaConditionDto => ({
    field: "recent_visit_count",
    operator,
    value: { kind: "windowCount", days: RECENT_DAYS, ...value },
  });
  switch (frequency) {
    case "weekly":
      return [recent("Gte", { min: 4 })];
    case "monthly":
      return [recent("Between", { min: 1, max: 3 })];
    case "occasional":
      return [int("visit_count", "Gte", 2), recent("Lte", { max: 0 })];
    case "firstTime":
      return [int("visit_count", "Lte", 1)];
  }
}

/** The Send Message wizard's audience. A chosen saved segment contributes its
 *  own conditions, ANDed with the filters. */
export async function audienceCriteria(businessId: string, filters: AudienceFilters): Promise<CrmCustomerCriteriaDto> {
  const conditions: CrmCriteriaConditionDto[] = [];
  const segment = filters.segment?.criteria;
  if (segment) {
    if (segment.match !== "All") throw new Error("A Match Any segment cannot be combined with other filters.");
    conditions.push(...segment.conditions);
  }
  if (filters.tag) conditions.push(await tagCondition(businessId, [filters.tag]));
  if (filters.visitFrequency) conditions.push(...frequencyConditions(filters.visitFrequency));
  if (filters.totalSpendFrom) conditions.push(money("total_spend", "Gte", Number(filters.totalSpendFrom)));
  if (filters.totalSpendTo) conditions.push(money("total_spend", "Lte", Number(filters.totalSpendTo)));
  if (filters.lastVisitFrom) conditions.push(date("last_visit_at", "Gte", filters.lastVisitFrom));
  if (filters.lastVisitTo) conditions.push(date("last_visit_at", "Lte", filters.lastVisitTo));
  if (filters.customerSinceFrom) conditions.push(date("customer_since", "Gte", filters.customerSinceFrom));
  if (filters.customerSinceTo) conditions.push(date("customer_since", "Lte", filters.customerSinceTo));
  if (filters.gender) conditions.push({ field: "gender", operator: "In", value: { kind: "strings", values: [filters.gender] } });
  if (filters.ageRange) {
    const [min, max] = AGE_BOUNDS[filters.ageRange];
    conditions.push(int("age", "Gte", min));
    if (max !== null) conditions.push(int("age", "Lte", max));
  }
  // The API refuses criteria with no conditions, and the wizard with no filters
  // set means every customer: everyone became a customer on or before today.
  if (conditions.length === 0) conditions.push(date("customer_since", "Lte", new Date().toISOString().slice(0, 10)));
  return { match: "All", conditions };
}

// ---- segments ---------------------------------------------------------------

export interface ServerSegment {
  id: string;
  name: string;
  criteria: CrmCustomerCriteriaDto;
}

/** The business's saved segments, or null when the segments feature is off for it. */
export async function loadSegments(businessId: string): Promise<ServerSegment[] | null> {
  try {
    const out: ServerSegment[] = [];
    for (let page = 1; ; page += 1) {
      const list = await listCrmSegments(businessId, { page, pageSize: LIST_PAGE_SIZE });
      for (const s of list.data) out.push({ id: s.id, name: s.name, criteria: s.criteria });
      if (list.data.length < LIST_PAGE_SIZE) return out;
    }
  } catch (err) {
    if (unavailable(err)) return null;
    throw err;
  }
}

/** "Save Segment": the filter bar, stored as a segment. */
export async function saveSegment(businessId: string, name: string, filters: ListFilters): Promise<ServerSegment> {
  const created = await createCrmSegment(businessId, { name, criteria: await listFiltersCriteria(businessId, filters) });
  return { id: created.id, name: created.name, criteria: created.criteria };
}

/** How many customers the wizard's audience matches right now (Active and Blocked). */
export async function estimateAudience(businessId: string, filters: AudienceFilters): Promise<number> {
  const estimate = await estimateCrmAudience(businessId, { criteria: await audienceCriteria(businessId, filters) });
  return estimate.estimatedCount;
}

// ---- export -----------------------------------------------------------------

/** The selected customers as the server's own CSV (pinned columns, no notes). */
export async function exportCustomers(businessId: string, ids: string[]): Promise<{ blob: Blob; fileName: string }> {
  const file = await exportCrmCustomers(businessId, { format: "csv", customerIds: ids });
  return { blob: file.blob, fileName: file.fileName ?? `crm-customers-${new Date().toISOString().slice(0, 10)}.csv` };
}

// ---- send message -----------------------------------------------------------

export interface SendMessageInput {
  filters: AudienceFilters;
  channels: CommunicationChannel[];
  message: string;
  timing: SendTiming;
  language: "ar" | "en";
}

// The wizard's batches have a size and no pace; one batch an hour is sent.
const BATCH_INTERVAL_MINUTES = 60;

function toDelivery(timing: SendTiming): CrmCampaignDeliveryDto {
  if (timing.kind === "later") return { mode: "Scheduled", scheduledAt: new Date(timing.at).toISOString() };
  if (timing.kind === "batches") return { mode: "Paced", batchSize: timing.batchSize, intervalMinutes: BATCH_INTERVAL_MINUTES };
  return { mode: "Now" };
}

/** One campaign per chosen channel: saved as a draft, then sent. A draft the
 *  server refuses to send is deleted again, so a failed Send leaves nothing behind. */
export async function sendMessage(businessId: string, input: SendMessageInput): Promise<void> {
  const criteria = await audienceCriteria(businessId, input.filters);
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  for (const channel of input.channels) {
    const name = `${channel} ${stamp}`;
    const draft = await createCrmCampaignDraft(businessId, {
      name,
      channel: CHANNEL_CODES[channel] as CrmChannel,
      language: input.language,
      audience: { kind: "Criteria", criteria },
      // Email needs a subject and the wizard has none, so the campaign's name stands in.
      content: { subject: channel === "Email" ? name : null, body: input.message },
      delivery: toDelivery(input.timing),
    });
    try {
      await sendCrmCampaign(businessId, draft.id, draft.version, crypto.randomUUID());
    } catch (err) {
      await deleteCrmCampaignDraft(businessId, draft.id, draft.version).catch(() => undefined);
      throw err;
    }
  }
}
