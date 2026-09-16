// The walk-in waitlist: who is waiting, in what order, and every pure rule the
// list page and the Seat Guest screen share. No React, no storage.

export type WaitlistStatus = "waiting" | "notified" | "onTheWay" | "seated" | "left";
export type WaitlistSource = "walkIn" | "phone" | "whatsapp" | "website" | "instagram";
export type ContactChannel = "whatsapp" | "call" | "sms";
export type HistoryType = "joined" | "edited" | "notified" | "called" | "movedUp" | "seated" | "left";

export const WAITLIST_STATUSES: readonly WaitlistStatus[] = ["waiting", "notified", "onTheWay", "seated", "left"];
export const ACTIVE_STATUSES: readonly WaitlistStatus[] = ["waiting", "notified", "onTheWay"];
export const WAITLIST_SOURCES: readonly WaitlistSource[] = ["walkIn", "phone", "whatsapp", "website", "instagram"];
export const CONTACT_CHANNELS: readonly ContactChannel[] = ["whatsapp", "call", "sms"];

export interface HistoryEvent {
  id: string;
  type: HistoryType;
  at: number;
  detail?: string;
}

export interface WaitlistEntry {
  id: string;
  firstName: string;
  lastName: string;
  /** E.164, e.g. "+966510002877". */
  phone: string;
  partySize: number;
  source: WaitlistSource;
  channel: ContactChannel;
  areaPreference: string;
  tablePreference: string;
  note: string;
  status: WaitlistStatus;
  joinedAt: number;
  /** Minutes quoted to the guest when they joined. */
  quotedMin: number;
  /** Queue order; lower is served first. */
  rank: number;
  seatedAt?: number;
  seatedTable?: string;
  seatedArea?: string;
  leftAt?: number;
  history: HistoryEvent[];
}

export interface GuestInput {
  firstName: string;
  lastName: string;
  phone: string;
  partySize: number;
  source: WaitlistSource;
  channel: ContactChannel;
  areaPreference: string;
  tablePreference: string;
  note: string;
}

const MINUTE = 60_000;

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function fullName(entry: Pick<WaitlistEntry, "firstName" | "lastName">): string {
  return `${entry.firstName} ${entry.lastName}`.trim();
}

export function isActive(entry: WaitlistEntry): boolean {
  return ACTIVE_STATUSES.includes(entry.status);
}

/* ----------------------------------------------------------------- phone */

/** Accepts "0510002877", "510002877", "+966 51 000 2877", "00966…". Returns
 *  E.164 for a Saudi mobile number, or null. */
