// The anonymous public read of a Public Link site (backend PublicReadContracts.cs), camelCase JSON:
//   GET /v1/public-site?lang=              -> PublicSiteShell
//   GET /v1/public-site/pages?path=&lang=  -> one PublicSitePage
// The storefront renders from these. The builder's live preview produces the same shapes from the
// unsaved draft (apps/merchant .../_shared/live-site.ts `draftPublicRead`) and sends them to the
// storefront's canvas route, which renders them with the same components — hence one definition here.

export type PublicSiteDirection = "ltr" | "rtl";

export interface PublicSiteMedia {
  url: string;
  width?: number | null;
  height?: number | null;
}

export interface PublicSiteNavItem {
  label: string;
  iconKey: string | null;
  href: string | null;
  /** "Page" | "Anchor" | "External" | "Group". */
  kind: string;
  openInNewTab: boolean;
  showInHeader: boolean;
  showInDrawer: boolean;
  children: PublicSiteNavItem[];
}

export interface PublicSiteFooterLink {
  label: string;
  href: string;
  kind: string;
  openInNewTab: boolean;
}

export interface PublicSiteShell {
  host: string;
  canonicalBaseUrl: string;
  language: string;
  direction: PublicSiteDirection;
  defaultLanguage: string;
  languages: { code: string; direction: PublicSiteDirection }[];
  theme: {
    key: string;
    colors: Record<string, string>;
    typography: Record<string, { heading: string | null; body: string | null }>;
    layout: Record<string, string>;
  };
  brand: { displayName: string; logo: PublicSiteMedia | null; favicon: PublicSiteMedia | null };
  seo: {
    titleTemplate: string | null;
    defaultTitle: string;
    defaultDescription: string | null;
    socialImageUrl: string | null;
    noIndex: boolean;
  };
  navigation: {
    options: { stickyHeader: boolean; showActivePageIndicator: boolean; showIcons: boolean; openLinksInSameTab: boolean };
    items: PublicSiteNavItem[];
  };
  footer: {
    groups: { title: string; links: PublicSiteFooterLink[] }[];
    socialLinks: { network: string; url: string }[];
    contact: { address: string | null; hours: string | null; phone: string | null };
  };
  pages: { path: string; title: string; isHome: boolean; noIndex: boolean; lastModifiedUtc: string }[];
  isPreview: boolean;
  /** Present on a preview read only. */
  preview?: { siteVersion: number; expiresAtUtc: string } | null;
}

export interface PublicSiteSource {
  sourceKey: string;
  version: number | null;
  /** The opaque key the owning module's public read takes (the builder sends the content key). */
  publicLinkKey: string | null;
  settings: unknown;
}

/** A resolved field: text a string, media `{url,…}`, link `{href,kind,label?}`, rich text a block array, list `[{id,fields}]`. */
export interface PublicSiteSection {
  sectionId: string;
  type: string;
  anchor: string | null;
  styleVariant: string | null;
  style: Record<string, unknown>;
  fields: Record<string, unknown>;
  source: PublicSiteSource | null;
  /** Device classes (`mobile`, `tablet`, `desktop`) the section is hidden on; absent from older reads. */
  hiddenOn?: string[] | null;
}

export interface PublicSitePage {
  pageId: string;
  path: string;
  isHome: boolean;
  kind: string;
  title: string;
  seo: { title: string; description: string | null; socialImageUrl: string | null; noIndex: boolean; canonicalUrl: string };
  layout: { header: unknown; hideFooter: boolean };
  source: PublicSiteSource | null;
  sections: PublicSiteSection[];
  lastModifiedUtc: string;
}
