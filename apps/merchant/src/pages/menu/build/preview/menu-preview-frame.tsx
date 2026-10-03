// "Live Preview — how it appears to your customers": the real storefront menu page, framed, drawn from the menu held in
// memory (draftMenuDocument), so every edit shows before Save. Falls back to the builder's own drawing (PreviewRail) when
// the storefront canvas does not answer within 8 s.
import { useMemo, useState } from "react";
import type { MenuRenderPayload } from "@octopus/api-client";
import { useMenuCurrency, type Menu } from "@/entities/menu";
import type { SiteDraft } from "@/entities/site-draft";
import { useI18n } from "@/app/providers/i18n-provider";
import { StorefrontFrame, type FrameDevice } from "@/widgets/storefront-frame";
import { PreviewCard, PreviewRail } from "../preview-rail";
import { canvasOrigin } from "./canvas-origin";
import { draftMenuDocument } from "./draft-menu-document";
import { MENU_CANVAS_CHANNEL } from "./menu-canvas-channel";

const TAG_KEYS: Record<string, string> = {
  "chef-recommended": "menuWiz.item.tag.chef",
  "top-selling": "menuWiz.item.tag.top",
  "most-ordered": "menuWiz.item.tag.most",
  "healthy-choice": "menuWiz.item.tag.healthy",
};
const MAX_CARD: Record<FrameDevice, number> = { desktop: Infinity, tablet: 520, mobile: 320 };

export interface MenuPreviewFrameProps {
  menu: Menu;
  /** The builder section being edited: outlined in the page. */
  selectedSectionId?: string | null;
  /** A section clicked in the page. */
  onSelectSection?: (sectionId: string) => void;
  /** "order" shows the site's add buttons and sticky cart. */
  mode?: "order" | "view";
  /** Fallback drawing only: the brand PreviewRail uses. */
  site?: SiteDraft;
  height?: number | string;
}

export function MenuPreviewFrame({ menu, selectedSectionId = null, onSelectSection, mode = "order", site, height = 760 }: MenuPreviewFrameProps) {
  const { t, locale } = useI18n();
  const currency = useMenuCurrency();
  const [device, setDevice] = useState<FrameDevice>("desktop");
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const origin = canvasOrigin();

  const { document, sectionIds } = useMemo(
    () =>
      draftMenuDocument(menu, {
        currency: currency.data ?? null,
        language: locale === "ar" ? "ar" : "en",
        tagLabel: (tag) => (TAG_KEYS[tag] ? t(TAG_KEYS[tag]) : tag),
      }),
    [menu, currency.data, locale, t]
  );
  const highlight = selectedSectionId ? sectionIds.indexOf(selectedSectionId) : -1;
  const selectable = Boolean(onSelectSection);
  const payload = useMemo<MenuRenderPayload>(
    () => ({ document, mode, selectable, highlightSectionRef: highlight >= 0 ? `s${highlight}` : null }),
    [document, mode, selectable, highlight]
  );

  if (failed) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-[11.5px] text-[var(--octo-text-muted)]">{t("menuWiz.preview.fallback")}</p>
        <PreviewRail menu={menu} composition="menu" site={site} />
      </div>
    );
  }

  return (
    <PreviewCard device={device} onDeviceChange={setDevice}>
      {/* The frames carry no "your real menu" badge; `ready` is still tracked
          so it can come back without rewiring the canvas. */}
      <div data-ready={ready || undefined}>
        <StorefrontFrame
          channel={MENU_CANVAS_CHANNEL}
          origin={origin}
          device={device}
          payload={payload}
          scrollRequest={null}
          onNavigate={() => undefined}
          onSelectSection={(ref) => {
            const match = /^s(\d+)$/.exec(ref);
            const id = match ? sectionIds[Number(match[1])] : undefined;
            if (id && onSelectSection) onSelectSection(id);
          }}
          onReady={() => setReady(true)}
          onUnavailable={() => setFailed(true)}
          height={height}
          maxCardWidth={MAX_CARD[device]}
          title={menu.name}
        />
      </div>
    </PreviewCard>
  );
}
