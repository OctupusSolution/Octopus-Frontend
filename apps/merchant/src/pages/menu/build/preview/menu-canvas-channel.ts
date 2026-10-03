import { MENU_PREVIEW_PATH, isFromMenuCanvasMessage, toMenuCanvas, type MenuRenderPayload } from "@octopus/api-client";
import type { CanvasChannel } from "@/widgets/storefront-frame";

/** The storefront menu canvas (/preview/menu) as a frame channel. */
export const MENU_CANVAS_CHANNEL: CanvasChannel<MenuRenderPayload> = {
  path: MENU_PREVIEW_PATH,
  render: (payload) => toMenuCanvas({ type: "render", ...payload }),
  scrollTo: (anchor) => toMenuCanvas({ type: "scroll-to", anchor }),
  accept: (data) => {
    if (!isFromMenuCanvasMessage(data)) return null;
    if (data.type === "select-section") return { type: "select-section", id: data.sectionRef };
    if (data.type === "navigate") return { type: "navigate", href: data.href };
    return { type: "ready" };
  },
};
