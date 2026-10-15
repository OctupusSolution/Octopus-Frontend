// apps/merchant/src/pages/customers/segments/mock-segments.ts
// MOCK DATA. Shown only when the CRM segments API is not available to the
// business (403 / 404), in the same way the customer list falls back to its
// sample customers. Shaped like the API's own responses so nothing else changes
// when the real data arrives:
//   mockSegments        -> GET  /crm/segments            (CrmSegmentSummaryResponse)
//   mockAudienceEstimate-> POST /crm/audiences/estimate  (CrmAudienceEstimateResponse)
//   mockPreviewMembers  -> no endpoint yet: a segment's members list
import type { CrmCustomerCriteriaDto } from "@octopus/api-client";
import type { SegmentMemberPreview, SegmentTrendPoint, SegmentView } from "./segment-model";

// The frames draw every card with the same figures and the same rule.
const FRAME_CRITERIA: CrmCustomerCriteriaDto = {
  match: "All",
  conditions: [
    { field: "visit_count", operator: "Gte", value: { kind: "int", int: 40 } },
    { field: "total_spend", operator: "Gte", value: { kind: "money", amount: 5000 } },
  ],
};

// Eight weekly points following the frame's trend line (a dip at the fourth).
const FRAME_TREND: readonly SegmentTrendPoint[] = [
  { localDate: "2026-08-10", members: 610 },
  { localDate: "2026-08-17", members: 649 },
  { localDate: "2026-08-24", members: 688 },
  { localDate: "2026-08-31", members: 668 },
  { localDate: "2026-09-07", members: 726 },
  { localDate: "2026-09-14", members: 765 },
  { localDate: "2026-09-21", members: 803 },
  { localDate: "2026-09-28", members: 842 },
];

function frameSegment(id: string, name: string): SegmentView {
  return { id, name, criteria: FRAME_CRITERIA, members: 842, ofBasePercent: 6.6, avgSpendSar: 1840, trend: FRAME_TREND };
}

export const mockSegments: readonly SegmentView[] = [
  frameSegment("seg-vip", "VIP"),
  frameSegment("seg-new", "New"),
  frameSegment("seg-regular", "Regular"),
  frameSegment("seg-big-spenders", "Big Spenders"),
  frameSegment("seg-at-risk", "At-Risk"),
  frameSegment("seg-inactive", "Inactive"),
];

export const mockPreviewMembers: readonly SegmentMemberPreview[] = [
  { id: "mock-member-1", name: "Abdullah Al-Qahtani", visits: 62, totalSpendSar: 8420 },
  { id: "mock-member-2", name: "Noura Al-Harbi", visits: 28, totalSpendSar: 3150 },
  { id: "mock-member-3", name: "Faisal Al-Zahrani", visits: 2, totalSpendSar: 210 },
  { id: "mock-member-4", name: "Sara Al-Otaibi", visits: 74, totalSpendSar: 11860 },
  { id: "mock-member-5", name: "Khalid Al-Dosari", visits: 14, totalSpendSar: 1640 },
];

export const mockAudienceEstimate = { estimatedCount: 12847 } as const;
