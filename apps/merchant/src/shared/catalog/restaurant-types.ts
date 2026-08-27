// The twelve restaurant types from the OCTOPUS Restaurants SRS, Section 7.
//
// A type is a *provisioning profile*, not a hard wall (SRS §7 design rule):
// it decides what is enabled by default and what the onboarding wizard,
// navigation and dashboards emphasise. Every capability stays technically
// reachable — see type-defaults.ts for what each type turns on.

export type TypeCode =
  | "T1" | "T2" | "T3" | "T4" | "T5" | "T6"
  | "T7" | "T8" | "T9" | "T10" | "T11" | "T12";

/** The four service models the twelve types cluster into (SRS §7.0). */
export type ServiceModel = "on-premise" | "counter" | "off-premise" | "scheduled";

export interface RestaurantType {
  code: TypeCode;
  serviceModel: ServiceModel;
  /** filename inside apps/assets/onboarding-Type, resolved to a URL in the UI layer */
  image: string;
  nameKey: string;
  /** one-line definition */
  descKey: string;
  /** "right for you if…" — the line that helps a merchant self-identify */
  fitKey: string;
}

export const restaurantTypes: readonly RestaurantType[] = [
  { code: "T1",  serviceModel: "on-premise", image: "fine-dining.png",
    nameKey: "onboarding.type.T1.name",  descKey: "onboarding.type.T1.desc",  fitKey: "onboarding.type.T1.fit" },
  { code: "T2",  serviceModel: "on-premise", image: "casual.png",
    nameKey: "onboarding.type.T2.name",  descKey: "onboarding.type.T2.desc",  fitKey: "onboarding.type.T2.fit" },
  { code: "T3",  serviceModel: "counter", image: "quick-service.png",
    nameKey: "onboarding.type.T3.name",  descKey: "onboarding.type.T3.desc",  fitKey: "onboarding.type.T3.fit" },
  { code: "T4",  serviceModel: "counter", image: "cafe.png",
    nameKey: "onboarding.type.T4.name",  descKey: "onboarding.type.T4.desc",  fitKey: "onboarding.type.T4.fit" },
  { code: "T5",  serviceModel: "scheduled", image: "patisserie.png",
    nameKey: "onboarding.type.T5.name",  descKey: "onboarding.type.T5.desc",  fitKey: "onboarding.type.T5.fit" },
  { code: "T6",  serviceModel: "off-premise", image: "cloud-kitchen.png",
    nameKey: "onboarding.type.T6.name",  descKey: "onboarding.type.T6.desc",  fitKey: "onboarding.type.T6.fit" },
  { code: "T7",  serviceModel: "counter", image: "food-truck.png",
    nameKey: "onboarding.type.T7.name",  descKey: "onboarding.type.T7.desc",  fitKey: "onboarding.type.T7.fit" },
  { code: "T8",  serviceModel: "on-premise", image: "food-court.png",
    nameKey: "onboarding.type.T8.name",  descKey: "onboarding.type.T8.desc",  fitKey: "onboarding.type.T8.fit" },
  { code: "T9",  serviceModel: "scheduled", image: "catering.png",
    nameKey: "onboarding.type.T9.name",  descKey: "onboarding.type.T9.desc",  fitKey: "onboarding.type.T9.fit" },
  { code: "T10", serviceModel: "on-premise", image: "traditional.png",
    nameKey: "onboarding.type.T10.name", descKey: "onboarding.type.T10.desc", fitKey: "onboarding.type.T10.fit" },
  { code: "T11", serviceModel: "on-premise", image: "hotel-beach.png",
    nameKey: "onboarding.type.T11.name", descKey: "onboarding.type.T11.desc", fitKey: "onboarding.type.T11.fit" },
  { code: "T12", serviceModel: "scheduled", image: "home-based.png",
    nameKey: "onboarding.type.T12.name", descKey: "onboarding.type.T12.desc", fitKey: "onboarding.type.T12.fit" },
];

export function getRestaurantType(code: TypeCode): RestaurantType | undefined {
  return restaurantTypes.find((t) => t.code === code);
}
