// Bridges the local SiteDraft (localStorage-backed, see use-site-draft.ts) to
// the Public Link API.
//
// The API keeps a draft site: a slug, a brand (display name, colour tokens, font
// codes, logo/favicon/hero media) and an ordered list of sections, each either a
// built-in block with opaque `content` or bound to another module's content
// (menu, reservation). Every draft change needs the site's `contentVersion` and
// answers with the new one, so writes are run strictly one after another.
//
// What maps and what does not:
//   - slug, business name, the four brand colours, typography, logo, favicon,
//     hero background   -> the API brand
//   - hero / testimonials / instagram sections -> built-in sections, the local
//     settings carried as the section's `content`
//   - menu / reservations sections -> bound to the matching content source
//   - pages, navigation, SEO, custom domain, offers/events sections -> stay local
//     (the API has no field for them yet; see docs/BACKEND_GAPS.md)
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  addDraftSection,
  checkSlugAvailability,
  getPublicLinkSite,
  getVersion as getSiteVersion,
  listColorTokens,
  listContentSources,
  listFonts,
  listVersions as listSiteVersions,
  publishSite,
  putSlug,
  removeDraftSection,
  reorderDraftSections,
  restoreSiteVersionToDraft,
  rollbackSiteToVersion,
  setDraftSectionEnabled,
  unpublishSite,
  updateDraftBrand,
  updateDraftSection,
  type ContentSourceResponse,
  type FontResponse,
  type PublicSitePublicationResponse,
  type PublicSiteResponse,
  type SectionJson,
  type VersionSummaryResponse,
} from "@octopus/api-client";
import { useAuth } from "@/app/providers/auth-provider";
import { useTenantConfig } from "@/app/providers/tenant-config-provider";
import { isLocalMedia, knownMedia, mediaUrl, uploadMedia } from "@/shared/api/media";
import type { SiteAction, SiteDraft } from "./site-draft";
import { FALLBACK_SITE_FONTS, toFontCode } from "./site-fonts";

const SYNC_DEBOUNCE_MS = 900;
const key = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export type RemoteSyncStatus = "disconnected" | "loading" | "synced" | "saving" | "error";

export interface ConnectableContent {
  sourceKey: string;
  contentKey: string;
  displayName: string;
}

export interface PublicLinkSync {
  status: RemoteSyncStatus;
  error: string | null;
  /** Publishes the draft, then reflects the result locally. */
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
  checkSlug: (slug: string) => Promise<{ isAvailable: boolean; reason: string | null }>;
  claimSlug: (slug: string) => Promise<void>;
  connectableContent: ConnectableContent[];
  /** Published history (BACKEND_GAPS 1b.11). `restoreVersion` brings a past
   *  version back as the draft (same posture as Floor Plan's history);
   *  `rollbackVersion` below is the explicit, confirmed "make live" path. */
  listVersions: () => Promise<VersionSummaryResponse[]>;
  restoreVersion: (version: number) => Promise<void>;
  /** One published version in full (`GET /versions/{v}`). */
  getVersion: (version: number) => Promise<PublicSitePublicationResponse>;
  /** Makes an older version live again as a new version (`POST /versions/{v}/rollback`).
   *  Publishes directly; the draft is left untouched. */
  rollbackVersion: (version: number) => Promise<void>;
  /** The font catalogue (`GET /fonts`); the backend defaults until it loads. */
  fonts: readonly FontResponse[];
}

// ---- mapping -------------------------------------------------------------------

/** The four local swatches, by the colour token each one sets. */
const COLOR_TOKENS = {
  primary: "core.primary",
  light: "background.surface",
  accent: "core.accent",
  dark: "text.heading",
} as const;

/** Local section id -> how the API represents it. */
type SectionMapping =
  | { kind: "builtin"; type: string }
  | { kind: "source"; sourceKey: string };

const SECTION_MAP: Record<string, SectionMapping> = {
  hero: { kind: "builtin", type: "hero" },
  testimonials: { kind: "builtin", type: "testimonials" },
  instagram: { kind: "builtin", type: "social-feed" },
  menu: { kind: "source", sourceKey: "menu" },
  reservations: { kind: "source", sourceKey: "reservation" },
  reservationsCta: { kind: "source", sourceKey: "reservation" },
};

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.problem?.detail ?? err.problem?.errorCode ?? err.message;
  return err instanceof Error ? err.message : "Unknown error";
}

/** Data URLs are far too large to store as section content; they stay local. */
function sanitize(settings: unknown): SectionJson {
  return JSON.parse(JSON.stringify(settings ?? {}, (_k, v) => (typeof v === "string" && v.startsWith("data:") ? null : v))) as SectionJson;
}

