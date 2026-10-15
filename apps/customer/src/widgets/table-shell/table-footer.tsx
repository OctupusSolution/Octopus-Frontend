"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/app/providers";
import { useMobileFlow } from "@/shared/lib/flow-context";
import { TableIcon } from "@/shared/ui/table";
import { TABLE_BRAND_FALLBACK_LOGO, useTableBrand } from "./table-brand";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const COLUMN_TITLE = "text-[14px] font-bold leading-none";
const COLUMN_LINKS = "flex flex-col items-center gap-3 text-[12px] leading-none";

/** There is no newsletter endpoint, so the field validates and confirms locally
 *  (as the site footer's does) rather than implying a subscription was made. */
function FooterNewsletter() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "ok" | "invalid">("idle");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setStatus("invalid");
      return;
    }
    setStatus("ok");
    setEmail("");
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex w-full flex-col gap-2">
      <div className="flex h-12 w-full">
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setStatus("idle");
          }}
          placeholder={t("store.footer.newsletterPlaceholder")}
          aria-label={t("store.footer.newsletterPlaceholder")}
          aria-invalid={status === "invalid"}
          className="min-w-0 flex-1 rounded-s-[24px] border border-e-0 border-gray-300 bg-transparent px-4 text-[14px] leading-none text-gray-900 outline-none placeholder:text-[var(--octo-store-select-label)]"
        />
        <button
          type="submit"
          className="w-[133px] shrink-0 rounded-e-[24px] bg-ocean-blue text-[16px] font-bold leading-none text-white"
        >
          {t("store.footer.newsletterSubmit")}
        </button>
      </div>

      {status !== "idle" && (
        <p
          aria-live="polite"
          className={`text-center text-[12px] ${
            status === "ok" ? "text-[var(--octo-store-success)]" : "text-[var(--octo-store-danger)]"
          }`}
        >
          {t(status === "ok" ? "store.footer.newsletterThanks" : "store.footer.newsletterInvalid")}
        </p>
      )}
    </form>
  );
}

export function TableFooter() {
  const { t } = useI18n();
  const flow = useMobileFlow();
  const brand = useTableBrand();
  const atTable = flow.mode === "table";

  return (
    <footer className="flex flex-col items-center gap-6 bg-gray-200 px-4 py-6 text-gray-900">
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={brand.logoUrl ?? TABLE_BRAND_FALLBACK_LOGO} alt="" className="size-20 object-contain" />

          <div className="flex w-full flex-col gap-4">
            <p className="text-center text-[12px] leading-[1.5]">{t("store.footer.tagline")}</p>

            <div className="flex flex-col items-center gap-2">
              <p className={COLUMN_TITLE}>{t("store.footer.followUs")}</p>
              {/* Drawn left to right in both languages: Instagram, Facebook, LinkedIn. */}
              <div dir="ltr" className="flex items-center gap-4">
                <span className="relative flex size-8 items-center justify-center">
                  <TableIcon name="social-circle" size={32} className="absolute inset-0" />
                  <TableIcon name="social-instagram" size={21.33} className="relative" />
                </span>
                <TableIcon name="social-2" size={32} />
                <TableIcon name="social-3" size={32} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-center text-[14px] font-medium leading-none">
            {t("store.footer.contactUs")}
          </p>
          <div className="flex flex-col gap-4">
            <p className="text-center text-[16px] font-medium leading-none">
              {t("store.footer.newsletterTitle")}
            </p>
            <FooterNewsletter />
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-4">
          <p className={COLUMN_TITLE}>{t("store.footer.explore")}</p>
          <div className={COLUMN_LINKS}>
            <Link href={flow.home}>{t("store.nav.home")}</Link>
            <Link href={flow.menuIndex}>{t("store.nav.menu")}</Link>
            <Link href={atTable ? `${flow.home}#best-sellers` : flow.bestSellers}>
              {t("store.section.bestSellers")}
            </Link>
            <Link href={flow.offers}>{t("store.table.footerOffers")}</Link>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className={COLUMN_TITLE}>{t("store.footer.info")}</p>
          <div className={COLUMN_LINKS}>
            <span>{t("store.footer.contactUs")}</span>
            <span>{t("store.footer.privacy")}</span>
            <span>{t("store.footer.terms")}</span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className={COLUMN_TITLE}>{t("store.footer.visitUs")}</p>
          <div className="flex flex-col items-start gap-3 text-[12px] leading-none">
            <p className="flex items-center gap-2">
              <TableIcon name="location-24" />
              {t("store.footer.address")}
            </p>
            <p className="flex items-center gap-2">
              <TableIcon name="clock-24" />
              {t("store.footer.hours")}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