export function normalizeSaudiMobile(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00966")) digits = digits.slice(5);
  else if (digits.startsWith("966")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return /^5\d{8}$/.test(digits) ? `+966${digits}` : null;
}

/** The part a merchant types after the fixed +966 prefix. */
export function localMobileDigits(phone: string): string {
  return phone.replace(/^\+966/, "");
}

/* ----------------------------------------------------------------- queue */

export function activeQueue(entries: readonly WaitlistEntry[]): WaitlistEntry[] {
  return entries.filter(isActive).sort((a, b) => a.rank - b.rank);
}

/** 1-based place among the parties still waiting, or null once seated/left. */
export function queuePosition(entries: readonly WaitlistEntry[], id: string): number | null {
  const index = activeQueue(entries).findIndex((e) => e.id === id);
  return index === -1 ? null : index + 1;
}

/** About a minute and a half per party ahead — tables turn in parallel —
 *  longer for big parties because fewer tables fit them. */
export function estimateWaitMinutes(partiesAhead: number, partySize: number): number {
  const base = 5 + Math.round(partiesAhead * 1.5);
  const sizePenalty = partySize >= 7 ? 10 : partySize >= 5 ? 5 : 0;
  return Math.min(120, base + sizePenalty);
}

export function waitedMinutes(entry: WaitlistEntry, now: number): number {
  const end = entry.seatedAt ?? entry.leftAt ?? now;
  return Math.max(0, Math.floor((end - entry.joinedAt) / MINUTE));
}

/** Minutes until this party is expected to sit down. */
export function estimatedSeatingMinutes(entries: readonly WaitlistEntry[], entry: WaitlistEntry, now: number): number | null {
  const position = queuePosition(entries, entry.id);
  if (position === null) return null;
  const byQueue = estimateWaitMinutes(position - 1, entry.partySize);
  const byQuote = entry.quotedMin - waitedMinutes(entry, now);
  return Math.max(byQueue, byQuote, 0);
}

/** Moves a waiting party one place up the queue. Returns the same array when
 *  it is already first or no longer waiting. */
export function moveUp(entries: readonly WaitlistEntry[], id: string, now: number): WaitlistEntry[] {
  const queue = activeQueue(entries);
  const index = queue.findIndex((e) => e.id === id);
  if (index <= 0) return entries as WaitlistEntry[];
  const current = queue[index];
  const previous = queue[index - 1];
  return entries.map((e) => {
    if (e.id === current.id) return withEvent({ ...e, rank: previous.rank }, "movedUp", now, String(index));
    if (e.id === previous.id) return { ...e, rank: current.rank };
    return e;
  });
}

/* ----------------------------------------------------------- transitions */

function withEvent(entry: WaitlistEntry, type: HistoryType, at: number, detail?: string): WaitlistEntry {
  return { ...entry, history: [...entry.history, { id: newId("ev"), type, at, detail }] };
}

export function createEntry(entries: readonly WaitlistEntry[], input: GuestInput, now: number): WaitlistEntry {
  const ahead = activeQueue(entries).length;
  const rank = entries.reduce((max, e) => Math.max(max, e.rank), 0) + 1;
  const entry: WaitlistEntry = {
    id: newId("wl"),
    ...input,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    note: input.note.trim(),
    status: "waiting",
    joinedAt: now,
    quotedMin: estimateWaitMinutes(ahead, input.partySize),
    rank,
    history: [],
  };
  return withEvent(entry, "joined", now);
}

export function updateEntry(entry: WaitlistEntry, input: GuestInput, now: number): WaitlistEntry {
  return withEvent(
    { ...entry, ...input, firstName: input.firstName.trim(), lastName: input.lastName.trim(), note: input.note.trim() },
    "edited",
    now
  );
}

export function markNotified(entry: WaitlistEntry, now: number): WaitlistEntry {
  const status = entry.status === "onTheWay" ? "onTheWay" : "notified";
  return withEvent({ ...entry, status }, "notified", now, entry.channel);
}

export function markCalled(entry: WaitlistEntry, now: number): WaitlistEntry {
  return withEvent(entry, "called", now);
}

export function markLeft(entry: WaitlistEntry, now: number): WaitlistEntry {
  return withEvent({ ...entry, status: "left", leftAt: now }, "left", now);
}

export function markSeated(entry: WaitlistEntry, table: string, area: string, now: number): WaitlistEntry {
  return withEvent({ ...entry, status: "seated", seatedAt: now, seatedTable: table, seatedArea: area }, "seated", now, table);
}

/* ----------------------------------------------------------------- stats */

export interface WaitlistStats {
  waitingNow: number;
  seatedToday: number;
  leftToday: number;
  avgWaitMin: number;
}

export function startOfDay(now: number): number {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function computeStats(entries: readonly WaitlistEntry[], now: number): WaitlistStats {
  const dayStart = startOfDay(now);
  const seated = entries.filter((e) => e.status === "seated" && (e.seatedAt ?? 0) >= dayStart);
  const left = entries.filter((e) => e.status === "left" && (e.leftAt ?? 0) >= dayStart);
  const active = entries.filter(isActive);
  const sample = seated.length > 0 ? seated : active;
  const avgWaitMin = sample.length === 0 ? 0 : Math.round(sample.reduce((sum, e) => sum + waitedMinutes(e, now), 0) / sample.length);
  return { waitingNow: active.length, seatedToday: seated.length, leftToday: left.length, avgWaitMin };
}

/** Percentage change, one decimal, or null when there is nothing to compare. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/* --------------------------------------------------------- filter & sort */

export type PartySizeBucket = "all" | "1-2" | "3-4" | "5-6" | "7+";
export const PARTY_SIZE_BUCKETS: readonly PartySizeBucket[] = ["all", "1-2", "3-4", "5-6", "7+"];
export type WaitlistSort = "joinedLatest" | "joinedEarliest" | "queue" | "longestWait" | "partySize";
export const WAITLIST_SORTS: readonly WaitlistSort[] = ["joinedLatest", "joinedEarliest", "queue", "longestWait", "partySize"];

export interface WaitlistFilters {
  query: string;
  area: string;
  partySize: PartySizeBucket;
  statuses: readonly WaitlistStatus[];
  sources: readonly WaitlistSource[];
  channels: readonly ContactChannel[];
}

/** Seated parties have left the queue, so the list hides them until asked. */
export const DEFAULT_STATUSES: readonly WaitlistStatus[] = ["waiting", "notified", "onTheWay", "left"];

export const DEFAULT_FILTERS: WaitlistFilters = {
  query: "",
  area: "",
  partySize: "all",
  statuses: DEFAULT_STATUSES,
  sources: [],
  channels: [],
};

export function inBucket(size: number, bucket: PartySizeBucket): boolean {
  switch (bucket) {
    case "all": return true;
    case "1-2": return size <= 2;
    case "3-4": return size >= 3 && size <= 4;
    case "5-6": return size >= 5 && size <= 6;
    case "7+": return size >= 7;
  }
}

export function filterEntries(entries: readonly WaitlistEntry[], filters: WaitlistFilters): WaitlistEntry[] {
  const q = filters.query.trim().toLowerCase();
  const qDigits = q.replace(/\D/g, "");
  return entries.filter((e) => {
    if (q) {
      const nameHit = fullName(e).toLowerCase().includes(q);
      const phoneHit = qDigits.length > 0 && e.phone.replace(/\D/g, "").includes(qDigits);
      if (!nameHit && !phoneHit) return false;
    }
    if (filters.area && e.areaPreference !== filters.area) return false;
    if (!inBucket(e.partySize, filters.partySize)) return false;
    if (!filters.statuses.includes(e.status)) return false;
    if (filters.sources.length > 0 && !filters.sources.includes(e.source)) return false;
    if (filters.channels.length > 0 && !filters.channels.includes(e.channel)) return false;
    return true;
  });
}

/** How many filters in the Filters popover differ from their defaults. */
export function advancedFilterCount(filters: WaitlistFilters): number {
  const statusesChanged =
    filters.statuses.length !== DEFAULT_STATUSES.length || filters.statuses.some((s) => !DEFAULT_STATUSES.includes(s));
  return (statusesChanged ? 1 : 0) + (filters.sources.length > 0 ? 1 : 0) + (filters.channels.length > 0 ? 1 : 0);
}

export function sortEntries(entries: readonly WaitlistEntry[], sort: WaitlistSort, now: number): WaitlistEntry[] {
  const list = [...entries];
  switch (sort) {
    case "joinedLatest": return list.sort((a, b) => b.joinedAt - a.joinedAt);
    case "joinedEarliest": return list.sort((a, b) => a.joinedAt - b.joinedAt);
    case "queue": return list.sort((a, b) => Number(isActive(b)) - Number(isActive(a)) || a.rank - b.rank);
    case "longestWait": return list.sort((a, b) => waitedMinutes(b, now) - waitedMinutes(a, now));
    case "partySize": return list.sort((a, b) => b.partySize - a.partySize || a.rank - b.rank);
  }
}

/* ------------------------------------------------------------ formatting */

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** "13MAY2026 at 13:40", the frame's own format; Arabic spells the month. */
export function formatJoined(at: number, locale: string, atWord: string): string {
  const date = new Date(at);
  if (locale === "ar") {
    const day = new Intl.DateTimeFormat("ar", { day: "numeric", month: "long", year: "numeric", numberingSystem: "latn" }).format(date);
    return `${day}، ${clock(date)}`;
  }
  return `${String(date.getDate()).padStart(2, "0")}${MONTHS[date.getMonth()]}${date.getFullYear()} ${atWord} ${clock(date)}`;
}

/* ------------------------------------------------------------------ seed */

interface SeedRow {
  first: string;
  last: string;
  phone: string;
  size: number;
  joinedAgo: number;
  quoted: number;
  area: string;
  source: WaitlistSource;
  channel: ContactChannel;
  status: WaitlistStatus;
  note?: string;
  table?: string;
}

const SEED: readonly SeedRow[] = [
  { first: "Reem", last: "Al-Subaie", phone: "+966510002877", size: 3, joinedAgo: 18, quoted: 24, area: "Main Dining", source: "walkIn", channel: "whatsapp", status: "notified", note: "Birthday — would love a window table" },
  { first: "Yousef", last: "Al-Harthi", phone: "+966510003014", size: 5, joinedAgo: 15, quoted: 25, area: "Terrace", source: "phone", channel: "whatsapp", status: "waiting" },
  { first: "Fahad", last: "Al-Rashidi", phone: "+966510003151", size: 4, joinedAgo: 31, quoted: 20, area: "Family Zone", source: "walkIn", channel: "call", status: "left" },
  { first: "Amal", last: "Al-Enezi", phone: "+966510003288", size: 2, joinedAgo: 12, quoted: 10, area: "Main Dining", source: "whatsapp", channel: "whatsapp", status: "onTheWay" },
  { first: "Bandar", last: "Al-Juhani", phone: "+966510003425", size: 1, joinedAgo: 15, quoted: 10, area: "Main Dining", source: "walkIn", channel: "sms", status: "waiting" },
  { first: "Nawaf", last: "Al-Qarni", phone: "+966510003562", size: 3, joinedAgo: 22, quoted: 24, area: "Main Dining", source: "website", channel: "whatsapp", status: "notified" },
  { first: "Aisha", last: "Al-Malki", phone: "+966510003699", size: 6, joinedAgo: 9, quoted: 20, area: "Terrace", source: "walkIn", channel: "whatsapp", status: "waiting", note: "High chair needed" },
  { first: "Salman", last: "Al-Otaibi", phone: "+966510003836", size: 4, joinedAgo: 40, quoted: 15, area: "VIP Area", source: "instagram", channel: "call", status: "left" },
  { first: "Dana", last: "Al-Balawi", phone: "+966510003973", size: 2, joinedAgo: 7, quoted: 10, area: "Main Dining", source: "walkIn", channel: "whatsapp", status: "onTheWay" },
  { first: "Rakan", last: "Al-Shehri", phone: "+966510004110", size: 1, joinedAgo: 4, quoted: 10, area: "Main Dining", source: "walkIn", channel: "whatsapp", status: "waiting" },
  { first: "Lama", last: "Al-Dosari", phone: "+966510004247", size: 4, joinedAgo: 70, quoted: 20, area: "Main Dining", source: "walkIn", channel: "whatsapp", status: "seated", table: "T20" },
  { first: "Majed", last: "Al-Ghamdi", phone: "+966510004384", size: 2, joinedAgo: 55, quoted: 15, area: "Terrace", source: "phone", channel: "call", status: "seated", table: "T5" },
];

/** A believable lunch queue anchored to `now`, so wait times read as live. */
export function seedEntries(now: number): WaitlistEntry[] {
  return SEED.map((row, index) => {
    const joinedAt = now - row.joinedAgo * MINUTE;
    let entry: WaitlistEntry = {
      id: `wl-seed-${index + 1}`,
      firstName: row.first,
      lastName: row.last,
      phone: row.phone,
      partySize: row.size,
      source: row.source,
      channel: row.channel,
      areaPreference: row.area,
      tablePreference: "",
      note: row.note ?? "",
      status: "waiting",
      joinedAt,
      quotedMin: row.quoted,
      rank: index + 1,
      history: [{ id: `ev-seed-${index + 1}-0`, type: "joined", at: joinedAt }],
    };
    if (row.status === "notified" || row.status === "onTheWay") {
      entry = { ...markNotified(entry, joinedAt + 5 * MINUTE), status: row.status };
    } else if (row.status === "left") {
      entry = markLeft(entry, joinedAt + (row.joinedAgo - 2) * MINUTE);
    } else if (row.status === "seated") {
      entry = markSeated(entry, row.table ?? "", row.area, joinedAt + row.quoted * MINUTE);
    }
    return entry;
  });
}

/* ------------------------------------------------------------- validation */

export type GuestField = "firstName" | "lastName" | "phone" | "source" | "partySize";

export function validateGuest(
  input: Omit<GuestInput, "source"> & { source: WaitlistSource | "" },
  entries: readonly WaitlistEntry[],
  editingId: string | null
): Partial<Record<GuestField, "required" | "invalid" | "duplicate">> {
  const errors: Partial<Record<GuestField, "required" | "invalid" | "duplicate">> = {};
  if (!input.firstName.trim()) errors.firstName = "required";
  if (!input.lastName.trim()) errors.lastName = "required";
  if (!input.phone.trim()) errors.phone = "required";
  else {
    const phone = normalizeSaudiMobile(input.phone);
    if (!phone) errors.phone = "invalid";
    else if (entries.some((e) => e.id !== editingId && isActive(e) && e.phone === phone)) errors.phone = "duplicate";
  }
  if (!input.source) errors.source = "required";
  if (!Number.isInteger(input.partySize) || input.partySize < 1 || input.partySize > 30) errors.partySize = "invalid";
  return errors;
}
