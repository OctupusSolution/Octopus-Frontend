import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CrmCustomerListItemResponse, CrmCustomerProfileResponse } from "@octopus/api-client";

vi.mock("@octopus/api-client", async (importActual) => ({
  ...(await importActual<typeof import("@octopus/api-client")>()),
  listCrmCustomers: vi.fn(),
  listCrmTags: vi.fn(),
  listCrmCustomerNotes: vi.fn(),
  listCrmCustomerActivities: vi.fn(),
  listCrmCustomerTransactions: vi.fn(),
  getCrmCustomer: vi.fn(),
  createCrmCustomer: vi.fn(),
  createCrmTag: vi.fn(),
  bulkTagCrmCustomers: vi.fn(),
  bulkDeleteCrmCustomers: vi.fn(),
  deleteCrmCustomer: vi.fn(),
  blockCrmCustomer: vi.fn(),
  mergeCrmCustomers: vi.fn(),
}));

import * as api from "@octopus/api-client";
import {
  actionErrorKey,
  addCustomersTag,
  createCustomer,
  deleteCustomers,
  loadCustomers,
  mergeCustomerRecords,
  setCustomerBlocked,
  toListRecord,
} from "./crm-api";

const BUSINESS = "b1";
const unknown = { status: "Unknown" as const, source: null, changedAtUtc: null };

function row(id: string, version: number): CrmCustomerListItemResponse {
  return {
    id,
    version,
    firstName: "Noura",
    lastName: "Al-Harbi",
    phoneE164: "+966501234567",
    email: null,
    status: "Active",
    tags: [],
    avatar: null,
    visits: 0,
    totalSpend: { amount: 0, currency: "SAR" },
    lastVisitAtUtc: null,
    customerSince: "2024-02-03",
    upcoming: null,
    birthdayThisMonth: false,
  };
}

function profile(id: string, version: number): CrmCustomerProfileResponse {
  return {
    customer: {
      id,
      version,
      firstName: "Noura",
      lastName: "Al-Harbi",
      phoneE164: "+966501234567",
      email: null,
      dateOfBirth: null,
      gender: "Female",
      preferredLanguage: null,
      sourceCode: null,
      referredBy: null,
      preferredBranchId: null,
      preferredChannels: [],
      customerSinceExplicit: null,
      customerSince: "2024-02-03",
      status: "Active",
      blockedAtUtc: null,
      blockReasonCode: null,
      deletedAtUtc: null,
      mergedIntoId: null,
      consent: { email: unknown, sms: unknown, whatsApp: unknown },
      birthdayThisMonth: false,
      tags: [],
      attributes: [],
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
}

const envelope = <T,>(data: T[]) => ({ success: true, data, error: null, metadata: null, correlationId: "", timestampUtc: "" });

/** Loads the list so the bridge knows these customers' versions. */
async function loaded(...rows: CrmCustomerListItemResponse[]) {
  vi.mocked(api.listCrmCustomers).mockResolvedValue(envelope(rows));
  await loadCustomers(BUSINESS);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listCrmCustomerNotes).mockResolvedValue(envelope([]));
  vi.mocked(api.listCrmCustomerActivities).mockResolvedValue(envelope([]));
  vi.mocked(api.listCrmCustomerTransactions).mockResolvedValue(envelope([]));
  vi.mocked(api.listCrmTags).mockResolvedValue(
    envelope([{ id: "tag-vip", version: 1, name: "VIP", colorKey: "amber", isSeeded: true, isVipTag: true }])
  );
});

describe("createCustomer", () => {
  it("sends the source code and consent only for the chosen channels, then attaches the tags", async () => {
    vi.mocked(api.createCrmTag).mockResolvedValue({ id: "tag-new", version: 1, name: "Regular", colorKey: "slate", isSeeded: false, isVipTag: false });
    vi.mocked(api.createCrmCustomer).mockResolvedValue({ customer: profile("c9", 1).customer, possibleDuplicates: [] });
    vi.mocked(api.getCrmCustomer).mockResolvedValue(profile("c9", 1));

    const draft = {
      ...toListRecord(row("draft", 0)),
      email: "",
      tags: ["vip", "Regular"],
      referredBy: "Instagram",
      marketingConsent: "Opted in" as const,
      communicationPreference: ["SMS" as const],
      notes: [{ date: "2026-10-02", text: "Window seat" }],
    };
    const created = await createCustomer(BUSINESS, draft);

    expect(api.createCrmTag).toHaveBeenCalledWith(BUSINESS, { name: "Regular", colorKey: "slate" });
    const [, request, idempotencyKey] = vi.mocked(api.createCrmCustomer).mock.calls[0];
    expect(request).toMatchObject({
      email: null,
      sourceCode: "social-media",
      referredBy: null,
      preferredChannels: ["Sms"],
      consent: { email: null, sms: "Granted", whatsApp: null },
      note: "Window seat",
    });
    expect(idempotencyKey).toBeTruthy();
    // Tags follow the create: a business's seeded tags only exist once its first command has run.
    expect(request).not.toHaveProperty("tagIds");
    expect(api.bulkTagCrmCustomers).toHaveBeenCalledWith(BUSINESS, { customerIds: ["c9"], addTagIds: ["tag-vip", "tag-new"] });
    expect(created.id).toBe("c9");
  });
});

