// Step 4 of the builder: where the pages chosen in step 3 actually appear in
// navigation, and how that navigation behaves. Drawn to the Figma "Public
// Link-step 4" frame: two cards on the start side (Navigation Display, Global
// Options), the Page Order list in the middle, and on the end side the Live
// Preview card — the web page beside the mobile drawer — with its note under.
import { useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { StorefrontPreview, type PreviewDevice } from "@/widgets/storefront-preview";
import { PAGE_MODULES } from "../_shared/page-catalog";
import { previewModelFromSite } from "../_shared/preview-model";
import type { PageEntry, SiteAction, SiteDraft } from "../_shared/site-draft";
import { usePlText } from "../_shared/texts";
import { PlInfoBanner, plPanel, plText } from "../ui/kit";
import { MobileDrawerPreview, PlPageIcon } from "../ui/nav-preview";
import { ReorderHint, ReorderList } from "../ui/reorder-list";
import { SitePreview } from "../ui/site-preview";
import type { StepProps } from "../_shared/steps";
import {
  FooterCard,
  NAV_CARD,
  NAV_ICON_BUTTON,
  NAV_ROWS,
  NavCheckbox,
  NavEye,
  NavigationDisplayCard,
  NavigationItemsCard,
  NavListHeading,
  NavOptionRow,
} from "./connected/navigation-panel";

/** Module scope, not nested inside `NavigationStep`: a component redefined on
 *  every render would remount every row on every keystroke elsewhere on the
 *  page, dropping focus from whichever eye button or grip a merchant just
 *  used. The eye toggle sets `navigation.hidden`, which is deliberately
 *  distinct from the Pages step's `inNav` flag: this row stays in the order
 *  list either way, only the rendered header/drawer nav loses the item. */
function PageOrderRow({
  page,
  grip,
  hidden,
  dispatch,
}: {
  page: PageEntry;
  grip: ReactNode;
  hidden: boolean;
  dispatch: (action: SiteAction) => void;
}) {
  const { t } = useI18n();
  const module = PAGE_MODULES.find((m) => m.id === page.id);
  if (!module) return null;

  const label = t(module.labelKey);
  const eyeLabel = `${label} — ${t(hidden ? "publicLink.nav.showPage" : "publicLink.nav.hidePage")}`;

  return (
    <>
      {grip}
      <PlPageIcon id={page.id} className="text-[var(--pl-text)]" />
      <span className={clsx(plText.h6, "min-w-0 flex-1 truncate py-px")}>{label}</span>
      <button
        type="button"
        aria-label={eyeLabel}
        aria-pressed={hidden}
        onClick={() => dispatch({ type: "toggleNavHidden", id: page.id })}
        className={NAV_ICON_BUTTON}
      >
        <NavEye hidden={hidden} />
      </button>
    </>
  );
}

// The storefront itself at desktop width, scaled down into the frame's 253px
// tall, 20px-radius tile, so the header reads exactly as the site will —
// sticky header, active underline, new-tab glyphs and hidden pages included —
// rather than a hand-drawn strip that could drift from the real page. The tile
// shows the top of the page and clips the rest, as the frame's thumbnail does.
// Decorative, so aria-hidden.
const THUMB_SOURCE_WIDTH = 1100;

function ScaledSitePreview({ draft }: { draft: SiteDraft }) {
  const { t, locale } = useI18n();
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.18);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => setScale(box.clientWidth / THUMB_SOURCE_WIDTH));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      aria-hidden
      className="relative h-[253px] w-full overflow-hidden rounded-[20px] bg-[var(--pl-surface)] shadow-[0_0_8px_rgba(0,0,0,0.08)]"
    >
      <div
        className="absolute start-0 top-0 origin-top-left rtl:origin-top-right"
        style={{ width: THUMB_SOURCE_WIDTH, transform: `scale(${scale})` }}
      >
        <StorefrontPreview model={previewModelFromSite(draft, "desktop", t, locale)} />
      </div>
    </div>
  );
}

function pageLabel(page: PageEntry, t: (key: string) => string): string {
  const module = PAGE_MODULES.find((m) => m.id === page.id);
  return module ? t(module.labelKey) : page.id;
}

const PREVIEW_CAPTION = "whitespace-nowrap text-[12px] font-medium leading-[12px] text-[var(--pl-text)]";

