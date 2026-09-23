// Bridge between the Reservation API and the module's `Reservation` view model.
//
// The screens were built on a flat row (date + minutes-from-midnight, area and
// table as strings). The API is nested and in UTC, so every server row is
// converted to that shape here, in the business's own time zone, and the
// screens' events are converted back into API calls. Nothing else in the module
// talks to the API.
import {
  ApiError,
  assignReservationResource,
  cancelReservation,
  completeReservation,
  confirmReservation,
  createReservation,
  getReservation,
  getReservationAlternatives,
  getReservationAvailability,
  getReservationDeposit,
  getReservationSettings,
  hideReservation,
  issueReservationPaymentLink,
  listReservationActivity,
  listReservations,
  issueReservationDepositRefund,
  markReservationNoShow,
  overrideReservationDeposit,
  previewReservationCancellation,
  recordReservationCashDeposit,
  recoverReservationNoShow,
  refreshReservationDeposit,
  reinstateReservation,
  rescheduleReservation,
  startReservationService,
  unhideReservation,
  updateReservation,
  type ReservationDepositAttemptResponse,
  type ReservationDepositResponse,
  type ReservationResponse,
  type ReservationSettingsResponse,
} from "@octopus/api-client";
import {
  branches,
  setToday,
  type DepositState,
  type Reservation,
  type ReservationDeposit,
  type ReservationPaymentLink,
  type ReservationSource,
  type ReservationStatus,
} from "@/shared/api/mock-reservations";
import { setNowMinutes, type CancelPayload } from "./model";

// The module's "today" and "now" were fixed mock values; on real data they are
// the real ones (the browser's clock — the list is a working view of the day).
{
  const d = new Date();
  setToday(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  setNowMinutes(d.getHours() * 60 + d.getMinutes());
}

const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export function describeReservationError(err: unknown): string {
  if (err instanceof ApiError) return err.problem?.detail ?? err.problem?.errorCode ?? err.message;
  return err instanceof Error ? err.message : "Request failed";
}

// ---- time zone --------------------------------------------------------------

let settingsCache: Promise<ReservationSettingsResponse> | null = null;
let settingsFor: string | null = null;

export function reservationSettings(businessId: string): Promise<ReservationSettingsResponse> {
  if (settingsFor !== businessId || !settingsCache) {
    settingsFor = businessId;
    settingsCache = getReservationSettings(businessId).catch((err) => {
      settingsCache = null;
      throw err;
    });
  }
  return settingsCache;
}

/** Wall-clock parts of `instant` in `timeZone`. */
function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

const pad = (n: number) => String(n).padStart(2, "0");

/** The UTC instant at which the clock in `timeZone` reads `date` + `minutes`. */
export function zonedToUtc(date: string, minutes: number, timeZone: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, mo - 1, d, 0, minutes);
  const seen = zonedParts(new Date(guess), timeZone);
  const shown = Date.UTC(seen.y, seen.mo - 1, seen.d, seen.h, seen.mi);
  return new Date(guess - (shown - guess)).toISOString();
}

// ---- server -> view model ---------------------------------------------------

export const STATUS_FROM_API: Record<string, ReservationStatus> = {
  Pending: "Pending",
  Confirmed: "Confirmed",
  InService: "Seated",
  Completed: "Completed",
  Cancelled: "Cancelled",
  Expired: "Pending",
  NoShow: "No-show",
};

const SOURCES: readonly ReservationSource[] = ["Direct Booking", "Website", "Walk In", "Phone", "Instagram"];
const SOURCE_BY_CODE: Record<string, ReservationSource> = { website: "Website", phone: "Phone", onsite: "Walk In" };
const CODE_BY_SOURCE: Record<ReservationSource, string> = {
  "Direct Booking": "website",
  Website: "website",
  "Walk In": "onsite",
  Phone: "phone",
  Instagram: "website",
};

function sourceOf(res: ReservationResponse): ReservationSource {
  const detail = res.channelDetail as ReservationSource | null;
  if (detail && SOURCES.includes(detail)) return detail;
  return SOURCE_BY_CODE[res.channelCode] ?? "Website";
}

