// Business verticals OCTOPUS can provision. OCTOPUS is a modular business
// operating system, not a restaurant product — the vertical picked at signup
// is what decides which product the merchant actually gets.
//
// Only `restaurants` is buildable today (its twelve types, capability matrix
// and every page exist). The rest are listed honestly as `coming-soon` so the
// multi-vertical model is visible without pretending product exists that does
// not.

export type VerticalId =
  | "restaurants"
  | "healthcare"
  | "retail"
  | "professionalServices"
  | "logistics"
  | "education"
  | "fitness"
  | "realEstate"
  | "technology"
  | "other";

export type VerticalStatus = "available" | "coming-soon";

export interface Vertical {
  id: VerticalId;
  status: VerticalStatus;
  /** filename inside apps/assets/onboarding-Business, resolved to a URL in the UI layer */
  image: string;
  nameKey: string;
  descKey: string;
}

export const verticals: readonly Vertical[] = [
  {
    id: "healthcare",
    status: "coming-soon",
    image: "healthcare.png",
    nameKey: "onboarding.vertical.healthcare.name",
    descKey: "onboarding.vertical.healthcare.desc",
  },
  {
    id: "retail",
    status: "coming-soon",
    image: "retail.png",
    nameKey: "onboarding.vertical.retail.name",
    descKey: "onboarding.vertical.retail.desc",
  },
  {
    id: "restaurants",
    status: "available",
    image: "restaurant.png",
    nameKey: "onboarding.vertical.restaurants.name",
    descKey: "onboarding.vertical.restaurants.desc",
  },
  {
    id: "professionalServices",
    status: "coming-soon",
    image: "professional-services.png",
    nameKey: "onboarding.vertical.professionalServices.name",
    descKey: "onboarding.vertical.professionalServices.desc",
  },
  {
    id: "logistics",
    status: "coming-soon",
    image: "logistics.png",
    nameKey: "onboarding.vertical.logistics.name",
    descKey: "onboarding.vertical.logistics.desc",
  },
  {
    id: "education",
    status: "coming-soon",
    image: "education.png",
    nameKey: "onboarding.vertical.education.name",
    descKey: "onboarding.vertical.education.desc",
  },
  {
    id: "fitness",
    status: "coming-soon",
    image: "fitness.png",
    nameKey: "onboarding.vertical.fitness.name",
    descKey: "onboarding.vertical.fitness.desc",
  },
  {
    id: "realEstate",
    status: "coming-soon",
    image: "real-estate.png",
    nameKey: "onboarding.vertical.realEstate.name",
    descKey: "onboarding.vertical.realEstate.desc",
  },
  {
    id: "technology",
    status: "coming-soon",
    image: "technology.png",
    nameKey: "onboarding.vertical.technology.name",
    descKey: "onboarding.vertical.technology.desc",
  },
  {
    id: "other",
    status: "coming-soon",
    image: "other.png",
    nameKey: "onboarding.vertical.other.name",
    descKey: "onboarding.vertical.other.desc",
  },
];

export function getVertical(id: VerticalId): Vertical | undefined {
  return verticals.find((v) => v.id === id);
}
