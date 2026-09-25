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
}

interface NavEntry {
  href: string;
  key: string;
}

// The three middle entries are in-page anchors, not routes — the design's nav
// mixes both, and only the real routes can ever be "active".
const NAV: readonly NavEntry[] = [
  { href: "/", key: "store.nav.home" },
  { href: "/menu", key: "store.nav.menu" },
  { href: "/menu#products", key: "store.nav.products" },
  { href: "/#best-sellers", key: "store.nav.bestSellers" },
  { href: "/#offers", key: "store.nav.offers" },
  { href: "/booking", key: "store.nav.booking" },
  { href: "/orders", key: "store.nav.trackOrder" },
];

export function SiteHeader({ locale, logoUrl, brandName }: SiteHeaderProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const { state } = useOrderingSession();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const itemCount = state.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--octo-border-card)] bg-[var(--octo-card)]">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label={brandName ?? "OCTOPUS"} className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl ?? "/octopus-logo.svg"} alt="" className="h-[30px] w-auto max-w-[120px] object-contain" />
        </Link>

        <nav className="hidden items-center gap-[26px] md:flex">
          {NAV.map((entry) => {
            const active = pathname === entry.href;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={active ? "page" : undefined}
                className={`relative text-[13.5px] transition-colors ${
                  active
                    ? "font-semibold text-[var(--octo-brand)] after:absolute after:inset-x-0 after:-bottom-[17px] after:h-[2px] after:bg-[var(--octo-brand)]"
                    : "text-[var(--octo-text-primary)] hover:text-[var(--octo-brand)]"
                }`}
              >
                {t(entry.key)}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <SwitchLocale locale={locale} />

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
            {NAV.map((entry) => (
              <li key={entry.href}>
                <Link
                  href={entry.href}
                  onClick={() => setDrawerOpen(false)}
                  className="block py-2.5 text-[13.5px] text-[var(--octo-text-primary)]"
                >
                  {t(entry.key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
