"use client";

import { Menu, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@i18n/index";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { SwitchLocale } from "@/features/session/switch-locale";

export interface SiteHeaderProps {
  locale: Locale;
  /** The business's own logo; the platform mark until it uploads one. */
  logoUrl?: string | null;
  brandName?: string;
  /** A published site's own navigation (already resolved for the language);
   *  omitted for the sample storefront, which uses its built-in entries. */
  nav?: SiteNavLink[];
  /** The languages the published site offers. */
  languages?: string[];
  /** A published site's navigation switches; omitted for the sample storefront, which keeps its
   *  pinned header and underlined current page. */
  options?: { stickyHeader: boolean; showActivePageIndicator: boolean };
  /** The page being shown, when it is not the URL's (the builder canvas renders every page at one URL). */
  currentPath?: string;
  /** Builder canvas only: the language pill reports the switch instead of reloading. */
  onSwitchLanguage?: (language: string) => void;
}

export interface SiteNavLink {
  label: string;
  href: string;
  openInNewTab: boolean;
  inHeader: boolean;
  inDrawer: boolean;
}

interface NavEntry {
  href: string;
  label: string;
  newTab?: boolean;
}

// The three middle entries are in-page anchors, not routes — the design's nav
// mixes both, and only the real routes can ever be "active".
const NAV: readonly { href: string; key: string }[] = [
  { href: "/", key: "store.nav.home" },
  { href: "/menu", key: "store.nav.menu" },
  { href: "/menu#products", key: "store.nav.products" },
  { href: "/#best-sellers", key: "store.nav.bestSellers" },
  { href: "/#offers", key: "store.nav.offers" },
  { href: "/booking", key: "store.nav.booking" },
  { href: "/orders", key: "store.nav.trackOrder" },
];

export function SiteHeader({ locale, logoUrl, brandName, nav, languages, options, currentPath, onSwitchLanguage }: SiteHeaderProps) {
  const sticky = options?.stickyHeader ?? true;
  const markActive = options?.showActivePageIndicator ?? true;
  const { t } = useI18n();
  const sampleNav: NavEntry[] = NAV.map((e) => ({ href: e.href, label: t(e.key) }));
  const headerNav: NavEntry[] = nav
    ? nav.filter((e) => e.inHeader).map((e) => ({ href: e.href, label: e.label, newTab: e.openInNewTab }))
    : sampleNav;
  const drawerNav: NavEntry[] = nav
    ? nav.filter((e) => e.inDrawer).map((e) => ({ href: e.href, label: e.label, newTab: e.openInNewTab }))
    : sampleNav;
  const urlPath = usePathname();
  const pathname = currentPath ?? urlPath;
  const { state } = useOrderingSession();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const itemCount = state.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <header className={`${sticky ? "sticky top-0" : "relative"} z-30 border-b border-[var(--octo-border-card)] bg-[var(--octo-card)]`}>
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label={brandName ?? "OCTOPUS"} className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoUrl || !nav ? (
            <img src={logoUrl ?? "/octopus-logo.svg"} alt="" className="h-[30px] w-auto max-w-[120px] object-contain" />
          ) : (
            <span className="text-[16px] font-bold text-[var(--octo-text-primary)]">{brandName}</span>
          )}
        </Link>

        <nav className="hidden items-center gap-[26px] md:flex">
          {headerNav.map((entry) => {
            const active = pathname === entry.href;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                target={entry.newTab ? "_blank" : undefined}
                rel={entry.newTab ? "noopener noreferrer" : undefined}
                aria-current={active ? "page" : undefined}
                className={`relative text-[13.5px] transition-colors ${
                  active && markActive
                    ? "font-semibold text-[var(--octo-brand)] after:absolute after:inset-x-0 after:-bottom-[17px] after:h-[2px] after:bg-[var(--octo-brand)]"
                    : "text-[var(--octo-text-primary)] hover:text-[var(--octo-brand)]"
                }`}
              >
                {entry.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <SwitchLocale locale={locale} languages={languages} onSwitch={onSwitchLanguage} />

          <Link
            href="/cart"
            aria-label={t("store.nav.cart")}
            className="relative grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-[var(--octo-brand)] text-white transition-opacity hover:opacity-90"
          >
            <ShoppingBag size={17} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 end-[-6px] grid h-4 min-w-4 place-items-center rounded-full bg-[#EF4444] px-1 text-[10px] font-semibold text-white">
                {itemCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            aria-label={t("store.nav.openMenu")}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
            className="grid h-[38px] w-[38px] place-items-center rounded-[11px] border border-[var(--octo-border-input)] text-[var(--octo-text-secondary)] md:hidden"
          >
            {drawerOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {drawerOpen && (
        <nav className="border-t border-[var(--octo-divider)] bg-[var(--octo-card)] px-4 py-3 md:hidden">
          <ul className="flex flex-col">
            {drawerNav.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  target={entry.newTab ? "_blank" : undefined}
                  rel={entry.newTab ? "noopener noreferrer" : undefined}
                  onClick={() => setDrawerOpen(false)}
                  className="block py-2.5 text-[13.5px] text-[var(--octo-text-primary)]"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
