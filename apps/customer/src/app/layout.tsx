import type { Metadata, Viewport } from "next";
import { Cairo, IBM_Plex_Sans_Arabic, Inter, Playfair_Display, Poppins, Tajawal } from "next/font/google";
import { headers } from "next/headers";
import { getDirection } from "@i18n/index";
import { readLocaleCookie } from "@/shared/lib/locale-cookie";
import { OrderingSessionProvider } from "@/entities/order";
import { TENANT_SLUG_HEADER } from "@/entities/tenant";
import { loadSite, loadTenant } from "@/entities/tenant/load";
import { StoreI18nProvider } from "@/app/providers";
import { themeStyle } from "@/shared/api/brand-theme";
import { SiteHeader } from "@/widgets/site-header";
import { SiteFooter } from "@/widgets/site-footer";
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

export const metadata: Metadata = {
  title: "OCTOPUS",
  description: "Order online",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = readLocaleCookie();
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const [tenant, site] = await Promise.all([loadTenant(slug), loadSite(slug)]);

  return (
    <html lang={locale} dir={getDirection(locale)} className={`${inter.variable} ${interAlias.variable} ${plexArabic.variable} ${cairo.variable} ${tajawal.variable} ${poppins.variable} ${playfair.variable}`}
      style={themeStyle(site)}
    >
      <body>
        <StoreI18nProvider locale={locale}>
          <OrderingSessionProvider>
            <SiteHeader locale={locale} logoUrl={site?.brand.logo?.url ?? null} brandName={tenant.name} />
            <main>{children}</main>
            <SiteFooter tenant={tenant} />
          </OrderingSessionProvider>
        </StoreI18nProvider>
      </body>
    </html>
  );
}
