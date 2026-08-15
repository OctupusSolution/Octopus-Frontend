// Mock data for the Marketing module (5 pages) — stands in for @octopus/api-client.
import type { KpiCard } from "./mock-dashboard";

/* ============================================================ shared: loyalty landing (legacy) */

export const marketingStats: readonly KpiCard[] = [
  {
    id: "loyalty-members",
    label: "LOYALTY MEMBERS",
    value: "8,412",
    delta: "+6.7%",
    deltaNote: "vs last month",
    color: "#a78bfa",
    sparkline: [7200, 7300, 7250, 7400, 7350, 7550, 7500, 7700, 7650, 7900, 7850, 8100, 8050, 8300, 8250, 8412],
  },
  {
    id: "points-issued",
    label: "POINTS ISSUED THIS MONTH",
    value: "1.2M",
    delta: "+11.4%",
    deltaNote: "vs last month",
    color: "#60a5fa",
    sparkline: [900, 920, 910, 950, 940, 980, 970, 1010, 1000, 1050, 1040, 1100, 1090, 1150, 1140, 1200],
  },
  {
    id: "gift-cards-active",
    label: "GIFT CARDS ACTIVE",
    value: "342",
    delta: "+3.9%",
    deltaNote: "vs last month",
    color: "#a3e635",
    sparkline: [290, 295, 292, 300, 298, 305, 303, 312, 310, 320, 318, 328, 326, 336, 334, 342],
  },
  {
    id: "campaign-revenue",
    label: "CAMPAIGN REVENUE",
    value: "SAR 94.6K",
    delta: "+14.8%",
    deltaNote: "vs last month",
    color: "#fb923c",
    sparkline: [60, 63, 61, 67, 65, 71, 69, 75, 73, 80, 78, 85, 83, 90, 88, 94.6],
  },
] as const;

export type LoyaltyTierName = "Bronze" | "Silver" | "Gold" | "Platinum";

export interface LoyaltyTierRow {
  tier: LoyaltyTierName;
  members: number;
  sharePercent: number;
  multiplier: "1x" | "1.5x" | "2x" | "3x";
  color: string;
}

export const loyaltyTierRows: readonly LoyaltyTierRow[] = [
  { tier: "Bronze", members: 4820, sharePercent: 57, multiplier: "1x", color: "#8b7cf0" },
  { tier: "Silver", members: 2310, sharePercent: 27, multiplier: "1.5x", color: "#5b8def" },
  { tier: "Gold", members: 980, sharePercent: 12, multiplier: "2x", color: "#22c9d9" },
  { tier: "Platinum", members: 302, sharePercent: 4, multiplier: "3x", color: "#2ec9c0" },
] as const;

export type CampaignChannel = "WhatsApp" | "SMS" | "Email" | "Push";
export type CampaignStatus = "Active" | "Scheduled" | "Completed" | "Draft" | "Paused";

export interface CampaignRow {
  id: string;
  name: string;
  channel: CampaignChannel;
  audience: number;
  sent: number;
  opened: number;
  redeemed: number;
  status: CampaignStatus;
}

export const campaignRows: readonly CampaignRow[] = [
  { id: "CMP-01", name: "Ramadan Iftar Offer", channel: "WhatsApp", audience: 6200, sent: 6200, opened: 4980, redeemed: 1120, status: "Active" },
  { id: "CMP-02", name: "National Day 20% Off", channel: "SMS", audience: 8100, sent: 8100, opened: 5300, redeemed: 1640, status: "Completed" },
  { id: "CMP-03", name: "Weekend Family Bundle", channel: "Push", audience: 3400, sent: 3400, opened: 2100, redeemed: 580, status: "Active" },
  { id: "CMP-04", name: "Eid Gift Card Promo", channel: "WhatsApp", audience: 5600, sent: 0, opened: 0, redeemed: 0, status: "Scheduled" },
  { id: "CMP-05", name: "New Branch Launch — Narjis", channel: "Email", audience: 2200, sent: 2200, opened: 980, redeemed: 210, status: "Completed" },
  { id: "CMP-06", name: "Gold Tier Double Points Weekend", channel: "Push", audience: 980, sent: 980, opened: 720, redeemed: 340, status: "Active" },
  { id: "CMP-07", name: "Back to School Combo", channel: "SMS", audience: 4700, sent: 0, opened: 0, redeemed: 0, status: "Draft" },
  { id: "CMP-08", name: "Coffee Hour Flash Sale", channel: "WhatsApp", audience: 3900, sent: 3900, opened: 2960, redeemed: 890, status: "Paused" },
] as const;