export function NavigationStep({ draft, dispatch, publicLinkSync }: StepProps) {
  const { t } = useI18n();
  const tx = usePlText();
  const { navigation } = draft;
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const connected = publicLinkSync.connected;

  const patchNav = (patch: Partial<Omit<SiteDraft["navigation"], "hidden">>) =>
    dispatch({ type: "patchNavigation", patch });

  return (
    <div className="flex flex-col gap-4">
      <div
        className={clsx(
          "grid items-start gap-4",
          // The frame's 286 / 464 / 367 columns; connected, the end column
          // holds the live storefront, which needs the wider slot it had.
          connected ? "xl:grid-cols-[286px_minmax(0,1fr)_540px]" : "xl:grid-cols-[286px_minmax(0,1fr)_367px]"
        )}
      >
        {connected ? (
          <NavigationDisplayCard sync={publicLinkSync} />
        ) : (
          /* Start: Navigation Display + Global Options */
          <div className="flex flex-col gap-3">
            <div className={NAV_CARD}>
              <p className={plText.h5}>{t("publicLink.navigation.display")}</p>
              <div className="flex flex-col gap-3">
                <NavCheckbox
                  checked={navigation.showInHeader}
                  onChange={(checked) => patchNav({ showInHeader: checked })}
                  label={tx("pl.navigation.showInHeader")}
                />
                <NavCheckbox
                  checked={navigation.showInDrawer}
                  onChange={(checked) => patchNav({ showInDrawer: checked })}
                  label={tx("pl.navigation.showInDrawer")}
                />
              </div>
            </div>

            <div className={NAV_CARD}>
              <p className={plText.h5}>{t("publicLink.navigation.globalOptions")}</p>
              <div className="flex flex-col gap-6">
                <NavOptionRow
                  label={t("publicLink.navigation.stickyHeader")}
                  note={tx("pl.navigation.stickyHeaderNote")}
                  checked={navigation.stickyHeader}
                  onChange={() => patchNav({ stickyHeader: !navigation.stickyHeader })}
                />
                <NavOptionRow
                  label={tx("pl.navigation.activeIndicator")}
                  note={tx("pl.navigation.activeIndicatorNote")}
                  checked={navigation.activeIndicator}
                  onChange={() => patchNav({ activeIndicator: !navigation.activeIndicator })}
                />
                <NavOptionRow
                  label={tx("pl.navigation.showIcons")}
                  note={tx("pl.navigation.showIconsNote")}
                  checked={navigation.showIcons}
                  onChange={() => patchNav({ showIcons: !navigation.showIcons })}
                />
                <NavOptionRow
                  label={tx("pl.navigation.sameTab")}
                  note={tx("pl.navigation.sameTabNote")}
                  checked={navigation.sameTab}
                  onChange={() => patchNav({ sameTab: !navigation.sameTab })}
                />
              </div>
            </div>
          </div>
        )}

        {connected ? (
          <NavigationItemsCard sync={publicLinkSync} />
        ) : (
          /* Middle: Page Order */
          <div className="flex min-w-0 flex-col gap-3">
            <NavListHeading title={t("publicLink.navigation.pageOrder")} hint={t("publicLink.navigation.pageOrderHint")} />
            <ReorderList
              items={draft.pages}
              getId={(page) => page.id}
              getLabel={(page) => pageLabel(page, t)}
              onReorder={(pages) => dispatch({ type: "setPages", pages })}
              className={NAV_ROWS}
              renderRow={(page, _index, grip) => (
                <PageOrderRow page={page} grip={grip} hidden={navigation.hidden.includes(page.id)} dispatch={dispatch} />
              )}
            />
            <ReorderHint>{tx("pl.navigation.dragHint")}</ReorderHint>
            <PlInfoBanner className="py-2">{tx("pl.navigation.tip")}</PlInfoBanner>
          </div>
        )}

        {/* End: the frame's Live Preview card — the site as it reads on the
            web, beside the phone drawer. Connected, the live storefront itself:
            its header, drawer (mobile) and footer follow every change here. */}
        <div className="flex min-w-0 flex-col gap-4">
          {connected ? (
            <SitePreview draft={draft} dispatch={dispatch} sync={publicLinkSync} device={device} onDevice={setDevice} height={520} />
          ) : (
            <div className={clsx(plPanel, "flex min-w-0 flex-col gap-6 px-4 py-6")}>
              <p className={plText.h5}>{t("publicLink.livePreview")}</p>
              <div className="flex items-start justify-between gap-[10px]">
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <p className={PREVIEW_CAPTION}>{t("publicLink.navigation.webPreviewCaption")}</p>
                  <ScaledSitePreview draft={draft} />
                </div>
                <div className="flex w-[132px] shrink-0 flex-col items-center gap-3">
                  <p className={PREVIEW_CAPTION}>{t("publicLink.navigation.mobilePreviewCaption")}</p>
                  <MobileDrawerPreview draft={draft} />
                </div>
              </div>
            </div>
          )}
          <PlInfoBanner className="py-2">{tx("pl.navigation.updatesInstantly")}</PlInfoBanner>
        </div>
      </div>
      {connected && <FooterCard sync={publicLinkSync} />}
    </div>
  );
}
