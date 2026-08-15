// Mock data for the Settings page (Integrations Hub + Branches + Roles) —
// same "stands in for @octopus/api-client" rule as mock-dashboard.ts.
import type { KpiCard } from "./mock-dashboard";

/* ------------------------------------------------------------ Integrations */

export type IntegrationStatus = "Connected" | "Error" | "Not Connected" | "Syncing";

export interface Integration {
  id: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  /** human label, e.g. "6 minutes ago" — "Never" when never synced */
  lastSync: string;
  /** brand-ish colour for the circular initial badge */
  color: string;
}

export const integrations: readonly Integration[] = [
  { id: "moyasar", name: "Moyasar", category: "Payments", status: "Connected", lastSync: "6 minutes ago", color: "#6C4DFF" },
  { id: "tap", name: "Tap", category: "Payments", status: "Connected", lastSync: "12 minutes ago", color: "#5B8DEF" },
  { id: "hyperpay", name: "HyperPay", category: "Payments", status: "Not Connected", lastSync: "Never", color: "#0D6EFD" },
  { id: "paytabs", name: "PayTabs", category: "Payments", status: "Not Connected", lastSync: "Never", color: "#22c9d9" },
  { id: "qoyod", name: "Qoyod", category: "Accounting", status: "Connected", lastSync: "1 hour ago", color: "#885CF6" },
  { id: "wafeq", name: "Wafeq", category: "Accounting", status: "Not Connected", lastSync: "Never", color: "#2EC9C0" },
  { id: "daftra", name: "Daftra", category: "Accounting", status: "Not Connected", lastSync: "Never", color: "#4c35d4" },
  { id: "foodics", name: "Foodics", category: "Point of Sale", status: "Syncing", lastSync: "just now", color: "#EF4444" },
  { id: "jisr", name: "Jisr", category: "HR", status: "Connected", lastSync: "2 hours ago", color: "#22C55E" },
  { id: "zenhr", name: "ZenHR", category: "HR", status: "Not Connected", lastSync: "Never", color: "#8B7CF0" },
  { id: "whatsapp", name: "WhatsApp Cloud API", category: "Messaging", status: "Error", lastSync: "3 hours ago", color: "#22C55E" },
  { id: "zatca", name: "ZATCA", category: "Tax Compliance", status: "Connected", lastSync: "4 minutes ago", color: "#F59E0B" },
  { id: "tabby", name: "Tabby", category: "BNPL", status: "Connected", lastSync: "26 minutes ago", color: "#14B8A6" },
  { id: "tamara", name: "Tamara", category: "BNPL", status: "Connected", lastSync: "18 minutes ago", color: "#3B82F6" },
] as const;

/* ----------------------------------------------- Integration details (drawer) */

export type IntegrationEnvironment = "Live" | "Test" | "Production";

export type IntegrationEventKind = "sync" | "error" | "test" | "webhook";

export interface IntegrationEvent {
  id: string;
  kind: IntegrationEventKind;
  label: string;
  time: string;
}

export interface IntegrationDetails {
  id: string;
  environment: IntegrationEnvironment;
  webhookUrl: string;
  /** masked credential shown in the drawer; absent for providers without keys */
  maskedKey?: string;
  events: readonly IntegrationEvent[];
}

const I = (partial: Omit<IntegrationDetails, "id"> & { id: string }): IntegrationDetails => partial;

