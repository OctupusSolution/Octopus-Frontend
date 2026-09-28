import type { Metadata, Viewport } from "next";
import { Cairo, IBM_Plex_Sans_Arabic, Inter, Playfair_Display, Poppins, Tajawal } from "next/font/google";
import { headers } from "next/headers";
import { defaultLocale } from "@i18n/index";
import { OrderingSessionProvider } from "@/entities/order";
import { getStorefront, loadTenant } from "@/entities/tenant/load";
import { StoreI18nProvider } from "@/app/providers";
import { themeStyle } from "@/shared/api/brand-theme";
import type { PublishedShell } from "@/shared/api/public-api";
import { createTranslator } from "@/shared/i18n/translate";
import { BUILDER_CANVAS_HEADER } from "@/shared/lib/merchant-origins";
import { navLinks, SiteHeader } from "@/widgets/site-header";
import { SiteFooter } from "@/widgets/site-footer";
import { ClearPreviewCookie, PreviewBanner } from "@/widgets/preview-banner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-latin-loaded", display: "swap" });
// `--font-inter-loaded` is the same face under the name the brand theme uses.
const interAlias = Inter({ subsets: ["latin"], variable: "--font-inter-loaded", display: "swap" });
// The fonts a business can pick in the Public Link builder (the API's font
// catalogue). All are registered as CSS variables; brand-theme.ts points the
// storefront's font stacks at whichever the business chose.
const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo-loaded", display: "swap" });
const tajawal = Tajawal({ subsets: ["arabic", "latin"], weight: ["400", "500", "700"], variable: "--font-tajawal-loaded", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-poppins-loaded", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair-loaded", display: "swap" });
// The storefront designs are set in IBM Plex Sans Arabic; its narrower
// metrics are what keep the card copy on the line counts the frames show.
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  variable: "--font-arabic-loaded",
  display: "swap",
});

const FONT_CLASSES = `${inter.variable} ${interAlias.variable} ${plexArabic.variable} ${cairo.variable} ${tajawal.variable} ${poppins.variable} ${playfair.variable}`;

/** The builder's canvas route (middleware marks its request): no published site is read for it. */
const isBuilderCanvas = () => headers().get(BUILDER_CANVAS_HEADER) === "1";

/** Site-wide metadata: the published site's defaults (a page's own metadata overrides them). */
export async function generateMetadata(): Promise<Metadata> {
  if (isBuilderCanvas()) return { title: "Preview", robots: { index: false, follow: false } };
  const { sample, shell, preview } = await getStorefront();
  if (sample || !shell) {
    return {
      title: sample ? "OCTOPUS" : "Not found",
      description: sample ? "Order online" : undefined,
      robots: preview ? { index: false, follow: false } : undefined,
    };
  }
  const name = shell.brand.displayName;
  const template = shell.seo.titleTemplate?.includes("{page}")
    ? shell.seo.titleTemplate.replaceAll("{page}", "%s").replaceAll("{site}", name)
    : `%s | ${name}`;
  let metadataBase: URL | undefined;
  try {
    metadataBase = new URL(shell.canonicalBaseUrl);
  } catch {
    metadataBase = undefined;
  }
  return {
    metadataBase,
    title: { default: shell.seo.defaultTitle || name, template },
    description: shell.seo.defaultDescription ?? undefined,
    applicationName: name,
    icons: shell.brand.favicon ? { icon: shell.brand.favicon.url } : undefined,
    robots: shell.seo.noIndex || shell.isPreview ? { index: false, follow: false } : undefined,
    openGraph: {
      siteName: name,
      locale: shell.language,
      images: shell.seo.socialImageUrl ? [shell.seo.socialImageUrl] : undefined,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  if (isBuilderCanvas()) {
    // The canvas sets lang, dir and the theme on <html> itself, from what the builder sends.
    return (
      <html lang="en" dir="ltr" className={FONT_CLASSES}>
        <body>
          <StoreI18nProvider locale={defaultLocale}>
            <OrderingSessionProvider>{children}</OrderingSessionProvider>
          </StoreI18nProvider>
        </body>
      </html>
    );
  }

  const storefront = await getStorefront();
  const { sample, shell, preview, locale, language, direction } = storefront;

  // A real subdomain with no published site: no chrome, just the 404 the page renders.
  // With a preview cookie this is also an unusable preview link (invalid, expired or revoked,
  // one uniform answer): the cookie is dropped and the visitor sees the same 404.
  if (!sample && !shell) {
    return (
      <html lang={language} dir={direction} className={FONT_CLASSES}>
        <body>
          {preview && <ClearPreviewCookie />}
          <StoreI18nProvider locale={locale}>
            <main>{children}</main>
          </StoreI18nProvider>
        </body>
      </html>
    );
  }

  const tenant = await loadTenant();
  const t = createTranslator(locale);

  return (
    <html lang={language} dir={direction} className={FONT_CLASSES} style={themeStyle(shell)}>
      <body>
        <StoreI18nProvider locale={locale}>
          <OrderingSessionProvider>
            {shell ? (
              <SiteHeader
                locale={locale}
                logoUrl={shell.brand.logo?.url ?? null}
                brandName={shell.brand.displayName}
                nav={navLinks(shell, t("store.nav.home"))}
                languages={shell.languages.map((l) => l.code)}
                options={shell.navigation.options}
              />
            ) : (
              <SiteHeader locale={locale} brandName={tenant.name} />
            )}
            <main>{children}</main>
            <SiteFooter
              tenant={tenant}
              site={
                shell
                  ? {
                      brandName: shell.brand.displayName,
                      logoUrl: shell.brand.logo?.url ?? null,
                      groups: shell.footer.groups,
                      socialLinks: shell.footer.socialLinks,
                      contact: shell.footer.contact,
                    }
                  : undefined
              }
            />
            {shell?.isPreview && <PreviewBanner language={language} expiresAtUtc={shell.preview?.expiresAtUtc} />}
          </OrderingSessionProvider>
        </StoreI18nProvider>
      </body>
    </html>
  );
}