/* ============================================================ 1. loyalty program */

export const loyaltyKpis: readonly KpiCard[] = [
  { id: "active-members", label: "ACTIVE MEMBERS", value: "8,412", delta: "+6.7%", deltaNote: "vs last month", color: "#a78bfa",
    sparkline: [7200, 7300, 7250, 7400, 7350, 7550, 7500, 7700, 7650, 7900, 7850, 8100, 8050, 8300, 8250, 8412] },
  { id: "points-issued-month", label: "POINTS ISSUED THIS MONTH", value: "1.2M", delta: "+11.4%", deltaNote: "vs last month", color: "#60a5fa",
    sparkline: [900, 920, 910, 950, 940, 980, 970, 1010, 1000, 1050, 1040, 1100, 1090, 1150, 1140, 1200] },
  { id: "redemption-rate", label: "REDEMPTION RATE", value: "34.2%", delta: "+2.1%", deltaNote: "vs last month", color: "#a3e635",
    sparkline: [28, 29, 29.5, 30, 30.8, 31.2, 31.9, 32.4, 32.9, 33.1, 33.5, 33.8, 33.9, 34, 34.1, 34.2] },
  { id: "points-liability", label: "POINTS LIABILITY", value: "SAR 62K", delta: "+4.5%", deltaNote: "accounting liability", color: "#fb923c",
    sparkline: [52, 53, 54, 54.5, 55, 56, 57, 57.5, 58, 59, 59.5, 60, 60.5, 61, 61.5, 62] },
] as const;

export interface LoyaltyTierConfig {
  tier: LoyaltyTierName;
  color: string;
  thresholdSar: number;
  members: number;
  sharePercent: number;
  multiplier: "1x" | "1.5x" | "2x" | "3x";
}

export const loyaltyTiers: readonly LoyaltyTierConfig[] = [
  { tier: "Bronze", color: "#a9714a", thresholdSar: 0, members: 4820, sharePercent: 57, multiplier: "1x" },
  { tier: "Silver", color: "#9aa3ad", thresholdSar: 1500, members: 2310, sharePercent: 27, multiplier: "1.5x" },
  { tier: "Gold", color: "#d4a83b", thresholdSar: 5000, members: 980, sharePercent: 12, multiplier: "2x" },
  { tier: "Platinum", color: "#6C4DFF", thresholdSar: 15000, members: 302, sharePercent: 4, multiplier: "3x" },
] as const;

export interface LoyaltyRules {
  pointsPerSar: number;
  sarPerPointRedemption: number;
  expiryMonths: 12 | 24 | 36;
  minRedemptionSar: number;
  birthdayBonusEnabled: boolean;
  birthdayBonusPoints: number;
  referralBonusEnabled: boolean;
  referralBonusPoints: number;
}

export const loyaltyRulesDefault: LoyaltyRules = {
  pointsPerSar: 1,
  sarPerPointRedemption: 0.1,
  expiryMonths: 24,
  minRedemptionSar: 50,
  birthdayBonusEnabled: true,
  birthdayBonusPoints: 200,
  referralBonusEnabled: true,
  referralBonusPoints: 150,
};

export interface LoyaltyPointsPeriod {
  period: string;
  issued: number;
  redeemed: number;
}

export const loyaltyPointsHistory: readonly LoyaltyPointsPeriod[] = [
  { period: "Jan", issued: 860, redeemed: 260 },
  { period: "Feb", issued: 910, redeemed: 290 },
  { period: "Mar", issued: 1040, redeemed: 340 },
  { period: "Apr", issued: 980, redeemed: 310 },
  { period: "May", issued: 1070, redeemed: 355 },
  { period: "Jun", issued: 1110, redeemed: 370 },
  { period: "Jul", issued: 1150, redeemed: 390 },
  { period: "Aug", issued: 1200, redeemed: 410 },
] as const;

/* ============================================================ 2. gift cards */

