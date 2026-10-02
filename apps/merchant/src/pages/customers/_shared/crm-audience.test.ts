import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CrmCustomerActivityResponse, CrmCustomerTransactionResponse, CrmDashboardResponse } from "@octopus/api-client";

vi.mock("@octopus/api-client", async (importActual) => ({
  ...(await importActual<typeof import("@octopus/api-client")>()),
  listCrmTags: vi.fn(),
  createCrmCampaignDraft: vi.fn(),
  sendCrmCampaign: vi.fn(),
  deleteCrmCampaignDraft: vi.fn(),
}));

import * as api from "@octopus/api-client";
import { audienceCriteria, listFiltersCriteria, sendMessage, toPayments, toReservations, toStats } from "./crm-api";
import { EMPTY_LIST_FILTERS } from "./list-filter";
import { EMPTY_AUDIENCE_FILTERS } from "./send-message-wizard/audience";

const BUSINESS = "b1";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.listCrmTags).mockResolvedValue({
    success: true,
    data: [{ id: "tag-vip", version: 1, name: "VIP", colorKey: "amber", isSeeded: true, isVipTag: true }],
    error: null,
    metadata: null,
    correlationId: "",
    timestampUtc: "",
  });
});

describe("listFiltersCriteria", () => {
  it("turns the filter bar into Match All conditions, without the search text", async () => {
    const criteria = await listFiltersCriteria(BUSINESS, {
      ...EMPTY_LIST_FILTERS,
      search: "noura",
      tags: ["vip"],
      visits: { from: "3", to: "" },
      spend: { from: "", to: "500" },
      lastVisit: { from: "2026-05-01", to: "" },
    });
    expect(criteria).toEqual({
      match: "All",
      conditions: [
        { field: "tags", operator: "ContainsAny", value: { kind: "ids", ids: ["tag-vip"] } },
        { field: "visit_count", operator: "Gte", value: { kind: "int", int: 3 } },
        { field: "total_spend", operator: "Lte", value: { kind: "money", amount: 500 } },
        { field: "last_visit_at", operator: "Gte", value: { kind: "date", date: "2026-05-01" } },
      ],
    });
  });

  it("refuses a tag the business does not have rather than widening the match", async () => {
    await expect(listFiltersCriteria(BUSINESS, { ...EMPTY_LIST_FILTERS, tags: ["Ghost"] })).rejects.toThrow("Ghost");
  });
});

describe("audienceCriteria", () => {
  it("adds a chosen segment's conditions to the wizard's own", async () => {
    const criteria = await audienceCriteria(BUSINESS, {
      ...EMPTY_AUDIENCE_FILTERS,
      gender: "Female",
      ageRange: "51+",
      segment: {
        id: "s1",
        name: "Regulars",
        filters: EMPTY_LIST_FILTERS,
        criteria: { match: "All", conditions: [{ field: "visit_count", operator: "Gte", value: { kind: "int", int: 5 } }] },
      },
    });
    expect(criteria.conditions).toEqual([
      { field: "visit_count", operator: "Gte", value: { kind: "int", int: 5 } },
      { field: "gender", operator: "In", value: { kind: "strings", values: ["Female"] } },
      { field: "age", operator: "Gte", value: { kind: "int", int: 51 } },
    ]);
  });
  it("asks for every customer when no filter is set, since empty criteria are refused", async () => {
    const criteria = await audienceCriteria(BUSINESS, EMPTY_AUDIENCE_FILTERS);
    expect(criteria.conditions).toEqual([
      { field: "customer_since", operator: "Lte", value: { kind: "date", date: new Date().toISOString().slice(0, 10) } },
    ]);
  });
});