// A confirmation's real moment and who did it lives in the activity log
// (recorded only when a staff member confirms it explicitly), not on the
// reservation itself — see `refreshConfirmedDetails`. Until that's fetched,
// `createdAtUtc` is the best guess: an auto-confirmed booking is confirmed at
// the instant it's created, and the common "create and confirm" flow
// confirms manually within the same request, so it's exact far more often
// than not.
const CONFIRMED_OR_BEYOND = new Set<ReservationResponse["status"]>(["Confirmed", "InService", "Completed"]);

// A stable code, not display text — the fixture's `confirmedMethod` was
// always free-form English ("AUTO (Deposit Paid)"), but a real reservation's
// value has to render translated on the Arabic page too, so it's looked up
// through CONFIRMED_METHOD_LABEL_KEY (reservation-detail-modal.tsx) rather
// than printed as-is.
function confirmedOf(res: ReservationResponse, timeZone: string): { confirmedOn?: string; confirmedMethod?: string } {
  if (!CONFIRMED_OR_BEYOND.has(res.status)) return {};
  return {
    confirmedOn: dateTimeStr(res.createdAtUtc, timeZone),
    confirmedMethod: res.autoConfirmApplied ? "auto" : "staff",
  };
}

function depositOf(res: ReservationResponse, timeZone: string): ReservationDeposit | undefined {
  const d = res.deposit;
  if (!d.required || !d.amount) return undefined;
  const state = res.status === "Expired" ? "expired" : d.isFullyPaid ? "paid" : "unpaid";
  // `paymentDueAtUtc` rides on the reservation itself, not the deposit terms
  // — easy to miss (BACKEND_GAPS.md 4.5 once listed "dueBy" as missing; it
  // was just never read from here).
  return { amount: d.amount.amount, currency: "SAR", type: "Pre Reservation", state, dueBy: dateTimeStr(res.paymentDueAtUtc, timeZone) };
}

// ---- deposit attempt detail (link, method, paid date, transaction id) ------
//
// `ReservationResponse.deposit` only carries the terms (required, amount,
// paid-or-not) — enough for the list. The link URL, who paid and how, and the
// transaction reference live on the deposit's payment *attempts*, fetched
// separately per reservation. Pulling that for every row on every list load
// would double the read cost for a detail almost nobody opens, so it's
// merged in lazily — see `refreshDepositDetails`, called when a reservation's
// detail dialog actually opens.

const ATTEMPT_STATE: Record<string, DepositState> = {
  Pending: "unpaid",
  LinkSent: "link-sent",
  Paid: "paid",
  Failed: "failed",
  Expired: "expired",
  Cancelled: "cancelled",
};

const METHOD_LABEL: Record<string, string> = { Cash: "Cash", OnlineCard: "Card" };

/** The channel a link was last shared over, from this session's own
 *  `issueLink` call — the attempt the API returns back doesn't echo it
 *  (issuing a link doesn't send it; sharing is a separate, manual step). */
const linkChannels = new Map<string, { sentVia: ReservationPaymentLink["sentVia"]; sentTo: string }>();

function dateTimeStr(iso: string | null, timeZone: string): string | undefined {
  if (!iso) return undefined;
  const at = zonedParts(new Date(iso), timeZone);
  return `${at.y}-${pad(at.mo)}-${pad(at.d)} ${String(at.h).padStart(2, "0")}:${pad(at.mi)}`;
}

function latestAttempt(attempts: readonly ReservationDepositAttemptResponse[]): ReservationDepositAttemptResponse | undefined {
  return [...attempts].sort((a, b) => b.attemptNo - a.attemptNo)[0];
}

