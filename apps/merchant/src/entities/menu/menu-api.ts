// The bridge between the Menu module's AdminApi and the merchant Menu model.
// The server owns identity, name, status (`badge`) and version; the builder's
// sections/theme/schedule are still local until later stages, so a server row
// is merged onto whatever local copy of the same id already exists.
import {
  ApiError,
  getCatalogSettings,
  getMenu,
  getMenuAvailability,
  setMenuAvailability,
  updateCatalogSettings,
  updateMenuDetails,
  type AvailabilityScheduleDto,
  type ChannelSelectionDto,
  type MenuAvailabilityResponse,
  type MenuResponse,
  type MenuSummaryResponse,
} from "@octopus/api-client";
import { blankMenu } from "./draft";
import { channelStateFor, WEEKDAYS, type ChannelState, type Menu, type MenuSchedule, type MenuStatus, type Weekday } from "./menu";
import { SCHEDULE_PRESETS } from "./library";
import { SEED_BRANCHES } from "./seed";

const BADGE_TO_STATUS: Record<string, MenuStatus> = {
  archived: "archived",
  pending: "pending",
  onhold: "on-hold",
  expired: "expired",
  active: "active",
  scheduled: "scheduled",
};

export function statusFromBadge(badge: string): MenuStatus {
  return BADGE_TO_STATUS[badge.replace(/[\s_-]/g, "").toLowerCase()] ?? "pending";
}

function pickName(name: Record<string, string>): string {
  return name.en || name.ar || Object.values(name)[0] || "";
}

/** Merge a server row onto the local copy (if any) of the same menu. */
export function fromServer(row: MenuSummaryResponse | MenuResponse, local?: Menu): Menu {
  const status = statusFromBadge(row.badge);
  const base = local ?? blankMenu(row.id, SEED_BRANCHES[0].id, new Date().toISOString());
  const channel = channelStateFor(status);
  return {
    ...base,
    id: row.id,
    name: pickName(row.name),
    status,
    channels: local && status === "active" ? base.channels : { pos: channel, publicLink: channel, tableQr: channel },
    publishedAt: row.lastPublishedAtUtc,
    version: row.version,
  };
}

/** Settings must be initialised once per business before any menu call. The
 *  "not initialised yet" case comes back as 409 Conflict with this error
 *  code, not the 404 this used to check for — a fresh business always hit
 *  this catch block and rethrew instead of ever initializing. */
export async function ensureMenuSettings(businessId: string): Promise<void> {
  try {
    await getCatalogSettings(businessId);
  } catch (err) {
    const notInitialized =
      err instanceof ApiError && (err.status === 404 || err.problem?.errorCode === "menu.settings.not-initialized");
    if (!notInitialized) throw err;
    await updateCatalogSettings(businessId, {
      defaultLanguage: "en",
      enabledLanguages: ["en", "ar"],
      salesChannels: { all: true, codes: [] },
      fulfillmentModes: { all: true, codes: [] },
      currency: null,
      defaultTimeZoneId: null,
      requiredFactCodes: null,
      factRequirementSeverity: null,
      expectedVersion: null,
    });
  }
}

// ---- schedule and channels -------------------------------------------------------
// The API's availability is a weekly window (or none = always); which channels a
// menu is offered on is the menu's `salesChannels`. The timezone and the branches
// the menu applies to are not part of the schedule there, so they stay as they were.

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CHANNEL_CODE = { pos: "pos", publicLink: "public-link", tableQr: "qr" } as const;
type ChannelKey = keyof typeof CHANNEL_CODE;

export function scheduleToApi(schedule: MenuSchedule): AvailabilityScheduleDto | null {
  if (schedule.type === "all-day") return null;
  return {
    presetCode: schedule.presetCode ?? null,
    windows: [{ days: schedule.days.map((d) => DAY_NAMES[WEEKDAYS.indexOf(d)]), start: schedule.start, end: schedule.end }],
    dateFrom: null,
    dateTo: null,
  };
}

export function scheduleFromApi(a: MenuAvailabilityResponse, local: MenuSchedule): MenuSchedule {
  const w = a.schedule?.windows[0];
  const window = w
    ? {
        start: w.start.slice(0, 5),
        end: w.end.slice(0, 5),
        days: w.days.map((d) => WEEKDAYS[DAY_NAMES.indexOf(d)]).filter((d): d is Weekday => Boolean(d)),
      }
    : { start: SCHEDULE_PRESETS["all-day"].start, end: SCHEDULE_PRESETS["all-day"].end, days: [...WEEKDAYS] };
  const type =
    !w
      ? "all-day"
      : (["breakfast", "lunch", "dinner"] as const).find((k) => SCHEDULE_PRESETS[k].start === window.start && SCHEDULE_PRESETS[k].end === window.end) ?? "custom";
  return {
    ...local,
    type,
    ...window,
    fallbackMenuId: a.fallbackMenuId,
    allowPreorderOutsideSchedule: a.allowPreOrder,
    presetCode: a.schedule?.presetCode ?? null,
  };
}

const salesOn = (sel: ChannelSelectionDto, key: ChannelKey) => sel.all || sel.codes.includes(CHANNEL_CODE[key]);

export function channelsFromApi(sel: ChannelSelectionDto, status: MenuStatus): Menu["channels"] {
  const state = channelStateFor(status);
  const on = (k: ChannelKey): ChannelState => (salesOn(sel, k) ? state : "off");
  return { pos: on("pos"), publicLink: on("publicLink"), tableQr: on("tableQr") };
}

/** Reads a menu's schedule and channels (two calls) and folds them into `menu`. */
export async function withScheduleAndChannels(businessId: string, menu: Menu): Promise<Menu> {
  const [full, availability] = await Promise.all([getMenu(businessId, menu.id), getMenuAvailability(businessId, menu.id)]);
  return {
    ...menu,
    schedule: scheduleFromApi(availability, menu.schedule),
    channels: channelsFromApi(full.salesChannels, menu.status),
  };
}

/** Saves the Schedule dialog: the availability window, then the channels. */
export async function saveScheduleAndChannels(
  businessId: string,
  menu: Menu,
  schedule: MenuSchedule,
  channels: Menu["channels"]
): Promise<Menu> {
  const current = await getMenuAvailability(businessId, menu.id);
  await setMenuAvailability(businessId, menu.id, {
    schedule: scheduleToApi(schedule),
    fallbackMenuId: schedule.fallbackMenuId,
    allowPreOrder: schedule.allowPreorderOutsideSchedule,
    expectedVersion: current.version,
  });
  const full = await getMenu(businessId, menu.id);
  const keys = Object.keys(CHANNEL_CODE) as ChannelKey[];
  const codes = keys.filter((k) => channels[k] !== "off").map((k) => CHANNEL_CODE[k]);
  await updateMenuDetails(businessId, menu.id, {
    name: full.name,
    branchScope: full.branchScope,
    salesChannels: { all: codes.length === keys.length, codes: codes.length === keys.length ? [] : codes },
    expectedVersion: full.version,
  });
  return withScheduleAndChannels(businessId, { ...menu, schedule, channels });
}
