import type { OrderChannel } from "@octopus/api-client";

export const FULFILLMENT_CHANNELS = ["scheduled", "delivery", "takeaway", "dine_in"] as const;

export type FulfillmentChannel = (typeof FULFILLMENT_CHANNELS)[number];

export const PICKUP_TIMINGS = ["asap", "scheduled"] as const;

export type PickupTiming = (typeof PICKUP_TIMINGS)[number];

export function fulfillmentLabel(channel: FulfillmentChannel): string {
  switch (channel) {
    case "scheduled":
      return "طلب مجدول";
    case "delivery":
      return "توصيل للمنزل";
    case "takeaway":
      return "استلام من الفرع";
    case "dine_in":
      return "داخل المطعم";
  }
}

/** The API contract records how an order is collected, not when it was
 *  arranged for — a scheduled order is still collected from a branch. */
export function toOrderChannel(channel: FulfillmentChannel): OrderChannel {
  return channel === "scheduled" ? "takeaway" : channel;
}