describe("sendMessage", () => {
  const draft = { id: "camp-1", version: 1 } as api.CrmCampaignResponse;

  it("saves one draft per channel and sends it", async () => {
    vi.mocked(api.createCrmCampaignDraft).mockResolvedValue(draft);
    vi.mocked(api.sendCrmCampaign).mockResolvedValue(draft);

    await sendMessage(BUSINESS, {
      filters: EMPTY_AUDIENCE_FILTERS,
      channels: ["Email", "SMS"],
      message: "Hello {{First_Name}}",
      timing: { kind: "batches", batchSize: 250 },
      language: "en",
    });

    const requests = vi.mocked(api.createCrmCampaignDraft).mock.calls.map(([, request]) => request);
    expect(requests.map((r) => r.channel)).toEqual(["Email", "Sms"]);
    expect(requests[0].content.subject).toBeTruthy();
    expect(requests[1].content.subject).toBeNull();
    expect(requests[0].delivery).toEqual({ mode: "Paced", batchSize: 250, intervalMinutes: 60 });
    expect(api.sendCrmCampaign).toHaveBeenCalledTimes(2);
  });

  it("deletes the draft when the server refuses to send it", async () => {
    vi.mocked(api.createCrmCampaignDraft).mockResolvedValue(draft);
    vi.mocked(api.sendCrmCampaign).mockRejectedValue(new api.ApiError(409, { errorCode: "crm.campaign.sending-disabled" }));
    vi.mocked(api.deleteCrmCampaignDraft).mockResolvedValue(undefined);

    await expect(
      sendMessage(BUSINESS, { filters: EMPTY_AUDIENCE_FILTERS, channels: ["Email"], message: "Hi", timing: { kind: "now" }, language: "ar" })
    ).rejects.toBeInstanceOf(api.ApiError);
    expect(api.deleteCrmCampaignDraft).toHaveBeenCalledWith(BUSINESS, "camp-1", 1);
  });
});

describe("history", () => {
  it("shows an engagement as a reservation and a payment by its method", () => {
    const activity = {
      kind: "Engagement",
      engagement: {
        state: "Scheduled",
        scheduledAtUtc: "2026-05-10T16:30:00Z",
        endAtUtc: null,
        attendedAtUtc: null,
        attendeeCount: 4,
        locationLabel: "Terrace T3",
        reference: "R-1001",
        statusCode: "Pending",
      },
      purchase: null,
    } as CrmCustomerActivityResponse;
    expect(toReservations([activity])).toEqual([{ date: "2026-05-10T16:30:00Z", table: "Terrace T3", guests: 4, status: "Pending" }]);

    const tx = (kind: "Payment" | "Refund", state: string) =>
      ({ kind, state, amount: { amount: 150, currency: "SAR" }, occurredAtUtc: "2026-05-10T17:00:00Z", methodCode: "OnlineCard" }) as CrmCustomerTransactionResponse;
    expect(toPayments([tx("Payment", "Paid"), tx("Refund", "Refunded"), tx("Payment", "Pending")])).toEqual([
      { date: "2026-05-10", cardLast4: "", method: "OnlineCard", amountSar: 150, status: "PAID" },
      { date: "2026-05-10", cardLast4: "", method: "OnlineCard", amountSar: 150, status: "PENDING" },
    ]);
  });
});

describe("toStats", () => {
  it("shows a missing baseline as a dash and spend in the business's currency", () => {
    const kpi = (value: number, deltaPercent: number | null) => ({ value, baseline: 0, deltaPercent, comparedWith: "yesterday" as const });
    const stats = toStats({
      asOfUtc: "",
      timeZoneId: "Asia/Riyadh",
      currency: "SAR",
      kpis: {
        totalCustomers: kpi(120, 12.5),
        activeCustomers: kpi(80, null),
        newThisMonth: kpi(6, 0),
        vipCustomers: kpi(9, 0),
        returningCustomers: kpi(40, 0),
        spendThisMonth: {
          value: { amount: 1_400_000, currency: "SAR" },
          baseline: { amount: 0, currency: "SAR" },
          deltaPercent: null,
          comparedWith: "previous-month-to-date",
        },
      },
    } satisfies CrmDashboardResponse);
    expect(stats.total).toEqual({ value: 120, delta: "12.5%" });
    expect(stats.active.delta).toBe("—");
    expect(stats.totalSpend).toEqual({ display: "SAR 1.4M", delta: "—" });
  });
});