export const giftCardKpis: readonly KpiCard[] = [
  { id: "gc-active", label: "ACTIVE CARDS", value: "342", delta: "+3.9%", deltaNote: "vs last month", color: "#a78bfa",
    sparkline: [290, 295, 292, 300, 298, 305, 303, 312, 310, 320, 318, 328, 326, 336, 334, 342] },
  { id: "gc-outstanding", label: "OUTSTANDING BALANCE", value: "SAR 84.2K", delta: "+5.2%", deltaNote: "liability", color: "#60a5fa",
    sparkline: [70, 71, 72, 73.5, 75, 76, 77.5, 78.8, 79.5, 80.6, 81.4, 82.1, 82.9, 83.4, 83.8, 84.2] },
  { id: "gc-sold-month", label: "SOLD THIS MONTH", value: "SAR 22.4K", delta: "+9.1%", deltaNote: "vs last month", color: "#a3e635",
    sparkline: [14, 15, 15.5, 16.2, 17, 17.8, 18.4, 19, 19.6, 20.2, 20.8, 21.2, 21.6, 22, 22.2, 22.4] },
  { id: "gc-redemption-rate", label: "REDEMPTION RATE", value: "61%", delta: "+1.4%", deltaNote: "vs last month", color: "#fb923c",
    sparkline: [54, 55, 55.5, 56, 56.8, 57.3, 58, 58.5, 59, 59.4, 59.9, 60.2, 60.5, 60.8, 60.9, 61] },
] as const;

export type GiftCardDesign = "Ocean" | "Violet" | "Sunset" | "Emerald";

export const giftCardDesignSwatches: readonly { id: GiftCardDesign; gradient: string }[] = [
  { id: "Ocean", gradient: "linear-gradient(135deg,#0D6EFD,#22c9d9)" },
  { id: "Violet", gradient: "linear-gradient(135deg,#6C4DFF,#a78bfa)" },
  { id: "Sunset", gradient: "linear-gradient(135deg,#fb923c,#F59E0B)" },
  { id: "Emerald", gradient: "linear-gradient(135deg,#22C55E,#14B8A6)" },
] as const;

export type GiftCardStatus = "Active" | "Partially Used" | "Fully Used" | "Expired" | "Void";

export interface GiftCardEvent {
  date: string;
  label: string;
  amountSar?: number;
}

export interface GiftCard {
  id: string;
  code: string;
  design: GiftCardDesign;
  initialValueSar: number;
  balanceSar: number;
  purchaser: string;
  recipient: string;
  issued: string;
  expiry: string;
  status: GiftCardStatus;
  history: readonly GiftCardEvent[];
}

const GC_PURCHASERS = ["Faisal Al-Otaibi", "Noura Al-Harbi", "Khalid Al-Zahrani", "Sara Al-Qahtani", "Omar Al-Ghamdi", "Lama Al-Dosari", "Yousef Al-Shammari", "Reem Al-Subaie", "Abdullah Al-Mutairi", "Hind Al-Rashid"];
const GC_RECIPIENTS = ["Mona Saleh", "Turki Fahad", "Layla Nasser", "Bandar Saud", "Aisha Majed", "Fahad Nawaf", "Dana Rakan", "Salman Adel", "Ghada Yazeed", "Waleed Hamad"];

const GC_STATUS_CYCLE: GiftCardStatus[] = ["Active", "Active", "Partially Used", "Partially Used", "Fully Used", "Expired", "Void"];
const GC_VALUES = [100, 150, 200, 250, 300, 500];

