"use client";

import type { MenuCategory } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useMobileFlow } from "@/shared/lib/flow-context";
import { TableBackTitle } from "@/shared/ui/table";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { buildTiles, CategoryTile } from "../table/home-view";

export interface PickupCategoriesViewProps {
  categories: MenuCategory[];
}

/** "The menu" as its own screen: the home screen's mosaic of categories. */
export function PickupCategoriesView({ categories }: PickupCategoriesViewProps) {
  const { t } = useI18n();
  const flow = useMobileFlow();
  const tiles = buildTiles(categories, t("store.nav.offers"), flow);

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <TableTopCard />

        <div className="flex flex-col gap-4 px-4">
          <TableBackTitle title={t("store.nav.menu")} backHref={flow.home} backLabel={t("store.table.back")} />
          <div className="grid grid-cols-2 gap-4">
            {tiles.map((tile) => (
              <CategoryTile key={tile.key} tile={tile} />
            ))}
          </div>
        </div>
      </div>

      <TableFooter />
    </div>
  );
}
