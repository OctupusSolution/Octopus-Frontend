"use client";

import type { MenuItem, OrderLine } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import type { Translate } from "@/shared/i18n/translate";
import { useMobileFlow } from "@/shared/lib/flow-context";
import type { TableBill } from "@/shared/lib/table-flow";
import { TableButton } from "@/shared/ui/table";
import { TableLineSummary, type TableTotalsRow } from "@/widgets/table-order";

/** The bill's rows in the order every payment screen lists them. The discount
 *  and the tip only appear once there is one. */
export function billRows(t: Translate, bill: TableBill, withTip: boolean): TableTotalsRow[] {
  return [
    { label: t("store.cart.basePrice"), amountSar: bill.baseSar },
    { label: t("store.cart.addons"), amountSar: bill.addonsSar },
    { label: t("store.fulfillment.serviceFee"), amountSar: bill.serviceFeeSar },
    { label: t("store.fulfillment.vat"), amountSar: bill.vatSar },
    ...(bill.discountSar > 0
      ? [{ label: t("store.table.discountValue"), amountSar: bill.discountSar, discount: true }]
      : []),
    ...(withTip ? [{ label: t("store.fulfillment.tip"), amountSar: bill.tipSar }] : []),
  ];
}

/** The ordered items as the payment screens recap them: one bordered card each. */
export function PayLineCards({ lines, items }: { lines: readonly OrderLine[]; items: MenuItem[] }) {
  return (
    <>
      {lines.map((line) => (
        <div
          key={line.lineId}
          className="flex min-h-24 items-center rounded-[24px] border border-gray-300 px-3 py-2"
        >
          <TableLineSummary
            line={line}
            imageUrl={items.find((item) => item.id === line.menuItemId)?.imageUrl ?? null}
          />
        </div>
      ))}
    </>
  );
}

/** A payment screen opened with nothing to pay for. */
export function PayEmpty() {
  const { t } = useI18n();
  const flow = useMobileFlow();

  return (
    <div className="flex flex-col items-center gap-4 px-4 py-12 text-center">
      <p className="text-[16px] font-medium leading-none text-[var(--octo-store-select-label)]">
        {t("store.cart.empty")}
      </p>
      <TableButton href={flow.menuIndex}>{t("store.cart.browse")}</TableButton>
    </div>
  );
}
