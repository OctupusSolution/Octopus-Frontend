// Shared bits of the server-backed ("connected") panels: the card chrome the
// builder's steps already use, a busy-flag wrapper for sync actions, and small
// readers over the server copy. Errors from sync actions are surfaced once, by
// the builder's status banner (index.tsx) — these helpers only swallow them so
// no click handler leaves an unhandled rejection behind.
import { useCallback, useEffect, useState } from "react";
import type { NavItemDto, PageDraftResponse, PageSummaryResponse, SectionDraftResponse, UpdatePageInput } from "@octopus/api-client";
import { pickText, stableJson, type PreviewSectionEdit, type PublicLinkServer, type PublicLinkSync } from "@/entities/site-draft";

/**
 * Hands an inspector's unsaved state of a section to the live preview, so it shows before Save.
 * Nothing is reported while the state matches the saved section, and the edit is dropped when the
 * inspector closes (its unsaved state goes with it).
 */
export function usePreviewEdit(
  sync: PublicLinkSync,
  page: PageDraftResponse,
  section: SectionDraftResponse,
  state: Omit<PreviewSectionEdit, "pageId" | "anchor"> & { anchor: string }
) {
  const { setPreviewEdit } = sync;
  const { sectionId } = section;
  const edit: PreviewSectionEdit = {
    pageId: page.pageId,
    ...state,
    anchor: state.anchor.replace(/-+$/, "") || null,
  };
  const saved: PreviewSectionEdit = {
    pageId: page.pageId,
    ...(state.fields !== undefined ? { fields: section.fields ?? {} } : {}),
    style: section.style ?? {},
    hiddenOn: section.hiddenOn ?? [],
    anchor: section.anchor ?? null,
  };
  const editJson = stableJson(edit);
  const dirty = editJson !== stableJson(saved);

  useEffect(() => {
    setPreviewEdit(sectionId, dirty ? (JSON.parse(editJson) as PreviewSectionEdit) : null);
  }, [dirty, editJson, sectionId, setPreviewEdit]);

  useEffect(() => () => setPreviewEdit(sectionId, null), [sectionId, setPreviewEdit]);
}

// Drawn with the builder's Figma palette (`--pl-*`, ui/kit.tsx) so the connected
// panels read as the same screens as the sample ones.
export const CARD = "flex flex-col gap-4 rounded-[12px] bg-[var(--pl-surface)] px-3 py-4 shadow-[shadow:var(--pl-shadow-card)]";
export const CARD_TITLE = "text-[16px] font-medium leading-[16px] text-[var(--pl-text)]";
export const CARD_NOTE = "-mt-2 text-[12px] leading-[1.4] text-[var(--pl-text-3)]";
export const SMALL_BUTTON =
  "inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[var(--pl-g300)] px-2.5 text-[12px] font-medium text-[var(--pl-text)] transition-colors hover:bg-[var(--pl-g50)] disabled:cursor-not-allowed disabled:opacity-50";

/** Runs a sync action with a busy flag; a rejection is already reported by the sync hook. */
export function useBusy() {
  const [busy, setBusy] = useState<string | null>(null);
  const act = useCallback(async (id: string, job: () => Promise<unknown>): Promise<boolean> => {
    setBusy(id);
    try {
      await job();
      return true;
    } catch {
      return false;
    } finally {
      setBusy(null);
    }
  }, []);
  return { busy, act };
}

export function pageTitle(page: Pick<PageSummaryResponse, "title" | "path"> | undefined, lang: string, fallback?: string): string {
  if (!page) return "";
  return pickText(page.title, lang, fallback) || page.path;
}

/** Pages in site order, Home first. */
export function orderedPages(server: PublicLinkServer): PageSummaryResponse[] {
  const pages = server.overview.pages;
  const home = pages.filter((p) => p.isHome);
  return [...home, ...pages.filter((p) => !p.isHome)];
}

/** The full-replacement settings write that reproduces a page as it is (then patched by the caller). */
export function pageInput(page: PageDraftResponse): UpdatePageInput {
  return {
    title: page.title,
    path: page.path,
    visibility: page.visibility === "hidden" ? "hidden" : "visible",
    seo: {
      title: page.seo?.title ?? {},
      description: page.seo?.description ?? {},
      socialImage: page.seo?.socialImage ?? null,
      hideFromSearchEngines: page.seo?.hideFromSearchEngines ?? false,
    },
    layout: { header: page.layout?.header ?? null, hideFooter: page.layout?.hideFooter ?? false },
  };
}

/** Whether a page is in the header menu. With no explicit items the header lists every visible page. */
export function isInMenu(server: PublicLinkServer, page: PageSummaryResponse): boolean {
  const items = server.navigation?.items ?? [];
  if (items.length === 0) return page.visibility !== "hidden";
  return items.some(
    (item) => (item.target?.kind === "page" && item.target.pageId === page.pageId) || (item.children ?? []).some((c) => c.target?.kind === "page" && c.target.pageId === page.pageId)
  );
}

/** The navigation write that adds or removes a page, materialising the derived menu first. */
export function toggleMenuItems(server: PublicLinkServer, page: PageSummaryResponse): NavItemDto[] {
  let items: NavItemDto[] = server.navigation?.items ?? [];
  if (items.length === 0) {
    items = orderedPages(server)
      .filter((p) => p.visibility !== "hidden")
      .map((p) => ({ target: { kind: "page", pageId: p.pageId }, showInHeader: true, showInDrawer: true, children: [] }));
  }
  const points = (item: NavItemDto) => item.target?.kind === "page" && item.target.pageId === page.pageId;
  if (items.some(points) || items.some((i) => (i.children ?? []).some(points))) {
    return items.filter((i) => !points(i)).map((i) => ({ ...i, children: (i.children ?? []).filter((c) => !points(c)) }));
  }
  return [...items, { target: { kind: "page", pageId: page.pageId }, showInHeader: true, showInDrawer: true, children: [] }];
}
