"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import type { Locale } from "@i18n/index";
import { useOrderingSession } from "@/entities/order";
import { SwitchLocale } from "@/features/session/switch-locale";

export interface SiteHeaderProps {
  locale: Locale;
}

export function SiteHeader({ locale }: SiteHeaderProps) {
  const { state } = useOrderingSession();
  const itemCount = state.lines.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--octo-border-card)] bg-[var(--octo-card)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-[26px]">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/octopus-OCTOPUS LOGO.svg" alt="OCTOPUS" className="h-7 w-7" />
        </Link>

        <div className="flex items-center gap-3">
          <SwitchLocale locale={locale} />

          <Link
            href="/cart"
            aria-label="cart"
            className="relative grid h-9 w-9 place-items-center rounded-[9px] border border-[var(--octo-border-input)] bg-[var(--octo-card)] text-[var(--octo-text-secondary)] transition-colors hover:bg-[var(--octo-hover)]"
          >
            <ShoppingCart size={16} />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 end-[-6px] grid h-4 min-w-4 place-items-center rounded-full bg-[#0D6EFD] px-1 text-[10px] font-semibold text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
