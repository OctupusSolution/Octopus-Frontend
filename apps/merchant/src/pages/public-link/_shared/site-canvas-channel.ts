import { BUILDER_PREVIEW_PATH, isFromCanvasMessage, toCanvas, type BuilderRenderPayload } from "@octopus/api-client";
import type { CanvasChannel } from "@/widgets/storefront-frame";

/** The Public Link site canvas (/preview/builder) as a frame channel. */
export const SITE_CANVAS_CHANNEL: CanvasChannel<BuilderRenderPayload> = {
  path: BUILDER_PREVIEW_PATH,
  render: (payload) => toCanvas({ type: "render", ...payload }),
  scrollTo: (anchor) => toCanvas({ type: "scroll-to", anchor }),
  accept: (data) => {
    if (!isFromCanvasMessage(data)) return null;
    return data.type === "select-section"
      ? { type: "select-section", id: data.sectionId }
      : data.type === "navigate"
        ? { type: "navigate", href: data.href }
        : data.type === "language"
          ? { type: "language", language: data.language }
          : { type: "ready" };
  },
};
