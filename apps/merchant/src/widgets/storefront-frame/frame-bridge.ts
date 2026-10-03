// Pure helpers of a framed storefront canvas: where it points, which messages to trust, and how the page is scaled into
// the card. Channel-agnostic: each canvas (Public Link site, menu) supplies how its own messages map to frame events.

/** Past this without a `ready`, the storefront is taken as unreachable and the host shows its own preview instead. */
export const READY_TIMEOUT_MS = 8000;

/** The viewport each device is laid out at (CSS px). */
export const FRAME_VIEWPORT_WIDTH = { desktop: 1280, tablet: 768, mobile: 390 } as const;
export type FrameDevice = keyof typeof FRAME_VIEWPORT_WIDTH;

export type CanvasEvent =
  | { type: "ready" }
  | { type: "navigate"; href: string }
  | { type: "language"; language: string }
  | { type: "select-section"; id: string };

export interface CanvasChannel<P> {
  /** The storefront route, e.g. "/preview/builder". */
  path: string;
  render(payload: P): unknown;
  scrollTo(anchor: string): unknown;
  /** The canvas's message as a frame event, or null when it is not one of this channel's (already shape-checked). */
  accept(data: unknown): CanvasEvent | null;
}

export const canvasUrl = (origin: string, path: string): string => `${origin.replace(/\/+$/, "")}${path}`;

export function acceptFromCanvas(
  event: { origin: string; source: unknown; data: unknown },
  expectedOrigin: string,
  frameWindow: unknown,
  accept: (data: unknown) => CanvasEvent | null
): CanvasEvent | null {
  if (!frameWindow || event.source !== frameWindow || event.origin !== expectedOrigin) return null;
  return accept(event.data);
}

export function frameGeometry(viewportWidth: number, cardWidth: number, cardHeight: number, maxCardWidth: number) {
  const drawnWidth = Math.min(cardWidth, maxCardWidth);
  const scale = viewportWidth > 0 && drawnWidth > 0 ? drawnWidth / viewportWidth : 0;
  return { drawnWidth, scale, frameHeight: scale > 0 ? Math.round(cardHeight / scale) : 0 };
}