export const integrationDetails: Record<string, IntegrationDetails> = {
  moyasar: I({
    id: "moyasar", environment: "Live", webhookUrl: "https://al-bahri.sa/webhooks/moyasar",
    maskedKey: "pk_live_••••••••4f2a",
    events: [
      { id: "ev-1", kind: "sync", label: "Captured 1,240 transactions", time: "6 minutes ago" },
      { id: "ev-2", kind: "test", label: "Connection test passed", time: "1 hour ago" },
      { id: "ev-3", kind: "sync", label: "Captured 1,190 transactions", time: "Yesterday" },
      { id: "ev-4", kind: "webhook", label: "Webhook verified", time: "Yesterday" },
      { id: "ev-5", kind: "sync", label: "Captured 1,305 transactions", time: "2 days ago" },
    ],
  }),
  tap: I({
    id: "tap", environment: "Live", webhookUrl: "https://al-bahri.sa/webhooks/tap",
    maskedKey: "pk_live_••••••••9b17",
    events: [
      { id: "ev-1", kind: "sync", label: "Captured 860 transactions", time: "12 minutes ago" },
      { id: "ev-2", kind: "webhook", label: "Webhook verified", time: "3 hours ago" },
      { id: "ev-3", kind: "sync", label: "Captured 790 transactions", time: "Yesterday" },
      { id: "ev-4", kind: "test", label: "Connection test passed", time: "2 days ago" },
      { id: "ev-5", kind: "sync", label: "Captured 812 transactions", time: "2 days ago" },
    ],
  }),
  hyperpay: I({
    id: "hyperpay", environment: "Test", webhookUrl: "https://al-bahri.sa/webhooks/hyperpay",
    events: [
      { id: "ev-1", kind: "test", label: "Credentials rejected", time: "3 hours ago" },
      { id: "ev-2", kind: "error", label: "Authentication failed", time: "3 hours ago" },
    ],
  }),
  paytabs: I({
    id: "paytabs", environment: "Test", webhookUrl: "https://al-bahri.sa/webhooks/paytabs",
    maskedKey: "pt_test_••••••••3c88",
    events: [
      { id: "ev-1", kind: "test", label: "Credentials rejected", time: "6 hours ago" },
    ],
  }),
  qoyod: I({
    id: "qoyod", environment: "Live", webhookUrl: "https://al-bahri.sa/webhooks/qoyod",
    maskedKey: "qy_live_••••••••71c0",
    events: [
      { id: "ev-1", kind: "sync", label: "Journal entries synced", time: "1 hour ago" },
      { id: "ev-2", kind: "test", label: "Connection test passed", time: "1 hour ago" },
      { id: "ev-3", kind: "sync", label: "Journal entries synced", time: "Yesterday" },
      { id: "ev-4", kind: "webhook", label: "Webhook verified", time: "Yesterday" },
      { id: "ev-5", kind: "sync", label: "Journal entries synced", time: "2 days ago" },
    ],
  }),
  wafeq: I({
    id: "wafeq", environment: "Test", webhookUrl: "https://al-bahri.sa/webhooks/wafeq",
    events: [
      { id: "ev-1", kind: "test", label: "Credentials rejected", time: "5 hours ago" },
    ],
  }),
  daftra: I({
    id: "daftra", environment: "Test", webhookUrl: "https://al-bahri.sa/webhooks/daftra",
    maskedKey: "df_test_••••••••7e21",
    events: [],
  }),
  foodics: I({
    id: "foodics", environment: "Live", webhookUrl: "https://al-bahri.sa/webhooks/foodics",
    maskedKey: "fs_live_••••••••b33d",
    events: [
      { id: "ev-1", kind: "sync", label: "Full menu sync in progress", time: "just now" },
      { id: "ev-2", kind: "test", label: "Connection test passed", time: "1 hour ago" },
      { id: "ev-3", kind: "sync", label: "Menu synced (2,410 items)", time: "Yesterday" },
      { id: "ev-4", kind: "sync", label: "Menu synced (2,398 items)", time: "2 days ago" },
      { id: "ev-5", kind: "webhook", label: "Webhook verified", time: "3 days ago" },
    ],
  }),
  jisr: I({
    id: "jisr", environment: "Live", webhookUrl: "https://al-bahri.sa/webhooks/jisr",
    maskedKey: "js_live_••••••••04e8",
    events: [
      { id: "ev-1", kind: "sync", label: "Employee records synced", time: "2 hours ago" },
      { id: "ev-2", kind: "test", label: "Connection test passed", time: "2 hours ago" },
      { id: "ev-3", kind: "sync", label: "Employee records synced", time: "Yesterday" },
      { id: "ev-4", kind: "webhook", label: "Webhook verified", time: "4 days ago" },
    ],
  }),
  zenhr: I({
    id: "zenhr", environment: "Test", webhookUrl: "https://al-bahri.sa/webhooks/zenhr",
    events: [],
  }),
  whatsapp: I({
    id: "whatsapp", environment: "Live", webhookUrl: "https://al-bahri.sa/webhooks/whatsapp",
    maskedKey: "wa_••••••••c221",
    events: [
      { id: "ev-1", kind: "error", label: "Token expired — re-connect required", time: "3 hours ago" },
      { id: "ev-2", kind: "sync", label: "12,480 messages delivered", time: "4 hours ago" },
      { id: "ev-3", kind: "sync", label: "11,905 messages delivered", time: "Yesterday" },
      { id: "ev-4", kind: "test", label: "Connection test passed", time: "Yesterday" },
      { id: "ev-5", kind: "webhook", label: "Webhook verified", time: "2 days ago" },
    ],
  }),
  zatca: I({
    id: "zatca", environment: "Production", webhookUrl: "https://al-bahri.sa/webhooks/zatca",
    maskedKey: "csid_••••••••9f01",
    events: [
      { id: "ev-1", kind: "sync", label: "Reporting invoices submitted", time: "4 minutes ago" },
      { id: "ev-2", kind: "test", label: "Clearance test passed", time: "1 hour ago" },
      { id: "ev-3", kind: "sync", label: "Reporting invoices submitted", time: "Yesterday" },
      { id: "ev-4", kind: "webhook", label: "Webhook verified", time: "Yesterday" },
      { id: "ev-5", kind: "sync", label: "Reporting invoices submitted", time: "2 days ago" },
    ],
  }),
  tabby: I({
    id: "tabby", environment: "Live", webhookUrl: "https://al-bahri.sa/webhooks/tabby",
    maskedKey: "tb_live_••••••••5d33",
    events: [
      { id: "ev-1", kind: "sync", label: "Captured 214 BNPL orders", time: "26 minutes ago" },
      { id: "ev-2", kind: "test", label: "Connection test passed", time: "2 hours ago" },
      { id: "ev-3", kind: "sync", label: "Captured 198 BNPL orders", time: "Yesterday" },
      { id: "ev-4", kind: "webhook", label: "Webhook verified", time: "Yesterday" },
    ],
  }),
  tamara: I({
    id: "tamara", environment: "Live", webhookUrl: "https://al-bahri.sa/webhooks/tamara",
    maskedKey: "tm_live_••••••••2f74",
    events: [
      { id: "ev-1", kind: "sync", label: "Captured 176 BNPL orders", time: "18 minutes ago" },
      { id: "ev-2", kind: "test", label: "Connection test passed", time: "3 hours ago" },
      { id: "ev-3", kind: "sync", label: "Captured 164 BNPL orders", time: "Yesterday" },
      { id: "ev-4", kind: "webhook", label: "Webhook verified", time: "2 days ago" },
    ],
  }),
};