export const giftCards: readonly GiftCard[] = Array.from({ length: 36 }, (_, i) => {
  const status = GC_STATUS_CYCLE[i % GC_STATUS_CYCLE.length];
  const design = giftCardDesignSwatches[i % giftCardDesignSwatches.length].id;
  const initialValueSar = GC_VALUES[i % GC_VALUES.length];
  const balanceSar =
    status === "Fully Used" || status === "Void" ? 0
    : status === "Partially Used" ? Math.round(initialValueSar * 0.45)
    : status === "Expired" ? Math.round(initialValueSar * 0.2)
    : initialValueSar;
  const issuedMonth = 1 + (i % 8);
  const issued = `2026-${String(issuedMonth).padStart(2, "0")}-${String(2 + (i % 26)).padStart(2, "0")}`;
  const expiry = `2027-${String(issuedMonth).padStart(2, "0")}-${String(2 + (i % 26)).padStart(2, "0")}`;
  const last4 = String(1000 + i * 37).slice(-4);
  const history: GiftCardEvent[] = [{ date: issued, label: "Issued", amountSar: initialValueSar }];
  if (balanceSar < initialValueSar && balanceSar > 0) {
    history.push({ date: issued, label: "Redeemed at checkout", amountSar: -(initialValueSar - balanceSar) });
  }
  if (status === "Fully Used") history.push({ date: issued, label: "Redeemed in full", amountSar: -initialValueSar });
  if (status === "Void") history.push({ date: issued, label: "Voided by merchant" });

  return {
    id: `GC-${String(i + 1).padStart(4, "0")}`,
    code: `GC-••••-${last4}`,
    design,
    initialValueSar,
    balanceSar,
    purchaser: GC_PURCHASERS[i % GC_PURCHASERS.length],
    recipient: GC_RECIPIENTS[i % GC_RECIPIENTS.length],
    issued,
    expiry,
    status,
    history,
  };
});

/* ============================================================ 3. subscriptions */

export const subscriptionKpis: readonly KpiCard[] = [
  { id: "sub-active", label: "ACTIVE SUBSCRIBERS", value: "624", delta: "+8.3%", deltaNote: "vs last month", color: "#a78bfa",
    sparkline: [510, 520, 525, 535, 545, 555, 562, 570, 580, 590, 598, 605, 610, 615, 620, 624] },
  { id: "sub-mrr", label: "MRR", value: "SAR 84.6K", delta: "+7.1%", deltaNote: "vs last month", color: "#60a5fa",
    sparkline: [66, 68, 69.5, 71, 72.8, 74, 75.5, 77, 78.4, 79.6, 80.8, 81.9, 82.8, 83.6, 84.2, 84.6] },
  { id: "sub-churn", label: "CHURN RATE", value: "4.2%", delta: "-0.6%", deltaNote: "vs last month", color: "#fb923c",
    sparkline: [5.6, 5.5, 5.3, 5.2, 5.0, 4.9, 4.8, 4.7, 4.6, 4.5, 4.4, 4.35, 4.3, 4.25, 4.22, 4.2] },
  { id: "sub-ltv", label: "AVG SUBSCRIBER LTV", value: "SAR 271", delta: "+3.4%", deltaNote: "vs last month", color: "#a3e635",
    sparkline: [230, 234, 238, 241, 245, 249, 252, 255, 258, 261, 263, 265, 267, 269, 270, 271] },
] as const;

export type SubscriptionPlanId = "coffee-club" | "lunch-pass" | "family-weekly" | "vip-dining";

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  priceSar: number;
  subscribers: number;
  benefits: readonly string[];
}

export const subscriptionPlans: readonly SubscriptionPlan[] = [
  { id: "coffee-club", name: "Coffee Club", priceSar: 99, subscribers: 268,
    benefits: ["1 free specialty coffee daily", "10% off pastries", "Priority pickup line"] },
  { id: "lunch-pass", name: "Lunch Pass", priceSar: 349, subscribers: 201,
    benefits: ["1 lunch set meal, Sun–Thu", "Free delivery on lunch orders", "Skip-the-queue at dine-in"] },
  { id: "family-weekly", name: "Family Weekly", priceSar: 599, subscribers: 112,
    benefits: ["1 family platter every weekend", "Free dessert for kids", "20% off additional orders"] },
  { id: "vip-dining", name: "VIP Dining", priceSar: 1200, subscribers: 43,
    benefits: ["Reserved table, any branch", "Complimentary tasting menu monthly", "Dedicated concierge line"] },
] as const;

export type BillingCycle = "Monthly" | "Quarterly" | "Annual";
export type SubscriptionStatus = "Active" | "Past Due" | "Paused" | "Cancelled";

export interface Subscriber {
  id: string;
  name: string;
  phone: string;
  planId: SubscriptionPlanId;
  started: string;
  nextBilling: string;
  billingCycle: BillingCycle;
  paymentMethod: string;
  status: SubscriptionStatus;
  ltvSar: number;
}

