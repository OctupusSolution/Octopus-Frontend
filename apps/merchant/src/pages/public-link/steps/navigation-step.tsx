// Step 4 of the builder: where the pages chosen in step 3 actually appear in
// navigation, and how that navigation behaves. Structurally this follows
// pages-step.tsx: one card (here, two stacked) on the start side, a preview on
// the end side — except the previews here are the web header strip and the
// mobile drawer, shown side by side, rather than pages-step's single dark
// drawer mock.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Eye, EyeOff, Info } from "lucide-react";
import { Checkbox } from "@ui/primitives";
import { useI18n } from "@/app/providers/i18n-provider";
import { StorefrontPreview } from "@/widgets/storefront-preview";
import { PAGE_MODULES } from "../_shared/page-catalog";
import { previewModelFromSite } from "../_shared/preview-model";
import type { PageEntry, SiteAction, SiteDraft } from "../_shared/site-draft";
import { MobileDrawerPreview } from "../ui/nav-preview";
import { ReorderList } from "../ui/reorder-list";
import { Switch } from "../ui/switch";
import type { StepProps } from "../_shared/steps";

/** Module scope, not nested inside `NavigationStep`: a component redefined on
 *  every render would remount every row on every keystroke elsewhere on the
 *  page, dropping focus from whichever eye button or grip a merchant just
 *  used. */
