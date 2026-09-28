// The connected builder's live preview. It shows the merchant's real storefront, framed
// (storefront-frame.tsx): the draft — server copy plus every unsaved edit — is projected into the
// storefront's own public read shapes (draftPublicRead) and posted to its canvas on every change. When
// the storefront cannot be reached (no address yet, server down, origin not allowed) it falls back
// to the in-app mirror (live-site-canvas.tsx), fed from the same projection.
//
// The card chooses the device, the language (any the site offers) and the page (the builder's
// selected page; clicking a link in the preview changes it). Clicking a section in the framed site
// selects it for editing, and the selected section is outlined there.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Globe, Monitor, Smartphone, Tablet } from "lucide-react";
import { previewMenuDraft, type BuilderMenuDocument } from "@octopus/api-client";
import type { Locale } from "@i18n/index";
import { Card, Segmented } from "@ui/primitives";
import { useAuth } from "@/app/providers/auth-provider";
import { I18nScope, useI18n } from "@/app/providers/i18n-provider";
import { ensureFontLoaded, type PublicLinkSync, type SiteAction, type SiteDraft } from "@/entities/site-draft";
import { mediaUrl } from "@/shared/api/media";
import { storefrontAsset } from "@/shared/lib/storefront-assets";
import { draftPublicRead, liveSiteFromRead, mediaIdsOf, type LiveMenu } from "../_shared/live-site";
import { builderMenuDocument, menuFromDocument, menuMediaIds } from "../_shared/preview-menu";
import { storefrontOrigin } from "../_shared/preview-url";
import { LiveSiteCanvas, VIEWPORT_WIDTH, type LiveDevice } from "./live-site-canvas";
import { StorefrontFrame } from "./storefront-frame";

const DEVICE_ICON: Readonly<Record<LiveDevice, typeof Monitor>> = { desktop: Monitor, tablet: Tablet, mobile: Smartphone };
const DEVICE_LABEL_KEY: Readonly<Record<LiveDevice, string>> = {
  desktop: "publicLink.device.desktop",
  tablet: "publicLink.device.tablet",
  mobile: "publicLink.device.mobile",
};
/** How wide a phone or tablet is drawn inside the card, at most (CSS px of the card). */
const DEVICE_MAX_CARD_WIDTH: Readonly<Record<LiveDevice, number>> = { desktop: Infinity, tablet: 520, mobile: 300 };
const DEFAULT_DEVICES: readonly LiveDevice[] = ["desktop", "tablet", "mobile"];

// ---- menus ----------------------------------------------------------------------------------------

/** One read per menu and language for the whole session; a failed read shows no menu, as the storefront does. */
const menuJobs = new Map<string, Promise<BuilderMenuDocument | null>>();

function loadMenuDocument(businessId: string, menuId: string, lang: string): Promise<BuilderMenuDocument | null> {
  const key = `${businessId}|${menuId}|${lang}`;
  let job = menuJobs.get(key);
  if (!job) {
    job = (async () => {
      const doc = await previewMenuDraft(businessId, menuId, { lang });
      const urls = new Map<string, string>();
      await Promise.all(
        menuMediaIds(doc).map(async (id) => {
          const url = await mediaUrl(businessId, { assetId: id, kind: "Image" }, "menu").catch(() => null);
          if (url) urls.set(id, url);
        })
      );
      return builderMenuDocument(doc, (id) => urls.get(id) ?? null);
    })().catch(() => {
      menuJobs.delete(key);
      return null;
    });
    menuJobs.set(key, job);
  }
  return job;
}

// ---- the frame ------------------------------------------------------------------------------------

