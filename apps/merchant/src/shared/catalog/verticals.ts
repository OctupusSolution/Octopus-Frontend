// Business verticals OCTOPUS can provision. OCTOPUS is a modular business
// operating system, not a restaurant product — the vertical picked at signup
// is what decides which product the merchant actually gets.
//
// Only `restaurants` (labelled "Hospitality", the frame's word for it) has a
// type catalogue, capability matrix and pages behind it today. `status` still
// records that, but the Setup frames deliberately offer all twelve without a
// lock: every one of them continues into the same Services step, because the
// restaurant type list is the only type list that exists. Building a second
// vertical means giving it its own type catalogue and reading `status` here
// to route to it.

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
  | "petCare"
  | "kidsPlayArea"
  | "other";

export type VerticalStatus = "available" | "coming-soon";

export interface Vertical {
  id: VerticalId;
  status: VerticalStatus;
  /** Filename inside apps/assets/onboarding-Business, resolved to a URL in the
   *  UI layer. `null` where no 3D render has been produced yet — the card
   *  falls back to `icon` rather than borrowing another vertical's picture,
   *  which would read as a mislabelled card rather than a missing one. */
  image: string | null;
  /** lucide-react icon name, used only when `image` is null. */
  icon: string;
  nameKey: string;
  descKey: string;
}

export const verticals: readonly Vertical[] = [
  {
    id: "healthcare",
    status: "coming-soon",
    image: "healthcare.png",
    icon: "Stethoscope",
    nameKey: "onboarding.vertical.healthcare.name",
    descKey: "onboarding.vertical.healthcare.desc",
  },
  {
    id: "retail",
    status: "coming-soon",
    image: "retail.png",
    icon: "ShoppingBag",
    nameKey: "onboarding.vertical.retail.name",
    descKey: "onboarding.vertical.retail.desc",
  },
  {
    id: "restaurants",
    status: "available",
    image: "restaurant.png",
    icon: "UtensilsCrossed",
    nameKey: "onboarding.vertical.restaurants.name",
    descKey: "onboarding.vertical.restaurants.desc",
  },
  {
    id: "professionalServices",
    status: "coming-soon",
    image: "professional-services.png",
    icon: "Building2",
    nameKey: "onboarding.vertical.professionalServices.name",
    descKey: "onboarding.vertical.professionalServices.desc",
  },
  {
    id: "logistics",
    status: "coming-soon",
    image: "logistics.png",
    icon: "Truck",
    nameKey: "onboarding.vertical.logistics.name",
    descKey: "onboarding.vertical.logistics.desc",
  },
  {
    id: "education",
    status: "coming-soon",
    image: "education.png",
    icon: "Users",
    nameKey: "onboarding.vertical.education.name",
    descKey: "onboarding.vertical.education.desc",
  },
  {
    id: "fitness",
    status: "coming-soon",
    image: "fitness.png",
    icon: "Zap",
    nameKey: "onboarding.vertical.fitness.name",
    descKey: "onboarding.vertical.fitness.desc",
  },
  {
    id: "realEstate",
    status: "coming-soon",
    image: "real-estate.png",
    icon: "Home",
    nameKey: "onboarding.vertical.realEstate.name",
    descKey: "onboarding.vertical.realEstate.desc",
  },
  {
    id: "technology",
    status: "coming-soon",
    image: "technology.png",
    icon: "Settings",
    nameKey: "onboarding.vertical.technology.name",
    descKey: "onboarding.vertical.technology.desc",
  },
  {
    id: "petCare",
    status: "coming-soon",
    image: "pet-care.png",
    icon: "PawPrint",
    nameKey: "onboarding.vertical.petCare.name",
    descKey: "onboarding.vertical.petCare.desc",
  },
  {
    id: "kidsPlayArea",
    status: "coming-soon",
    image: "kids-play-area.png",
    icon: "Blocks",
    nameKey: "onboarding.vertical.kidsPlayArea.name",
    descKey: "onboarding.vertical.kidsPlayArea.desc",
  },
  {
    id: "other",
    status: "coming-soon",
    image: "other.png",
    icon: "Box",
    nameKey: "onboarding.vertical.other.name",
    descKey: "onboarding.vertical.other.desc",
  },
];

export function getVertical(id: VerticalId): Vertical | undefined {
  return verticals.find((v) => v.id === id);
}
