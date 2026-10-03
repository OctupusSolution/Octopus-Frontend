// Mock data for the Finance module — payments. Stands in for
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
