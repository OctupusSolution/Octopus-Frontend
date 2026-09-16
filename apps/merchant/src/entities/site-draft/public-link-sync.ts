// Bridges the local SiteDraft (localStorage-backed, see use-site-draft.ts)
// to the real PublicLink backend for the subset of fields it actually
// supports today: slug, business name, 4 brand colours, and publish status.
//
// Deliberately NOT wired here (see PUBLIC_LINK_MISSING_ENDPOINTS.md):
// theme beyond colours, pages, navigation, multi-section content, and the
// logo (its `logoDataUrl` is a data: URL for local preview; the backend
// wants an opaque `logoReference` from an upload flow that doesn't exist for
// Public Link yet — see gaps doc item 1). Those fields stay purely local
// until the backend grows to support them; do not add speculative syncing
// for them here.
//
// Requires a dev session (see shared/api/dev-backend-session.ts) — with none
// configured, every function here is a no-op and the builder behaves exactly
// as it did before (local-only), which is the common case until Identity is
// wired for real.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  checkSlugAvailability,
  connectContent,
  disconnectContent,
  getConnectableContent,
  getPublicLink,
  publishSite,
  unpublishSite,
  updateBrand,
  updateSlug,
  type ConnectableContentSummary,
  type PublicSiteResponse,
} from "@octopus/api-client";
import { getDevBusinessId, hasDevSession } from "@/shared/api/dev-backend-session";
import type { SiteAction, SiteDraft } from "./site-draft";

const BRAND_SYNC_DEBOUNCE_MS = 800;

export type RemoteSyncStatus = "disconnected" | "loading" | "synced" | "saving" | "error";

export interface PublicLinkSync {
  status: RemoteSyncStatus;
  error: string | null;
  /** Publishes on the real backend, then reflects the result locally. Falls
   *  back to the old local-only toggle when no dev session is configured. */
  publish: () => Promise<void>;
  unpublish: () => Promise<void>;
  checkSlug: (slug: string) => Promise<{ isAvailable: boolean; reason: string | null }>;
  claimSlug: (slug: string) => Promise<void>;
  connectableContent: ConnectableContentSummary[];
  connect: (contentKey: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

function applyRemote(dispatch: (action: SiteAction) => void, remote: PublicSiteResponse): void {
  dispatch({ type: "patchSlug", slug: remote.slug ?? "" });
  dispatch({
    type: "patchBrand",
    patch: { businessName: remote.displayName ?? "" },
  });
  dispatch({
    type: "patchColors",
    patch: {
      primary: remote.colors.primary ?? undefined,
      light: remote.colors.light ?? undefined,
      accent: remote.colors.accent ?? undefined,
      dark: remote.colors.dark ?? undefined,
    },
  });
  dispatch({
    type: "patchPublish",
    patch: {
      published: remote.status === "Live",
      publishedAt: remote.lastPublishedAtUtc ? Date.parse(remote.lastPublishedAtUtc) : null,
    },
  });
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.problem?.errorCode ?? err.message;
  return err instanceof Error ? err.message : "Unknown error";
}

export function usePublicLinkSync(draft: SiteDraft, dispatch: (action: SiteAction) => void): PublicLinkSync {
  const [status, setStatus] = useState<RemoteSyncStatus>(hasDevSession() ? "loading" : "disconnected");
  const [error, setError] = useState<string | null>(null);
  const [connectableContent, setConnectableContent] = useState<ConnectableContentSummary[]>([]);
  const businessId = getDevBusinessId();

  // Initial hydrate: the backend is the source of truth for slug/brand/
  // publish status, so a fresh mount overwrites whatever was in
  // localStorage for those fields with what the server actually has.
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    setStatus("loading");
    Promise.all([getPublicLink(businessId), getConnectableContent(businessId)])
      .then(([site, connectable]) => {
        if (cancelled) return;
        applyRemote(dispatch, site);
        setConnectableContent(connectable);
        setStatus("synced");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(errorMessage(err));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // Only on mount / businessId change — brand fields are synced separately
    // below via the debounced effect, not by re-running this hydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  // Debounced brand sync: business name + 4 colours only (see file banner).
  const brandTimer = useRef<number | null>(null);
  const { businessName, colors } = draft.brand;
  useEffect(() => {
    if (!businessId || status === "loading") return;
    if (brandTimer.current !== null) window.clearTimeout(brandTimer.current);
    brandTimer.current = window.setTimeout(() => {
      setStatus("saving");
      updateBrand(businessId, {
        displayName: businessName || null,
        primaryColor: colors.primary || null,
        lightColor: colors.light || null,
        accentColor: colors.accent || null,
        darkColor: colors.dark || null,
      })
        .then(() => setStatus("synced"))
        .catch((err: unknown) => {
          setError(errorMessage(err));
          setStatus("error");
        });
    }, BRAND_SYNC_DEBOUNCE_MS);
    return () => {
      if (brandTimer.current !== null) window.clearTimeout(brandTimer.current);
    };
    // status intentionally excluded — including it would cancel/reschedule
    // this timer on every status transition the effect itself causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, businessName, colors.primary, colors.light, colors.accent, colors.dark]);

  const publish = useCallback(async () => {
    if (!businessId) {
      // No backend session — keep the old local-only behaviour so the
      // builder still works while Identity/Setup aren't wired yet.
      dispatch({ type: "patchPublish", patch: { published: true, publishedAt: Date.now() } });
      return;
    }
    setStatus("saving");
    try {
      const site = await publishSite(businessId);
      applyRemote(dispatch, site);
      setStatus("synced");
    } catch (err) {
      setError(errorMessage(err));
      setStatus("error");
      throw err;
    }
  }, [businessId, dispatch]);

  const unpublish = useCallback(async () => {
    if (!businessId) {
      dispatch({ type: "patchPublish", patch: { published: false, publishedAt: null } });
      return;
    }
    setStatus("saving");
    try {
      const site = await unpublishSite(businessId);
      applyRemote(dispatch, site);
      setStatus("synced");
    } catch (err) {
      setError(errorMessage(err));
      setStatus("error");
      throw err;
    }
  }, [businessId, dispatch]);

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
        const site = await updateSlug(businessId, slug);
        applyRemote(dispatch, site);
        setStatus("synced");
      } catch (err) {
        setError(errorMessage(err));
        setStatus("error");
        throw err;
      }
    },
    [businessId, dispatch]
  );

  const connect = useCallback(
    async (contentKey: string) => {
      if (!businessId) return;
      setStatus("saving");
      try {
        const site = await connectContent(businessId, contentKey);
        applyRemote(dispatch, site);
        setStatus("synced");
      } catch (err) {
        setError(errorMessage(err));
        setStatus("error");
        throw err;
      }
    },
    [businessId, dispatch]
  );

  const disconnect = useCallback(async () => {
    if (!businessId) return;
    setStatus("saving");
    try {
      const site = await disconnectContent(businessId);
      applyRemote(dispatch, site);
      setStatus("synced");
    } catch (err) {
      setError(errorMessage(err));
      setStatus("error");
      throw err;
    }
  }, [businessId, dispatch]);

  return { status, error, publish, unpublish, checkSlug, claimSlug, connectableContent, connect, disconnect };
}
