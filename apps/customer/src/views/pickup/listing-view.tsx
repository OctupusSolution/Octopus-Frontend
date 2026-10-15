"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { MenuItem } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useMenuFilters } from "@/features/menu/filter-items";
import { useMobileFlow } from "@/shared/lib/flow-context";
import { filterItems } from "@/shared/lib/storefront";
import { TableBackTitle, TableIcon } from "@/shared/ui/table";
import { TableItemGrid } from "@/widgets/table-item-card";
import { TableFooter, TableTopCard } from "@/widgets/table-shell";
import { FILTER_KEYS, FilterSheet } from "../table/menu-view";

export interface PickupListingViewProps {
  /** Which of the two shelves this is; it picks the title and the items. */
  kind: "offers" | "bestSellers";
  items: MenuItem[];
}

const BADGE = { offers: "offer", bestSellers: "best_seller" } as const;
const TITLE = { offers: "store.nav.offers", bestSellers: "store.nav.bestSellers" } as const;

/** A whole shelf of the home screen — the offers, or the best sellers — with
 *  the menu's filter one tap away. */
export function PickupListingView({ kind, items }: PickupListingViewProps) {
  const { t } = useI18n();
  const flow = useMobileFlow();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { filters, setParam, toggleInList } = useMenuFilters();
  const [sheetOpen, setSheetOpen] = useState(false);

  const shelf = items.filter((item) => item.badges?.includes(BADGE[kind]));
  const visible = filterItems(shelf, filters);

  function resetFilters() {
    const next = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((key) => next.delete(key));
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4">
        <TableTopCard />

        <div className="flex flex-col gap-6 px-4">
          <div className="flex items-center justify-between">
            <TableBackTitle title={t(TITLE[kind])} backHref={flow.home} backLabel={t("store.table.back")} />
            <button
              type="button"
              aria-label={t("store.filter.toggle")}
              aria-expanded={sheetOpen}
              onClick={() => setSheetOpen(true)}
              className="flex size-10 shrink-0 items-center rounded-[12px] border border-gray-300 bg-[var(--octo-store-select)] p-2"
            >
              <TableIcon name="filter" />
            </button>
          </div>

          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-[14px] text-[var(--octo-store-select-label)]">{t("store.filter.empty")}</p>
              {shelf.length > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[14px] font-medium text-[var(--octo-store-select-text)]"
                >
                  {t("store.filter.clear")}
                </button>
              )}
            </div>
          ) : (
            <TableItemGrid items={visible} />
          )}
        </div>
      </div>

      <TableFooter />

      <FilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        setParam={setParam}
        toggleInList={toggleInList}
        onReset={resetFilters}
      />
    </div>
  );
}