/** Layers one deposit's real attempt detail onto a row `toRow` already built. */
export function withDepositDetail(row: Reservation, detail: ReservationDepositResponse, timeZone: string): Reservation {
  const attempt = latestAttempt(detail.attempts);
  if (!row.deposit || !attempt) return row;
  const state = ATTEMPT_STATE[attempt.state] ?? row.deposit.state;
  const deposit: ReservationDeposit = {
    ...row.deposit,
    state,
    paidOn: dateTimeStr(attempt.paidAtUtc, timeZone),
    method: METHOD_LABEL[attempt.method] ?? attempt.method,
    txnId: attempt.merchantReference,
  };
  let paymentLink = row.paymentLink;
  if (state === "link-sent" && attempt.linkUrl) {
    const channel = linkChannels.get(row.id);
    paymentLink = {
      url: attempt.linkUrl,
      sentVia: channel?.sentVia ?? "WhatsApp",
      sentTo: channel?.sentTo ?? row.phone,
      sentOn: dateTimeStr(attempt.lastCheckedAtUtc, timeZone) ?? "—",
      expiresOn: dateTimeStr(attempt.linkExpiresAtUtc, timeZone) ?? "—",
    };
  }
  return { ...row, deposit, paymentLink };
}

/** Pulls one reservation's real deposit attempt and merges it in — the
 *  detail dialog calls this when it opens on a reservation that has a
 *  deposit, so the link/method/paid-on it shows is the server's, not a
 *  guess from the summary alone. */
export async function refreshDepositDetails(businessId: string, row: Reservation): Promise<Reservation> {
  if (!row.deposit) return row;
  const settings = await reservationSettings(businessId);
  const detail = await getReservationDeposit(businessId, row.id);
  return withDepositDetail(row, detail, settings.timeZoneId);
}

/** Replaces the `createdAtUtc` guess `confirmedOf` makes with the activity
 *  log's real "Confirmed" entry — its actual timestamp and who did it
 *  (a staff member, days later, rather than at creation). Called when the
 *  detail dialog opens on an already-confirmed reservation, same as
 *  `refreshDepositDetails`. */
export async function refreshConfirmedDetails(businessId: string, row: Reservation): Promise<Reservation> {
  if (!row.confirmedOn) return row;
  const settings = await reservationSettings(businessId);
  const activity = await listReservationActivity(businessId, row.id, { pageSize: 100 });
  const confirmed = activity.data.filter((entry) => entry.action === "Confirmed").pop();
  if (!confirmed) return row;
  return {
    ...row,
    confirmedOn: dateTimeStr(confirmed.occurredAtUtc, settings.timeZoneId) ?? row.confirmedOn,
    confirmedMethod: confirmed.actorKind === "System" ? "auto" : "staff",
  };
}

export function toRow(res: ReservationResponse, timeZone: string): Reservation {
  const at = zonedParts(new Date(res.startUtc), timeZone);
  const date = `${at.y}-${pad(at.mo)}-${pad(at.d)}`;
  // After-midnight starts belong to the previous service day (see mock-reservations).
  const startMinutes = at.h * 60 + at.mi;
  return {
    id: res.id,
    date,
    startMinutes,
    durationMinutes: res.durationMinutes,
    ref: res.code,
    guest: res.customer.name,
    phone: res.customer.phone,
    email: res.customer.email ?? undefined,
    partySize: res.attendeeCount,
    area: res.target.groupName ?? "",
    table: res.target.resource?.displayName ?? res.target.resource?.code ?? "",
    // The API only carries a branch id and there is no branches endpoint yet.
    branch: branches[0],
    source: sourceOf(res),
    status: STATUS_FROM_API[res.status] ?? "Pending",
    tags: res.labels.length ? res.labels : undefined,
    deposit: depositOf(res, timeZone),
    notes: res.customerNote ?? undefined,
    hidden: res.isHidden,
    ...confirmedOf(res, timeZone),
  };
}

/** Latest known version per reservation: every mutation needs the version the
 *  caller last read, and rows in the view model do not carry one. */
const versions = new Map<string, number>();
const resourceIds = new Map<string, string>();
// The view model folds "Expired" into "Pending" (STATUS_FROM_API) — the list
// has no pill for it — so the real status is remembered here for the one
// action that needs it: reinstating an expired reservation.
const expiredIds = new Set<string>();
/** What each reservation is booked against — alternatives are searched on the same target. */
const targets = new Map<string, { resourceId?: string; groupId?: string }>();

