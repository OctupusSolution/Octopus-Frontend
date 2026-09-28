// The menu builder's live preview: the merchant console frames the storefront's /preview/menu canvas and drives it with
// postMessage. Same shape and trust rules as the Public Link canvas (builder-preview.ts), on its own channels so the two can
// never be confused. Both sides validate every message with these guards AND check the sender (origin and window).
import type { PublicMenuDocument } from "./public-menu";

export const MENU_PREVIEW_PROTOCOL = 1 as const;
/** Under the reserved `preview` first path segment, like the Public Link canvas. */
export const MENU_PREVIEW_PATH = "/preview/menu";
export const MENU_BUILDER_CHANNEL = "octopus-menu-builder" as const;
export const MENU_CANVAS_CHANNEL = "octopus-menu-canvas" as const;

export interface MenuRenderPayload {
  document: PublicMenuDocument;
  /** "order" shows add buttons and the sticky cart (the site); "view" never does (the QR menu). */
  mode: "order" | "view";
  /** Hover outlines and select-section clicks — only where the builder wires selection. */
  selectable: boolean;
  /** `s{index}` of the section being edited: outlined and scrolled into view. */
  highlightSectionRef: string | null;
}

export type ToMenuCanvasBody = ({ type: "render" } & MenuRenderPayload) | { type: "scroll-to"; anchor: string };
export type ToMenuCanvasMessage = ToMenuCanvasBody & { channel: typeof MENU_BUILDER_CHANNEL; protocol: typeof MENU_PREVIEW_PROTOCOL };
export type MenuRenderMessage = Extract<ToMenuCanvasMessage, { type: "render" }>;

export type FromMenuCanvasBody =
  | { type: "ready" }
  | { type: "navigate"; href: string }
  | { type: "select-section"; sectionRef: string };
export type FromMenuCanvasMessage = FromMenuCanvasBody & { channel: typeof MENU_CANVAS_CHANNEL; protocol: typeof MENU_PREVIEW_PROTOCOL };

export const toMenuCanvas = (body: ToMenuCanvasBody): ToMenuCanvasMessage => ({ ...body, channel: MENU_BUILDER_CHANNEL, protocol: MENU_PREVIEW_PROTOCOL });
export const fromMenuCanvas = (body: FromMenuCanvasBody): FromMenuCanvasMessage => ({ ...body, channel: MENU_CANVAS_CHANNEL, protocol: MENU_PREVIEW_PROTOCOL });

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function isToMenuCanvasMessage(data: unknown): data is ToMenuCanvasMessage {
  if (!isObject(data) || data.channel !== MENU_BUILDER_CHANNEL || data.protocol !== MENU_PREVIEW_PROTOCOL) return false;
  if (data.type === "render") {
    const doc = data.document;
    return (
      isObject(doc) &&
      Array.isArray(doc.sections) &&
      isObject(doc.items) &&
      isObject(doc.offers) &&
      (data.mode === "order" || data.mode === "view") &&
      typeof data.selectable === "boolean" &&
      (data.highlightSectionRef === null || typeof data.highlightSectionRef === "string")
    );
  }
  if (data.type === "scroll-to") return typeof data.anchor === "string";
  return false;
}

export function isFromMenuCanvasMessage(data: unknown): data is FromMenuCanvasMessage {
  if (!isObject(data) || data.channel !== MENU_CANVAS_CHANNEL || data.protocol !== MENU_PREVIEW_PROTOCOL) return false;
  switch (data.type) {
    case "ready":
      return true;
    case "navigate":
      return typeof data.href === "string";
    case "select-section":
      return typeof data.sectionRef === "string";
    default:
      return false;
  }
}
