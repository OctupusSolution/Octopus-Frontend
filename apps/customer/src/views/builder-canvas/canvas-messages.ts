// Pure helpers of the builder canvas: which messages to trust, and where a clicked link goes.
import { isToCanvasMessage, type ToCanvasMessage } from "@octopus/api-client";

/** The message, when it comes from the parent window at an allowed origin and is well formed; else null. */
export function acceptToCanvas(
  event: { origin: string; source: unknown; data: unknown },
  allowedOrigins: readonly string[],
  parent: unknown
): ToCanvasMessage | null {
  if (event.source !== parent || !allowedOrigins.includes(event.origin)) return null;
  return isToCanvasMessage(event.data) ? event.data : null;
}

/** A same-site link as `path#hash` (the builder opens that page); null for anything that leaves the site. */
export function canvasLinkTarget(href: string, ownOrigin: string): string | null {
  if (href.startsWith("#")) return href;
  let url: URL;
  try {
    url = new URL(href, ownOrigin);
  } catch {
    return null;
  }
  if (url.origin !== ownOrigin) return null;
  return `${url.pathname}${url.hash}`;
}
