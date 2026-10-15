"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useI18n } from "@/app/providers";
import { useMobileFlow } from "@/shared/lib/flow-context";
import { TableIcon } from "@/shared/ui/table";
import { TABLE_BRAND_FALLBACK_LOGO, useTableBrand } from "./table-brand";

export interface TableDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Omitted when the site is published in one language only. */
  onSwitchLanguage?: () => void;
}

/** An exported icon drawn as a mask, so the row it sits in decides its colour:
 *  the same glyph is ink on a resting row and brand blue on the current one. */
function DrawerIcon({ name, size = [24, 24] }: { name: string; size?: readonly [number, number] }) {
  const url = `url(/images/table/${name}.svg)`;

  return (
    <span className="flex size-6 shrink-0 items-center justify-center">
      <span
        aria-hidden="true"
        className="bg-current"
        style={{
          width: size[0],
          height: size[1],
          maskImage: url,
          WebkitMaskImage: url,
          maskSize: "100% 100%",
          WebkitMaskSize: "100% 100%",
        }}
      />
    </span>
  );
}

/** The side menu the pickup bar's menu button opens. */
export function TableDrawer({ open, onClose, onSwitchLanguage }: TableDrawerProps) {
  const { t } = useI18n();
  const brand = useTableBrand();
  const flow = useMobileFlow();
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const links = [
    { href: flow.home, label: t("store.nav.home"), icon: <DrawerIcon name="drawer-home" /> },
    { href: flow.menuIndex, label: t("store.nav.menu"), icon: <DrawerIcon name="drawer-menu" /> },
    { href: flow.offers, label: t("store.nav.offers"), icon: <DrawerIcon name="drawer-offers" /> },
    { href: flow.bestSellers, label: t("store.nav.bestSellers"), icon: <DrawerIcon name="drawer-fire" /> },
    {
      href: flow.booking,
      label: t("store.nav.booking"),
      icon: <DrawerIcon name="drawer-table" size={[21.5, 18.5]} />,
    },
  ];
  const isCurrent = (href: string): boolean =>
    href === flow.home ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="fixed inset-0 z-50 flex justify-center">
      <div className="relative h-full w-full max-w-[480px]">
        <div className="absolute inset-0 bg-black/60" aria-hidden="true" onClick={onClose} />
        <nav
          role="dialog"
          aria-modal="true"
          aria-label={t("store.nav.openMenu")}
          className="absolute inset-y-0 end-0 flex w-[243px] flex-col justify-between overflow-y-auto rounded-s-[24px] bg-white p-6"
        >
          <div className="flex flex-col gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logoUrl ?? TABLE_BRAND_FALLBACK_LOGO} alt="" className="size-[59px] object-contain" />

            <ul className="flex flex-col gap-4">
              {links.map((link) => {
                const current = isCurrent(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onClose}
                      aria-current={current ? "page" : undefined}
                      className={`flex items-center gap-2 rounded-[12px] p-2 text-[16px] font-medium leading-none ${
                        current
                          ? "bg-[var(--octo-store-select-soft)] text-[var(--octo-store-select-text)]"
                          : "text-gray-900"
                      }`}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {onSwitchLanguage && (
            <button
              type="button"
              onClick={onSwitchLanguage}
              className="flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-[20px] border border-gray-300 p-3"
            >
              <TableIcon name="drawer-language" />
              <span className="border-s border-gray-200 p-2 text-[16px] font-medium leading-none text-gray-900">
                {t("store.nav.language")}
              </span>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}
