import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import { headers } from "next/headers";
import { getDirection } from "@i18n/index";
import { readLocaleCookie } from "@/shared/lib/locale-cookie";
import { OrderingSessionProvider } from "@/entities/order";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { StoreI18nProvider } from "@/app/providers";
import { SiteHeader } from "@/widgets/site-header";
import { SiteFooter } from "@/widgets/site-footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-latin-loaded", display: "swap" });
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = readLocaleCookie();
  const slug = headers().get(TENANT_SLUG_HEADER) ?? "burger-house";
  const tenant = getTenantBySlug(slug);

  return (
    <html lang={locale} dir={getDirection(locale)} className={`${inter.variable} ${plexArabic.variable}`}>
      <body>
        <StoreI18nProvider locale={locale}>
          <OrderingSessionProvider>
            <SiteHeader locale={locale} />
            <main>{children}</main>
            <SiteFooter tenant={tenant} />
          </OrderingSessionProvider>
        </StoreI18nProvider>
      </body>
    </html>
  );
}
