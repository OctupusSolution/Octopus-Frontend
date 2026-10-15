"use client";

import { getMenuGroups } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { usePlaceScan } from "@/features/place/place-scan-context";
import { PLACE_ROUTES } from "@/shared/lib/table-flow";
import { TableCartView, TableMenuView, TableProductView } from "@/views/table";
import { PlaceUnavailableView } from "./unavailable-view";

// The table flow's menu, item and cart screens, fed from the scanned code's menu. Their links
// follow the MobileFlowProvider the `/p/[key]` layout sets, so they stay under the code.

function BrowseOnlyBanner() {
  const { t } = useI18n();
  const { ordering } = usePlaceScan();
  if (ordering) return null;
  return (
    <p role="status" className="sticky top-0 z-10 bg-amber-50 px-4 py-2 text-center text-[13px] font-medium text-amber-900">
      {t("store.place.browseOnly")}
    </p>
  );
}

export function PlaceMenuView() {
  const { menu } = usePlaceScan();
  return (
    <>
      <BrowseOnlyBanner />
      <TableMenuView categories={menu.categories} items={menu.items} groups={getMenuGroups()} />
    </>
  );
}

export function PlaceProductView({ itemId }: { itemId: string }) {
  const { key, menu } = usePlaceScan();
  const item = menu.items.find((i) => i.id === itemId);
  if (!item) return <PlaceUnavailableView reason="item" backHref={PLACE_ROUTES(key).menu} />;
  return (
    <>
      <BrowseOnlyBanner />
      <TableProductView item={item} items={menu.items} />
    </>
  );
}

export function PlaceCartView() {
  const { menu } = usePlaceScan();
  return (
    <>
      <BrowseOnlyBanner />
      <TableCartView items={menu.items} />
    </>
  );
}
