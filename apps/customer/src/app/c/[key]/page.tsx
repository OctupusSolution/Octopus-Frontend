import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { defaultLocale, getDirection, locales, type Locale } from "@i18n/index";
import { StoreI18nProvider } from "@/app/providers";
import { fetchMenuDocumentByCode } from "@/shared/api/public-api";
import { ThemedMenu } from "@/widgets/themed-menu";

// A printed QR code's menu (Menu:PublicCodesBaseUri, e.g. https://menu.octopus.sa/c/{key}). View only: no cart, no site.
export const dynamic = "force-dynamic";

function preferred(): string | null {
  return headers().get("accept-language")?.split(",")[0]?.trim() || null;
}

export async function generateMetadata({ params }: { params: { key: string } }): Promise<Metadata> {
  const document = await fetchMenuDocumentByCode(params.key, preferred());
  return { title: document?.menu.name ?? "Menu" };
}

export default async function QrMenuPage({ params, searchParams }: { params: { key: string }; searchParams: { l?: string; lang?: string } }) {
  const document = await fetchMenuDocumentByCode(params.key, searchParams.lang ?? preferred(), searchParams.l ?? null);
  if (!document) notFound();
  const locale: Locale = (locales as readonly string[]).includes(document.language) ? (document.language as Locale) : defaultLocale;
  return (
    <StoreI18nProvider locale={locale}>
      <div dir={getDirection(locale)} lang={document.language}>
        <ThemedMenu document={document} mode="view" />
      </div>
    </StoreI18nProvider>
  );
}
