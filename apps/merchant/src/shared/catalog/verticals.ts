// Business verticals OCTOPUS can provision. OCTOPUS is a modular business
// operating system, not a restaurant product — the vertical picked at signup
// is what decides which product the merchant actually gets.
//
// Only `restaurants` is buildable today (its twelve types, capability matrix
// and every page exist). The rest are listed honestly as `coming-soon` so the
// multi-vertical model is visible without pretending product exists that does
// not.

export type VerticalId = "restaurants" | "clinics" | "pets" | "salons" | "retail";

export type VerticalStatus = "available" | "coming-soon";

export interface Vertical {
  id: VerticalId;
  status: VerticalStatus;
  /** lucide-react icon name, resolved to a component in the UI layer */
  icon: string;
  nameKey: string;
  descKey: string;
}

export const verticals: readonly Vertical[] = [
  {
    id: "restaurants",
    status: "available",
    icon: "UtensilsCrossed",
    nameKey: "onboarding.vertical.restaurants.name",
    descKey: "onboarding.vertical.restaurants.desc",
  },
  {
    id: "clinics",
    status: "coming-soon",
    icon: "Stethoscope",
    nameKey: "onboarding.vertical.clinics.name",
    descKey: "onboarding.vertical.clinics.desc",
  },
  {
    id: "pets",
    status: "coming-soon",
    icon: "PawPrint",
    nameKey: "onboarding.vertical.pets.name",
    descKey: "onboarding.vertical.pets.desc",
  },
  {
    id: "salons",
    status: "coming-soon",
    icon: "Scissors",
    nameKey: "onboarding.vertical.salons.name",
    descKey: "onboarding.vertical.salons.desc",
  },
  {
    id: "retail",
    status: "coming-soon",
    icon: "ShoppingBag",
    nameKey: "onboarding.vertical.retail.name",
    descKey: "onboarding.vertical.retail.desc",
  },
];

export function getVertical(id: VerticalId): Vertical | undefined {
  return verticals.find((v) => v.id === id);
}
