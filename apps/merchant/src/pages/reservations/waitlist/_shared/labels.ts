import type { ContactChannel, HistoryType, PartySizeBucket, WaitlistSort, WaitlistSource, WaitlistStatus } from "@/entities/waitlist-entry";

export const STATUS_KEY: Record<WaitlistStatus, string> = {
  waiting: "waitlist.status.waiting",
  notified: "waitlist.status.notified",
  onTheWay: "waitlist.status.onTheWay",
  seated: "waitlist.status.seated",
  left: "waitlist.status.left",
};

/** Theme tokens, sampled against the frame's pills. */
export const STATUS_TONE: Record<WaitlistStatus, { bg: string; text: string; dot: string }> = {
  waiting: { bg: "var(--octo-tone-info-bg)", text: "var(--octo-tone-info-text)", dot: "var(--octo-tone-info-text)" },
  notified: { bg: "var(--octo-tone-warning-bg)", text: "var(--octo-tone-warning-dot)", dot: "var(--octo-tone-warning-dot)" },
  onTheWay: { bg: "var(--octo-tone-success-bg)", text: "var(--octo-tone-completed-text)", dot: "var(--octo-tone-completed-dot)" },
  seated: { bg: "var(--octo-tone-violet-bg)", text: "var(--octo-tone-violet-text)", dot: "var(--octo-tone-violet-dot)" },
  left: { bg: "var(--octo-tone-slate-bg)", text: "var(--octo-tone-slate-text)", dot: "var(--octo-tone-slate-text)" },
};

export const SOURCE_KEY: Record<WaitlistSource, string> = {
  walkIn: "waitlist.source.walkIn",
  phone: "waitlist.source.phone",
  whatsapp: "waitlist.source.whatsapp",
  website: "waitlist.source.website",
  instagram: "waitlist.source.instagram",
};

export const CHANNEL_KEY: Record<ContactChannel, string> = {
  whatsapp: "waitlist.channel.whatsapp",
  call: "waitlist.channel.call",
  sms: "waitlist.channel.sms",
};

export const BUCKET_KEY: Record<PartySizeBucket, string> = {
  all: "waitlist.toolbar.allPartySize",
  "1-2": "waitlist.toolbar.party12",
  "3-4": "waitlist.toolbar.party34",
  "5-6": "waitlist.toolbar.party56",
  "7+": "waitlist.toolbar.party7",
};

export const SORT_KEY: Record<WaitlistSort, string> = {
  joinedLatest: "waitlist.sort.joinedLatest",
  joinedEarliest: "waitlist.sort.joinedEarliest",
  queue: "waitlist.sort.queue",
  longestWait: "waitlist.sort.longestWait",
  partySize: "waitlist.sort.partySize",
};

export const HISTORY_KEY: Record<HistoryType, string> = {
  joined: "waitlist.history.joined",
  edited: "waitlist.history.edited",
  notified: "waitlist.history.notified",
  called: "waitlist.history.called",
  movedUp: "waitlist.history.movedUp",
  seated: "waitlist.history.seated",
  left: "waitlist.history.left",
};

/** `t()` does no interpolation; replace every `{name}` occurrence. */
export function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((text, [key, value]) => text.split(`{${key}}`).join(String(value)), template);
}