describe("versions", () => {
  it("blocks with the version the list gave, then deletes with the one the block returned", async () => {
    await loaded(row("c1", 4));
    vi.mocked(api.blockCrmCustomer).mockResolvedValue({ ...profile("c1", 5).customer, status: "Blocked" });

    const blocked = await setCustomerBlocked(BUSINESS, toListRecord(row("c1", 4)), true);
    expect(api.blockCrmCustomer).toHaveBeenCalledWith(BUSINESS, "c1", 4);
    expect(blocked.isBlocked).toBe(true);

    await deleteCustomers(BUSINESS, ["c1"]);
    expect(api.deleteCrmCustomer).toHaveBeenCalledWith(BUSINESS, "c1", 5);
  });

  it("deletes many in one all-or-nothing call", async () => {
    await loaded(row("c1", 2), row("c2", 7));
    await deleteCustomers(BUSINESS, ["c1", "c2"]);
    expect(api.bulkDeleteCrmCustomers).toHaveBeenCalledWith(BUSINESS, {
      items: [
        { customerId: "c1", expectedVersion: 2 },
        { customerId: "c2", expectedVersion: 7 },
      ],
    });
    expect(api.deleteCrmCustomer).not.toHaveBeenCalled();
  });

  it("merges into the first customer with every participant's version", async () => {
    await loaded(row("c1", 2), row("c2", 7));
    vi.mocked(api.mergeCrmCustomers).mockResolvedValue({ canonicalCustomerId: "c1", version: 3, mergedCustomerIds: ["c2"] });
    vi.mocked(api.getCrmCustomer).mockResolvedValue(profile("c1", 3));

    const merged = await mergeCustomerRecords(BUSINESS, ["c1", "c2"]);
    expect(api.mergeCrmCustomers).toHaveBeenCalledWith(BUSINESS, {
      canonicalId: "c1",
      mergedIds: ["c2"],
      expectedVersions: { c1: 2, c2: 7 },
    });
    expect(merged.id).toBe("c1");
  });
});

describe("addCustomersTag", () => {
  it("attaches an existing tag by id without creating it again", async () => {
    await addCustomersTag(BUSINESS, ["c1", "c2"], "VIP");
    expect(api.createCrmTag).not.toHaveBeenCalled();
    expect(api.bulkTagCrmCustomers).toHaveBeenCalledWith(BUSINESS, { customerIds: ["c1", "c2"], addTagIds: ["tag-vip"] });
  });
});

describe("tags", () => {
  it("uses the existing tag when its name is taken between the list and the create", async () => {
    const vip = { id: "tag-vip", version: 1, name: "VIP", colorKey: "amber", isSeeded: true, isVipTag: true };
    vi.mocked(api.listCrmTags).mockResolvedValueOnce(envelope([])).mockResolvedValue(envelope([vip]));
    vi.mocked(api.createCrmTag).mockRejectedValue(new api.ApiError(409, { errorCode: "crm.tag.name-taken" }));

    await addCustomersTag(BUSINESS, ["c1"], "VIP");
    expect(api.bulkTagCrmCustomers).toHaveBeenCalledWith(BUSINESS, { customerIds: ["c1"], addTagIds: ["tag-vip"] });
  });
});

describe("actionErrorKey", () => {
  it("names the refusals the screens can explain", () => {
    const refused = (errorCode: string) => new api.ApiError(409, { errorCode });
    expect(actionErrorKey(refused("crm.customer.phone-taken"))).toBe("customers.error.phoneTaken");
    expect(actionErrorKey(refused("crm.concurrency.stale"))).toBe("customers.error.stale");
    expect(actionErrorKey(new Error("offline"))).toBe("customers.error.generic");
  });
});
