// What the Schedule Menu modal refuses to save. Pure, so the modal only has
// to decide *when* to show each message (after a touch, or after Save).
import type { MenuSchedule } from "./menu";

export type ScheduleField = "start" | "end" | "days" | "branchIds" | "fallbackMenuId";

export type ScheduleIssue =
  | "time-required"
  | "end-not-after-start"
  | "no-days"
  | "no-branches"
  | "fallback-self";

export type ScheduleErrors = Partial<Record<ScheduleField, ScheduleIssue>>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * A window is one same-day span: the menu API sends a single `start`/`end`
 * pair per day and nothing downstream reads an end before its start as
 * "past midnight", so an end at or before the start is an error, not an
 * overnight window.
 */
export function validateSchedule(schedule: MenuSchedule, menuId: string): ScheduleErrors {
  const errors: ScheduleErrors = {};

  const startOk = TIME.test(schedule.start);
  const endOk = TIME.test(schedule.end);
  if (!startOk) errors.start = "time-required";
  if (!endOk) errors.end = "time-required";
  // "HH:MM" is zero-padded, so the strings order the same way the times do.
  else if (startOk && schedule.end <= schedule.start) errors.end = "end-not-after-start";

  if (schedule.days.length === 0) errors.days = "no-days";
  if (schedule.branchIds.length === 0) errors.branchIds = "no-branches";
  if (schedule.fallbackMenuId !== null && schedule.fallbackMenuId === menuId) errors.fallbackMenuId = "fallback-self";

  return errors;
}

export function isScheduleValid(schedule: MenuSchedule, menuId: string): boolean {
  return Object.keys(validateSchedule(schedule, menuId)).length === 0;
}
