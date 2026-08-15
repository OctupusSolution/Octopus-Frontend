// Mock data for the Finance module (W2-07) — payments, ZATCA tax invoices,
// settlements, accounting sync, and house accounts. Stands in for
// @octopus/api-client until the backend exists; shaped so swapping this for
// real queries later is a one-file change. All money fields are numbers
// (SAR) so the pages can do real arithmetic; format with `formatSAR`.
import type { KpiCard } from "./mock-dashboard";

/* ------------------------------------------------------------------ money */

export function formatSAR(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}SAR ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}SAR ${(abs / 1_000).toFixed(1)}K`;
  return `${sign}SAR ${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Deterministic PRNG (mulberry32) so the generated rows below never change
// between runs/builds.
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ================================================================== payments */

export type PaymentMethod = "Mada" | "Apple Pay" | "STC Pay" | "Visa" | "Mastercard" | "Tabby" | "Tamara" | "Cash";
export type PaymentGateway = "Moyasar" | "Tap" | "HyperPay" | "PayTabs";
export type PaymentStatus = "Captured" | "Authorized" | "Refunded" | "Partially Refunded" | "Failed" | "Chargeback";
export type ThreeDsResult = "Authenticated" | "Exempted" | "Not enrolled" | "N/A";

export interface TransactionRow {
  id: string;
  order: string;
  method: PaymentMethod;
  gateway: PaymentGateway;
  amount: number;
  fee: number;
  net: number;
  status: PaymentStatus;
  time: string;
  minutesAgo: number;
  cardMask: string | null;
  threeDs: ThreeDsResult;
  linkedInvoice: string;
  gatewayResponse: { reference: string; authCode: string; rrn: string; processorMessage: string };
}

const FEE_RATE: Record<PaymentGateway, number> = { Moyasar: 0.021, Tap: 0.0225, HyperPay: 0.024, PayTabs: 0.0229 };
const METHODS: PaymentMethod[] = ["Mada", "Apple Pay", "STC Pay", "Visa", "Mastercard", "Tabby", "Tamara", "Cash"];
const GATEWAYS: PaymentGateway[] = ["Moyasar", "Tap", "HyperPay", "PayTabs"];
const PAYMENT_STATUS_POOL: PaymentStatus[] = [
  "Captured", "Captured", "Captured", "Captured", "Captured", "Captured",
  "Authorized", "Authorized",
  "Refunded", "Partially Refunded",
  "Failed", "Failed",
  "Chargeback",
];
const BRANCHES_FIN = ["Riyadh - Olaya", "Riyadh - Narjis", "Jeddah - Corniche", "Dammam - Corniche", "Khobar - Rakah"];

function cardMaskFor(method: PaymentMethod, rnd: () => number): string | null {
  const last4 = String(1000 + Math.floor(rnd() * 9000)).slice(-4);
  if (method === "Visa") return `Visa ending ${last4}`;
  if (method === "Mastercard") return `Mastercard ending ${last4}`;
  if (method === "Mada") return `Mada ending ${last4}`;
  if (method === "Apple Pay") return `Apple Pay · Visa ending ${last4}`;
  return null;
}

function threeDsFor(method: PaymentMethod, rnd: () => number): ThreeDsResult {
  if (method === "Cash" || method === "STC Pay" || method === "Tabby" || method === "Tamara") return "N/A";
  const roll = rnd();
  if (roll < 0.7) return "Authenticated";
  if (roll < 0.9) return "Exempted";
  return "Not enrolled";
}

function timeLabel(minutesAgo: number): string {
  if (minutesAgo < 60) return `${minutesAgo} min ago`;
  const hrs = Math.floor(minutesAgo / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function buildTransactions(): TransactionRow[] {
  const rnd = mulberry32(88291);
  const rows: TransactionRow[] = [];
  const count = 56;
  let minutesAgo = 2;
  for (let i = 0; i < count; i++) {
    const method = METHODS[Math.floor(rnd() * METHODS.length)];
    const gateway = GATEWAYS[Math.floor(rnd() * GATEWAYS.length)];
    const status = PAYMENT_STATUS_POOL[Math.floor(rnd() * PAYMENT_STATUS_POOL.length)];
    const amount = Math.round((30 + rnd() * 470) * 100) / 100;
    const fee = Math.round(amount * FEE_RATE[gateway] * 100) / 100;
    const net = Math.round((amount - fee) * 100) / 100;
    const txnId = `TXN-${88291 - i}`;
    const orderId = `ORD-${10432 - i}`;
    rows.push({
      id: txnId,
      order: orderId,
      method,
      gateway,
      amount,
      fee,
      net,
      status,
      time: timeLabel(minutesAgo),
      minutesAgo,
      cardMask: cardMaskFor(method, rnd),
      threeDs: threeDsFor(method, rnd),
      linkedInvoice: `INV-2026-${4821 - Math.floor(i * 0.7)}`,
      gatewayResponse: {
        reference: `${gateway.slice(0, 3).toUpperCase()}-${1000000 + Math.floor(rnd() * 8999999)}`,
        authCode: String(100000 + Math.floor(rnd() * 899999)),
        rrn: String(200000000000 + Math.floor(rnd() * 799999999999)),
        processorMessage:
          status === "Captured" ? "Approved"
          : status === "Authorized" ? "Approved — awaiting capture"
          : status === "Refunded" ? "Refund processed"
          : status === "Partially Refunded" ? "Partial refund processed"
          : status === "Chargeback" ? "Chargeback initiated by issuer"
          : "Do not honour (issuer decline)",
      },
    });
    minutesAgo += 3 + Math.floor(rnd() * 20);
  }
  return rows;
}

export const transactionRows: readonly TransactionRow[] = buildTransactions();

export const failedPaymentsCount = transactionRows.filter((r) => r.status === "Failed" || r.status === "Chargeback").length;

export const paymentStats: readonly KpiCard[] = [
  { id: "revenue-today", label: "REVENUE TODAY", value: "SAR 187.4K", delta: "+9.2%", deltaNote: "vs yesterday",
    color: "#a78bfa", sparkline: [40, 44, 42, 48, 45, 52, 49, 56, 53, 60, 57, 64, 61, 68, 65, 72] },
  { id: "transactions", label: "TRANSACTIONS", value: "1,284", delta: "+6.4%", deltaNote: "vs yesterday",
    color: "#60a5fa", sparkline: [30, 34, 31, 38, 35, 42, 39, 46, 43, 52, 48, 57, 54, 62, 59, 68] },
  { id: "avg-ticket", label: "AVG TICKET", value: "SAR 145.9", delta: "+2.1%", deltaNote: "vs yesterday",
    color: "#a3e635", sparkline: [120, 128, 124, 132, 129, 136, 133, 140, 137, 144, 141, 148, 145, 152, 149, 156] },
  { id: "failed-payments", label: "FAILED PAYMENTS", value: "12", delta: "+3", deltaNote: "vs yesterday",
    color: "#EF4444", sparkline: [6, 7, 6, 8, 7, 9, 8, 9, 8, 10, 9, 11, 10, 12, 11, 12] },
] as const;

/* =============================================================== tax invoices */

export type InvoiceType = "Standard" | "Simplified" | "Credit Note";
export type ZatcaStatus = "Cleared" | "Reported" | "Pending" | "Warning" | "Rejected";

export interface ZatcaInvoiceRow {
  id: string;
  type: InvoiceType;
  buyer: string;
  buyerVatNo: string;
  net: number;
  vat: number;
  total: number;
  zatcaStatus: ZatcaStatus;
  requiredFlow: "clearance" | "reporting";
  hoursSinceIssued: number;
  uuid: string;
  timestamp: string;
  xmlHash: string;
  previousInvoiceHash: string;
  cryptographicStamp: { signed: boolean; signedAt: string };
  zatcaMessage: string;
  creditNoteOf?: string;
}

const B2B_BUYERS = [
  { name: "Al Majd Trading Co.", vat: "310123456700003" },
  { name: "Tamimi Markets", vat: "300987654300009" },
  { name: "Nadec Distribution", vat: "311456789200005" },
  { name: "Al Faisaliah Group", vat: "300223344500001" },
  { name: "Riyadh Front Mall", vat: "312998877600004" },
  { name: "Sadafco Supplies", vat: "300556677800002" },
];

function makeHash(seed: number, len = 40): string {
  const chars = "0123456789abcdef";
  const rnd = mulberry32(seed);
  let s = "";
  for (let i = 0; i < len; i++) s += chars[Math.floor(rnd() * chars.length)];
  return s;
}
function makeUuid(seed: number): string {
  const h = makeHash(seed, 32);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function buildInvoices(): ZatcaInvoiceRow[] {
  const rnd = mulberry32(48210);
  const rows: ZatcaInvoiceRow[] = [];
  const count = 36;
  let minutesAgo = 4;
  let prevHash = makeHash(1, 40);

  for (let i = 0; i < count; i++) {
    const roll = rnd();
    // ~30% Standard B2B, ~62% Simplified B2C, ~8% Credit Note
    const type: InvoiceType = roll < 0.3 ? "Standard" : roll < 0.92 ? "Simplified" : "Credit Note";
    const net = Math.round((80 + rnd() * 4800) * 100) / 100;
    const vat = Math.round(net * 0.15 * 100) / 100;
    const total = Math.round((net + vat) * 100) / 100;
    const hoursSinceIssued = Math.round((minutesAgo / 60) * 10) / 10;
    const id = `INV-2026-${4821 - i}`;
    const uuid = makeUuid(1000 + i);
    const hash = makeHash(2000 + i, 40);

    let zatcaStatus: ZatcaStatus;
    let zatcaMessage: string;
    const requiredFlow: "clearance" | "reporting" = type === "Simplified" ? "reporting" : "clearance";

    const statusRoll = rnd();
    if (type === "Standard") {
      // Standard MUST be cleared before issuing — so it is either Cleared,
      // still Pending clearance, Warning, or Rejected. Never "Reported".
      if (statusRoll < 0.82) { zatcaStatus = "Cleared"; zatcaMessage = "Invoice complies — cleared by ZATCA before issuance."; }
      else if (statusRoll < 0.9) { zatcaStatus = "Pending"; zatcaMessage = "Awaiting ZATCA clearance response."; }
      else if (statusRoll < 0.96) { zatcaStatus = "Warning"; zatcaMessage = "Cleared with warning: buyer VAT number format should be verified."; }
      else { zatcaStatus = "Rejected"; zatcaMessage = "Rejected: XML schema validation failed (missing supply date)."; }
    } else if (type === "Simplified") {
      // Simplified is issued first, then reported within 24h.
      if (hoursSinceIssued < 24 && statusRoll < 0.55) { zatcaStatus = "Pending"; zatcaMessage = "Issued to buyer — reporting to ZATCA within 24 hours."; }
      else if (statusRoll < 0.88) { zatcaStatus = "Reported"; zatcaMessage = "Invoice complies — reported to ZATCA."; }
      else if (statusRoll < 0.96) { zatcaStatus = "Warning"; zatcaMessage = "Reported with warning: duplicate invoice counter detected."; }
      else { zatcaStatus = "Rejected"; zatcaMessage = "Rejected: cryptographic stamp verification failed."; }
    } else {
      // Credit note follows the clearance flow of a standard invoice.
      if (statusRoll < 0.85) { zatcaStatus = "Cleared"; zatcaMessage = "Credit note complies — cleared by ZATCA."; }
      else if (statusRoll < 0.94) { zatcaStatus = "Pending"; zatcaMessage = "Awaiting ZATCA clearance response."; }
      else { zatcaStatus = "Rejected"; zatcaMessage = "Rejected: referenced invoice UUID not found."; }
    }

    const buyer = type === "Simplified"
      ? "Walk-in"
      : B2B_BUYERS[Math.floor(rnd() * B2B_BUYERS.length)].name;
    const buyerVatNo = type === "Simplified"
      ? "—"
      : B2B_BUYERS.find((b) => b.name === buyer)?.vat ?? "310000000000003";

    rows.push({
      id,
      type,
      buyer,
      buyerVatNo,
      net,
      vat,
      total,
      zatcaStatus,
      requiredFlow,
      hoursSinceIssued,
      uuid,
      timestamp: timeLabel(minutesAgo),
      xmlHash: hash,
      previousInvoiceHash: prevHash,
      cryptographicStamp: { signed: zatcaStatus !== "Rejected", signedAt: timeLabel(minutesAgo) },
      zatcaMessage,
      creditNoteOf: type === "Credit Note" ? `INV-2026-${4821 - i - 3}` : undefined,
    });

    prevHash = hash;
    minutesAgo += 5 + Math.floor(rnd() * 25);
  }
  return rows;
}

export const zatcaInvoiceRows: readonly ZatcaInvoiceRow[] = buildInvoices();

export const invoiceStats: readonly KpiCard[] = [
  { id: "invoices-today", label: "INVOICES TODAY", value: "1,204", delta: "+4.6%", deltaNote: "vs yesterday",
    color: "#a78bfa", sparkline: [200, 210, 205, 220, 215, 230, 225, 240, 235, 250, 245, 260, 255, 270, 265, 280] },
  { id: "cleared", label: "CLEARED", value: "1,180", delta: "+4.1%", deltaNote: "vs yesterday",
    color: "#22C55E", sparkline: [190, 198, 195, 208, 204, 216, 212, 226, 222, 236, 232, 246, 242, 256, 252, 264] },
  { id: "pending", label: "PENDING", value: "12", delta: "+2", deltaNote: "since last hour",
    color: "#F59E0B", sparkline: [4, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10, 9, 11, 10, 12] },
  { id: "rejected", label: "REJECTED", value: "3", delta: "+1", deltaNote: "since last hour",
    color: "#EF4444", sparkline: [1, 1, 2, 1, 2, 1, 2, 2, 3, 2, 3, 2, 3, 2, 3, 3] },
] as const;

export const zatcaCsidValidUntil = "14 Mar 2027";
export const zatcaRejectedCount = zatcaInvoiceRows.filter((r) => r.zatcaStatus === "Rejected").length;

/* ================================================================ settlements */

export type SettlementStatus = "Pending" | "Received" | "Reconciled" | "Discrepancy";

export interface SettlementTxnLine {
  date: string;
  amount: number;
  fee: number;
  net: number;
  status: "Matched" | "Unmatched";
}

export interface SettlementRow {
  id: string;
  gateway: PaymentGateway;
  period: string;
  gross: number;
  fees: number;
  netExpected: number;
  netReceived: number;
  difference: number;
  status: SettlementStatus;
  note: string;
  lines: SettlementTxnLine[];
}

function buildSettlementLines(rnd: () => number, count: number, dayLabel: string): SettlementTxnLine[] {
  const lines: SettlementTxnLine[] = [];
  for (let i = 0; i < count; i++) {
    const amount = Math.round((60 + rnd() * 400) * 100) / 100;
    const fee = Math.round(amount * 0.022 * 100) / 100;
    const net = Math.round((amount - fee) * 100) / 100;
    lines.push({ date: dayLabel, amount, fee, net, status: rnd() < 0.9 ? "Matched" : "Unmatched" });
  }
  return lines;
}

function buildSettlements(): SettlementRow[] {
  const rnd = mulberry32(30442);
  const periods = [
    "1 – 7 Aug 2026", "25 – 31 Jul 2026", "18 – 24 Jul 2026", "11 – 17 Jul 2026",
    "4 – 10 Jul 2026", "27 Jun – 3 Jul 2026", "20 – 26 Jun 2026", "13 – 19 Jun 2026",
    "6 – 12 Jun 2026", "30 May – 5 Jun 2026", "23 – 29 May 2026", "16 – 22 May 2026",
  ];
  const rows: SettlementRow[] = [];
  for (let i = 0; i < periods.length; i++) {
    const gateway = GATEWAYS[i % GATEWAYS.length];
    const gross = Math.round((40000 + rnd() * 60000) * 100) / 100;
    const fees = Math.round(gross * FEE_RATE[gateway] * 100) / 100;
    const netExpected = Math.round((gross - fees) * 100) / 100;
    // Most periods reconcile exactly; a few carry a real discrepancy.
    const hasDiscrepancy = i === 2 || i === 5 || i === 9;
    const diff = hasDiscrepancy ? Math.round((rnd() * 900 - 450) * 100) / 100 : 0;
    const netReceived = Math.round((netExpected + diff) * 100) / 100;
    const difference = Math.round((netReceived - netExpected) * 100) / 100;
    let status: SettlementStatus;
    if (i === 0) status = "Pending";
    else if (hasDiscrepancy) status = "Discrepancy";
    else if (i <= 2) status = "Received";
    else status = "Reconciled";

    rows.push({
      id: `STL-${5100 - i}`,
      gateway,
      period: periods[i],
      gross,
      fees,
      netExpected,
      netReceived,
      difference,
      status,
      note: hasDiscrepancy ? "Unmatched refund lines pending gateway confirmation." : "",
      lines: buildSettlementLines(rnd, 4 + Math.floor(rnd() * 4), periods[i].split(" – ")[0]),
    });
  }
  return rows;
}

export const settlementRows: readonly SettlementRow[] = buildSettlements();

export const settlementStats: readonly KpiCard[] = [
  { id: "pending-settlement", label: "PENDING SETTLEMENT", value: "SAR 284K", delta: "+5.4%", deltaNote: "vs last week",
    color: "#a78bfa", sparkline: [220, 228, 224, 236, 232, 244, 240, 252, 248, 260, 256, 268, 264, 276, 272, 284] },
  { id: "settled-month", label: "SETTLED THIS MONTH", value: "SAR 2.4M", delta: "+8.9%", deltaNote: "vs last month",
    color: "#60a5fa", sparkline: [1800, 1860, 1830, 1900, 1870, 1950, 1920, 2000, 1970, 2100, 2050, 2200, 2150, 2300, 2260, 2400] },
  { id: "unreconciled", label: "UNRECONCILED ITEMS", value: "18", delta: "+4", deltaNote: "vs last week",
    color: "#F59E0B", sparkline: [10, 11, 10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17, 16, 18] },
  { id: "avg-settlement-time", label: "AVG SETTLEMENT TIME", value: "2.1 days", delta: "-0.3 days", deltaNote: "vs last week",
    color: "#a3e635", sparkline: [2.8, 2.7, 2.7, 2.6, 2.6, 2.5, 2.5, 2.4, 2.4, 2.3, 2.3, 2.2, 2.2, 2.1, 2.1, 2.1] },
] as const;

/* ================================================================ accounting */

export type AccountingProviderName = "Qoyod" | "Wafeq" | "Daftra";
export type AccountingConnectionStatus = "Connected" | "Error" | "Not Connected";

export interface AccountingProvider {
  id: string;
  name: AccountingProviderName;
  status: AccountingConnectionStatus;
  lastSync: string;
  entriesToday: number;
  errorMessage?: string;
}

export const accountingProviders: readonly AccountingProvider[] = [
  { id: "qoyod", name: "Qoyod", status: "Connected", lastSync: "6 min ago", entriesToday: 248 },
  { id: "wafeq", name: "Wafeq", status: "Not Connected", lastSync: "Never", entriesToday: 0 },
  { id: "daftra", name: "Daftra", status: "Error", lastSync: "3 hr ago", entriesToday: 41,
    errorMessage: "Authentication token expired — reconnect the Daftra account." },
] as const;

export type MappingStatus = "Mapped" | "Unmapped";

export interface AccountMappingRow {
  id: string;
  category: string;
  ledgerAccount: string | null;
  taxCode: string;
  status: MappingStatus;
}

export const ledgerAccountOptions: readonly string[] = [
  "4000 · Sales Revenue", "4010 · Delivery Revenue", "5000 · Cost of Goods Sold",
  "5100 · Direct Labour", "6000 · Overhead Expenses", "2200 · VAT Payable", "2210 · VAT Receivable",
];

export const accountMappingRows: readonly AccountMappingRow[] = [
  { id: "map-sales", category: "Sales Revenue", ledgerAccount: "4000 · Sales Revenue", taxCode: "VAT-15", status: "Mapped" },
  { id: "map-vat-collected", category: "VAT Collected", ledgerAccount: "2200 · VAT Payable", taxCode: "VAT-15", status: "Mapped" },
  { id: "map-cogs", category: "COGS", ledgerAccount: null, taxCode: "—", status: "Unmapped" },
  { id: "map-labour", category: "Labour", ledgerAccount: null, taxCode: "—", status: "Unmapped" },
  { id: "map-overhead", category: "Overhead", ledgerAccount: null, taxCode: "—", status: "Unmapped" },
  { id: "map-vat-paid", category: "VAT Paid", ledgerAccount: null, taxCode: "—", status: "Unmapped" },
] as const;

export const unmappedCategoryCount = accountMappingRows.filter((r) => r.status === "Unmapped").length;

export type SyncLogType = "Sales Journal" | "Payment" | "Refund" | "VAT";
export type SyncLogStatus = "Synced" | "Pending" | "Failed";

export interface SyncLogRow {
  id: string;
  timestamp: string;
  type: SyncLogType;
  reference: string;
  amount: number;
  status: SyncLogStatus;
  message: string;
}

function buildSyncLog(): SyncLogRow[] {
  const rnd = mulberry32(77120);
  const types: SyncLogType[] = ["Sales Journal", "Payment", "Refund", "VAT"];
  const rows: SyncLogRow[] = [];
  let minutesAgo = 3;
  for (let i = 0; i < 20; i++) {
    const type = types[i % types.length];
    const amount = Math.round((80 + rnd() * 3200) * 100) / 100;
    const roll = rnd();
    const status: SyncLogStatus = roll < 0.78 ? "Synced" : roll < 0.9 ? "Pending" : "Failed";
    const message =
      status === "Synced" ? "Posted to ledger."
      : status === "Pending" ? "Queued — waiting for provider window."
      : type === "VAT"
        ? "Provider error: VAT account 2200 is unmapped."
        : "Provider error: duplicate reference in Qoyod ledger.";
    rows.push({
      id: `SYNC-${9400 - i}`,
      timestamp: timeLabel(minutesAgo),
      type,
      reference: type === "Sales Journal" ? `ORD-${10432 - i}` : type === "Payment" ? `TXN-${88291 - i}` : type === "Refund" ? `RFD-${5200 - i}` : `INV-2026-${4821 - i}`,
      amount,
      status,
      message,
    });
    minutesAgo += 6 + Math.floor(rnd() * 30);
  }
  return rows;
}

export const syncLogRows: readonly SyncLogRow[] = buildSyncLog();

/* ============================================================= house accounts */

export type HouseAccountStatus = "Active" | "On Hold" | "Over Limit" | "Closed";
export type PaymentTerms = "Net 15" | "Net 30" | "Net 60";

export interface AgingBuckets {
  current: number;
  d30: number;
  d60: number;
  d90plus: number;
}

export interface StatementLine {
  invoiceDate: string;
  amount: number;
  dueDate: string;
  paid: boolean;
  balance: number;
}

export interface HouseAccountRow {
  id: string;
  account: string;
  company: string;
  contactName: string;
  contactPhone: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  paymentTerms: PaymentTerms;
  oldestInvoiceAgeDays: number;
  status: HouseAccountStatus;
  aging: AgingBuckets;
  statement: StatementLine[];
}

const COMPANIES = [
  "Al Majd Trading Co.", "Tamimi Markets", "Nadec Distribution", "Al Faisaliah Group",
  "Riyadh Front Mall", "Sadafco Supplies", "Almarai Foodservice", "Jarir Investment",
  "Panda Retail Co.", "Saudi Airlines Catering", "STC Corporate Events", "Aramco Contracting",
  "Nesma Holding", "Alkhorayef Group", "Zamil Industrial", "Savola Foods",
  "Rezayat Trading", "Abdullah Al Othaim", "Danube Online", "Extra Stores",
  "Xenel Group", "Olayan Financing",
];
const CONTACT_FIRST = ["Faisal", "Noura", "Abdullah", "Mona", "Khalid", "Reem", "Turki", "Lama", "Saad", "Hind"];
const CONTACT_LAST = ["Al-Subaie", "Al-Otaibi", "Al-Qahtani", "Al-Harbi", "Al-Dosari", "Al-Ghamdi", "Al-Zahrani"];
const TERMS: PaymentTerms[] = ["Net 15", "Net 30", "Net 60"];

function buildHouseAccounts(): HouseAccountRow[] {
  const rnd = mulberry32(15042);
  const rows: HouseAccountRow[] = [];
  for (let i = 0; i < COMPANIES.length; i++) {
    const creditLimit = Math.round((15000 + rnd() * 65000) / 500) * 500;
    const utilisation = 0.2 + rnd() * 0.95;
    const currentBalance = Math.round(creditLimit * Math.min(utilisation, 1.15) * 100) / 100;
    const availableCredit = Math.round((creditLimit - currentBalance) * 100) / 100;
    const oldestInvoiceAgeDays = 5 + Math.floor(rnd() * 95);
    let status: HouseAccountStatus;
    if (i === COMPANIES.length - 1) status = "Closed";
    else if (currentBalance > creditLimit) status = "Over Limit";
    else if (oldestInvoiceAgeDays > 75 || currentBalance / creditLimit > 0.92) status = "On Hold";
    else status = "Active";

    const d90plus = oldestInvoiceAgeDays > 90 ? Math.round(currentBalance * 0.25 * 100) / 100 : 0;
    const d60 = oldestInvoiceAgeDays > 60 ? Math.round(currentBalance * 0.2 * 100) / 100 : 0;
    const d30 = oldestInvoiceAgeDays > 30 ? Math.round(currentBalance * 0.25 * 100) / 100 : 0;
    const current = Math.round((currentBalance - d90plus - d60 - d30) * 100) / 100;

    const statement: StatementLine[] = [];
    let runningBalance = currentBalance;
    const lineCount = 3 + Math.floor(rnd() * 3);
    for (let s = 0; s < lineCount; s++) {
      const amount = Math.round((1200 + rnd() * 8000) * 100) / 100;
      const paid = s > 0 && rnd() < 0.5;
      if (paid) runningBalance = Math.round((runningBalance - amount) * 100) / 100;
      statement.push({
        invoiceDate: `${(s + 1) * 4} Jul 2026`,
        amount,
        dueDate: `${(s + 1) * 4 + 30} Jul 2026`,
        paid,
        balance: Math.max(runningBalance, 0),
      });
    }

    rows.push({
      id: `HA-${1042 + i}`,
      account: `${COMPANIES[i]} — House Account`,
      company: COMPANIES[i],
      contactName: `${CONTACT_FIRST[i % CONTACT_FIRST.length]} ${CONTACT_LAST[i % CONTACT_LAST.length]}`,
      contactPhone: `+9665${String(10000000 + Math.floor(rnd() * 89999999)).slice(0, 8)}`,
      creditLimit,
      currentBalance,
      availableCredit,
      paymentTerms: TERMS[i % TERMS.length],
      oldestInvoiceAgeDays: status === "Closed" ? 0 : oldestInvoiceAgeDays,
      status,
      aging: { current: Math.max(current, 0), d30, d60, d90plus },
      statement,
    });
  }
  return rows;
}

export const houseAccountRows: readonly HouseAccountRow[] = buildHouseAccounts();

export const houseAccountStats: readonly KpiCard[] = [
  { id: "active-accounts", label: "ACTIVE ACCOUNTS", value: "42", delta: "+3", deltaNote: "vs last month",
    color: "#a78bfa", sparkline: [34, 35, 35, 36, 36, 37, 38, 38, 39, 39, 40, 40, 41, 41, 42, 42] },
  { id: "outstanding-balance", label: "OUTSTANDING BALANCE", value: "SAR 384K", delta: "+6.2%", deltaNote: "vs last month",
    color: "#60a5fa", sparkline: [300, 308, 312, 320, 326, 334, 340, 348, 354, 360, 366, 372, 376, 380, 382, 384] },
  { id: "overdue", label: "OVERDUE", value: "SAR 62K", delta: "+11%", deltaNote: "vs last month",
    color: "#EF4444", sparkline: [40, 42, 44, 46, 48, 50, 51, 53, 55, 56, 57, 58, 59, 60, 61, 62] },
  { id: "avg-days-to-pay", label: "AVG DAYS TO PAY", value: "24", delta: "-1.2 days", deltaNote: "vs last month",
    color: "#a3e635", sparkline: [27, 27, 26, 26, 26, 25, 25, 25, 24, 24, 24, 24, 24, 24, 24, 24] },
] as const;
