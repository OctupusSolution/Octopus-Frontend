import { describe, expect, it } from "vitest";
import type { CrmCustomerListItemResponse, CrmCustomerProfileResponse } from "@octopus/api-client";
import { toListRecord, toProfileRecord } from "./crm-api";

const row: CrmCustomerListItemResponse = {
  id: "7c1f0c2e-0000-4000-8000-000000000001",
  version: 3,
  firstName: "Noura",
  lastName: "Al-Harbi",
  phoneE164: "+966501234567",
  email: null,
  status: "Blocked",
  tags: [{ id: "t1", name: "VIP", colorKey: "amber", assignedAtUtc: "2026-05-01T10:00:00Z" }],
  avatar: null,
  visits: 4,
  totalSpend: { amount: 800, currency: "SAR" },
  lastVisitAtUtc: "2026-05-10T19:30:00Z",
  customerSince: "2024-02-03",
  upcoming: null,
  birthdayThisMonth: false,
};

const granted = { status: "Granted" as const, source: null, changedAtUtc: null };
const unknown = { status: "Unknown" as const, source: null, changedAtUtc: null };

const profile: CrmCustomerProfileResponse = {
  customer: {
    id: row.id,
    version: 3,
    firstName: "Noura",
    lastName: "Al-Harbi",
    phoneE164: "+966501234567",
    email: "noura@example.com",
    dateOfBirth: "1990-05-12",
    gender: "Female",
    preferredLanguage: "ar",
    sourceCode: "instagram",
    referredBy: null,
    preferredBranchId: null,
    preferredChannels: ["Sms", "WhatsApp"],
    customerSinceExplicit: null,
    customerSince: "2024-02-03",
    status: "Active",
    blockedAtUtc: null,
    blockReasonCode: null,
    deletedAtUtc: null,
    mergedIntoId: null,
    consent: { email: unknown, sms: granted, whatsApp: unknown },
    birthdayThisMonth: false,
    tags: [],
    attributes: [
      { key: "cuisine", type: "MultiSelect", group: "Preferences", text: null, number: null, date: null, bool: null, optionKeys: ["seafood", "grill"], location: null, locationLabel: null },
      { key: "dietary", type: "MultiSelect", group: "Preferences", text: null, number: null, date: null, bool: null, optionKeys: ["gluten-free"], location: null, locationLabel: null },
      { key: "special-requests", type: "LongText", group: "Preferences", text: "Window seat", number: null, date: null, bool: null, optionKeys: null, location: null, locationLabel: null },
    ],
    avatar: null,
    createdAtUtc: "2024-02-03T08:00:00Z",
    updatedAtUtc: null,
  },
  insights: null,
  upcoming: null,
  vipSince: null,
  birthdayThisMonth: false,
  loyaltyPoints: null,
  identities: null,
  segments: null,
};

describe("toListRecord", () => {
  it("flattens a list row", () => {
    const record = toListRecord(row);
    expect(record).toMatchObject({
      id: row.id,
      phone: "+966501234567",
      email: "",
      isBlocked: true,
      tags: ["VIP"],
      totalSpendSar: 800,
      avgSpendSar: 200,
      lastVisit: "2026-05-10",
    });
  });

  it("leaves the last visit empty for a customer who never visited", () => {
    const record = toListRecord({ ...row, visits: 0, lastVisitAtUtc: null });
    expect(record.lastVisit).toBe("");
    expect(record.avgSpendSar).toBe(0);
  });
});

describe("toProfileRecord", () => {
  it("maps consent, channels and profile attributes", () => {
    const record = toProfileRecord(profile, [
      { id: "n1", customerId: row.id, text: "Prefers booth", authorAccountId: "a1", createdAtUtc: "2026-05-11T09:00:00Z" },
    ]);
    expect(record.gender).toBe("Female");
    expect(record.marketingConsent).toBe("Opted in");
    expect(record.communicationPreference).toEqual(["SMS", "WhatsApp"]);
    expect(record.cuisinePreference).toEqual(["Seafood", "Grill"]);
    expect(record.dietaryPreference).toBe("Gluten free");
    expect(record.specialRequests).toBe("Window seat");
    expect(record.referredBy).toBe("instagram");
    expect(record.notes).toEqual([{ date: "2026-05-11", text: "Prefers booth" }]);
  });

  it("keeps the list row's figures while the profile has no insights yet", () => {
    const record = toProfileRecord(profile, [], toListRecord(row));
    expect(record.visits).toBe(4);
    expect(record.totalSpendSar).toBe(800);
    expect(record.lastVisit).toBe("2026-05-10");
  });
});
