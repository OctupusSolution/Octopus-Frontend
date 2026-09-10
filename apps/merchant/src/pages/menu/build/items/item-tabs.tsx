// The middle column of step 2: "Item Information" and its five tabs.
//
// The Modifiers tab is stubbed here and filled by the next task, which also
// swaps the right-hand rail from the live preview to the customer-view
// modifier preview — the one place in the wizard that rail is not the preview.
import clsx from "clsx";
import { EmptyState } from "@ui/primitives";
import type { Item } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { TabGeneral } from "./tab-general";
import { TabPricing } from "./tab-pricing";
import { TabNutrition } from "./tab-nutrition";
import { TabAllergies } from "./tab-allergies";

export const ITEM_TABS = ["general", "modifiers", "pricing", "nutrition", "allergies"] as const;
export type ItemTabId = (typeof ITEM_TABS)[number];

export function ItemTabs({
  item,
  sectionName,
  tab,
  onTabChange,
  onPatch,
}: {
  item: Item;
  sectionName: string;
  tab: ItemTabId;
  onTabChange: (tab: ItemTabId) => void;
  onPatch: (patch: Partial<Item>) => void;
}) {
  const { t } = useI18n();

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
        {t("menuWiz.item.infoTitle")}
      </h2>
      <p className="mt-1 text-[15px] font-medium text-[var(--octo-text-primary)]">{sectionName}</p>

      <div className="mt-3 flex flex-wrap gap-5 border-b border-[var(--octo-border-card)]">
        {ITEM_TABS.map((id) => (
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
            {t(`menuWiz.item.tab.${id}`)}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "general" && <TabGeneral item={item} onPatch={onPatch} />}
        {tab === "pricing" && <TabPricing item={item} onPatch={onPatch} />}
        {tab === "nutrition" && <TabNutrition item={item} onPatch={onPatch} />}
        {tab === "allergies" && <TabAllergies item={item} onPatch={onPatch} />}
        {tab === "modifiers" && <EmptyState title={t("menuWiz.item.tab.modifiers")} />}
      </div>
    </section>
  );
}
