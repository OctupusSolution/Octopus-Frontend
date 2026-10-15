"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { useFavorites } from "@/features/menu/toggle-favorite";
import { useMobileFlow } from "@/shared/lib/flow-context";
import { flowItemHref } from "@/shared/lib/table-flow";
import { TableIcon, TableMoney } from "@/shared/ui/table";
import { quickAddOf } from "./quick-add";

export interface TableItemCardProps {
  item: MenuItem;
  /** The cart's "you may also like" cards carry the favourite heart; the rest do not. */
  favorite?: boolean;
}

function BestSellerBadge({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-[20px] bg-[var(--octo-store-select)] px-2 py-1 text-[10px] leading-none text-gray-900">
      <span className="flex size-4 shrink-0 items-center justify-center rounded-[12px] bg-ocean-blue">
        <TableIcon name="fire-white" size={12} />
      </span>
      {label}
    </span>
  );
}

/** The whole card opens the item. The link stretches over the card as an overlay
 *  rather than wrapping the buttons, because a button inside an anchor is invalid. */
export function TableItemCard({ item, favorite = false }: TableItemCardProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { addLine } = useOrderingSession();
  const { isFavorite, toggle } = useFavorites();

  const href = flowItemHref(useMobileFlow(), item.id);
  const bestSeller = item.badges?.includes("best_seller") ?? false;
  const liked = isFavorite(item.id);

  const quickAdd = quickAddOf(item);

  function handleAdd() {
    // An item with choices to make is added from its own screen, where they are made.
    if (quickAdd === "open") {
      router.push(href);
      return;
    }
    if (quickAdd === "add") addLine(item.id, item.name, item.priceSar, 1, [], "");
  }

  return (
    <article className="relative flex flex-col gap-2 overflow-hidden rounded-[20px] border border-gray-300">
      <div className="relative h-[178px] shrink-0 bg-[var(--octo-store-photo)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          className="absolute inset-x-3 bottom-2 h-[110px] w-[calc(100%-24px)] object-contain"
        />

        <div className="absolute inset-x-2 top-2 z-10 flex items-center justify-between">
          {favorite && (
            <button
              type="button"
              aria-label={liked ? t("store.card.unfavorite") : t("store.card.favorite")}
              aria-pressed={liked}
              onClick={() => toggle(item.id)}
              className={`flex size-9 items-center justify-center rounded-[20px] ${
                liked ? "bg-[var(--octo-store-select)]" : "bg-white"
              }`}
            >
              <TableIcon name="heart" />
            </button>
          )}
          {bestSeller && <BestSellerBadge label={t("store.card.bestSeller")} />}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <Link href={href} className="flex flex-col gap-2 px-2">
          <span className="absolute inset-0" aria-hidden="true" />
          <span className="flex flex-col gap-1">
            {item.rating !== undefined && (
              <span className="flex items-center gap-1 text-[10px] font-medium leading-none text-[var(--octo-store-select-label)]">
                <TableIcon name="star" size={12} />
                {item.rating}
              </span>
            )}
            <span className="text-[14px] font-bold leading-none text-gray-900">{item.name}</span>
          </span>
          <span className="line-clamp-3 text-[10px] leading-[1.5] text-[var(--octo-store-select-label)]">
            {item.description}
          </span>
        </Link>

        <div className="mt-auto flex items-center justify-between px-2 pb-2">
          <div className="flex flex-col gap-1">
            <TableMoney
              amount={item.priceSar}
              className="text-[14px] font-bold text-[var(--octo-store-price)]"
              currencyClassName="text-[10px] font-light"
            />
            {item.compareAtPriceSar !== undefined && item.compareAtPriceSar > item.priceSar && (
              <TableMoney
                amount={item.compareAtPriceSar}
                className="text-[10px] text-[var(--octo-store-select-label)] line-through"
              />
            )}
          </div>

          <button
            type="button"
            aria-label={t("store.card.addToCart")}
            onClick={handleAdd}
            disabled={quickAdd === "none"}
            className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-ocean-blue disabled:cursor-not-allowed disabled:opacity-40"
          >
            <TableIcon name="bag-white" />
          </button>
        </div>
      </div>
    </article>
  );
}

export interface TableItemGridProps {
  items: MenuItem[];
  favorite?: boolean;
}

/** Two cards to a row, as every listing in the flow lays them out. */
export function TableItemGrid({ items, favorite }: TableItemGridProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item) => (
        <TableItemCard key={item.id} item={item} favorite={favorite} />
      ))}
    </div>
  );
}
