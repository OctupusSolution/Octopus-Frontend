// The Public Link builder's live preview: the merchant console frames the customer storefront's
// canvas route and drives it with postMessage (US-019 builder). Builder -> canvas: what to render
// (the public read shapes, produced from the unsaved draft). Canvas -> builder: what the visitor did.
// Both sides validate every message with the guards below AND check the sender (origin and window);
// see apps/customer/src/views/builder-canvas and apps/merchant/src/pages/public-link/ui/storefront-frame.tsx.
import type { PublicSitePage, PublicSiteShell } from "./public-read";

/** Bumped when a message changes shape; each side ignores other versions. */
export const BUILDER_PREVIEW_PROTOCOL = 1 as const;
/** The storefront route the builder frames. `preview` is a reserved first path segment, so no page can take it. */
export const BUILDER_PREVIEW_PATH = "/preview/builder";
export const BUILDER_CHANNEL = "octopus-builder" as const;
export const CANVAS_CHANNEL = "octopus-builder-canvas" as const;

/** A menu as the storefront's public menu read gives it, with images already delivery URLs. */
export interface BuilderMenuDocument {
  sections: { name: string; description: string | null; image: string | null; entries: { ref: string; kind: string }[] }[];
  items: Record<
    string,
    {
      name: string;
      description: string | null;
      image: string | null;
      price: { amount: number } | null;
      isAvailable: boolean;
      modifierGroupRefs: string[];
      tags?: string[];
    }
  >;
  modifierGroups: Record<
    string,
    {
      name: string;
      selectionMode: string;
      isRequired?: boolean;
      options: { id?: string; name: string; effect?: { amount?: { amount: number } | null }; isDefault?: boolean }[];
    }
  >;
}

export interface BuilderRenderPayload {
  shell: PublicSiteShell;
  /** The page to show; null when it is not on the site (hidden, content unavailable) or still loading. */
  page: PublicSitePage | null;
  pageLoading: boolean;
  /** Menu documents by `source.publicLinkKey`; a missing key is still loading, null means none. */
  menus: Record<string, BuilderMenuDocument | null>;
  /** The section the merchant is editing: outlined and scrolled into view. */
  highlightSectionId: string | null;
  /** Whether the canvas should show selection chrome (hover outline, pointer cursor) and report clicked sections. */
  selectable: boolean;
}

export type ToCanvasBody = ({ type: "render" } & BuilderRenderPayload) | { type: "scroll-to"; anchor: string };
export type ToCanvasMessage = ToCanvasBody & { channel: typeof BUILDER_CHANNEL; protocol: typeof BUILDER_PREVIEW_PROTOCOL };
export type BuilderRenderMessage = Extract<ToCanvasMessage, { type: "render" }>;

export type FromCanvasBody =
  | { type: "ready" }
  | { type: "navigate"; href: string }
  | { type: "language"; language: string }
  | { type: "select-section"; sectionId: string };
export type FromCanvasMessage = FromCanvasBody & { channel: typeof CANVAS_CHANNEL; protocol: typeof BUILDER_PREVIEW_PROTOCOL };

export const toCanvas = (body: ToCanvasBody): ToCanvasMessage => ({ ...body, channel: BUILDER_CHANNEL, protocol: BUILDER_PREVIEW_PROTOCOL });
export const fromCanvas = (body: FromCanvasBody): FromCanvasMessage => ({ ...body, channel: CANVAS_CHANNEL, protocol: BUILDER_PREVIEW_PROTOCOL });

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

export function isToCanvasMessage(data: unknown): data is ToCanvasMessage {
  if (!isObject(data) || data.channel !== BUILDER_CHANNEL || data.protocol !== BUILDER_PREVIEW_PROTOCOL) return false;
  if (data.type === "render") return isObject(data.shell) && (data.page === null || isObject(data.page)) && isObject(data.menus) && typeof data.selectable === "boolean";
  if (data.type === "scroll-to") return typeof data.anchor === "string";
  return false;
}

export function isFromCanvasMessage(data: unknown): data is FromCanvasMessage {
  if (!isObject(data) || data.channel !== CANVAS_CHANNEL || data.protocol !== BUILDER_PREVIEW_PROTOCOL) return false;
  switch (data.type) {
    case "ready":
      return true;
    case "navigate":
      return typeof data.href === "string";
    case "language":
      return typeof data.language === "string";
    case "select-section":
      return typeof data.sectionId === "string";
    default:
      return false;
  }
}
