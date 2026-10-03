// "Item summary" and "Full Modifiers Preview (Customer view)" — the right-hand
// rail while the Modifiers tab is open. This is the one place in the wizard
// that rail is not the storefront preview.
//
// Nothing here is operable: it depicts a customer's choices, it does not take
// them. Every control is a span, so a screen reader is not told there is a form
// to fill in and a click does not silently change the draft.
import clsx from "clsx";
import { Check } from "lucide-react";
import { modifierTotal, type Item } from "@/entities/menu";
import { MediaTile } from "@/shared/ui/media-tile";
import { useI18n } from "@/app/providers/i18n-provider";

/** The storefront quotes modifier prices to the halala, so the preview does. */
function money(value: number): string {
  return value.toFixed(2);
}

export function ModifierPreview({ item }: { item: Item }) {
  const { t } = useI18n();
  const hasGroups = item.modifierGroups.length > 0;

  return (
    <section className="self-start rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h2 className="text-[20px] font-semibold text-[var(--octo-text-primary)]">
        {t("menuWiz.mod.summaryTitle")}
      </h2>

      <div className="mt-3 flex gap-3 rounded-[12px] border border-[var(--octo-accent)] p-2.5">
        <span className="h-[72px] w-[84px] shrink-0 overflow-hidden rounded-[8px]">
          <MediaTile src={item.image} rounded="rounded-[8px]" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-[var(--octo-text-primary)]">
            {item.name}
          </p>
          <p className="line-clamp-3 text-[12px] text-[var(--octo-text-secondary)]">
            {item.description}
          </p>
          <p className="mt-0.5 text-[13.5px] font-semibold text-[var(--octo-accent)]">
            SAR {item.pricing.price}
          </p>
        </div>
      </div>

      {/* The first-time frame shows the summary alone: an empty "customer
          view" with only a Total line would preview nothing. */}
      {hasGroups && (
        <div className="mt-4 rounded-[12px] border border-[var(--octo-border-card)] p-2.5">
          <p className="text-[14.5px] font-semibold text-[var(--octo-text-primary)]">
            {t("menuWiz.mod.previewTitle")}{" "}
            <span className="text-[11.5px] font-normal text-[var(--octo-text-secondary)]">
              ({t("menuWiz.mod.previewHint")})
            </span>
          </p>

          <div className="mt-2.5 space-y-3">
            {item.modifierGroups.map((group, index) => (
              <div
                key={group.id}
                className="rounded-[10px] border border-[var(--octo-border-card)] px-2.5 py-2"
              >
                <p className="text-[14px] text-[var(--octo-text-primary)]">
                  {index + 1}- {group.customerLabel || group.name}
                  {group.required && <span className="text-error"> *</span>}
                </p>

                <ul className="mt-1 divide-y divide-[var(--octo-border-card)]">
                  {group.options.map((option) => {
                    const selected = option.isDefault && option.available;
                    const single = group.type === "single";
                    return (
                      <li
                        key={option.id}
                        className={clsx(
                          "flex items-center gap-2.5 rounded-[6px] px-1.5 py-2",
                          selected && single && "bg-[var(--octo-hover)]",
                          !option.available && "opacity-50"
                        )}
                      >
                        <span
                          aria-hidden
                          className={clsx(
                            "grid h-[18px] w-[18px] shrink-0 place-items-center border",
                            single ? "rounded-full" : "rounded-[4px]",
                            selected
                              ? single
                                ? "border-[var(--octo-accent)] border-[1.5px]"
                                : "border-[var(--octo-accent)] bg-[var(--octo-accent)]"
                              : "border-[var(--octo-border-input)]"
                          )}
                        >
                          {single && selected && (
                            <span className="h-2.5 w-2.5 rounded-full bg-[var(--octo-accent)]" />
                          )}
                          {!single && (
                            <Check
                              size={12}
                              strokeWidth={3}
                              className={selected ? "text-white" : "text-[var(--octo-border-card)]"}
                            />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] text-[var(--octo-text-primary)]">
                            {option.name}
                          </span>
                          {option.subLabel && (
                            <span className="block text-[11px] text-[var(--octo-text-muted)]">
                              {option.subLabel}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
                          {option.priceType === "add-amount" && option.price > 0 ? "+" : ""}
                          SAR {money(option.price)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Derived, never typed: base price plus every pre-selected surcharge.
              The frame's SAR 113 is 100 + 8 + 2 + 3. */}
          <div className="mt-3 flex items-center justify-between rounded-[8px] bg-[var(--octo-hover)] px-3 py-2.5">
            <span className="text-[14px] text-[var(--octo-text-primary)]">
              {t("menuWiz.mod.previewTotal")}
            </span>
            <span className="text-[14.5px] font-semibold text-[var(--octo-accent)] underline underline-offset-2">
              SAR {modifierTotal(item)}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