const SUB_NAMES = ["Abdulaziz Al-Fahad", "Nourah Al-Amri", "Mishaal Al-Otaibi", "Jawaher Al-Saud", "Rakan Al-Harbi", "Alanoud Al-Qahtani", "Sultan Al-Ghamdi", "Haya Al-Dosari", "Bader Al-Shammari", "Amjad Al-Subaie", "Shatha Al-Mutairi", "Fahad Al-Rashid", "Wejdan Al-Zahrani", "Talal Al-Anazi", "Rania Al-Juhani"];
const SUB_METHODS = ["Mada", "Apple Pay", "Visa", "STC Pay", "Mastercard"];
const SUB_STATUS_CYCLE: SubscriptionStatus[] = ["Active", "Active", "Active", "Active", "Past Due", "Paused", "Cancelled"];

export const subscribers: readonly Subscriber[] = Array.from({ length: 42 }, (_, i) => {
  const plan = subscriptionPlans[i % subscriptionPlans.length];
  const status = SUB_STATUS_CYCLE[i % SUB_STATUS_CYCLE.length];
  const startMonth = 1 + (i % 7);
  const started = `2026-${String(startMonth).padStart(2, "0")}-${String(3 + (i % 24)).padStart(2, "0")}`;
  const nextBilling = status === "Cancelled" ? "—" : `2026-${String(9).padStart(2, "0")}-${String(3 + (i % 24)).padStart(2, "0")}`;
  const cycle: BillingCycle = i % 5 === 0 ? "Quarterly" : i % 11 === 0 ? "Annual" : "Monthly";
  const monthsActive = 9 - startMonth + 1;
  const ltvSar = Math.max(plan.priceSar, Math.round(plan.priceSar * monthsActive * 0.92));

  return {
    id: `SUB-${String(1000 + i)}`,
    name: SUB_NAMES[i % SUB_NAMES.length],
    phone: `+9665${String(10000000 + i * 777).slice(0, 8)}`,
    planId: plan.id,
    started,
    nextBilling,
    billingCycle: cycle,
    paymentMethod: SUB_METHODS[i % SUB_METHODS.length],
    status,
    ltvSar,
  };
});

/* ============================================================ 4. promotions & vouchers */

export const promotionKpis: readonly KpiCard[] = [
  { id: "promo-active", label: "ACTIVE PROMOTIONS", value: "14", delta: "+2", deltaNote: "vs last month", color: "#a78bfa",
    sparkline: [9, 10, 10, 11, 11, 12, 12, 12, 13, 13, 13, 14, 14, 14, 14, 14] },
  { id: "promo-redemptions", label: "REDEMPTIONS THIS MONTH", value: "2,847", delta: "+16.2%", deltaNote: "vs last month", color: "#60a5fa",
    sparkline: [1800, 1900, 1950, 2050, 2150, 2250, 2320, 2400, 2480, 2560, 2640, 2700, 2760, 2800, 2820, 2847] },
  { id: "promo-discount", label: "DISCOUNT GIVEN", value: "SAR 42.8K", delta: "+11.5%", deltaNote: "vs last month", color: "#fb923c",
    sparkline: [30, 31, 32.5, 34, 35.5, 37, 38, 39, 40, 40.8, 41.4, 41.9, 42.2, 42.5, 42.7, 42.8] },
  { id: "promo-incremental", label: "INCREMENTAL REVENUE", value: "SAR 186K", delta: "+13.8%", deltaNote: "vs last month", color: "#a3e635",
    sparkline: [140, 145, 150, 155, 160, 164, 168, 172, 176, 179, 182, 184, 185, 185.5, 185.8, 186] },
] as const;

export type PromoType = "Percentage" | "Fixed Amount" | "BOGO" | "Free Delivery" | "Free Item";
export type PromoStatus = "Active" | "Scheduled" | "Expired";
export type PromoChannel = "Dine-in" | "Delivery" | "Kiosk" | "Aggregators";

export interface Promotion {
  id: string;
  code: string;
  name: string;
  type: PromoType;
  value: string;
  conditions: readonly string[];
  channels: readonly PromoChannel[];
  used: number;
  cap: number;
  startDate: string;
  endDate: string;
  status: PromoStatus;
}

