// Mock data for /settings/devices — 48 devices across the branch network.
// Status counts are fixed to match the KPI row: 44 Online, 3 Offline,
// 1 Needs Attention. Offline devices are sorted to the top by the page.
import type { KpiCard } from "./mock-dashboard";

export type DeviceType =
  | "POS Terminal"
  | "KDS Screen"
  | "Receipt Printer"
  | "Kitchen Printer"
  | "Label Printer"
  | "Cash Drawer"
  | "Card Reader";

export type DeviceStatus = "Online" | "Offline" | "Needs Attention";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  model: string;
  branchId: string;
  branchName: string;
  /** IP address for smart devices, serial number for printers/drawers. */
  endpoint: string;
  lastHeartbeat: string;
  status: DeviceStatus;
  /** Only printers have a routing target (e.g. "Kitchen Printer → Grill"). */
  routing?: string;
}

type DeviceSpec = readonly [
  branchId: string, branchName: string, id: string, name: string, type: DeviceType,
  model: string, endpoint: string, heartbeat: string, status: DeviceStatus, routing?: string,
];

const SPECS: readonly DeviceSpec[] = [
  // Riyadh - Olaya
  ["br-1", "Riyadh - Olaya", "dev-01", "Olaya POS-01", "POS Terminal", "Sunmi V2 Pro", "10.0.1.11", "just now", "Online"],
  ["br-1", "Riyadh - Olaya", "dev-02", "Olaya POS-02", "POS Terminal", "PAX A920 Pro", "10.0.1.12", "2 min ago", "Online"],
  ["br-1", "Riyadh - Olaya", "dev-03", "Olaya KDS-01", "KDS Screen", "Castles Q3", "10.0.1.21", "1 min ago", "Online"],
  ["br-1", "Riyadh - Olaya", "dev-04", "Olaya KDS-02", "KDS Screen", "LinkPOS F2", "10.0.1.22", "5 min ago", "Online"],
  ["br-1", "Riyadh - Olaya", "dev-05", "Olaya KDS-03", "KDS Screen", "VSun 5M", "10.0.1.23", "just now", "Online"],
  ["br-1", "Riyadh - Olaya", "dev-06", "Olaya Receipt-01", "Receipt Printer", "Epson TM-m30III", "SN RCP-1101", "just now", "Online", "Receipt Printer → POS 1"],
  ["br-1", "Riyadh - Olaya", "dev-07", "Olaya Kitchen-01", "Kitchen Printer", "Epson TM-T88VI", "SN KCP-1101", "just now", "Online", "Kitchen Printer → Grill Station"],
  ["br-1", "Riyadh - Olaya", "dev-08", "Olaya Kitchen-02", "Kitchen Printer", "Bixolon SRP-350III", "SN KCP-1102", "just now", "Online", "Kitchen Printer → Cold Prep"],
  ["br-1", "Riyadh - Olaya", "dev-09", "Olaya Label-01", "Label Printer", "Zebra GK420d", "SN LBL-1101", "4 min ago", "Online", "Label Printer → Packing Station"],
  ["br-1", "Riyadh - Olaya", "dev-10", "Olaya Drawer-01", "Cash Drawer", "APG 610B", "SN CWD-1101", "just now", "Online"],
  ["br-1", "Riyadh - Olaya", "dev-11", "Olaya Reader-01", "Card Reader", "PAX D210", "10.0.1.31", "just now", "Online"],
  // Riyadh - Narjis
  ["br-2", "Riyadh - Narjis", "dev-12", "Narjis POS-01", "POS Terminal", "Castles Q6", "10.0.2.11", "3 min ago", "Online"],
  ["br-2", "Riyadh - Narjis", "dev-13", "Narjis KDS-01", "KDS Screen", "Castles Q3", "10.0.2.21", "just now", "Online"],
  ["br-2", "Riyadh - Narjis", "dev-14", "Narjis KDS-02", "KDS Screen", "VSun 5M", "10.0.2.22", "8 min ago", "Online"],
  ["br-2", "Riyadh - Narjis", "dev-15", "Narjis Receipt-01", "Receipt Printer", "Star TSP143IV", "SN RCP-1201", "just now", "Online", "Receipt Printer → POS 1"],
  ["br-2", "Riyadh - Narjis", "dev-16", "Narjis Kitchen-01", "Kitchen Printer", "Star TSP654", "SN KCP-1201", "just now", "Online", "Kitchen Printer → Grill Station"],
  ["br-2", "Riyadh - Narjis", "dev-17", "Narjis Drawer-01", "Cash Drawer", "CashCode RD-M22", "SN CWD-1201", "just now", "Online"],
  ["br-2", "Riyadh - Narjis", "dev-18", "Narjis Reader-01", "Card Reader", "Verve NFC", "10.0.2.31", "6 min ago", "Online"],
  // Riyadh - Airport (cloud kitchen)
  ["br-3", "Riyadh - Airport", "dev-19", "Airport KDS-01", "KDS Screen", "VSun 5M", "10.0.3.21", "just now", "Online"],
  ["br-3", "Riyadh - Airport", "dev-20", "Airport Kitchen-01", "Kitchen Printer", "Bixolon SRP-350III", "SN KCP-1301", "just now", "Online", "Kitchen Printer → Production Line A"],
  ["br-3", "Riyadh - Airport", "dev-21", "Airport Label-01", "Label Printer", "Brother QL-820NWB", "SN LBL-1301", "just now", "Online", "Label Printer → Packing Station"],
  // Jeddah - Corniche
  ["br-4", "Jeddah - Corniche", "dev-22", "Corniche POS-01", "POS Terminal", "Sunmi V2 Pro", "10.0.4.11", "just now", "Online"],
  ["br-4", "Jeddah - Corniche", "dev-23", "Corniche POS-02", "POS Terminal", "PAX A920 Pro", "10.0.4.12", "1 min ago", "Online"],
  ["br-4", "Jeddah - Corniche", "dev-24", "Corniche KDS-01", "KDS Screen", "Castles Q3", "10.0.4.21", "just now", "Online"],
  ["br-4", "Jeddah - Corniche", "dev-25", "Corniche KDS-02", "KDS Screen", "LinkPOS F2", "10.0.4.22", "2 min ago", "Online"],
  ["br-4", "Jeddah - Corniche", "dev-26", "Corniche KDS-03", "KDS Screen", "VSun 5M", "10.0.4.23", "just now", "Online"],
  ["br-4", "Jeddah - Corniche", "dev-27", "Corniche Receipt-01", "Receipt Printer", "Epson TM-m30III", "SN RCP-1401", "just now", "Online", "Receipt Printer → POS 1"],
  ["br-4", "Jeddah - Corniche", "dev-28", "Corniche Kitchen-01", "Kitchen Printer", "Epson TM-T88VI", "SN KCP-1401", "just now", "Online", "Kitchen Printer → Grill Station"],
  ["br-4", "Jeddah - Corniche", "dev-29", "Corniche Kitchen-02", "Kitchen Printer", "Star TSP654", "SN KCP-1402", "1 hr ago", "Needs Attention", "Kitchen Printer → Seafront Prep"],
  ["br-4", "Jeddah - Corniche", "dev-30", "Corniche Label-01", "Label Printer", "Zebra GK420d", "SN LBL-1401", "7 min ago", "Online", "Label Printer → Packing Station"],
  ["br-4", "Jeddah - Corniche", "dev-31", "Corniche Drawer-01", "Cash Drawer", "APG 610B", "SN CWD-1401", "just now", "Online"],
  ["br-4", "Jeddah - Corniche", "dev-32", "Corniche Reader-01", "Card Reader", "PAX D210", "10.0.4.31", "just now", "Online"],
  // Jeddah - Tahlia (drive-thru)
  ["br-5", "Jeddah - Tahlia", "dev-33", "Tahlia POS-01", "POS Terminal", "MobiLux Q3", "10.0.5.11", "just now", "Online"],
  ["br-5", "Jeddah - Tahlia", "dev-34", "Tahlia KDS-01", "KDS Screen", "VSun 5M", "10.0.5.21", "just now", "Online"],
  ["br-5", "Jeddah - Tahlia", "dev-35", "Tahlia Kitchen-01", "Kitchen Printer", "Bixolon SRP-350III", "SN KCP-1501", "just now", "Online", "Kitchen Printer → Grill Station"],
  ["br-5", "Jeddah - Tahlia", "dev-36", "Tahlia Receipt-01", "Receipt Printer", "Epson TM-T20X", "SN RCP-1501", "14 min ago", "Offline", "Receipt Printer → POS 1"],
  // Jeddah - Balad (kiosk)
  ["br-6", "Jeddah - Balad", "dev-37", "Balad POS-01", "POS Terminal", "Castles Q6", "10.0.6.11", "just now", "Online"],
  ["br-6", "Jeddah - Balad", "dev-38", "Balad Receipt-01", "Receipt Printer", "Star TSP143IV", "SN RCP-1601", "just now", "Online", "Receipt Printer → Kiosk 1"],
  ["br-6", "Jeddah - Balad", "dev-39", "Balad Reader-01", "Card Reader", "Verve NFC", "10.0.6.31", "just now", "Online"],
  // Dammam - Corniche
  ["br-7", "Dammam - Corniche", "dev-40", "Dammam POS-01", "POS Terminal", "Sunmi V2 Pro", "10.0.7.11", "2 min ago", "Online"],
  ["br-7", "Dammam - Corniche", "dev-41", "Dammam KDS-01", "KDS Screen", "Castles Q3", "10.0.7.21", "9 min ago", "Offline"],
  ["br-7", "Dammam - Corniche", "dev-42", "Dammam Kitchen-01", "Kitchen Printer", "Epson TM-T88VI", "SN KCP-1701", "just now", "Online", "Kitchen Printer → Grill Station"],
  ["br-7", "Dammam - Corniche", "dev-43", "Dammam Drawer-01", "Cash Drawer", "APG 610B", "SN CWD-1701", "just now", "Online"],
  ["br-7", "Dammam - Corniche", "dev-44", "Dammam Reader-01", "Card Reader", "PAX D210", "10.0.7.31", "just now", "Online"],
  // Al Khobar - Rakah
  ["br-8", "Al Khobar - Rakah", "dev-45", "Khobar POS-01", "POS Terminal", "PAX A920 Pro", "10.0.8.11", "just now", "Online"],
  ["br-8", "Al Khobar - Rakah", "dev-46", "Khobar KDS-01", "KDS Screen", "LinkPOS F2", "10.0.8.21", "just now", "Online"],
  ["br-8", "Al Khobar - Rakah", "dev-47", "Khobar Kitchen-01", "Kitchen Printer", "Star TSP654", "SN KCP-1801", "just now", "Online", "Kitchen Printer → Cold Prep"],
  // Madinah - Airport (cloud kitchen)
  ["br-12", "Madinah - Airport", "dev-48", "Madinah Kitchen-01", "Kitchen Printer", "Bixolon SRP-350III", "SN KCP-1901", "3 hr ago", "Offline", "Kitchen Printer → Production Line A"],
];

