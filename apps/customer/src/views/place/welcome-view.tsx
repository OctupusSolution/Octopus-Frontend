"use client";

import { useEffect } from "react";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import { usePlaceScan } from "@/features/place/place-scan-context";
import { PLACE_ROUTES } from "@/shared/lib/table-flow";
import { TableButton, TableIcon } from "@/shared/ui/table";
import { TABLE_BRAND_FALLBACK_LOGO, useTableBrand } from "@/widgets/table-shell";

// The table welcome screen without "pay from your phone": a scanned code sends the order and
// the bill is settled at the table.
const FEATURES = [
  { icon: "feature-table", key: "store.table.featureDeliver" },
  { icon: "feature-add", key: "store.table.featureAdd" },
] as const;

/** The first screen of a scanned place code: which restaurant and table this is. */
export function PlaceWelcomeView() {
  const { t } = useI18n();
  const brand = useTableBrand();
  const { key, scan, ordering } = usePlaceScan();
  const { setTable, setChannel } = useOrderingSession();
  const place = scan.place;

  useEffect(() => {
    if (place?.number) setTable(place.number);
    setChannel("", "dine_in");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place?.number]);

  const tableName = place?.name && place.name !== place.number ? ` · ${place.name}` : "";

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--octo-store-select-text)] pt-[max(16px,env(safe-area-inset-top))]">
      <div className="mx-4 flex h-12 shrink-0 items-center justify-between rounded-[50px] bg-white px-4 text-[14px] font-semibold leading-none text-black">
        <p className="flex min-w-0 items-center gap-1">
          <TableIcon name="location-dark" size={16} />
          <span className="truncate">{brand.name}</span>
        </p>
        <p className="flex items-center gap-1">
          <span className="flex size-4 items-center justify-center">
            <TableIcon name="table-dark" size={[14.33, 12.33]} />
          </span>
          {t("store.place.tableLabel", { n: place?.number ?? "—" })}
          {tableName}
        </p>
      </div>

      <div className="mt-8 flex flex-1 flex-col justify-between gap-8 rounded-t-[58px] bg-white px-4 py-10">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col items-center gap-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logoUrl ?? TABLE_BRAND_FALLBACK_LOGO} alt="" className="size-[146px] object-contain" />
            <div className="flex flex-col gap-4 text-center text-gray-900">
              <h1 className="text-[20px] font-bold leading-none">{t("store.table.welcomeTitle", { name: brand.name })}</h1>
              <p className="text-[14px] font-medium leading-[1.4]">{t("store.place.welcomeBody")}</p>
            </div>
          </div>

          {ordering ? (
            <ul className="flex flex-col gap-4">
              {FEATURES.map((feature) => (
                <li
                  key={feature.key}
                  className="flex items-center gap-2 rounded-[12px] border-2 border-dashed border-[var(--octo-store-select-border)] bg-[var(--octo-store-select)] p-3 text-[16px] font-medium text-gray-900"
                >
                  <TableIcon name={feature.icon} />
                  <span className="tbl-wrap-safe min-w-0 flex-1">{t(feature.key)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[12px] bg-amber-50 p-3 text-center text-[14px] font-medium text-amber-900">{t("store.place.browseOnly")}</p>
          )}
        </div>

        <TableButton href={PLACE_ROUTES(key).menu}>{t(ordering ? "store.place.start" : "store.table.browseMenu")}</TableButton>
      </div>
    </div>
  );
}