export interface LivePreviewFrameProps {
  sync: PublicLinkSync;
  draft: SiteDraft;
  dispatch: (action: SiteAction) => void;
  device: LiveDevice;
  onDevice: (device: LiveDevice) => void;
  devices?: readonly LiveDevice[];
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Height of the scrolling viewport (CSS px of the card, or any CSS length). */
  height?: number | string;
  /** Drop the card chrome (the site preview modal draws its own). */
  bare?: boolean;
  /** The section being edited: outlined and brought into view in the framed site. */
  selectedSectionId?: string | null;
  /** A section clicked in the framed site. */
  onSelectSection?: (sectionId: string) => void;
}

export function LivePreviewFrame({
  sync,
  draft,
  dispatch,
  device,
  onDevice,
  devices = DEFAULT_DEVICES,
  title,
  subtitle,
  actions,
  height = 560,
  bare = false,
  selectedSectionId = null,
  onSelectSection,
}: LivePreviewFrameProps) {
  const { t } = useI18n();
  const { activeBusinessId: businessId } = useAuth();
  const server = sync.server!;
  const [language, setLanguage] = useState(sync.editLanguage);
  const [docs, setDocs] = useState<Record<string, BuilderMenuDocument | null>>({});
  const viewportRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(0);
  const [pendingHash, setPendingHash] = useState<string | null>(null);
  const [scrollRequest, setScrollRequest] = useState<{ anchor: string; id: number } | null>(null);
  const [frameFailed, setFrameFailed] = useState(false);
  const [frameReady, setFrameReady] = useState(false);

  // A language the site stops offering falls back to the one being edited.
  const enabled = server.overview.settings.enabledLanguages;
  useEffect(() => {
    if (!enabled.includes(language)) setLanguage(sync.editLanguage);
  }, [enabled, language, sync.editLanguage]);

  const pageId = draft.selectedPageId && server.overview.pages.some((p) => p.pageId === draft.selectedPageId) ? draft.selectedPageId : null;

  const read = useMemo(
    () => draftPublicRead({ server, draft, edits: sync.previewEdits, pageId, language, mediaUrls: sync.mediaUrls, fonts: sync.fonts }),
    [server, draft, sync.previewEdits, pageId, language, sync.mediaUrls, sync.fonts]
  );
  const site = useMemo(() => liveSiteFromRead(read, sync.fonts), [read, sync.fonts]);

  // The storefront to frame: the claimed address (or the dev storefront); none -> the mirror.
  const origin = useMemo(
    () =>
      storefrontOrigin({
        host: server.overview.address.hostname,
        slug: server.overview.address.slug ?? draft.slug,
        currentHostname: typeof window === "undefined" ? "" : window.location.hostname,
      }),
    [server.overview.address.hostname, server.overview.address.slug, draft.slug]
  );
  useEffect(() => {
    setFrameFailed(false);
    setFrameReady(false);
  }, [origin]);
  const framed = Boolean(origin) && !frameFailed;

  // The page shown has to be loaded (only Home is read up front) — asked for once.
  const wantedId = pageId ?? server.overview.pages.find((p) => p.isHome)?.pageId ?? null;
  const { loadPage, siteMediaUrl } = sync;
  const asked = useRef(new Set<string>());
  useEffect(() => {
    if (!wantedId || server.pages[wantedId] || asked.current.has(`page:${wantedId}`)) return;
    asked.current.add(`page:${wantedId}`);
    void loadPage(wantedId).catch(() => asked.current.delete(`page:${wantedId}`));
  }, [wantedId, server.pages, loadPage]);

  // Media on the shown page (saved or still being edited) resolves to delivery URLs, once per asset.
  useEffect(() => {
    const page = wantedId ? server.pages[wantedId] : undefined;
    if (!page) return;
    const ids = new Set<string>();
    for (const s of page.sections) {
      mediaIdsOf(s.fields, ids);
      mediaIdsOf(sync.previewEdits[s.sectionId]?.fields, ids);
    }
    for (const id of ids) {
      if (sync.mediaUrls[id] || asked.current.has(`media:${id}`)) continue;
      asked.current.add(`media:${id}`);
      void siteMediaUrl(id);
    }
  }, [wantedId, server.pages, sync.previewEdits, sync.mediaUrls, siteMediaUrl]);

  // The menus the shown page binds (by content key = publicLinkKey), kept per language.
  const menuKey = [...new Set((read.page?.sections ?? []).filter((s) => s.source?.sourceKey === "menu" && s.source.publicLinkKey).map((s) => s.source!.publicLinkKey!))].join(",");
  useEffect(() => {
    if (!businessId || !menuKey) return;
    let cancelled = false;
    for (const id of menuKey.split(",")) {
      void loadMenuDocument(businessId, id, read.shell.language).then((doc) => {
        if (!cancelled) setDocs((prev) => ({ ...prev, [`${read.shell.language}|${id}`]: doc }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [businessId, menuKey, read.shell.language]);
  const shownDocs = useMemo(() => {
    const out: Record<string, BuilderMenuDocument | null> = {};
    const prefix = `${read.shell.language}|`;
    for (const [key, doc] of Object.entries(docs)) if (key.startsWith(prefix)) out[key.slice(prefix.length)] = doc;
    return out;
  }, [docs, read.shell.language]);
  const shownMenus = useMemo(() => {
    const out: Record<string, LiveMenu | null> = {};
    for (const [key, doc] of Object.entries(shownDocs)) out[key] = doc ? menuFromDocument(doc, storefrontAsset("all.png")) : null;
    return out;
  }, [shownDocs]);

  const payload = useMemo(
    () => ({ shell: read.shell, page: read.page, pageLoading: read.pageLoading, menus: shownDocs, highlightSectionId: selectedSectionId, selectable: Boolean(onSelectSection) }),
    [read, shownDocs, selectedSectionId, onSelectSection]
  );

  // The mirror's faces (the framed storefront loads its own).
  useEffect(() => {
    if (framed) return;
    if (site.fontName) ensureFontLoaded(site.fontName);
    if (site.headingFontName) ensureFontLoaded(site.headingFontName);
    if (site.direction === "rtl") ensureFontLoaded("IBM Plex Sans Arabic");
  }, [framed, site.fontName, site.headingFontName, site.direction]);

  // Mirror scale: the card's width against the device's viewport.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setCardWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [framed]);
  const drawnWidth = Math.min(cardWidth, DEVICE_MAX_CARD_WIDTH[device]);
  const zoom = drawnWidth > 0 ? drawnWidth / VIEWPORT_WIDTH[device] : 0;

  // Mirror: a device or page switch starts from the top; an anchor link scrolls to its section.
  useEffect(() => {
    viewportRef.current?.scrollTo({ top: 0 });
  }, [device, site.page?.pageId]);
  useEffect(() => {
    if (!pendingHash || !site.page) return;
    const target = viewportRef.current?.querySelector<HTMLElement>(`[id="${CSS.escape(pendingHash)}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setPendingHash(null);
    }
  }, [pendingHash, site.page, shownMenus]);

  /** A link clicked in the preview: open that page of the site (and its anchor); anything else is ignored. */
  function navigate(href: string) {
    const [path, hash] = href.split("#");
    const target = site.pages.find((p) => p.path === (path || site.page?.path || "/"));
    if (!target) return;
    if (target.pageId !== site.page?.pageId) dispatch({ type: "selectPage", pageId: target.pageId });
    if (hash) {
      setPendingHash(hash);
      setScrollRequest({ anchor: hash, id: Date.now() });
    } else if (target.pageId === site.page?.pageId) {
      viewportRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      setScrollRequest({ anchor: "", id: Date.now() });
    }
  }

  const scopeLocale: Locale = site.language === "ar" ? "ar" : "en";

  const mirror = (
    <div ref={viewportRef} className="octo-scroll relative overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--octo-border-card)] bg-[#f7f8fa]" style={{ height }}>
      {zoom > 0 && (
        <div className="mx-auto" style={{ width: VIEWPORT_WIDTH[device], zoom }}>
          <I18nScope locale={scopeLocale}>
            <LiveSiteCanvas key={`${device}-${site.language}`} site={site} device={device} menus={shownMenus} onNavigate={navigate} onLanguage={(code) => setLanguage(code)} />
          </I18nScope>
        </div>
      )}
    </div>
  );

  const canvas =
    framed && origin ? (
      <StorefrontFrame
        origin={origin}
        device={device}
        payload={payload}
        scrollRequest={scrollRequest}
        onNavigate={navigate}
        onLanguage={(code) => setLanguage(code)}
        onSelectSection={onSelectSection}
        onReady={() => setFrameReady(true)}
        onUnavailable={() => setFrameFailed(true)}
        height={height}
        maxCardWidth={DEVICE_MAX_CARD_WIDTH[device]}
        title={site.brandName || t("publicLink.livePreview")}
      />
    ) : (
      <div className="flex flex-col gap-2">
        {origin && frameFailed && <p className="text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.live.fallback")}</p>}
        {!origin && <p className="text-[11px] text-[var(--octo-text-muted)]">{t("publicLink.live.noAddress")}</p>}
        {mirror}
      </div>
    );

  const controls = (
    <div className="flex flex-wrap items-center gap-2">
      {site.pages.length > 1 && (
        <label className="flex h-8 max-w-[180px] items-center rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] pe-1 ps-2 text-[12px] text-[var(--octo-text-primary)]">
          <span className="sr-only">{t("publicLink.live.page")}</span>
          <select
            value={site.page?.pageId ?? wantedId ?? ""}
            onChange={(e) => dispatch({ type: "selectPage", pageId: e.target.value })}
            className="min-w-0 cursor-pointer truncate bg-transparent pe-1 text-[12px] font-medium focus:outline-none"
          >
            {site.pages.map((p) => (
              <option key={p.pageId} value={p.pageId}>
                {p.title || p.path}
              </option>
            ))}
          </select>
        </label>
      )}
      {devices.length > 1 && (
        <Segmented
          options={devices.map((id) => {
            const Icon = DEVICE_ICON[id];
            return {
              id,
              label: (
                <>
                  <Icon size={14} />
                  <span className="sr-only">{t(DEVICE_LABEL_KEY[id])}</span>
                </>
              ),
            };
          })}
          value={device}
          onChange={(id) => onDevice(id as LiveDevice)}
        />
      )}
      {actions}
      {enabled.length > 1 && (
        <label className="flex h-8 items-center gap-1 rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] pe-1 ps-2 text-[12px] text-[var(--octo-text-primary)]">
          <Globe size={13} className="shrink-0 text-[var(--octo-text-muted)]" aria-hidden />
          <span className="sr-only">{t("publicLink.preview.language")}</span>
          <select value={site.language} onChange={(e) => setLanguage(e.target.value)} className="cursor-pointer bg-transparent pe-1 text-[12px] font-medium focus:outline-none">
            {enabled.map((code) => (
              <option key={code} value={code}>
                {code.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );

  if (bare) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex justify-end">{controls}</div>
        {canvas}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="flex items-center gap-2 text-[13px] font-medium text-[var(--octo-text-primary)]">
            {title ?? t("publicLink.livePreview")}
            <span className="inline-flex items-center gap-1 rounded-full bg-[#16a34a]/10 px-2 py-0.5 text-[10.5px] font-semibold text-[#16a34a]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" aria-hidden />
              {framed && frameReady ? t("publicLink.live.connected") : t("publicLink.live.badge")}
            </span>
          </p>
          {subtitle && <p className="text-[11.5px] text-[var(--octo-text-muted)]">{subtitle}</p>}
        </div>
        {controls}
      </div>
      <div className="mt-4">{canvas}</div>
    </Card>
  );
}