export const devices: readonly Device[] = SPECS.map((spec) => {
  const [branchId, branchName, id, name, type, model, endpoint, heartbeat, status, routing] = spec;
  return {
    branchId, branchName, id, name, type, model, endpoint,
    lastHeartbeat: heartbeat, status,
    ...(routing ? { routing } : {}),
  };
});

export const deviceTypes: readonly DeviceType[] = [
  "POS Terminal", "KDS Screen", "Receipt Printer", "Kitchen Printer",
  "Label Printer", "Cash Drawer", "Card Reader",
] as const;

export const deviceStatuses: readonly DeviceStatus[] = ["Online", "Offline", "Needs Attention"] as const;

export const deviceKpis: readonly KpiCard[] = [
  {
    id: "dev-kpi-total",
    label: "Devices",
    value: "48",
    delta: "+3",
    deltaNote: "vs last month",
    color: "#a78bfa",
    sparkline: [40, 42, 42, 44, 45, 46, 47, 48],
  },
  {
    id: "dev-kpi-online",
    label: "Online",
    value: "44",
    delta: "+4",
    deltaNote: "vs last month",
    color: "#a3e635",
    sparkline: [36, 38, 39, 40, 41, 42, 43, 44],
  },
  {
    id: "dev-kpi-offline",
    label: "Offline",
    value: "3",
    delta: "-1",
    deltaNote: "vs last month",
    color: "#fb923c",
    sparkline: [5, 5, 4, 4, 3, 4, 3, 3],
  },
  {
    id: "dev-kpi-attention",
    label: "Needs Attention",
    value: "1",
    delta: "0",
    deltaNote: "vs last month",
    color: "#fbbf24",
    sparkline: [2, 3, 2, 2, 1, 2, 1, 1],
  },
] as const;