const PROMO_DEFS: Array<Omit<Promotion, "id" | "used" | "status">> = [
  { code: "RAMADAN25", name: "Ramadan Iftar 25% Off", type: "Percentage", value: "25%", conditions: ["Min SAR 100", "Dine-in only"], channels: ["Dine-in"], cap: 1000, startDate: "2026-03-01", endDate: "2026-03-30" },
  { code: "NATIONALDAY", name: "National Day Celebration", type: "Fixed Amount", value: "SAR 30", conditions: ["Min SAR 150"], channels: ["Dine-in", "Delivery"], cap: 2000, startDate: "2026-09-20", endDate: "2026-09-25" },
  { code: "FIRSTORDER", name: "First Order Welcome", type: "Percentage", value: "20%", conditions: ["First order only"], channels: ["Delivery", "Kiosk"], cap: 5000, startDate: "2026-01-01", endDate: "2026-12-31" },
  { code: "FREEDEL50", name: "Free Delivery over SAR 50", type: "Free Delivery", value: "Free delivery", conditions: ["Min SAR 50"], channels: ["Delivery", "Aggregators"], cap: 3000, startDate: "2026-05-01", endDate: "2026-12-31" },
  { code: "BOGOWINGS", name: "Buy 1 Get 1 Wings", type: "BOGO", value: "1+1", conditions: ["Dine-in only", "Min SAR 100"], channels: ["Dine-in"], cap: 800, startDate: "2026-06-01", endDate: "2026-08-31" },
  { code: "EIDFEAST", name: "Eid Feast Bundle", type: "Fixed Amount", value: "SAR 50", conditions: ["Min SAR 300"], channels: ["Dine-in", "Delivery"], cap: 1200, startDate: "2026-04-08", endDate: "2026-04-15" },
  { code: "APPFREEITEM", name: "Free Dessert on App", type: "Free Item", value: "1 free dessert", conditions: ["First order only", "Specific channel"], channels: ["Kiosk"], cap: 1500, startDate: "2026-02-01", endDate: "2026-12-31" },
  { code: "WEEKEND15", name: "Weekend Family 15% Off", type: "Percentage", value: "15%", conditions: ["Min SAR 120"], channels: ["Dine-in", "Delivery", "Kiosk"], cap: 2500, startDate: "2026-01-01", endDate: "2026-12-31" },
  { code: "HUNGERSTATION10", name: "HungerStation Exclusive", type: "Percentage", value: "10%", conditions: ["Specific channel"], channels: ["Aggregators"], cap: 4000, startDate: "2026-01-01", endDate: "2026-12-31" },
  { code: "TAMHEEL2026", name: "Founding Day Special", type: "Fixed Amount", value: "SAR 22", conditions: ["Min SAR 90"], channels: ["Dine-in", "Delivery"], cap: 1000, startDate: "2026-02-22", endDate: "2026-02-28" },
  { code: "STUDENT10", name: "Student Discount", type: "Percentage", value: "10%", conditions: ["Min SAR 40"], channels: ["Dine-in", "Kiosk"], cap: 6000, startDate: "2026-01-01", endDate: "2026-12-31" },
  { code: "JAHEZFREESHIP", name: "Jahez Free Shipping", type: "Free Delivery", value: "Free delivery", conditions: ["Min SAR 60", "Specific channel"], channels: ["Aggregators"], cap: 3500, startDate: "2026-01-01", endDate: "2026-12-31" },
  { code: "FAMILYCOMBO", name: "Family Combo Deal", type: "Fixed Amount", value: "SAR 40", conditions: ["Min SAR 200"], channels: ["Dine-in", "Delivery"], cap: 900, startDate: "2026-01-01", endDate: "2026-12-31" },
  { code: "SUMMERKICKOFF", name: "Summer Kickoff 30%", type: "Percentage", value: "30%", conditions: ["Min SAR 100", "First order only"], channels: ["Delivery"], cap: 1800, startDate: "2026-06-01", endDate: "2026-07-15" },
  { code: "ANNIVERSARY5", name: "5th Anniversary Bundle", type: "Free Item", value: "1 free starter", conditions: ["Min SAR 80"], channels: ["Dine-in"], cap: 700, startDate: "2026-10-05", endDate: "2026-10-12" },
  { code: "KEETAWELCOME", name: "Keeta New User Offer", type: "Percentage", value: "18%", conditions: ["First order only", "Specific channel"], channels: ["Aggregators"], cap: 2600, startDate: "2026-01-01", endDate: "2026-12-31" },
  { code: "DAMMAMOPEN", name: "Dammam Branch Opening", type: "Fixed Amount", value: "SAR 25", conditions: ["Min SAR 100"], channels: ["Dine-in", "Delivery", "Kiosk"], cap: 1000, startDate: "2025-11-01", endDate: "2025-12-01" },
];

