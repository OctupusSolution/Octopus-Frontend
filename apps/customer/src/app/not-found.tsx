import Link from "next/link";
import { getStorefront } from "@/entities/tenant/load";

// Local copy: the shared dictionaries (packages/i18n) have no strings for this yet.
const COPY = {
  en: {
    siteTitle: "This site isn't available",
    siteBody: "There is no published site at this address yet. If it's yours, publish it from the Public Link builder.",
    pageTitle: "Page not found",
    pageBody: "The page you're looking for doesn't exist or is no longer available.",
    home: "Back to home",
  },
  ar: {
    siteTitle: "هذا الموقع غير متاح",
    siteBody: "لا يوجد موقع منشور على هذا العنوان بعد. إن كان موقعك، انشره من أداة إنشاء الرابط العام.",
    pageTitle: "الصفحة غير موجودة",
    pageBody: "الصفحة التي تبحث عنها غير موجودة أو لم تعد متاحة.",
    home: "العودة إلى الرئيسية",
  },
} as const;

export default async function NotFound() {
  const { sample, shell, locale } = await getStorefront();
  const t = COPY[locale];
  const noSite = !sample && !shell;

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 py-24 text-center">
      <p className="text-[48px] font-bold text-[var(--octo-text-faint)]">404</p>
      <h1 className="text-[21px] font-bold text-[var(--octo-text-primary)]">{noSite ? t.siteTitle : t.pageTitle}</h1>
      <p className="text-[13px] leading-[1.9] text-[var(--octo-text-secondary)]">{noSite ? t.siteBody : t.pageBody}</p>
      {!noSite && (
        <Link href="/" className="text-[12.5px] font-medium text-[var(--octo-brand)] hover:underline">
          {t.home}
        </Link>
      )}
    </div>
  );
}
