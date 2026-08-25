// Mock data for the Delivery module (Aggregator / Third-Party Delivery
// Channels). Stands in for @octopus/api-client until the backend publishes
// a real OpenAPI spec — shape mirrors what a real query would return, so
// swapping this for TanStack Query hooks later is a drop-in change.

/* ------------------------------------------------------------ aggregators */

export type AggregatorId = "hungerstation" | "jahez" | "keeta" | "toyou" | "ownapp";
export type AggregatorStatus = "Connected" | "Error" | "Not Connected" | "Syncing";
export type MenuSyncStatus = "Synced" | "Syncing" | "Out of Sync";

export interface AggregatorPartner {
  id: AggregatorId;
  name: string;
  brandColor: string;
  status: AggregatorStatus;
  ordersToday: number;
  revenueToday: number;
  commissionPercent: number;
  avgPrepTimeMin: number;
  autoAccept: boolean;
  menuSyncStatus: MenuSyncStatus;
  lastSyncMinutesAgo: number | null;
  outOfSyncItems: number;
}

export const aggregatorPartners: readonly AggregatorPartner[] = [
  { id: "hungerstation", name: "HungerStation", brandColor: "#F36F21", status: "Connected", ordersToday: 145, revenueToday: 21800, commissionPercent: 22, avgPrepTimeMin: 24, autoAccept: true, menuSyncStatus: "Synced", lastSyncMinutesAgo: 6, outOfSyncItems: 0 },
  { id: "jahez", name: "Jahez", brandColor: "#FF3D3D", status: "Connected", ordersToday: 118, revenueToday: 17200, commissionPercent: 20, avgPrepTimeMin: 22, autoAccept: true, menuSyncStatus: "Synced", lastSyncMinutesAgo: 12, outOfSyncItems: 0 },
  { id: "keeta", name: "Keeta", brandColor: "#FFC300", status: "Syncing", ordersToday: 62, revenueToday: 8600, commissionPercent: 18, avgPrepTimeMin: 27, autoAccept: false, menuSyncStatus: "Syncing", lastSyncMinutesAgo: 1, outOfSyncItems: 3 },
  { id: "toyou", name: "ToYou", brandColor: "#7C3AED", status: "Error", ordersToday: 34, revenueToday: 4700, commissionPercent: 30, avgPrepTimeMin: 25, autoAccept: true, menuSyncStatus: "Out of Sync", lastSyncMinutesAgo: 186, outOfSyncItems: 11 },
  { id: "ownapp", name: "Own App", brandColor: "#0D6EFD", status: "Connected", ordersToday: 53, revenueToday: 10100, commissionPercent: 0, avgPrepTimeMin: 19, autoAccept: true, menuSyncStatus: "Synced", lastSyncMinutesAgo: 2, outOfSyncItems: 0 },
] as const;