function remember(res: ReservationResponse): ReservationResponse {
  versions.set(res.id, res.version);
  if (res.status === "Expired") expiredIds.add(res.id);
  else expiredIds.delete(res.id);
  targets.set(res.id, { resourceId: res.target.resource?.resourceId, groupId: res.target.groupId ?? undefined });
  return res;
}

/** Whether the server's own status for `id` is "Expired" (see expiredIds). */
export function isExpiredReservation(id: string): boolean {
  return expiredIds.has(id);
}
const versionOf = (id: string) => versions.get(id) ?? 0;

export async function loadReservations(businessId: string): Promise<Reservation[]> {
  const settings = await reservationSettings(businessId);
  const now = Date.now();
  const day = 86_400_000;
  const out: Reservation[] = [];
  for (let page = 1; ; page += 1) {
    const list = await listReservations(businessId, {
      fromUtc: new Date(now - 14 * day).toISOString(),
      toUtc: new Date(now + 60 * day).toISOString(),
      page,
      pageSize: 100,
    });
    const full = await Promise.all(list.data.map((s) => getReservation(businessId, s.id)));
    for (const res of full) out.push(toRow(remember(res), settings.timeZoneId));
    if (list.data.length < 100) return out;
  }
}

// ---- actions ----------------------------------------------------------------

async function withZone(businessId: string, res: ReservationResponse): Promise<Reservation> {
  const settings = await reservationSettings(businessId);
  return toRow(remember(res), settings.timeZoneId);
}

export interface NewReservationInput {
  draft: Reservation;
  intent: "pending" | "confirm";
  /** The table's id on the floor plan (= the API's resource id), when one was picked. */
  resourceId?: string | null;
}

export async function createRow(businessId: string, input: NewReservationInput): Promise<Reservation> {
  const { draft, intent, resourceId } = input;
  // The API books a specific table or a table group, never neither.
  if (!resourceId) throw new Error("Choose a table before saving: the reservation has to be booked on one.");
  const settings = await reservationSettings(businessId);
  let res = await createReservation(
    businessId,
    {
      channelCode: CODE_BY_SOURCE[draft.source],
      channelDetail: draft.source,
      customerName: draft.guest,
      customerPhone: draft.phone,
      customerEmail: draft.email ?? null,
      attendeeCount: draft.partySize,
      startUtc: zonedToUtc(draft.date, draft.startMinutes, settings.timeZoneId),
      durationMinutes: draft.durationMinutes,
      resourceId: resourceId ?? null,
      customerNote: draft.notes ?? null,
      labels: draft.tags ? [...draft.tags] : null,
    },
    key()
  );
  remember(res);
  if (resourceId) resourceIds.set(res.id, resourceId);
  if (intent === "confirm" && res.status === "Pending") {
    res = await confirmReservation(businessId, res.id, { expectedVersion: res.version });
  }
  return toRow(remember(res), settings.timeZoneId);
}

/** Keeps the record but drops it out of the general list — a spam/test entry,
 *  say — without cancelling or deleting it. `hideReservation`/`unhideReservation`
 *  were ready and unused (`isHidden` on the response was never even read). */
export async function setHidden(businessId: string, row: Reservation, hidden: boolean): Promise<Reservation> {
  const settings = await reservationSettings(businessId);
  const res = await (hidden ? hideReservation(businessId, row.id) : unhideReservation(businessId, row.id));
  return toRow(remember(res), settings.timeZoneId);
}

/** `resourceId` is the real floor-plan table the edit dialog resolved the
 *  picked table number to (null when nothing resolved). Only called when the
 *  table actually changed — a merchant reopening the same reservation and
 *  saving without touching the table field shouldn't re-send an assignment.
 *  This is the fix for BACKEND_GAPS 4.7b: `UpdateReservationRequest` has no
 *  `resourceId` field at all, so a changed table used to save silently
 *  without ever reaching the server. */
