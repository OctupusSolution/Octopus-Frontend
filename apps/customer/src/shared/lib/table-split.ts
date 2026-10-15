import type { OrderLine } from "@octopus/api-client";
import { computeLinePricing } from "./storefront";

/** How a table settles its bill: one payer, or one of the three ways to share it. */
export type SplitMode = "full" | "equal" | "items" | "custom";

export type SplitStatus = "unpaid" | "shared" | "paid";

export interface SplitPerson {
  id: string;
  name: string;
  /** "custom" mode only: what this person said they will pay. */
  amountSar?: number;
  /** `shared` — their payment link was sent, and they pay from their own phone. */
  status: SplitStatus;
}

export interface SplitState {
  mode: SplitMode;
  people: SplitPerson[];
  /** "items" mode only: who shares each cart line, by lineId. */
  assignments: Record<string, string[]>;
}

export const EMPTY_SPLIT: SplitState = { mode: "full", people: [], assignments: {} };

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** "أحمد محمد" → "أ م". The avatar a person gets in every split list. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join(" ");
}

/** What each person owes, by person id. The shares always add up to what they
 *  cover: rounding is settled on the last person, not lost. */
export function personShares(
  split: SplitState,
  lines: readonly OrderLine[],
  payableSar: number,
): Record<string, number> {
  const shares: Record<string, number> = {};
  const { people } = split;
  if (people.length === 0) return shares;

  if (split.mode === "custom") {
    for (const person of people) shares[person.id] = round2(person.amountSar ?? 0);
    return shares;
  }

  // The weight each person carries: an even one, or the value of the items they
  // took (an item shared by three counts a third to each).
  const weights: Record<string, number> = {};
  for (const person of people) weights[person.id] = split.mode === "equal" ? 1 : 0;
  if (split.mode === "items") {
    for (const line of lines) {
      const sharers = (split.assignments[line.lineId] ?? []).filter((id) => id in weights);
      if (sharers.length === 0) continue;
      const each = computeLinePricing(line).totalSar / sharers.length;
      for (const id of sharers) weights[id] += each;
    }
  }

  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) {
    for (const person of people) shares[person.id] = 0;
    return shares;
  }

  // Fees, VAT, tip and discount follow the same proportions as the weights.
  const owing = people.filter((person) => weights[person.id] > 0);
  let given = 0;
  for (const person of people) {
    if (weights[person.id] <= 0) {
      shares[person.id] = 0;
      continue;
    }
    const last = person.id === owing[owing.length - 1].id;
    const share = last ? round2(payableSar - given) : round2((payableSar * weights[person.id]) / total);
    shares[person.id] = share;
    given += share;
  }
  return shares;
}

export interface SplitTotals {
  paidSar: number;
  unpaidSar: number;
  /** What the bill still needs once the paid shares are taken off. */
  remainingSar: number;
}

export function splitTotals(
  split: SplitState,
  shares: Record<string, number>,
  payableSar: number,
): SplitTotals {
  let paidSar = 0;
  let unpaidSar = 0;
  for (const person of split.people) {
    const share = shares[person.id] ?? 0;
    if (person.status === "paid") paidSar += share;
    else unpaidSar += share;
  }
  return {
    paidSar: round2(paidSar),
    unpaidSar: round2(unpaidSar),
    remainingSar: round2(Math.max(0, payableSar - paidSar)),
  };
}

/** Every item has someone paying for it — the "items" split is ready to review. */
export function allLinesAssigned(split: SplitState, lines: readonly OrderLine[]): boolean {
  const known = new Set(split.people.map((person) => person.id));
  return lines.every((line) => (split.assignments[line.lineId] ?? []).some((id) => known.has(id)));
}
