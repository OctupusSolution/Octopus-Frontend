import type { Employee } from "@/shared/api/mock-staff";
import { formatClock, formatTime, shiftDurationHours, toISO } from "../_shared/format";
import type { LeaveRequest, Schedule, ShiftCell } from "../_shared/staff-store";

export const STANDARD_WEEK_HOURS = 40;
export const MAX_WEEK_HOURS = 48;
const OVERTIME_PREMIUM = 0.5;

export function shiftKey(employeeId: string, date: Date | string): string {
  return `${employeeId}|${typeof date === "string" ? date : toISO(date)}`;
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function employeeHours(employeeId: string, days: Date[], shifts: Record<string, ShiftCell>): number {
  return round1(
    days.reduce((sum, d) => {
      const cell = shifts[shiftKey(employeeId, d)];
      return sum + (cell ? shiftDurationHours(cell.start, cell.end) : 0);
    }, 0)
  );
}

function hourlyRate(e: Employee): number {
  const monthly = (e.salaryBandMin + e.salaryBandMax) / 2 || 3000;
  return monthly / 240;
}

export interface WeekSummary {
  totalHours: number;
  employeesScheduled: number;
  overtimeHours: number;
  /** Employee-days in the week that are neither a shift nor a planned day off. */
  openShifts: number;
  laborCost: number;
}

export function summarizeWeek(staff: Employee[], days: Date[], schedule: Schedule): WeekSummary {
  let totalHours = 0;
  let overtimeHours = 0;
  let employeesScheduled = 0;
  let laborCost = 0;
  let openShifts = 0;

  for (const e of staff) {
    const hours = employeeHours(e.id, days, schedule.shifts);
    const overtime = Math.max(0, hours - STANDARD_WEEK_HOURS);
    totalHours += hours;
    overtimeHours += overtime;
    if (hours > 0) employeesScheduled += 1;
    laborCost += hours * hourlyRate(e) + overtime * hourlyRate(e) * OVERTIME_PREMIUM;
    for (const d of days) {
      const key = shiftKey(e.id, d);
      if (!schedule.shifts[key] && !schedule.offDays[key]) openShifts += 1;
    }
  }

  return {
    totalHours: round1(totalHours),
    employeesScheduled,
    overtimeHours: round1(overtimeHours),
    openShifts,
    laborCost: Math.round(laborCost),
  };
}

export function formatCurrency(amount: number, locale: string, withUnit = true): string {
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-u-nu-latn" : "en-US", { maximumFractionDigits: 0 }).format(amount);
  if (!withUnit) return number;
  return locale === "ar" ? `${number} ر.س` : `SAR ${number}`;
}

/** "9:00AM- 6:00PM" — the compact label the schedule grid pills use. */
export function pillLabel(cell: ShiftCell, locale: string): string {
  return `${formatTime(cell.start, locale)}- ${formatTime(cell.end, locale)}`;
}

/** "08:00 AM – 04:00 PM" — the long label cards and tables use. */
export function rangeLabel(start: string, end: string, locale: string): string {
  return `${formatClock(start, locale)} – ${formatClock(end, locale)}`;
}

export function approvedLeaveOn(requests: LeaveRequest[], employeeId: string, date: string): LeaveRequest | undefined {
  return requests.find((r) => r.employeeId === employeeId && r.status === "approved" && r.start <= date && r.end >= date);
}
