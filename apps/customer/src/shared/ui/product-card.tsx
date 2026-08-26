"use client";

import { Flame, Heart, ShoppingBag } from "lucide-react";
import Link from "next/link";
import type { MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useFavorites } from "@/features/menu/toggle-favorite";
import { PriceBlock } from "./price-block";
import { RatingStars } from "./rating-stars";

export interface ProductCardProps {
  item: MenuItem;
  href: string;
  onAdd: (item: MenuItem) => void;
}

/** The whole card navigates to the product page. The link stretches over the
 *  card with an absolute overlay rather than wrapping the heart and bag
 *  buttons, because a button inside an anchor is invalid and swallows clicks. */
export function ProductCard({ item, href, onAdd }: ProductCardProps) {
  const { t } = useI18n();
  const { isFavorite, toggle } = useFavorites();
  const favorite = isFavorite(item.id);

  return (
    <article className="relative flex flex-col rounded-2xl border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-3 transition-shadow hover:shadow-[0_6px_20px_rgba(15,23,42,0.07)]">
      <div className="relative z-10 flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={favorite ? t("store.card.unfavorite") : t("store.card.favorite")}
          aria-pressed={favorite}
          onClick={() => toggle(item.id)}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--octo-border-card)] bg-[var(--octo-card)] transition-colors hover:bg-[var(--octo-hover)]"
        >
          <Heart
            size={13}
            className={favorite ? "fill-[#EF4444] text-[#EF4444]" : "text-[var(--octo-text-faint)]"}
          />
        </button>

        {item.badges?.includes("best_seller") && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--octo-selected)] py-0.5 pe-2 ps-0.5 text-[9px] font-semibold text-[var(--octo-text-secondary)]">
            <span className="grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full bg-[#0D6EFD]">
              <Flame size={9} className="text-white" />
            </span>
            {t("store.card.bestSeller")}
          </span>
        )}
      </div>

      <Link href={href} className="flex flex-1 flex-col">
        <span className="absolute inset-0 rounded-2xl" aria-hidden="true" />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt=""
          className="mx-auto mt-2 h-[110px] w-auto max-w-full object-contain"
          loading="lazy"
        />

        <div className="mt-3 flex items-center justify-between gap-2">
          <h3 className="truncate text-[13px] font-bold text-[var(--octo-text-primary)]">{item.name}</h3>
          {item.rating !== undefined && <RatingStars value={item.rating} />}
        </div>

        <p className="mt-1 line-clamp-2 text-[11px] leading-[1.6] text-[var(--octo-text-muted)]">
          {item.description}
        </p>
      </Link>

      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <button
          type="button"
          aria-label={t("store.card.addToCart")}
          onClick={() => onAdd(item)}
          className="relative z-10 grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-[#0D6EFD] text-white transition-opacity hover:opacity-90"
        >
          <ShoppingBag size={16} />
        </button>

        <PriceBlock item={item} />
      </div>
    </article>
  );
}
