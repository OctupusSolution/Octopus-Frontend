export const FULFILLMENT_CHANNELS = ["delivery", "takeaway", "dine_in"] as const;

export type FulfillmentChannel = (typeof FULFILLMENT_CHANNELS)[number];

export function fulfillmentLabel(channel: FulfillmentChannel): string {
  switch (channel) {
    case "delivery":
      return "توصيل للمنزل";
    case "takeaway":
      return "استلام من الفرع";
    case "dine_in":
      return "داخل المطعم";
  }
}
