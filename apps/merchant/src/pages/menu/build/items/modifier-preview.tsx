// "Item summary" and "Full Modifiers Preview (Customer view)" — the right-hand
// rail while the Modifiers tab is open. This is the one place in the wizard
// that rail is not the storefront preview.
//
// Nothing here is operable: it depicts a customer's choices, it does not take
// them. Every control is a glyph, so a screen reader is not told there is a
// form to fill in and a click does not silently change the draft.
import clsx from "clsx";
import { modifierTotal, type Item, type ModifierGroup } from "@/entities/menu";
import { MediaTile } from "@/shared/ui/media-tile";
import { useI18n } from "@/app/providers/i18n-provider";
import { INFO_STRIP, LINE, SURFACE_BLUE, TEXT, TEXT_GRAY } from "../../_shared/theme";
import { CheckGlyph, PRICE_TEXT, RadioGlyph } from "./ui";

/** The storefront quotes modifier prices to the halala, so the preview does. */
function money(value: number): string {
  return value.toFixed(2);
}

const ROW_RULE = "border-b border-[#e2e8f0] [[data-theme=dark]_&]:border-[var(--octo-border-card)]";

function GroupPreview({ group, index }: { group: ModifierGroup; index: number }) {
  const single = group.type === "single";
  // A group nobody pays extra for (the frame's sauces) lists names only.
  const priced = group.options.some((option) => option.price > 0);

  return (
    <div className={clsx("flex flex-col gap-2 rounded-[12px] border p-2", LINE)}>
      <p className={clsx("truncate text-[14px] font-medium leading-[14px]", TEXT)}>
        {index + 1}- {group.customerLabel || group.name}
        {group.required && <span className="text-[#d30202]"> *</span>}
      </p>

      {group.options.length > 0 && (
        <ul className="flex flex-col">
          {group.options.map((option, optionIndex) => {
            const selected = option.isDefault && option.available;
            const last = optionIndex === group.options.length - 1;
            return (
              <li
                key={option.id}
                className={clsx(
                  "flex items-center justify-between gap-2 px-1 py-2",
                  !last && ROW_RULE,
                  selected && single && `rounded-[4px] ${SURFACE_BLUE}`,
                  !option.available && "opacity-50"
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {single ? <RadioGlyph checked={selected} /> : <CheckGlyph checked={selected} />}
                  <span className="flex min-w-0 flex-col gap-1">
                    <span
                      className={clsx(
                        "truncate font-medium",
                        option.subLabel ? "text-[14px] leading-[14px]" : "text-[12px] leading-3",
                        TEXT
                      )}
                    >
                      {option.name}
                    </span>
                    {option.subLabel && (
                      <span className={clsx("truncate text-[10px] font-medium leading-[10px]", TEXT_GRAY)}>{option.subLabel}</span>
                    )}
                  </span>
                </span>
                {priced && (
                  <span dir="ltr" className={clsx("shrink-0 whitespace-nowrap text-[14px] font-semibold leading-[14px]", TEXT)}>
                    {option.priceType === "add-amount" && option.price > 0 ? "+" : ""}
                    SAR {money(option.price)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ModifierPreview({ item }: { item: Item }) {
  const { t } = useI18n();
  const hasGroups = item.modifierGroups.length > 0;

  return (
    <section className="flex flex-col gap-4 overflow-hidden rounded-[28px] bg-[var(--octo-card)] p-4 shadow-[0px_0px_8px_0px_rgba(0,0,0,0.05)] [[data-theme=dark]_&]:border [[data-theme=dark]_&]:border-[var(--octo-border-card)]">
      {/* The first-time frame titles the card in 18px bold; once there are
          groups it drops to the 16px medium the other rails use. */}
      <h2 className={clsx(hasGroups ? "text-[16px] font-medium leading-4" : "text-[18px] font-bold leading-[18px]", TEXT)}>
        {t("menuWiz.mod.summaryTitle")}
      </h2>

      <div className={clsx("flex h-[94px] items-center gap-2 rounded-[20px] border border-[#0D6EFD] p-2", SURFACE_BLUE)}>
        <span className="size-[76px] shrink-0 overflow-hidden rounded-[4px]">
          <MediaTile src={item.image} rounded="rounded-[4px]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <div className="flex flex-col gap-1">
            <p className={clsx("truncate text-[12px] font-semibold leading-3", TEXT)}>{item.name}</p>
            <p className={clsx("line-clamp-3 text-[10px] leading-[1.4]", TEXT_GRAY)}>{item.description}</p>
          </div>
          <p className={clsx("text-[12px] font-semibold leading-3", PRICE_TEXT)}>SAR {item.pricing.price}</p>
        </div>
      </div>

      {/* The first-time frame shows the summary alone: an empty "customer
          view" with only a Total line would preview nothing. */}
      {hasGroups && (
        <div className={clsx("flex flex-col gap-4 rounded-[20px] border p-2", LINE)}>
          <p className={clsx("text-[14px] font-bold leading-[14px]", TEXT)}>
            {t("menuWiz.mod.previewTitle")}{" "}
            <span className="text-[10px] font-medium leading-[10px]">({t("menuWiz.mod.previewHint")})</span>
          </p>

          {item.modifierGroups.map((group, index) => (
            <GroupPreview key={group.id} group={group} index={index} />
          ))}

          {/* Derived, never typed: base price plus every pre-selected surcharge.
              The frame's SAR 113 is 100 + 8 + 2 + 3. */}
          <div className={clsx("flex h-10 items-center justify-between gap-3 rounded-[8px] px-3 text-[14px] leading-[14px]", INFO_STRIP)}>
            <span className={clsx("font-medium", TEXT)}>{t("menuWiz.mod.previewTotal")}</span>
            <span className={clsx("font-bold underline [text-underline-position:from-font]", PRICE_TEXT)}>
              SAR {modifierTotal(item)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
