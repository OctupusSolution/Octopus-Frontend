// The offer editor — what the middle column becomes when the offers section is
// selected in step 2.
//
// Five tabs, none of them the item editor's. Reading that as "a section has a
// kind" rather than "offers are a special item" is what keeps the two editors
// from growing into each other.
import clsx from "clsx";
import { EmptyState } from "@ui/primitives";
import type { Menu, Offer } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { TabInfo } from "./tab-info";
import { TabItems } from "./tab-items";
import { TabPricing } from "./tab-pricing";
import { TabAvailability } from "./tab-availability";
import { TabChannels } from "./tab-channels";

export const OFFER_TABS = ["info", "items", "pricing", "availability", "channels"] as const;
export type OfferTabId = (typeof OFFER_TABS)[number];

/** What the footer's Next Step is gated on. The `-actions` frame shows a red
 *  bar naming the incomplete tabs, so the check has to know which tab each
 *  failure belongs to rather than returning one boolean. */
export function incompleteTabs(offer: Offer): OfferTabId[] {
  const missing: OfferTabId[] = [];
  if (offer.name.trim() === "" || offer.slug.trim() === "") missing.push("info");
  if (offer.entries.length === 0) missing.push("items");
  if (offer.pricing.offerPrice <= 0) missing.push("pricing");
  if (!Object.values(offer.channels).some(Boolean)) missing.push("channels");
  return missing;
}

export function OffersEditor({
  menu,
  offer,
  tab,
  onTabChange,
  onPatch,
  onSetEntry,
  onRemoveEntry,
}: {
  menu: Menu;
  offer: Offer | null;
  tab: OfferTabId;
  onTabChange: (tab: OfferTabId) => void;
  onPatch: (patch: Partial<Offer>) => void;
  onSetEntry: (itemId: string, qty: number, price: number) => void;
  onRemoveEntry: (itemId: string) => void;
}) {
  const { t } = useI18n();

  if (!offer) {
    return (
      <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
        <EmptyState title={t("menuOffer.addNew")} />
      </section>
    );
  }

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
        {t("menuOffer.infoTitle")}
      </h2>
      <p className="mt-1 text-[15px] font-medium text-[var(--octo-text-primary)]">{offer.name}</p>

      <div className="mt-3 flex flex-wrap gap-5 border-b border-[var(--octo-border-card)]">
        {OFFER_TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={clsx(
              "-mb-px border-b-2 pb-2 text-[14px]",
              tab === id
                ? "border-[var(--octo-accent)] font-medium text-[var(--octo-accent)]"
                : "border-transparent text-[var(--octo-text-secondary)]"
            )}
          >
            {t(`menuOffer.tab.${id}`)}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "info" && <TabInfo offer={offer} onPatch={onPatch} />}
        {tab === "items" && (
          <TabItems
            menu={menu}
            offer={offer}
            onSetEntry={onSetEntry}
            onRemoveEntry={onRemoveEntry}
            onPatch={onPatch}
          />
        )}
        {tab === "pricing" && <TabPricing menu={menu} offer={offer} onPatch={onPatch} />}
        {tab === "availability" && <TabAvailability offer={offer} onPatch={onPatch} />}
        {tab === "channels" && <TabChannels offer={offer} onPatch={onPatch} />}
      </div>
    </section>
  );
}
