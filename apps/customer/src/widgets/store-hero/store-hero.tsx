"use client";

import { ClipboardList } from "lucide-react";
import Link from "next/link";
import { useI18n } from "@/app/providers";

export function StoreHero() {
  const { t } = useI18n();

  return (
    <section className="relative isolate overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/storefront/hero.webp"
        alt=""
        className="h-[440px] w-full object-cover sm:h-[600px]"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/30" aria-hidden="true" />

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
        <h1 className="max-w-[860px] text-[26px] font-bold leading-[1.4] text-white sm:text-[44px]">
          {t("store.hero.title")}
        </h1>

        <p className="max-w-[720px] text-[13px] leading-[1.9] text-white/85 sm:text-[15px]">
          {t("store.hero.subtitle")}
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 rounded-full border border-white/70 px-6 py-3 text-[13.5px] text-white transition-colors hover:bg-white/10"
          >
            <ClipboardList size={16} aria-hidden="true" />
            {t("store.hero.viewMenu")}
          </Link>

          <Link
            href="/booking"
            className="inline-flex items-center gap-2 rounded-full border border-white/70 px-6 py-3 text-[13.5px] text-white transition-colors hover:bg-white/10"
          >
            <ClipboardList size={16} aria-hidden="true" />
            {t("store.hero.bookTable")}
          </Link>
        </div>
      </div>
    </section>
  );
}