function promoStatusFor(start: string, end: string, today: string): PromoStatus {
  if (today < start) return "Scheduled";
  if (today > end) return "Expired";
  return "Active";
}

const TODAY_ISO = "2026-08-09";

export const promotions: readonly Promotion[] = PROMO_DEFS.map((def, i) => {
  const status = promoStatusFor(def.startDate, def.endDate, TODAY_ISO);
  const used = status === "Expired" ? def.cap : status === "Scheduled" ? 0 : Math.round(def.cap * (0.2 + ((i * 13) % 55) / 100));
  return { id: `PR-${String(i + 1).padStart(3, "0")}`, used, status, ...def };
});

export const promoTodayIso = TODAY_ISO;

/* ============================================================ 5. campaigns */

export const campaignKpis: readonly KpiCard[] = [
  { id: "camp-active", label: "ACTIVE CAMPAIGNS", value: "6", delta: "+1", deltaNote: "vs last month", color: "#a78bfa",
    sparkline: [3, 3, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6] },
  { id: "camp-sent", label: "MESSAGES SENT", value: "48.2K", delta: "+9.4%", deltaNote: "vs last month", color: "#60a5fa",
    sparkline: [36, 37.5, 38.8, 40, 41.4, 42.6, 43.8, 44.9, 45.8, 46.5, 47, 47.5, 47.8, 48, 48.1, 48.2] },
  { id: "camp-open-rate", label: "OPEN RATE", value: "62.4%", delta: "+3.1%", deltaNote: "vs last month", color: "#a3e635",
    sparkline: [55, 55.8, 56.5, 57.4, 58.2, 59, 59.6, 60.2, 60.8, 61.2, 61.6, 61.9, 62.1, 62.2, 62.3, 62.4] },
  { id: "camp-revenue", label: "CAMPAIGN REVENUE", value: "SAR 94.6K", delta: "+14.8%", deltaNote: "vs last month", color: "#fb923c",
    sparkline: [60, 63, 61, 67, 65, 71, 69, 75, 73, 80, 78, 85, 83, 90, 88, 94.6] },
] as const;

export type CampaignSegment = "All Members" | "Gold & Platinum" | "Lapsed Customers" | "New Signups" | "Birthday This Month" | "Delivery Regulars";

export interface AbVariant {
  label: "A" | "B";
  openRate: number;
  clickRate: number;
  conversionRate: number;
}

export interface CampaignDetail {
  id: string;
  name: string;
  channel: CampaignChannel;
  segment: CampaignSegment;
  estimatedReach: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  redeemed: number;
  revenueSar: number;
  status: CampaignStatus;
  templateApproved?: boolean;
  scheduledFor?: string;
  recurring?: string;
  messagePreview: string;
  abTest?: { variantA: AbVariant; variantB: AbVariant; winner: "A" | "B" };
}

