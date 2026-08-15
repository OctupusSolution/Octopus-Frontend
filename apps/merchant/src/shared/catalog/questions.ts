// The operational questions asked during onboarding.
//
// The merchant is never asked to pick "modules" — they are asked about their
// own operation, in their own language, and the answers switch modules on.
//
// Which questions appear is derived, not hand-maintained: a question is only
// worth asking when the type profile leaves a genuine choice. If every module
// a question controls is `na` for the chosen type, the question is irrelevant
// (a cloud kitchen is never asked about tables). If every module is `core`,
// the answer is a foregone conclusion and asking wastes the merchant's time.

import type { ModuleId } from "./modules";
import type { TypeCode } from "./restaurant-types";
import { availabilityFor } from "./type-defaults";

export interface QuestionOption {
  id: string;
  labelKey: string;
  /** Modules this answer switches on. */
  enables: readonly ModuleId[];
  /** Only on the branches question — how many branches this answer means. */
  branchCount?: number;
}

export interface Question {
  id: string;
  textKey: string;
  helpKey?: string;
  /** Modules this question can switch on; drives the relevance rule. */
  controls: readonly ModuleId[];
  options: readonly QuestionOption[];
}

export const questions: readonly Question[] = [
  {
    id: "branches",
    textKey: "onboarding.q.branches.text",
    helpKey: "onboarding.q.branches.help",
    controls: [],
    options: [
      { id: "one",   labelKey: "onboarding.q.branches.one",   enables: [], branchCount: 1 },
      { id: "few",   labelKey: "onboarding.q.branches.few",   enables: [], branchCount: 3 },
      { id: "many",  labelKey: "onboarding.q.branches.many",  enables: [], branchCount: 8 },
    ],
  },
  {
    id: "delivery",
    textKey: "onboarding.q.delivery.text",
    helpKey: "onboarding.q.delivery.help",
    controls: ["delivery", "integrations"],
    options: [
      { id: "own",         labelKey: "onboarding.q.delivery.own",         enables: ["delivery"] },
      { id: "aggregators", labelKey: "onboarding.q.delivery.aggregators", enables: ["delivery", "integrations"] },
      { id: "both",        labelKey: "onboarding.q.delivery.both",        enables: ["delivery", "integrations"] },
      { id: "none",        labelKey: "onboarding.q.delivery.none",        enables: [] },
    ],
  },
  {
    id: "reservations",
    textKey: "onboarding.q.reservations.text",
    helpKey: "onboarding.q.reservations.help",
    controls: ["bookings"],
    options: [
      { id: "yes", labelKey: "onboarding.q.reservations.yes", enables: ["bookings"] },
      { id: "no",  labelKey: "onboarding.q.reservations.no",  enables: [] },
    ],
  },
  {
    id: "inventory",
    textKey: "onboarding.q.inventory.text",
    helpKey: "onboarding.q.inventory.help",
    controls: ["inventory"],
    options: [
      { id: "yes", labelKey: "onboarding.q.inventory.yes", enables: ["inventory"] },
      { id: "no",  labelKey: "onboarding.q.inventory.no",  enables: [] },
    ],
  },
  {
    id: "staff",
    textKey: "onboarding.q.staff.text",
    helpKey: "onboarding.q.staff.help",
    controls: ["hr"],
    options: [
      { id: "yes", labelKey: "onboarding.q.staff.yes", enables: ["hr"] },
      { id: "no",  labelKey: "onboarding.q.staff.no",  enables: [] },
    ],
  },
  {
    id: "loyalty",
    textKey: "onboarding.q.loyalty.text",
    helpKey: "onboarding.q.loyalty.help",
    controls: ["loyalty", "customers"],
    options: [
      { id: "yes", labelKey: "onboarding.q.loyalty.yes", enables: ["loyalty", "customers"] },
      { id: "no",  labelKey: "onboarding.q.loyalty.no",  enables: [] },
    ],
  },
  {
    id: "accounting",
    textKey: "onboarding.q.accounting.text",
    helpKey: "onboarding.q.accounting.help",
    controls: ["accounting"],
    options: [
      { id: "yes", labelKey: "onboarding.q.accounting.yes", enables: ["accounting"] },
      { id: "no",  labelKey: "onboarding.q.accounting.no",  enables: [] },
    ],
  },
  {
    id: "messaging",
    textKey: "onboarding.q.messaging.text",
    helpKey: "onboarding.q.messaging.help",
    controls: ["messaging"],
    options: [
      { id: "yes", labelKey: "onboarding.q.messaging.yes", enables: ["messaging"] },
      { id: "no",  labelKey: "onboarding.q.messaging.no",  enables: [] },
    ],
  },
];

/**
 * The questions worth asking a given type. A question survives only when at
 * least one module it controls is a real choice for that type — neither
 * hidden (`na`) nor mandatory (`core`).
 */
export function questionsFor(type: TypeCode): Question[] {
  return questions.filter((q) => {
    if (q.controls.length === 0) return true; // branch count always applies
    return q.controls.some((m) => {
      const availability = availabilityFor(type, m);
      return availability === "recommended" || availability === "optional";
    });
  });
}

/** The option the merchant most likely wants, based on the type profile. */
export function suggestedOptionFor(type: TypeCode, question: Question): string {
  if (question.id === "branches") return "one";
  const wanted = question.controls.some((m) => availabilityFor(type, m) === "recommended");
  // Pick the first option that switches something on, else the "no" option.
  const positive = question.options.find((o) => o.enables.length > 0);
  const negative = question.options.find((o) => o.enables.length === 0);
  return (wanted ? positive?.id : negative?.id) ?? question.options[0].id;
}
