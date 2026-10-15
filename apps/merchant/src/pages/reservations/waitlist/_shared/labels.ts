import type { ContactChannel, HistoryType, PartySizeBucket, WaitlistSort, WaitlistSource, WaitlistStatus } from "@/entities/waitlist-entry";

export const STATUS_KEY: Record<WaitlistStatus, string> = {
  waiting: "waitlist.status.waiting",
  notified: "waitlist.status.notified",
  onTheWay: "waitlist.status.onTheWay",
  seated: "waitlist.status.seated",
  left: "waitlist.status.left",
};

/** The frame's pill colours. The frame draws no Seated pill; it takes the
 *  violet of the Left Queue card. */
export const STATUS_TONE: Record<WaitlistStatus, { bg: string; text: string }> = {
  waiting: { bg: "#F5F9FF", text: "#0D6EFD" },
  notified: { bg: "#FFF5E4", text: "#DE9000" },
  onTheWay: { bg: "#EFFFF5", text: "#009A39" },
  seated: { bg: "#F7F4FF", text: "#7900F3" },
  left: { bg: "#E2E8F0", text: "#58606C" },
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
