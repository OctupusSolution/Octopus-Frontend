import { branches, type Employee } from "@/shared/api/mock-staff";
import { shiftDurationHours, toISO } from "../_shared/format";
import type { ShiftCell, ShiftRoleRecord } from "../_shared/staff-store";

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
  openShifts: number;
  laborCost: number;
}

export function summarizeWeek(
  staff: Employee[],
  days: Date[],
  shifts: Record<string, ShiftCell>,
  shiftRoles: ShiftRoleRecord[],
  branchFilter: string
): WeekSummary {
  let totalHours = 0;
  let overtimeHours = 0;
  let employeesScheduled = 0;
  let laborCost = 0;

  for (const e of staff) {
    const hours = employeeHours(e.id, days, shifts);
    const overtime = Math.max(0, hours - STANDARD_WEEK_HOURS);
    totalHours += hours;
    overtimeHours += overtime;
    if (hours > 0) employeesScheduled += 1;
    laborCost += hours * hourlyRate(e) + overtime * hourlyRate(e) * OVERTIME_PREMIUM;
  }

  // An open shift is a seat the Shift Roles coverage rules ask for (per role,
  // per branch, per day) that nobody on the schedule is filling.
  const branchList = branchFilter === "all" ? [...branches] : [branchFilter];
  let openShifts = 0;
  for (const d of days) {
    for (const branch of branchList) {
      for (const role of shiftRoles) {
        if (role.minPerDay <= 0) continue;
        const filled = staff.filter(
          (e) => e.branch === branch && role.staffRole !== null && e.role === role.staffRole && shifts[shiftKey(e.id, d)]
        ).length;
        openShifts += Math.max(0, role.minPerDay - filled);
      }
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