export async function updateRow(
  businessId: string,
  before: Reservation,
  draft: Reservation,
  resourceId?: string | null
): Promise<Reservation> {
  const settings = await reservationSettings(businessId);
  let res = await updateReservation(businessId, before.id, {
    customerNote: draft.notes ?? null,
    labels: draft.tags ? [...draft.tags] : [],
    attendeeCount: draft.partySize,
    expectedVersion: versionOf(before.id),
  });
  remember(res);
  if (
    draft.date !== before.date ||
    draft.startMinutes !== before.startMinutes ||
    draft.durationMinutes !== before.durationMinutes
  ) {
    res = await rescheduleReservation(businessId, before.id, {
      startUtc: zonedToUtc(draft.date, draft.startMinutes, settings.timeZoneId),
      durationMinutes: draft.durationMinutes,
      expectedVersion: res.version,
    });
  }
  if (resourceId && draft.table !== before.table) {
    res = await assignReservationResource(businessId, before.id, { resourceId, expectedVersion: res.version });
    resourceIds.set(before.id, resourceId);
  }
  return toRow(remember(res), settings.timeZoneId);
}

/** Status menu: the API has no "Arrived", so that choice is refused here. */
export async function changeStatus(businessId: string, row: Reservation, status: ReservationStatus): Promise<Reservation> {
  const v = { expectedVersion: versionOf(row.id) };
  switch (status) {
    case "Confirmed":
      return withZone(businessId, await confirmReservation(businessId, row.id, v));
    case "Seated":
      return withZone(businessId, await startReservationService(businessId, row.id, v));
    case "Completed":
      return withZone(businessId, await completeReservation(businessId, row.id, v));
    case "No-show":
      return withZone(businessId, await markReservationNoShow(businessId, row.id, v));
    case "Pending":
      if (row.status === "No-show") return withZone(businessId, await recoverReservationNoShow(businessId, row.id, v));
      break;
  }
  throw new Error(`"${status}" is not available yet.`);
}

/** What cancelling `row` right now would actually refund, per the business's
 *  own refund bands — the cancel dialog showed this from a client-side
 *  re-derivation of the policy (a fixed mock "now" against a copy of the
 *  bands) that could disagree with what the server would really do. */
export function cancellationPreview(businessId: string, row: Reservation) {
  return previewReservationCancellation(businessId, row.id);
}

export async function cancelRow(businessId: string, row: Reservation, payload: CancelPayload): Promise<Reservation> {
  const v = versionOf(row.id);
  if (payload.actionType === "no-show") {
    return withZone(businessId, await markReservationNoShow(businessId, row.id, { expectedVersion: v }));
  }
  return withZone(
    businessId,
    await cancelReservation(businessId, row.id, {
      cancelledBy: payload.actionType === "guest" ? "Customer" : "Staff",
      reasonCode: payload.reason || null,
      note: payload.note || null,
      expectedVersion: v,
    })
  );
}

export async function duplicateRow(businessId: string, row: Reservation): Promise<Reservation> {
  return createRow(businessId, {
    draft: { ...row, deposit: undefined },
    intent: "pending",
    resourceId: resourceIds.get(row.id) ?? null,
  });
}

export async function issueLink(businessId: string, row: Reservation): Promise<Reservation> {
  const back = `${window.location.origin}/reservations`;
  // The row's own phone is the only channel this action has a guest contact
  // for; "Share Link" itself opens WhatsApp with it (see guest-actions.ts).
  linkChannels.set(row.id, { sentVia: "WhatsApp", sentTo: row.phone });
  const res = await issueReservationPaymentLink(businessId, row.id, { returnUrl: back, backUrl: back }, key());
  return refreshDepositDetails(businessId, await withZone(businessId, res));
}

/** The guest paid the deposit in person; marks it settled without a link. */
export async function recordCashDeposit(businessId: string, row: Reservation): Promise<Reservation> {
  const res = await recordReservationCashDeposit(businessId, row.id, key());
  return refreshDepositDetails(businessId, await withZone(businessId, res));
}

/** Waives the deposit this reservation would otherwise owe. */
export async function waiveDeposit(businessId: string, row: Reservation, reason: string): Promise<Reservation> {
  const res = await overrideReservationDeposit(businessId, row.id, { required: false, reason });
  return withZone(businessId, res);
}

/** Requests the refund the reservation's cancellation already made due — the
 *  server finds which one itself, so this just names the reservation. */
