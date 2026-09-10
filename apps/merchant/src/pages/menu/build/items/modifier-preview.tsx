// "Item summary" and "Full Modifiers Preview (Customer view)" — the right-hand
// rail while the Modifiers tab is open. This is the one place in the wizard
// that rail is not the storefront preview.
//
// Nothing here is operable: it depicts a customer's choices, it does not take
// them. Every control is a span, so a screen reader is not told there is a form
// to fill in and a click does not silently change the draft.
import clsx from "clsx";
import { modifierTotal, type Item } from "@/entities/menu";
import { useI18n } from "@/app/providers/i18n-provider";

export function ModifierPreview({ item }: { item: Item }) {
  const { t } = useI18n();

  return (
    <section className="rounded-[14px] border border-[var(--octo-border-card)] bg-[var(--octo-card)] p-4">
      <h2 className="text-[16px] font-semibold text-[var(--octo-text-primary)]">
        {t("menuWiz.mod.summaryTitle")}
      </h2>

      <div className="mt-2 flex gap-3 rounded-[10px] border border-[var(--octo-accent)] bg-[var(--octo-selected)] p-2.5">
        {item.image ? (
          <img src={item.image} alt="" className="h-14 w-14 shrink-0 rounded-[8px] object-cover" />
        ) : (
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-[8px] bg-[#0d2b21] text-center font-serif text-[10px] leading-tight text-white/70"
            aria-hidden
          >
            ME
            <br />
            NU
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-[var(--octo-text-primary)]">
            {item.name}
          </p>
          <p className="line-clamp-2 text-[12.5px] text-[var(--octo-text-secondary)]">
            {item.description}
          </p>
          <p className="mt-0.5 text-[13px] font-semibold text-[var(--octo-accent)]">
            SAR {item.pricing.price}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[10px] border border-[var(--octo-border-card)] p-3">
        <p className="text-[14px] font-semibold text-[var(--octo-text-primary)]">
          {t("menuWiz.mod.previewTitle")}{" "}
          <span className="font-normal text-[var(--octo-text-secondary)]">
            ({t("menuWiz.mod.previewHint")})
          </span>
        </p>

        <div className="mt-2.5 space-y-3">
          {item.modifierGroups.map((group, index) => (
            <div
              key={group.id}
              className="rounded-[10px] border border-[var(--octo-border-card)] p-2.5"
            >
              <p className="text-[13.5px] font-semibold text-[var(--octo-text-primary)]">
                {index + 1}- {group.customerLabel || group.name}
                {group.required && <span className="text-error"> *</span>}
              </p>

              <ul className="mt-2 space-y-2">
                {group.options.map((option) => {
                  const selected = option.isDefault && option.available;
                  return (
                    <li
                      key={option.id}
                      className={clsx(
                        "flex items-center gap-2.5",
                        !option.available && "opacity-50"
                      )}
                    >
                      <span
                        aria-hidden
                        className={clsx(
                          "grid h-4 w-4 shrink-0 place-items-center border",
                          group.type === "single" ? "rounded-full" : "rounded-[4px]",
                          selected
                            ? "border-[var(--octo-accent)] bg-[var(--octo-accent)]"
                            : "border-[var(--octo-border-input)]"
                        )}
                      >
                        {selected && (
                          <span
                            className={clsx(
                              "bg-white",
                              group.type === "single" ? "h-1.5 w-1.5 rounded-full" : "h-2 w-2 rounded-[1px]"
                            )}
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-[var(--octo-text-primary)]">
                          {option.name}
                        </span>
                        {option.subLabel && (
                          <span className="block text-[11.5px] text-[var(--octo-text-muted)]">
                            {option.subLabel}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold text-[var(--octo-text-primary)]">
                        {option.priceType === "add-amount" && option.price > 0
                          ? `+SAR ${option.price}`
                          : `SAR ${option.price}`}
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
          <span className="text-[14px] font-medium text-[var(--octo-text-primary)]">
            {t("menuWiz.mod.previewTotal")}
          </span>
          <span className="text-[14px] font-semibold text-[var(--octo-accent)]">
            SAR {modifierTotal(item)}
          </span>
        </div>
      </div>
    </section>
  );
}
