"use client";

import Link from "next/link";
import type { MenuCategory, MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { bestSellers, offers } from "@/shared/lib/storefront";
import { useMobileFlow } from "@/shared/lib/flow-context";
import type { MobileFlow } from "@/shared/lib/table-flow";
import { DoodlePattern } from "@/shared/ui";
import { TableIcon, TableSectionTitle } from "@/shared/ui/table";
import { TableItemGrid } from "@/widgets/table-item-card";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";

export interface TableHomeViewProps {
  categories: MenuCategory[];
  items: MenuItem[];
}

const HERO_ACTION =
  "flex h-12 w-full items-center justify-center gap-2 rounded-[24px] text-[18px] font-bold leading-none text-white";

interface Tile {
  key: string;
  label: string;
  href: string;
  imageUrl: string;
  wide: boolean;
  /** The photograph hugs one edge and the label sits against the other. */
  imageAt: "start" | "end";
}

/** The design's mosaic: a pair, the offers banner, a banner for the third
 *  category, then pairs again. Within a pair the photographs face outwards. */
export function buildTiles(categories: MenuCategory[], offersLabel: string, flow: MobileFlow): Tile[] {
  const tiles: Tile[] = [];
  const categoryTile = (category: MenuCategory, wide: boolean, imageAt: Tile["imageAt"]): Tile => ({
    key: category.id,
    label: category.name,
    href: `${flow.menu}?category=${category.slug}`,
    imageUrl: category.imageUrl,
    wide,
    imageAt,
  });

  categories.forEach((category, index) => {
    if (index === 2) {
      tiles.push({
        key: "offers",
        label: offersLabel,
        href: flow.offers,
        imageUrl: "/images/storefront/burger.webp",
        wide: true,
        imageAt: "start",
      });
      tiles.push(categoryTile(category, true, "end"));
      return;
    }
    const position = index < 2 ? index : index - 3;
    tiles.push(categoryTile(category, false, position % 2 === 0 ? "start" : "end"));
  });

  return tiles;
}

export function CategoryTile({ tile }: { tile: Tile }) {
  const atStart = tile.imageAt === "start";

  return (
    <Link
      href={tile.href}
      className={`relative block overflow-hidden rounded-[20px] bg-[var(--octo-store-tile)] ${
        tile.wide ? "col-span-2 aspect-[384/206]" : "h-[206px]"
      }`}
    >
      <DoodlePattern className="absolute inset-0 size-full text-[#d9dde3] opacity-60" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={tile.imageUrl}
        alt=""
        loading="lazy"
        className={`absolute top-1/2 max-w-none -translate-y-1/2 object-contain ${
          tile.wide ? "h-[96%] w-[52%]" : "h-full w-[126%]"
        } ${
          atStart
            ? tile.wide ? "start-[-4%]" : "start-[-68%]"
            : tile.wide ? "end-[-4%]" : "end-[-68%]"
        }`}
      />
      <span
        className={`absolute bottom-6 text-[16px] font-bold leading-none text-gray-900 ${
          atStart ? (tile.wide ? "end-6" : "end-3") : tile.wide ? "start-6" : "start-4"
        }`}
      >
        {tile.label}
      </span>
    </Link>
  );
}

function ShowMore({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 self-center rounded-[20px] bg-gray-100 p-2 text-[12px] font-bold leading-none text-[var(--octo-store-price)]"
    >
      {label}
      <TableIcon name="arrow-left" className="ltr:-scale-x-100" />
    </Link>
  );
}

export function TableHomeView({ categories, items }: TableHomeViewProps) {
  const { t } = useI18n();
  const flow = useMobileFlow();
  const tiles = buildTiles(categories, t("store.nav.offers"), flow);
  const best = bestSellers(items);
  const picks = offers(items);

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-6">
        <div>
          <TableTopCard />

          <section className="relative isolate min-h-[416px] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/table/hero.jpg"
              alt=""
              className="absolute inset-0 -z-10 size-full object-cover"
            />
            <div className="absolute inset-0 -z-10 bg-[rgba(1,39,61,0.5)]" aria-hidden="true" />

            <div className="flex flex-col gap-6 px-4 pb-8 pt-12">
              <div className="flex flex-col gap-3 text-center">
                <h1 className="text-[40px] font-bold leading-[1.3] text-white">{t("store.hero.title")}</h1>
                <p className="text-[16px] font-medium leading-[1.5] text-gray-200">
                  {t("store.hero.subtitle")}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link href={flow.menuIndex} className={`${HERO_ACTION} bg-white/25`}>
                  <TableIcon name="clipboard-white" />
                  {t("store.hero.viewMenu")}
                </Link>
                <Link
                  href={flow.booking}
                  className={`${HERO_ACTION} border-2 border-white/50 bg-white/[0.08]`}
                >
                  <span className="flex size-6 items-center justify-center">
                    <TableIcon name="table-white-24" size={[21.5, 18.5]} />
                  </span>
                  {t("store.hero.bookTable")}
                </Link>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-6 px-4">
          <section className="flex flex-col gap-4">
            <TableSectionTitle id="menu" title={t("store.section.menu")} />
            <div className="grid grid-cols-2 gap-4">
              {tiles.map((tile) => (
                <CategoryTile key={tile.key} tile={tile} />
              ))}
            </div>
          </section>

          {best.length > 0 && (
            <section className="flex flex-col gap-8">
              <TableSectionTitle id="best-sellers" title={t("store.nav.bestSellers")} />
              <div className="flex flex-col gap-4">
                <TableItemGrid items={best} />
                <ShowMore href={flow.bestSellers} label={t("store.table.showMore")} />
              </div>
            </section>
          )}

          {picks.length > 0 && (
            <section className="flex flex-col gap-8">
              <TableSectionTitle id="offers" title={t("store.table.chefPicks")} />
              <div className="flex flex-col gap-4">
                <TableItemGrid items={picks} />
                <ShowMore
                  href={flow.mode === "table" ? flow.menu : flow.offers}
                  label={t("store.table.showMore")}
                />
              </div>
            </section>
          )}
        </div>
      </div>

      <TableFooter />
    </div>
  );
}
