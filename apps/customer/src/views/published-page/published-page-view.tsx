import "server-only";
import type { Metadata } from "next";
import { loadMenuByKey } from "@/entities/menu-item/load";
import type { PublicPage, PublishedShell } from "@/shared/api/public-api";
import { menuKeysOf, PageSections, sectionsOf } from "@/widgets/page-sections";

/** One published page: its sections, with the menu each Menu section is bound to. */
export async function PublishedPageView({ page, shell }: { page: PublicPage; shell: PublishedShell }) {
  const entries = await Promise.all(menuKeysOf(page).map(async (key) => [key, await loadMenuByKey(key)] as const));
  return (
    <PageSections
      sections={sectionsOf(page)}
      menus={Object.fromEntries(entries)}
      brandName={shell.brand.displayName}
      title={page.isHome ? undefined : page.title}
    />
  );
}

/** Next metadata for a published page (the API has already applied the title template). */
export function publishedPageMetadata(page: PublicPage, shell: PublishedShell): Metadata {
  const description = page.seo.description ?? shell.seo.defaultDescription ?? undefined;
  const image = page.seo.socialImageUrl ?? shell.seo.socialImageUrl;
  const noIndex = page.seo.noIndex || shell.seo.noIndex || shell.isPreview;
  return {
    title: { absolute: page.seo.title || page.title || shell.seo.defaultTitle },
    description,
    alternates: { canonical: page.seo.canonicalUrl },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title: page.seo.title,
      description,
      url: page.seo.canonicalUrl,
      siteName: shell.brand.displayName,
      locale: shell.language,
      images: image ? [image] : undefined,
    },
  };
}
