// The Preview step's rehearsal run: a fixed itinerary through a customer's
// journey (landing on the homepage through to a confirmed order), and the
// results table once some or all of it has run. Kept separate from
// `site-draft.ts` because `SIM_STEPS` is static content, not draft state —
// only `completed` and `results` live on the draft.
import type { SimResult } from "./site-draft";

export interface SimStep {
  id: string;
  labelKey: string;
  noteKey: string;
  detailKey: string;
  seconds: number;
}

export const SIM_STEPS: readonly SimStep[] = [
  { id: "landing", labelKey: "publicLink.sim.landing.label", noteKey: "publicLink.sim.landing.note", detailKey: "publicLink.sim.landing.detail", seconds: 0.8 },
  { id: "browseMenu", labelKey: "publicLink.sim.browseMenu.label", noteKey: "publicLink.sim.browseMenu.note", detailKey: "publicLink.sim.browseMenu.detail", seconds: 1.1 },
  { id: "reservation", labelKey: "publicLink.sim.reservation.label", noteKey: "publicLink.sim.reservation.note", detailKey: "publicLink.sim.reservation.detail", seconds: 1.4 },
  { id: "waitlist", labelKey: "publicLink.sim.waitlist.label", noteKey: "publicLink.sim.waitlist.note", detailKey: "publicLink.sim.waitlist.detail", seconds: 0.9 },
  { id: "order", labelKey: "publicLink.sim.order.label", noteKey: "publicLink.sim.order.note", detailKey: "publicLink.sim.order.detail", seconds: 1.6 },
  { id: "checkout", labelKey: "publicLink.sim.checkout.label", noteKey: "publicLink.sim.checkout.note", detailKey: "publicLink.sim.checkout.detail", seconds: 1.3 },
  { id: "confirmation", labelKey: "publicLink.sim.confirmation.label", noteKey: "publicLink.sim.confirmation.note", detailKey: "publicLink.sim.confirmation.detail", seconds: 0.7 },
];

/** Every step through `completed` reported as successful, carrying its own
 *  timing and detail key. `completed` is clamped to `[0, SIM_STEPS.length]`
 *  rather than trusted — a stray count past the end must not invent steps. */
export function resultsFor(completed: number): SimResult[] {
  const count = Math.max(0, Math.min(SIM_STEPS.length, completed));
  return SIM_STEPS.slice(0, count).map((step) => ({
    stepId: step.id,
    status: "success",
    seconds: step.seconds,
    detailKey: step.detailKey,
  }));
}
