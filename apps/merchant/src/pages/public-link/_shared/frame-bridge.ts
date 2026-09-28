// Pure helpers of the builder's storefront iframe (ui/storefront-frame.tsx): where it points, which
// messages to trust, and how the page is scaled into the card.
import { BUILDER_PREVIEW_PATH, isFromCanvasMessage, type FromCanvasMessage } from "@octopus/api-client";

/** Past this without a `ready`, the storefront is taken as unreachable and the mirror is shown. */
export const READY_TIMEOUT_MS = 8000;

export const canvasUrl = (origin: string): string => `${origin.replace(/\/+$/, "")}${BUILDER_PREVIEW_PATH}`;

/** The message, when it comes from our own frame's window at the storefront origin and is well formed; else null. */
export function acceptFromCanvas(
  event: { origin: string; source: unknown; data: unknown },
  expectedOrigin: string,
  frameWindow: unknown
): FromCanvasMessage | null {
  if (!frameWindow || event.source !== frameWindow || event.origin !== expectedOrigin) return null;
  return isFromCanvasMessage(event.data) ? event.data : null;
}

/**
 * The frame is `viewportWidth` CSS px wide (the device's real width) and scaled to `drawnWidth`
 * (the card, capped for phones and tablets); it is made tall enough to fill the card once scaled.
 */
export function frameGeometry(viewportWidth: number, cardWidth: number, cardHeight: number, maxCardWidth: number) {
  const drawnWidth = Math.min(cardWidth, maxCardWidth);
  const scale = viewportWidth > 0 && drawnWidth > 0 ? drawnWidth / viewportWidth : 0;
  return { drawnWidth, scale, frameHeight: scale > 0 ? Math.round(cardHeight / scale) : 0 };
}
