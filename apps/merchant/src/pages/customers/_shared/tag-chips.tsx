// apps/merchant/src/pages/customers/_shared/tag-chips.tsx
import { CircleX } from "lucide-react";
import clsx from "clsx";
import { useI18n } from "@/app/providers/i18n-provider";
import { BLOCKED_STYLE, DEFAULT_TAG_STYLE, TAG_LABEL_KEY, TAG_STYLE } from "./theme";
import type { CustomerTag } from "./types";

export function useTagLabel() {
  const { t } = useI18n();
  return (tag: string) => {
    const key = TAG_LABEL_KEY[tag as CustomerTag];
    return key ? t(key) : tag;
  };
}

/** The tinted tag pills shown on the row card, detail header and Payment
 *  Link modal. With `onRemove`, each chip gets the red circled-x badge from
 *  add new customer.png. */
export function TagChips({
  tags,
  blocked,
  size = "sm",
  onRemove,
  uniform,
  className,
}: {
  tags: readonly string[];
  blocked?: boolean;
  size?: "sm" | "md";
  onRemove?: (tag: string) => void;
  /** Draw every chip in the neutral blue style (the Add Customer frame). */
  uniform?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const label = useTagLabel();
  const pill = size === "md" ? "px-2.5 py-1 text-[12.5px]" : "px-2 py-[3px] text-[11px]";

  return (
    <div className={clsx("flex flex-wrap items-center gap-1.5", className)}>
      {blocked && (
        <span className={clsx("rounded-full font-medium", pill)} style={{ color: BLOCKED_STYLE.text, backgroundColor: BLOCKED_STYLE.bg }}>
          {t("customers.tag.blocked")}
        </span>
      )}
      {tags.map((tag) => {
        const style = uniform ? DEFAULT_TAG_STYLE : TAG_STYLE[tag as CustomerTag] ?? DEFAULT_TAG_STYLE;
        return (
          <span key={tag} className={clsx("relative rounded-full font-medium", pill)} style={{ color: style.text, backgroundColor: style.bg }}>
            {label(tag)}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(tag)}
                aria-label={t("customers.aria.removeTag").replace("{tag}", label(tag))}
                className="absolute -end-1.5 -top-2 grid place-items-center rounded-full bg-[var(--octo-card)] text-[#EF4444]"
              >
                <CircleX size={13} />
              </button>
            )}
          </span>
        );
      })}
    </div>
  );
}
