// The middle column of step 2: "Item Information" and its five tabs.
//
// The Modifiers tab is stubbed here and filled by the next task, which also
// swaps the right-hand rail from the live preview to the customer-view
// modifier preview — the one place in the wizard that rail is not the preview.
import clsx from "clsx";
import type { Item, ModifierGroup, ModifierOption } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { TabGeneral } from "./tab-general";
import { TabPricing } from "./tab-pricing";
import { TabNutrition } from "./tab-nutrition";
import { TabAllergies } from "./tab-allergies";
import { TabModifiers } from "./tab-modifiers";

export const ITEM_TABS = ["general", "modifiers", "pricing", "nutrition", "allergies"] as const;
export type ItemTabId = (typeof ITEM_TABS)[number];

export function ItemTabs({
  item,
  sectionName,
  tab,
  onTabChange,
  onPatch,
  modifiers,
}: {
  item: Item;
  sectionName: string;
  tab: ItemTabId;
  onTabChange: (tab: ItemTabId) => void;
  onPatch: (patch: Partial<Item>) => void;
  modifiers: {
    selectedGroupId: string | null;
    onSelectGroup: (id: string) => void;
    onAddGroup: (group: Pick<ModifierGroup, "name" | "required" | "type">) => void;
    onPatchGroup: (groupId: string, patch: Partial<ModifierGroup>) => void;
    onRemoveGroup: (groupId: string) => void;
    onAddOption: (groupId: string, option: Omit<ModifierOption, "id">) => void;
    onRemoveOption: (groupId: string, optionId: string) => void;
  };
}) {
  const { t } = useI18n();

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      {/* The frames title the card after the Allergies tab when it is open,
          and "Item Information" for every other tab. */}
      <h2 className="text-[20px] font-semibold text-[var(--octo-text-primary)]">
        {t(tab === "allergies" ? "menuWiz.item.tab.allergies" : "menuWiz.item.infoTitle")}
      </h2>
      <p className="mt-1 text-[16px] font-medium text-[var(--octo-text-primary)]">{sectionName}</p>

      <div className="mt-3 flex flex-wrap justify-between gap-x-5 gap-y-1 border-b border-[var(--octo-border-card)]">
        {ITEM_TABS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={clsx(
              "-mb-px border-b-2 px-1 pb-2 text-[16px]",
              tab === id
                ? "border-[var(--octo-accent)] font-medium text-[var(--octo-accent)]"
                : "border-transparent text-[var(--octo-text-primary)]"
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
        {tab === "modifiers" && <TabModifiers item={item} {...modifiers} />}
      </div>
    </section>
  );
}