function settingsOf(draft: SiteDraft, id: string): unknown {
  const s = draft.sectionSettings;
  if (id === "hero") return s.hero;
  if (id === "generic") return s.generic;
  return s.generic[id] ?? {};
}

function applyRemote(dispatch: (action: SiteAction) => void, site: PublicSiteResponse): void {
  dispatch({ type: "patchSlug", slug: site.slug ?? "" });
  dispatch({ type: "patchBrand", patch: { businessName: site.brand.displayName ?? "" } });
  const c = site.brand.colors;
  dispatch({
    type: "patchColors",
    patch: {
      primary: c[COLOR_TOKENS.primary],
      light: c[COLOR_TOKENS.light],
      accent: c[COLOR_TOKENS.accent],
      dark: c[COLOR_TOKENS.dark],
    },
  });
  // Catalogue codes are stored as-is; an unset side keeps the local choice.
  const t = site.brand.typography;
  const pair = (titles: string | null, body: string | null) => ({
    ...(titles ? { titles } : {}),
    ...(body ? { body } : {}),
  });
  if (t.titleEnglish || t.bodyEnglish) {
    dispatch({
      type: "patchTypography",
      locale: "en",
      patch: pair(t.titleEnglish, t.bodyEnglish),
    });
  }
  if (t.titleArabic || t.bodyArabic) {
    dispatch({
      type: "patchTypography",
      locale: "ar",
      patch: pair(t.titleArabic, t.bodyArabic),
    });
  }
  dispatch({
    type: "patchPublish",
    patch: {
      published: site.status === "Live",
      publishedAt: site.lastPublishedAtUtc ? Date.parse(site.lastPublishedAtUtc) : null,
    },
  });
}

// ---- the hook --------------------------------------------------------------------