export async function issueDepositRefund(businessId: string, row: Reservation): Promise<Reservation> {
  const res = await issueReservationDepositRefund(businessId, row.id, key());
  return withZone(businessId, res);
}

/** Asks the payment provider directly whether a sent link has been paid yet,
 *  rather than waiting on its own poll — for a guest who says they already
 *  paid but the state here still reads "link sent". */
export async function recheckDepositStatus(businessId: string, row: Reservation): Promise<Reservation> {
  const res = await refreshReservationDeposit(businessId, row.id);
  return refreshDepositDetails(businessId, await withZone(businessId, res));
}

// ---- table availability ------------------------------------------------------
//
// The table-picking grid colours tables from the floor plan's own local copy
// of its bookings — instant, but only as fresh as this browser's last sync.
// Two hosts open the same floor at once and the second one's client can
// still show a table as free after the first has already taken it. This is
// the server's own answer, asked once, right before the booking that would
// actually double it up — not a live per-table feed (that's a floor-plan
// concern), just a last check at the one moment it matters.

/** Whether `tableId` is genuinely free at `date`/`time` for `partySize` over
 *  `durationMinutes`, per the server — not the floor plan's local snapshot. */
export async function verifyTableAvailable(
  businessId: string,
  tableId: string,
  slot: { date: string; time: number; partySize: number; durationMinutes: number }
): Promise<boolean> {
  const settings = await reservationSettings(businessId);
  const wanted = new Date(zonedToUtc(slot.date, slot.time, settings.timeZoneId)).getTime();
  const availability = await getReservationAvailability(businessId, {
    date: slot.date,
    attendees: slot.partySize,
    durationMinutes: slot.durationMinutes,
    resourceId: tableId,
  });
  return availability.slots.some((s) => new Date(s.startUtc).getTime() === wanted);
}

/** Error codes meaning "that time is taken" — the cue to offer alternatives. */
const SLOT_TAKEN_CODES = new Set(["reservation.availability.conflict", "reservation.availability.group-exhausted"]);

export function isSlotTakenError(err: unknown): boolean {
  return err instanceof ApiError && SLOT_TAKEN_CODES.has(err.problem?.errorCode ?? "");
}

/** One bookable alternative, in the business's own clock. */
export interface AlternativeSlot {
  /** Local "yyyy-MM-dd" — alternatives never leave the refused time's local day. */
  date: string;
  /** Minutes from local midnight. */
  minutes: number;
}

/** The nearest bookable times (up to five, nearest first) around a refused
 *  `date`/`time` on the same table or group. `target` defaults to what an
 *  existing reservation (`reservationId`) is already booked on. */
export async function findAlternatives(
  businessId: string,
  slot: { date: string; time: number; partySize: number; durationMinutes: number },
  target: { resourceId?: string | null; groupId?: string | null; reservationId?: string }
): Promise<AlternativeSlot[]> {
  const known = target.reservationId ? targets.get(target.reservationId) : undefined;
  const resourceId = target.resourceId ?? known?.resourceId;
  const groupId = resourceId ? undefined : (target.groupId ?? known?.groupId);
  if (!resourceId && !groupId) return [];
  const settings = await reservationSettings(businessId);
  const res = await getReservationAlternatives(businessId, {
    attendees: slot.partySize,
    startUtc: zonedToUtc(slot.date, slot.time, settings.timeZoneId),
    durationMinutes: slot.durationMinutes,
    resourceId: resourceId ?? undefined,
    groupId: groupId ?? undefined,
  });
  return res.slots.map((s) => {
    const at = zonedParts(new Date(s.startUtc), settings.timeZoneId);
    return { date: `${at.y}-${pad(at.mo)}-${pad(at.d)}`, minutes: at.h * 60 + at.mi };
  });
}

// ---- reinstate ----------------------------------------------------------------

/** Brings an expired reservation back. The server re-checks the slot first,
 *  so this can fail with an availability conflict if someone took it since. */
export async function reinstateRow(businessId: string, row: Reservation): Promise<Reservation> {
  const res = await reinstateReservation(businessId, row.id, { expectedVersion: versionOf(row.id) });
  return withZone(businessId, res);
}
