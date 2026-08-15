// Mock data for /settings/business — business & legal entity profile.
// Stands in for GET /tenant/profile until the backend exists. Mirrors the
// mock-dashboard/mock-orders convention: typed readonly consts, swapped later
// for a TanStack Query hook with a one-file change.

export type EntityType = "Company" | "Partnership" | "Sole Proprietor";
export type CalendarKind = "Gregorian" | "Hijri";
export type NumberFormat = "1,234.56" | "1.234,56";
export type WeekStart = "Sunday" | "Saturday";

export interface BusinessProfile {
  legalNameEn: string;
  legalNameAr: string;
  crNumber: string;
  vatNumber: string;
  nationalAddress: string;
  entityType: EntityType;
  email: string;
  phone: string;
  website: string;
  logoUrl: string | null;
  brandColors: readonly string[];
  defaultLanguage: "ar" | "en";
  timezone: string;
  calendar: CalendarKind;
  currency: "SAR";
  numberFormat: NumberFormat;
  weekStart: WeekStart;
}

export const businessProfile: BusinessProfile = {
  legalNameEn: "Al Bahri Group Restaurants",
  legalNameAr: "مجموعة البحر للمطاعم",
  crNumber: "1010456789",
  vatNumber: "300000000000003",
  nationalAddress: "Riyadh, King Fahd Road, Building 4521, Unit 12, Al Olaya District",
  entityType: "Company",
  email: "owner@albahri.sa",
  phone: "+966551234567",
  website: "https://albahri.sa",
  logoUrl: null,
  // Pre-filled with the OCTOPUS palette (AGENTS.md §5) — the pickers open here.
  brandColors: ["#0D6EFD", "#6C4DFF", "#081026"],
  defaultLanguage: "ar",
  timezone: "Asia/Riyadh",
  calendar: "Gregorian",
  currency: "SAR",
  numberFormat: "1,234.56",
  weekStart: "Sunday",
} as const;

export const entityTypeOptions: readonly EntityType[] = ["Company", "Partnership", "Sole Proprietor"] as const;
export const timezoneOptions: readonly string[] = ["Asia/Riyadh", "Asia/Qatar", "Asia/Dubai", "Africa/Cairo", "Asia/Baghdad"] as const;
export const calendarOptions: readonly CalendarKind[] = ["Gregorian", "Hijri"] as const;
export const numberFormatOptions: readonly NumberFormat[] = ["1,234.56", "1.234,56"] as const;
export const weekStartOptions: readonly WeekStart[] = ["Sunday", "Saturday"] as const;

// Validation helpers shared with the business settings page. Kept here so the
// page stays declarative and the rules are documented next to the data.
export function isValidCrNumber(value: string): boolean {
  return /^\d{10}$/.test(value);
}

/** ZATCA VAT numbers are 15 digits starting AND ending with 3. */
export function isValidVatNumber(value: string): boolean {
  return /^3\d{13}3$/.test(value);
}

export function isValidEmail(value: string): boolean {
  return /^\S+@\S+\.\S+$/.test(value);
}

/** Saudi mobile: 05XXXXXXXX or +9665XXXXXXXX. */
export function isValidSaudiPhone(value: string): boolean {
  return /^(?:\+9665\d{8}|05\d{8})$/.test(value);
}
