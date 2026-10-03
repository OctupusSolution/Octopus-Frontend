"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MenuCategory, MenuItem, OrderLine } from "@octopus/api-client";
import { useI18n } from "@/app/providers";
import { useOrderingSession } from "@/entities/order";
import type { Tenant } from "@/entities/tenant";
import type { FulfillmentChannel } from "@/shared/lib/fulfillment";
import { PageHeading, SelectableCard } from "@/shared/ui";
import { OrderSummaryCard } from "@/widgets/order-summary-card";

interface ChannelOption {
  channel: FulfillmentChannel;
  icon: string;
  titleKey: string;
  bodyKey: string;
  /** Where the channel continues. Delivery still collects its address on the
   *  checkout page; the other two have a screen of their own. */
  href: string;
}

// Listed as the design reads them right-to-left: dining in is nearest the
// page's start edge, scheduling furthest from it.
const OPTIONS: readonly ChannelOption[] = [
  {
    channel: "dine_in",
    icon: "/images/storefront/fulfillment-dine-in.svg",
    titleKey: "store.fulfillment.dineInTitle",
    bodyKey: "store.fulfillment.dineInBody",
    href: "/fulfillment/dine-in",
  },
  {
    channel: "takeaway",
    icon: "/images/storefront/fulfillment-pickup.svg",
    titleKey: "store.fulfillment.pickupTitle",
    bodyKey: "store.fulfillment.pickupBody",
    href: "/fulfillment/pickup",
  },
  {
    channel: "delivery",
    icon: "/images/storefront/fulfillment-delivery.svg",
    titleKey: "store.fulfillment.deliveryTitle",
    bodyKey: "store.fulfillment.deliveryBody",
    href: "/checkout",
  },
  {
    channel: "scheduled",
    icon: "/images/storefront/fulfillment-scheduled.svg",
    titleKey: "store.fulfillment.scheduledTitle",
    bodyKey: "store.fulfillment.scheduledBody",
    href: "/fulfillment/pickup?when=scheduled",
  },
];

export interface FulfillmentViewProps {
  tenant: Tenant;
  categories: MenuCategory[];
  items: MenuItem[];
}

export function FulfillmentView({ tenant, categories, items }: FulfillmentViewProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { state, setChannel } = useOrderingSession();

  function itemFor(line: OrderLine): MenuItem | null {
    return items.find((i) => i.id === line.menuItemId) ?? null;
  }

  function editHrefFor(line: OrderLine): string {
    const item = itemFor(line);
    if (!item) return "/menu";
    const category = categories.find((c) => c.id === item.categoryId);
    if (!category) return "/menu";
    return `/menu/${category.slug}/${item.id}?line=${line.lineId}`;
  }

  function choose(option: ChannelOption) {
    setChannel(tenant.id, option.channel);
    router.push(option.href);
  }

  if (state.lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-16 text-center">
        <p className="text-[16px] text-[var(--octo-store-body)]">{t("store.cart.empty")}</p>
        <Link
          href="/menu"
          className="text-[16px] font-medium text-[var(--color-ocean-blue)] hover:underline"
        >
          {t("store.cart.browse")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-[58px] px-4 pb-1 pt-[58px] sm:px-6">
      <PageHeading title={t("store.fulfillment.title")} />

      <div className="flex flex-col gap-12">
        <div className="flex flex-col gap-4">
          {state.lines.map((line) => (
            <OrderSummaryCard
              key={line.lineId}
              line={line}
              imageUrl={itemFor(line)?.imageUrl ?? null}
              editHref={editHrefFor(line)}
            />
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {OPTIONS.map((option) => (
            <SelectableCard
              key={option.channel}
              onClick={() => choose(option)}
              className="flex items-center p-4"
            >
              <span className="flex w-full flex-col items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={option.icon} alt="" className="h-[97px] w-[97px] shrink-0" />
                <span className="flex w-full flex-col items-center gap-3 text-center">
                  <span className="text-[18px] font-bold leading-none text-[var(--color-gray-900)]">
                    {t(option.titleKey)}
                  </span>
                  <span className="text-[14px] font-medium leading-[1.5] text-[var(--octo-store-select-label)]">
                    {t(option.bodyKey)}
                  </span>
                </span>
              </span>
            </SelectableCard>
          ))}
        </div>
      </div>
    </div>
  );
}