function GlobalOptionRow({
  label,
  note,
  checked,
  onChange,
  connected = true,
}: {
  label: string;
  note: string;
  checked: boolean;
  onChange: () => void;
  /** Whether this toggle actually changes anything the merchant can see.
   *  `stickyHeader`, `activeIndicator` and `sameTab` have no consumer this
   *  build can honour without new model surface (final review finding F5) —
   *  rather than leave them silently dead under a banner promising instant
   *  updates, they carry this note so the control is honest about its own
   *  state. */
  connected?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-[12.5px] font-medium text-[var(--octo-text-primary)]">{label}</span>
        <span className="text-[11px] text-[var(--octo-text-muted)]">{note}</span>
        {!connected && (
          <span className="text-[10.5px] text-[var(--octo-text-faint)]">{t("publicLink.navigation.notConnectedYet")}</span>
        )}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/** Same module-scope rule as `GlobalOptionRow` above. The eye toggle sets
 *  `navigation.hidden`, which is deliberately distinct from the Pages step's
 *  `inNav` flag: this row stays in the order list either way, only the
 *  rendered header/drawer nav loses the item. */
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

  const Icon = module.icon;
  const label = t(module.labelKey);
  const eyeLabel = `${label} — ${t(hidden ? "publicLink.nav.showPage" : "publicLink.nav.hidePage")}`;

  return (
    <>
      {grip}
      <Icon size={14} className="shrink-0 text-[var(--octo-text-faint)]" />
      <span className="flex-1 truncate text-[12.5px] text-[var(--octo-text-primary)]">{label}</span>
      <button
        type="button"
        aria-label={eyeLabel}
        aria-pressed={hidden}
        onClick={() => dispatch({ type: "toggleNavHidden", id: page.id })}
        className="shrink-0 rounded p-1 text-[var(--octo-text-faint)] transition-colors hover:text-[var(--octo-text-secondary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D6EFD]/40"
      >
        {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </>
  );
}

// The storefront itself at desktop width, scaled down into the card, so the
// header reads exactly as the site will — sticky header, active underline,
// new-tab glyphs and hidden pages included — rather than a hand-drawn strip
// that could drift from the real page. Decorative, so aria-hidden.
const THUMB_SOURCE_WIDTH = 1100;

function ScaledSitePreview({ draft }: { draft: SiteDraft }) {
  const { t, locale } = useI18n();
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  const [innerHeight, setInnerHeight] = useState(THUMB_SOURCE_WIDTH);

  // A transformed element keeps its unscaled layout box, so the card's height
  // is set from the page's real height times the scale — otherwise it either
  // clips the footer or leaves a grey band beneath it.
  useEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;
    const observer = new ResizeObserver(() => {
      setScale(box.clientWidth / THUMB_SOURCE_WIDTH);
      setInnerHeight(inner.offsetHeight);
    });
    observer.observe(box);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={boxRef}
      aria-hidden
      style={{ height: Math.ceil(innerHeight * scale) }}
      className="relative overflow-hidden rounded-[10px] border border-[var(--octo-border-card)] bg-[var(--octo-page-bg)]"
    >
      <div
        ref={innerRef}
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

export function NavigationStep({ draft, dispatch }: StepProps) {
  const { t } = useI18n();
  const { navigation } = draft;

  const patchNav = (patch: Partial<Omit<SiteDraft["navigation"], "hidden">>) =>
    dispatch({ type: "patchNavigation", patch });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_540px]">
        {/* Start: Navigation Display + Global Options */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
            <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.navigation.display")}</p>
            <Checkbox
              checked={navigation.showInHeader}
              onChange={(e) => patchNav({ showInHeader: e.target.checked })}
              label={t("publicLink.navigation.showInHeader")}
            />
            <Checkbox
              checked={navigation.showInDrawer}
              onChange={(e) => patchNav({ showInDrawer: e.target.checked })}
              label={t("publicLink.navigation.showInDrawer")}
            />
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
            <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.navigation.globalOptions")}</p>
            <GlobalOptionRow
              label={t("publicLink.navigation.stickyHeader")}
              note={t("publicLink.navigation.stickyHeaderNote")}
              checked={navigation.stickyHeader}
              onChange={() => patchNav({ stickyHeader: !navigation.stickyHeader })}            />
            <GlobalOptionRow
              label={t("publicLink.navigation.activeIndicator")}
              note={t("publicLink.navigation.activeIndicatorNote")}
              checked={navigation.activeIndicator}
              onChange={() => patchNav({ activeIndicator: !navigation.activeIndicator })}            />
            <GlobalOptionRow
              label={t("publicLink.navigation.showIcons")}
              note={t("publicLink.navigation.showIconsNote")}
              checked={navigation.showIcons}
              onChange={() => patchNav({ showIcons: !navigation.showIcons })}
            />
            <GlobalOptionRow
              label={t("publicLink.navigation.sameTab")}
              note={t("publicLink.navigation.sameTabNote")}
              checked={navigation.sameTab}
              onChange={() => patchNav({ sameTab: !navigation.sameTab })}            />
          </div>
        </div>

        {/* Middle: Page Order */}
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.navigation.pageOrder")}</p>
          <ReorderList
            items={draft.pages}
            getId={(page) => page.id}
            getLabel={(page) => pageLabel(page, t)}
            onReorder={(pages) => dispatch({ type: "setPages", pages })}
            renderRow={(page, _index, grip) => (
              <PageOrderRow
                page={page}
                grip={grip}
                hidden={navigation.hidden.includes(page.id)}
                dispatch={dispatch}
              />
            )}
          />
          <p className="text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.navigation.pageOrderHint")}</p>
        </div>

        {/* End: the frame's Live Preview card — the site as it reads on the
            web, beside the phone drawer. */}
        <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] px-[18px] py-[15px]">
          <p className="text-[13px] font-semibold text-[var(--octo-text-primary)]">{t("publicLink.livePreview")}</p>
          <div className="grid grid-cols-[minmax(0,1fr)_148px] gap-3">
            <div className="flex min-w-0 flex-col gap-1.5">
              <p className="text-[11px] font-medium text-[var(--octo-text-muted)]">
                {t("publicLink.navigation.webPreviewCaption")}
              </p>
              <ScaledSitePreview draft={draft} />
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-medium text-[var(--octo-text-muted)]">
                {t("publicLink.navigation.mobilePreviewCaption")}
              </p>
              <MobileDrawerPreview draft={draft} />
            </div>
          </div>
          <p className="flex items-center gap-1.5 rounded-[10px] bg-[#0D6EFD]/5 px-3 py-2.5 text-[11.5px] text-[#0D6EFD]">
            <Info size={13} className="shrink-0" />
            {t("publicLink.navigation.updatesInstantly")}
          </p>
        </div>
      </div>
    </div>
  );
}
