// Pure helpers of the menu canvas: which messages to trust, on the menu channel.
import { isToMenuCanvasMessage, type ToMenuCanvasMessage } from "@octopus/api-client";

/** The message, when it comes from the parent window at an allowed origin on the menu channel; else null. */
export function acceptToMenuCanvas(
  event: { origin: string; source: unknown; data: unknown },
  allowedOrigins: readonly string[],
  parent: unknown
): ToMenuCanvasMessage | null {
  if (event.source !== parent || !allowedOrigins.includes(event.origin)) return null;
  return isToMenuCanvasMessage(event.data) ? event.data : null;
}
