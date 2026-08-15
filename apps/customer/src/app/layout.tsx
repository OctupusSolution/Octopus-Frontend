import type { Metadata, Viewport } from "next";
import { Inter, Readex_Pro } from "next/font/google";
import { headers } from "next/headers";
import { getDirection } from "@i18n/index";
import { readLocaleCookie } from "@/shared/lib/locale-cookie";
import { OrderingSessionProvider } from "@/entities/order";
import { getTenantBySlug, TENANT_SLUG_HEADER } from "@/entities/tenant";
import { SiteHeader } from "@/widgets/site-header";
import { SiteFooter } from "@/widgets/site-footer";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-latin-loaded", display: "swap" });
const readexPro = Readex_Pro({ subsets: ["arabic", "latin"], variable: "--font-arabic-loaded", display: "swap" });

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
    <html lang={locale} dir={getDirection(locale)} className={`${inter.variable} ${readexPro.variable}`}>
      <body>
        <OrderingSessionProvider>
          <SiteHeader locale={locale} />
          <main>{children}</main>
          <SiteFooter tenant={tenant} />
        </OrderingSessionProvider>
      </body>
    </html>
  );
}
