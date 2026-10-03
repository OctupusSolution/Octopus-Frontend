// The middle column of step 2: "Item Information" and its five tabs.
//
// Modifiers never renders here: its frames drop this card and give the whole
// width to the group list, the Edit Group form and the customer preview, so
// the step draws that layout itself under the bare tab bar exported below.
import clsx from "clsx";
import type { Item } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";
import { PANEL, TEXT, TEXT_GRAY } from "../../_shared/theme";
import { LABEL_16 } from "./ui";
import type { ItemForm, NutritionRow } from "./use-item-form";
import { TabGeneral } from "./tab-general";
import { TabPricing } from "./tab-pricing";
import { TabNutrition } from "./tab-nutrition";
import { TabAllergies } from "./tab-allergies";

export const ITEM_TABS = ["general", "modifiers", "pricing", "nutrition", "allergies"] as const;
export type ItemTabId = (typeof ITEM_TABS)[number];

/** The frames' tab row: 14px medium, a 1px rule, the open tab in blue.
 *  `spread` lays the tabs across the card; without it they sit 32px apart. */
export function ItemTabBar({
  tab,
  onTabChange,
  spread,
  className,
}: {
  tab: ItemTabId;
  onTabChange: (tab: ItemTabId) => void;
  spread?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div
      role="tablist"
      className={clsx(
        "flex border-b border-[#e2e8f0] [[data-theme=dark]_&]:border-[var(--octo-border-card)]",
        spread ? "w-full justify-between gap-2" : "w-fit max-w-full flex-wrap gap-x-8",
        className
      )}
    >
      {ITEM_TABS.map((id) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={tab === id}
          onClick={() => onTabChange(id)}
          className={clsx(
            "-mb-px whitespace-nowrap border-b pb-[11px] pt-1 text-[14px] font-medium leading-[14px]",
            tab === id ? "border-[#0D6EFD] text-[#0D6EFD]" : `border-transparent ${TEXT_GRAY}`
          )}
        >
          {t(`menuWiz.item.tab.${id}`)}
        </button>
      ))}
    </div>
  );
}

export function ItemTabs({
  item,
  sectionName,
  tab,
  onTabChange,
  onPatch,
  form,
  nutritionRows,
}: {
  item: Item;
  sectionName: string;
  tab: ItemTabId;
  onTabChange: (tab: ItemTabId) => void;
  onPatch: (patch: Partial<Item>) => void;
  form: ItemForm;
  nutritionRows: readonly NutritionRow[];
}) {
  const { t } = useI18n();

  return (
    <section className={clsx("flex flex-col gap-4", PANEL)}>
      {/* The frames title the card after the Allergies tab when it is open,
          and "Item Information" for every other tab. */}
      <h2 className={clsx("text-[18px] font-bold leading-[18px]", TEXT)}>
        {t(tab === "allergies" ? "menuWiz.item.tab.allergies" : "menuWiz.item.infoTitle")}
      </h2>

      <div className="flex flex-col gap-4">
        <p className={clsx("truncate", LABEL_16)}>{sectionName}</p>
        <ItemTabBar tab={tab} onTabChange={onTabChange} spread />
      </div>

      {tab === "general" && <TabGeneral item={item} onPatch={onPatch} form={form} />}
      {tab === "pricing" && <TabPricing item={item} onPatch={onPatch} form={form} />}
      {tab === "nutrition" && <TabNutrition item={item} onPatch={onPatch} form={form} rows={nutritionRows} />}
      {tab === "allergies" && <TabAllergies item={item} onPatch={onPatch} />}
    </section>
  );
}
