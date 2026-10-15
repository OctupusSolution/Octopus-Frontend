import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { defaultLocale, getDirection, locales, type Locale } from "@i18n/index";
import { StoreI18nProvider } from "@/app/providers";
import { OrderingSessionProvider } from "@/entities/order";
import { PlaceScanProvider } from "@/features/place/place-scan-context";
import { fetchPlaceScan, menuFromDocument } from "@/shared/api/public-api";
import { MobileFlowProvider } from "@/shared/lib/flow-context";
import { LOCALE_COOKIE_NAME } from "@/shared/lib/locale-cookie-name";
import { orderableMenu } from "@/shared/lib/place-order";
import { cartStorageKey } from "@/shared/lib/place-storage";
import { placeFlow } from "@/shared/lib/table-flow";
import { PlaceUnavailableView } from "@/views/place";
import { TableBrandProvider } from "@/widgets/table-shell";

// A printed place code ({PublicCodesBaseUri}/p/{key}): the code alone names the restaurant and
// the table, so nothing here reads the host. The scan is read on every request (no-store).
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

const known = (lang: string | null | undefined): Locale | null =>
  lang && (locales as readonly string[]).includes(lang.split("-")[0]) ? (lang.split("-")[0] as Locale) : null;

export default async function PlaceLayout({ params, children }: { params: { key: string }; children: ReactNode }) {
  const chosen = known(cookies().get(LOCALE_COOKIE_NAME)?.value);
  const browser = known(headers().get("accept-language")?.split(",")[0]?.trim());
  const result = await fetchPlaceScan(params.key, chosen ?? browser);
  // An unknown, revoked or replaced code is said here rather than through notFound(): from a
  // layout that reaches the site-wide not-found page, which speaks of sites, not codes.
  const scan = result.kind === "ok" ? result.scan : null;
  const locale: Locale = known(scan?.menu?.language) ?? chosen ?? browser ?? defaultLocale;
  const document = scan?.menu ?? null;
  const ordering = scan?.ordering ?? null;
  const menu = document ? orderableMenu(menuFromDocument(document), ordering) : { categories: [], items: [] };

  return (
    <StoreI18nProvider locale={locale}>
      <div
        dir={getDirection(locale)}
        lang={locale}
        className="mx-auto min-h-dvh w-full max-w-[480px] bg-gray-50 [font-family:var(--font-family-active),var(--font-arabic-loaded)]"
      >
        {result.kind === "notFound" ? (
          <PlaceUnavailableView reason="code" />
        ) : !scan || scan.status !== "open" || !document ? (
          <PlaceUnavailableView reason={!scan ? "error" : scan.reason === "menu" || !document ? "menu" : "place"} />
        ) : (
          <TableBrandProvider
            brand={{
              name: document.menu.name,
              logoUrl: document.menu.theme?.logo?.url ?? null,
              branchName: document.locationLabel ?? undefined,
              languages: document.availableLanguages,
            }}
          >
            <MobileFlowProvider flow={placeFlow(params.key)}>
              <OrderingSessionProvider storageKey={cartStorageKey(params.key)} storage="session">
                <PlaceScanProvider value={{ key: params.key, scan, menu, ordering }}>{children}</PlaceScanProvider>
              </OrderingSessionProvider>
            </MobileFlowProvider>
          </TableBrandProvider>
        )}
      </div>
    </StoreI18nProvider>
  );
}