export const campaigns: readonly CampaignDetail[] = [
  { id: "CMP-01", name: "Ramadan Iftar Offer", channel: "WhatsApp", segment: "All Members", estimatedReach: 6400, sent: 6200, delivered: 6080, opened: 4980, clicked: 2210, redeemed: 1120, revenueSar: 38600, status: "Active", templateApproved: true,
    messagePreview: "🌙 Ramadan Kareem! Enjoy 25% off your Iftar order this week. Use code RAMADAN25 at checkout. Valid until March 30.",
    abTest: { variantA: { label: "A", openRate: 78.1, clickRate: 34.2, conversionRate: 17.9 }, variantB: { label: "B", openRate: 82.4, clickRate: 39.8, conversionRate: 21.3 }, winner: "B" } },
  { id: "CMP-02", name: "National Day 20% Off", channel: "SMS", segment: "All Members", estimatedReach: 8300, sent: 8100, delivered: 8010, opened: 5300, clicked: 1980, redeemed: 1640, revenueSar: 41200, status: "Completed",
    messagePreview: "Happy National Day! Enjoy SAR 30 off orders over SAR 150. Code: NATIONALDAY. Valid Sep 20–25." },
  { id: "CMP-03", name: "Weekend Family Bundle", channel: "Push", segment: "Delivery Regulars", estimatedReach: 3600, sent: 3400, delivered: 3360, opened: 2100, clicked: 940, redeemed: 580, revenueSar: 19800, status: "Active",
    messagePreview: "This weekend only: Family Combo bundles starting at SAR 89. Tap to order now." },
  { id: "CMP-04", name: "Eid Gift Card Promo", channel: "WhatsApp", segment: "Gold & Platinum", estimatedReach: 5800, sent: 0, delivered: 0, opened: 0, clicked: 0, redeemed: 0, revenueSar: 0, status: "Scheduled", templateApproved: false,
    scheduledFor: "2026-04-08T09:00:00", messagePreview: "🎁 Celebrate Eid with a gift card for someone special — buy SAR 200, gift SAR 220. Limited time." },
  { id: "CMP-05", name: "New Branch Launch — Narjis", channel: "Email", segment: "All Members", estimatedReach: 2300, sent: 2200, delivered: 2170, opened: 980, clicked: 410, redeemed: 210, revenueSar: 8600, status: "Completed",
    messagePreview: "We've opened a new branch in Riyadh - Narjis! Visit us this week and get 15% off your first order." },
  { id: "CMP-06", name: "Gold Tier Double Points Weekend", channel: "Push", segment: "Gold & Platinum", estimatedReach: 1000, sent: 980, delivered: 970, opened: 720, clicked: 402, redeemed: 340, revenueSar: 15400, status: "Active",
    messagePreview: "Gold & Platinum members: earn 2x points this weekend on every order. No code needed." },
  { id: "CMP-07", name: "Back to School Combo", channel: "SMS", segment: "New Signups", estimatedReach: 4900, sent: 0, delivered: 0, opened: 0, clicked: 0, redeemed: 0, revenueSar: 0, status: "Draft",
    messagePreview: "Back to School Combo: kids meal + drink for SAR 25. Draft — pending final pricing approval." },
  { id: "CMP-08", name: "Coffee Hour Flash Sale", channel: "WhatsApp", segment: "Delivery Regulars", estimatedReach: 4100, sent: 3900, delivered: 3830, opened: 2960, clicked: 1340, redeemed: 890, revenueSar: 12300, status: "Paused", templateApproved: true,
    messagePreview: "☕ Flash sale: 2-for-1 coffee, 3–5 PM today only. Show this message at checkout." },
  { id: "CMP-09", name: "Lapsed Customer Win-back", channel: "Email", segment: "Lapsed Customers", estimatedReach: 3100, sent: 3000, delivered: 2950, opened: 1120, clicked: 480, redeemed: 260, revenueSar: 9400, status: "Completed",
    messagePreview: "We miss you! Here's SAR 25 off your next order — valid for the next 14 days only." },
  { id: "CMP-10", name: "Birthday Surprise", channel: "WhatsApp", segment: "Birthday This Month", estimatedReach: 640, sent: 610, delivered: 604, opened: 512, clicked: 288, redeemed: 201, revenueSar: 7100, status: "Active", templateApproved: true,
    messagePreview: "🎂 Happy Birthday from all of us! Enjoy a free dessert on your next visit this month." },
  { id: "CMP-11", name: "Founding Day Special", channel: "SMS", segment: "All Members", estimatedReach: 5200, sent: 0, delivered: 0, opened: 0, clicked: 0, redeemed: 0, revenueSar: 0, status: "Scheduled",
    scheduledFor: "2026-02-22T08:00:00", messagePreview: "Founding Day Special: SAR 22 off orders over SAR 90, Feb 22–28 only." },
  { id: "CMP-12", name: "Aggregator Cross-Promo", channel: "Push", segment: "New Signups", estimatedReach: 2700, sent: 2600, delivered: 2560, opened: 1640, clicked: 720, redeemed: 398, revenueSar: 6900, status: "Active",
    messagePreview: "New here? Get 20% off your very first order — no minimum spend." },
] as const;
