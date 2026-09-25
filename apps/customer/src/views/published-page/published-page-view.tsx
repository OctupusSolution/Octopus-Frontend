import "server-only";
import type { Metadata } from "next";
import { loadMenuByKey } from "@/entities/menu-item/load";
import type { PublicPage, PublishedShell } from "@/shared/api/public-api";
import { PageSections } from "@/widgets/page-sections";

/** One published page: its sections, with the menu each Menu section is bound to. */
export async function PublishedPageView({ page, shell }: { page: PublicPage; shell: PublishedShell }) {
  const keys = new Set<string>();
  for (const s of page.sections) if (s.source?.sourceKey === "menu" && s.source.publicLinkKey) keys.add(s.source.publicLinkKey);
  // A module page bound to the menu as a whole: render it as one Menu section.
  const sections =
    page.source?.sourceKey === "menu" && page.source.publicLinkKey && !page.sections.some((s) => s.type === "menu")
      ? [
          ...page.sections,
          { sectionId: `page-${page.pageId}`, type: "menu", anchor: "menu", styleVariant: null, style: {}, fields: {}, source: page.source },
        ]
      : page.sections;
  if (page.source?.sourceKey === "menu" && page.source.publicLinkKey) keys.add(page.source.publicLinkKey);

  const entries = await Promise.all([...keys].map(async (key) => [key, await loadMenuByKey(key)] as const));

  return (
    <PageSections
      sections={sections}
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
