"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { useMobileFlow } from "@/shared/lib/flow-context";
import { LOCALE_COOKIE_NAME } from "@/shared/lib/locale-cookie-name";
import { TableIcon } from "@/shared/ui/table";
import { TABLE_BRAND_FALLBACK_LOGO, useTableBrand } from "./table-brand";
import { TableDrawer } from "./table-drawer";

const ROUND = "flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-soft-blue)]";

/** The bar every screen of the phone flows opens with: whose restaurant this is
 *  and the three shortcuts. At a table it also names the table and shows that
 *  the session is live; ordering for pickup has neither. */
export function TableTopCard() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const brand = useTableBrand();
  const flow = useMobileFlow();
  const { state } = useOrderingSession();
  const [pending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const atTable = flow.mode === "table";
  const nextLanguage = (brand.languages ?? ["ar", "en"]).find((code) => code !== locale);

  function switchLanguage() {
    if (!nextLanguage) return;
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLanguage}; path=/; max-age=31536000`;
    startTransition(() => router.refresh());
  }

  return (
    <header className="flex flex-col gap-4 bg-[var(--octo-store-select-text)] px-4 pb-4 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1 text-[14px] font-semibold leading-none text-white">
            <TableIcon name="location-white" size={16} />
            {brand.name}
          </p>
          {atTable && (
            <p className="flex items-center gap-1 text-[12px] font-medium leading-none text-white">
              <span className="flex size-4 items-center justify-center">
                <TableIcon name="table-white" size={[14.33, 12.33]} />
              </span>
              {t("store.table.tableNumber", { n: state.tableNumber ?? "—" })}
            </p>
          )}
        </div>

        {atTable && (
          <p className="flex items-center gap-1 text-[12px] font-medium leading-none text-white">
            <TableIcon name="dot-online" size={10} />
            {t("store.table.connected")}
          </p>
        )}
      </div>

      <div className="flex h-12 items-center justify-between rounded-[50px] bg-white px-4">
        <Link href={flow.home} aria-label={brand.name} className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.logoUrl ?? TABLE_BRAND_FALLBACK_LOGO}
            alt=""
            className="size-8 object-contain"
          />
        </Link>

        <div className="flex items-center gap-1">
          <Link href={flow.cart} aria-label={t("store.nav.cart")} className={ROUND}>
            <TableIcon name="bag-blue" />
          </Link>
          {nextLanguage && (
            <button
              type="button"
              aria-label={t("store.nav.language")}
              onClick={switchLanguage}
              disabled={pending}
              className={ROUND}
            >
              <TableIcon name="language" />
            </button>
          )}
          {atTable ? (
            <Link href={flow.menu} aria-label={t("store.nav.openMenu")} className={ROUND}>
              <TableIcon name="menu" />
            </Link>
          ) : (
            <button
              type="button"
              aria-label={t("store.nav.openMenu")}
              aria-expanded={drawerOpen}
              onClick={() => setDrawerOpen(true)}
              className={ROUND}
            >
              <TableIcon name="menu" />
            </button>
          )}
        </div>
      </div>

      {!atTable && (
        <TableDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onSwitchLanguage={nextLanguage ? switchLanguage : undefined}
        />
      )}
    </header>
  );
}
