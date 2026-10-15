// A place's period of service (backend "place occupancy", US-020): one open period per table,
// collecting the orders taken there, guest and staff alike. Order.Contracts OccupancyDtos.cs.
// `status` is the enum name ("Open" | "Closed").

export interface OccupancyPlace {
  sourceKey: string;
  containerId: string;
  resourceId: string;
  code: string;
  displayName: string;
}

export interface OccupancyResponse {
  id: string;
  businessId: string;
  branchId: string | null;
  place: OccupancyPlace;
  status: string;
  openedVia: string;
  openedByAccountId: string | null;
  openedAtUtc: string;
  closedAtUtc: string | null;
  closedByAccountId: string | null;
  reopenCount: number;
  orderCount: number;
  unacceptedOrderCount: number;
  version: number;
}