export function usePublicLinkSync(draft: SiteDraft, dispatch: (action: SiteAction) => void): PublicLinkSync {
  const { activeBusinessId: businessId } = useAuth();
  // The API refuses to publish without a display name; the business's own name
  // stands in until the merchant types one in the Brand step.
  const { activeBusiness } = useTenantConfig();
  const fallbackName = useRef<string | null>(null);
  fallbackName.current = activeBusiness?.businessName ?? null;
  const [status, setStatus] = useState<RemoteSyncStatus>(businessId ? "loading" : "disconnected");
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<ContentSourceResponse[]>([]);
  const [fonts, setFonts] = useState<readonly FontResponse[]>(FALLBACK_SITE_FONTS);
  const fontsRef = useRef(fonts);
  fontsRef.current = fonts;

  /** The latest server copy of the site (null until a slug has been claimed). */
  const site = useRef<PublicSiteResponse | null>(null);
  const loaded = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;

  /** Runs one job at a time; every write's answer becomes the next write's version. */
  const run = useCallback(<T,>(job: () => Promise<T>): Promise<T> => {
    const next = queue.current.then(job);
    queue.current = next.then(() => undefined, () => undefined);
    return next;
  }, []);

  const fail = useCallback((err: unknown) => {
    setError(errorMessage(err));
    setStatus("error");
  }, []);

  // Hydrate: the server is the source of truth for whatever it holds.
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setStatus("loading");
    (async () => {
      const [content, catalogue] = await Promise.all([
        listContentSources(businessId).catch(() => [] as ContentSourceResponse[]),
        // A failed catalogue read keeps the fallback list rather than blocking the builder.
        listFonts(businessId).catch(() => null),
      ]);
      if (cancelled) return;
      setSources(content);
      if (catalogue && catalogue.length > 0) setFonts(catalogue);
      try {
        const remote = await getPublicLinkSite(businessId);
        if (cancelled) return;
        site.current = remote;
        applyRemote(dispatch, remote);
      } catch (err) {
        // 404: no site yet — it is created when a slug is first claimed.
        if (!(err instanceof ApiError && err.status === 404)) throw err;
      }
      loaded.current = true;
      setStatus("synced");
    })().catch((err) => !cancelled && fail(err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  /** Sends the brand and the sections in one pass; a no-op until a site exists.
   *  Resolves to the first image-upload failure (if any): a failed image keeps
   *  the previously saved one so the rest of the brand and the sections still save. */
  const push = useCallback(async (): Promise<unknown> => {
    if (!businessId || !site.current) return null;
    const d = draftRef.current;
    let current = site.current;
    let uploadError: unknown = null;

    // Brand: a full replace, so keep whatever colours the server already has.
    const colors = { ...current.brand.colors };
    (Object.keys(COLOR_TOKENS) as (keyof typeof COLOR_TOKENS)[]).forEach((k) => {
      if (d.brand.colors[k]) colors[COLOR_TOKENS[k]] = d.brand.colors[k];
    });
    const media = async (src: string | null, purpose: "Logo" | "Favicon" | "HeroBackground", existing: { assetId: string; kind: string } | null) => {
      let known = knownMedia(src);
      if (isLocalMedia(src)) {
        try {
          const up = await uploadMedia(businessId, src, purpose, `${purpose}.png`, "site");
          return { assetId: up.ref.assetId, kind: (up.ref.kind === "Video" ? "Video" : "Image") as "Image" | "Video" };
        } catch (err) {
          uploadError ??= err;
          known = null;
        }
      }
      const ref = known ?? existing;
      return ref ? { assetId: ref.assetId, kind: (ref.kind === "Video" ? "Video" : "Image") as "Image" | "Video" } : null;
    };
    // The backend rejects unknown codes (publiclink.brand.unknown-font), so a
    // value outside the catalogue is sent as unset rather than failing the save.
    const font = (value: string) => {
      const code = toFontCode(value);
      return fontsRef.current.some((f) => f.code === code) ? code : null;
    };
    current = await updateDraftBrand(businessId, current.contentVersion, {
      displayName: d.brand.businessName || fallbackName.current || null,
      colors,
      typography: {
        titleEnglish: font(d.brand.typography.en.titles),
        bodyEnglish: font(d.brand.typography.en.body),
        titleArabic: font(d.brand.typography.ar.titles),
        bodyArabic: font(d.brand.typography.ar.body),
      },
      logo: await media(d.brand.logoDataUrl, "Logo", current.brand.logo),
      favicon: await media(d.brand.faviconDataUrl, "Favicon", current.brand.favicon),
      heroBackground: await media(d.brand.heroPatternDataUrl, "HeroBackground", current.brand.heroBackground),
    });

    // Sections: one API section per mapped local section, matched by type.
    const wanted = d.sections
      .map((s) => ({ entry: s, map: SECTION_MAP[s.id] }))
      .filter((w): w is { entry: (typeof d.sections)[number]; map: SectionMapping } => Boolean(w.map));
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const { entry, map } of wanted) {
      const type = map.kind === "builtin" ? map.type : map.sourceKey;
      if (seen.has(type)) continue;
      seen.add(type);
      const existing = current.sections.find((sec) => sec.type === type);
      const content = map.kind === "builtin" ? sanitize(settingsOf(d, entry.id)) : null;
      if (existing) {
        if (map.kind === "builtin" && JSON.stringify(existing.content) !== JSON.stringify(content)) {
          current = await updateDraftSection(businessId, existing.sectionId, current.contentVersion, { content });
        }
        if (existing.enabled !== entry.enabled) {
          current = await setDraftSectionEnabled(businessId, existing.sectionId, current.contentVersion, entry.enabled);
        }
        ordered.push(existing.sectionId);
        continue;
      }
      let input: Parameters<typeof addDraftSection>[2];
      if (map.kind === "builtin") input = { type: map.type, content };
      else {
        const item = sourcesRef.current.find((s) => s.sourceKey === map.sourceKey)?.items[0];
        if (!item) continue; // nothing to bind to yet (e.g. no published menu)
        input = { type: map.sourceKey, sourceKey: map.sourceKey, contentKey: item.contentKey };
      }
      current = await addDraftSection(businessId, current.contentVersion, input);
      const added = current.sections.find((sec) => sec.type === type);
      if (added) {
        if (!entry.enabled) current = await setDraftSectionEnabled(businessId, added.sectionId, current.contentVersion, false);
        ordered.push(added.sectionId);
      }
    }
    // Server sections the local draft no longer has.
    for (const sec of current.sections) {
      if (!ordered.includes(sec.sectionId) && Object.values(SECTION_MAP).some((m) => (m.kind === "builtin" ? m.type : m.sourceKey) === sec.type)) {
        current = await removeDraftSection(businessId, sec.sectionId, current.contentVersion);
      }
    }
    const currentOrder = current.sections.map((sec) => sec.sectionId);
    const keptOrder = ordered.filter((id) => currentOrder.includes(id));
    const rest = currentOrder.filter((id) => !keptOrder.includes(id));
    const target = [...keptOrder, ...rest];
    if (target.length > 1 && target.join() !== currentOrder.join()) {
      current = await reorderDraftSections(businessId, current.contentVersion, target);
    }
    site.current = current;
    return uploadError;
  }, [businessId]);

  // Debounced sync of everything the API stores.
  const timer = useRef<number | null>(null);
  const fingerprint = JSON.stringify([draft.brand, draft.sections, draft.sectionSettings.hero]);
  useEffect(() => {
    if (!businessId || !loaded.current || !site.current) return;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setStatus("saving");
      run(push).then((uploadError) => (uploadError ? fail(uploadError) : setStatus("synced")), fail);
    }, SYNC_DEBOUNCE_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [businessId, fingerprint, run, push, fail]);

  const publish = useCallback(async () => {
    if (!businessId) {
      dispatch({ type: "patchPublish", patch: { published: true, publishedAt: Date.now() } });
      return;
    }
    setStatus("saving");
    try {
      const uploadError = await run(async () => {
        const failed = await push();
        if (!site.current) throw new Error("Choose a public link (slug) before publishing.");
        const res = await publishSite(businessId, site.current.contentVersion, key());
        site.current = res.site;
        applyRemote(dispatch, res.site);
        return failed;
      });
      if (uploadError) fail(uploadError);
      else setStatus("synced");
    } catch (err) {
      fail(err);
      throw err;
    }
  }, [businessId, dispatch, run, push, fail]);

  const unpublish = useCallback(async () => {
    if (!businessId) {
      dispatch({ type: "patchPublish", patch: { published: false, publishedAt: null } });
      return;
    }
    setStatus("saving");
    try {
      await run(async () => {
        const res = await unpublishSite(businessId);
        site.current = res;
        applyRemote(dispatch, res);
      });
      setStatus("synced");
    } catch (err) {
      fail(err);
      throw err;
    }
  }, [businessId, dispatch, run, fail]);

  const listVersions = useCallback(async (): Promise<VersionSummaryResponse[]> => {
    if (!businessId) return [];
    const res = await listSiteVersions(businessId, { page: 1, pageSize: 50 });
    return res.items;
  }, [businessId]);

  const restoreVersion = useCallback(
    async (version: number): Promise<void> => {
      if (!businessId) throw new Error("No active business");
      setStatus("saving");
      try {
        await run(async () => {
          const res = await restoreSiteVersionToDraft(businessId, version, site.current?.contentVersion ?? 0, key());
          site.current = res;
          applyRemote(dispatch, res);
        });
        setStatus("synced");
      } catch (err) {
        fail(err);
        throw err;
      }
    },
    [businessId, dispatch, run, fail]
  );

  const getVersion = useCallback(
    async (version: number): Promise<PublicSitePublicationResponse> => {
      if (!businessId) throw new Error("No active business");
      return getSiteVersion(businessId, version);
    },
    [businessId]
  );

  const rollbackVersion = useCallback(
    async (version: number): Promise<void> => {
      if (!businessId) throw new Error("No active business");
      setStatus("saving");
      try {
        await run(async () => {
          if (!site.current) throw new Error("Choose a public link (slug) first.");
          await rollbackSiteToVersion(businessId, version, site.current.contentVersion, key());
          // Rollback answers with the publication only; re-read the site for
          // its new live pointer. The draft is untouched server-side, so only
          // the publish state is reflected locally (unsynced edits stay).
          const fresh = await getPublicLinkSite(businessId);
          site.current = fresh;
          dispatch({
            type: "patchPublish",
            patch: {
              published: fresh.status === "Live",
              publishedAt: fresh.lastPublishedAtUtc ? Date.parse(fresh.lastPublishedAtUtc) : null,
            },
          });
        });
        setStatus("synced");
      } catch (err) {
        fail(err);
        throw err;
      }
    },
    [businessId, dispatch, run, fail]
  );

  const checkSlug = useCallback(
    async (slug: string) => {
      if (!businessId) return { isAvailable: true, reason: null };
      const res = await checkSlugAvailability(businessId, slug);
      return { isAvailable: res.isAvailable, reason: res.reason };
    },
    [businessId]
  );

  const claimSlug = useCallback(
    async (slug: string) => {
      if (!businessId) {
        dispatch({ type: "patchSlug", slug });
        return;
      }
      setStatus("saving");
      try {
        await run(async () => {
          const res = await putSlug(businessId, slug);
          site.current = res;
          dispatch({ type: "patchSlug", slug: res.slug ?? slug });
        });
        setStatus("synced");
        // The site exists now, so the brand and sections chosen so far can go up.
        void run(push).then((uploadError) => uploadError && fail(uploadError), fail);
      } catch (err) {
        fail(err);
        throw err;
      }
    },
    [businessId, dispatch, run, push, fail]
  );

  const connectableContent = sources.flatMap((s) =>
    s.items.map((i) => ({ sourceKey: s.sourceKey, contentKey: i.contentKey, displayName: i.displayName }))
  );

  return {
    status,
    error,
    publish,
    unpublish,
    checkSlug,
    claimSlug,
    connectableContent,
    listVersions,
    restoreVersion,
    getVersion,
    rollbackVersion,
    fonts,
  };
}
