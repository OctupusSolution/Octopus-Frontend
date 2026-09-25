// The booking flow is not built yet. This route existed as an empty stub with
// no default export, which made it a 500 rather than a page — and the nav and
// the hero both link here. A visible placeholder is honest; a crash is not.
import Link from "next/link";
import { createTranslator } from "@/shared/i18n/translate";
import { readLocaleCookie } from "@/shared/lib/locale-cookie";

export default function BookingPage() {
  const t = createTranslator(readLocaleCookie());

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-24 text-center">
      <h1 className="text-[21px] font-bold text-[var(--octo-text-primary)]">
        {t("store.nav.booking")}
      </h1>
      <p className="text-[12.5px] font-semibold text-[var(--octo-text-secondary)]">
        {t("store.placeholder.title")}
      </p>
      <p className="text-[12.5px] text-[var(--octo-text-muted)]">{t("store.placeholder.body")}</p>
      <Link href="/menu" className="text-[12.5px] font-medium text-[var(--octo-brand)] hover:underline">
        {t("store.nav.menu")}
      </Link>
    </div>
  );
}