/* ---------------------------------------------------------------- KPI row */

const connectedCount = integrations.filter((i) => i.status === "Connected").length;
const syncingCount = integrations.filter((i) => i.status === "Syncing").length;
const errorCount = integrations.filter((i) => i.status === "Error").length;

export const integrationKpis: readonly KpiCard[] = [
  {
    id: "int-kpi-total",
    label: "Integrations",
    value: String(integrations.length),
    delta: "+2",
    deltaNote: "vs last quarter",
    color: "#a78bfa",
    sparkline: [10, 11, 11, 12, 12, 13, 13, 14],
  },
  {
    id: "int-kpi-connected",
    label: "Connected",
    value: String(connectedCount),
    delta: "+1",
    deltaNote: "vs last quarter",
    color: "#60a5fa",
    sparkline: [6, 6, 7, 7, 7, 8, 8, 8],
  },
  {
    id: "int-kpi-syncing",
    label: "Syncing",
    value: String(syncingCount),
    delta: "+1",
    deltaNote: "vs last quarter",
    color: "#a3e635",
    sparkline: [0, 0, 0, 0, 0, 1, 1, 1],
  },
  {
    id: "int-kpi-errors",
    label: "Errors",
    value: String(errorCount),
    delta: "-1",
    deltaNote: "vs last quarter",
    color: "#fb923c",
    sparkline: [2, 2, 2, 1, 1, 1, 1, 1],
  },
] as const;

/* ---------------------------------------------------------------- Branches */

export type BranchType = "Dine-in" | "Cloud Kitchen" | "Drive-thru";
export type BranchStatus = "Active" | "Inactive";

export interface Branch {
  id: string;
  name: string;
  city: string;
  type: BranchType;
  staff: number;
  status: BranchStatus;
}

export const branches: readonly Branch[] = [
  { id: "br-1", name: "Riyadh - Olaya", city: "Riyadh", type: "Dine-in", staff: 24, status: "Active" },
  { id: "br-2", name: "Riyadh - Narjis", city: "Riyadh", type: "Dine-in", staff: 18, status: "Active" },
  { id: "br-3", name: "Jeddah - Corniche", city: "Jeddah", type: "Dine-in", staff: 31, status: "Active" },
  { id: "br-4", name: "Jeddah - Tahlia", city: "Jeddah", type: "Drive-thru", staff: 14, status: "Active" },
  { id: "br-5", name: "Dammam - Corniche", city: "Dammam", type: "Dine-in", staff: 22, status: "Active" },
  { id: "br-6", name: "Al Khobar - Corniche", city: "Al Khobar", type: "Dine-in", staff: 17, status: "Active" },
  { id: "br-7", name: "Riyadh - Airport", city: "Riyadh", type: "Cloud Kitchen", staff: 9, status: "Active" },
  { id: "br-8", name: "Makkah - Aziziyah", city: "Makkah", type: "Cloud Kitchen", staff: 6, status: "Inactive" },
] as const;

/* ------------------------------------------------------------------- Roles */

export interface Role {
  id: string;
  name: string;
  users: number;
  permissions: readonly string[];
}

export const roles: readonly Role[] = [
  { id: "owner", name: "Owner", users: 1, permissions: ["settings.manage", "finance.view", "orders.void", "staff.manage"] },
  { id: "branch-manager", name: "Branch Manager", users: 4, permissions: ["orders.view", "orders.void", "finance.view", "inventory.edit"] },
  { id: "cashier", name: "Cashier", users: 26, permissions: ["orders.create", "payments.refund", "inventory.view"] },
  { id: "waiter", name: "Waiter", users: 58, permissions: ["orders.create", "menu.view"] },
  { id: "kitchen", name: "Kitchen", users: 38, permissions: ["orders.view", "menu.view"] },
] as const;
